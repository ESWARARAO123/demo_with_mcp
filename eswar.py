from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from typing import List, Dict, Any, Optional
import uvicorn
import asyncio
import logging
import re
import requests
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database Configuration
DB_CONFIG = {
    'host': '172.16.16.54',
    'database': 'qor',
    'user': 'postgres',
    'password': 'root',
    'port': '5432'
}

# Ollama Configuration
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "mistral"

# FastAPI App Setup
app = FastAPI(
    title="SQL Executor API",
    description="API for executing SQL queries using Ollama for natural language understanding",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    sql: str
    data: List[Dict[str, Any]]
    columns: List[str]

def get_connection():
    """Create and return a database connection"""
    try:
        logger.info("Attempting to connect to database...")
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            database=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        logger.info("Database connection successful")
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise Exception(f"Database connection failed: {str(e)}")

def execute_sql(query: str) -> pd.DataFrame:
    """Execute SQL query and return results as pandas DataFrame"""
    conn = None
    try:
        logger.info(f"Executing query: {query}")
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query)
        results = cursor.fetchall()
        df = pd.DataFrame(results)
        logger.info(f"Query executed successfully. Found {len(df)} rows")
        return df
    except Exception as e:
        logger.error(f"Failed to execute query: {str(e)}")
        raise Exception(f"Failed to execute query: {str(e)}")
    finally:
        if conn:
            conn.close()
            logger.info("Database connection closed")

def get_database_schema() -> Dict[str, Any]:
    """Get complete database schema information"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT 
                t.table_name,
                obj_description(pgc.oid) as table_description,
                pgc.reltuples as row_count
            FROM information_schema.tables t
            JOIN pg_class pgc ON pgc.relname = t.table_name
            WHERE t.table_schema = 'public'
        """)
        tables = [{
            "name": row[0],
            "description": row[1],
            "row_count": row[2]
        } for row in cursor.fetchall()]
        
        # Get columns for each table
        for table in tables:
            cursor.execute("""
                SELECT 
                    column_name,
                    data_type,
                    column_default,
                    is_nullable
                FROM information_schema.columns 
                WHERE table_name = %s 
                AND table_schema = 'public'
            """, (table["name"],))
            table["columns"] = [{
                "name": row[0],
                "type": row[1],
                "default": row[2],
                "nullable": row[3]
            } for row in cursor.fetchall()]
        
        conn.close()
        return {"tables": tables}
    except Exception as e:
        logger.error(f"Error getting database schema: {str(e)}")
        return {"tables": []}

def generate_sql_with_ollama(natural_query: str, schema: Dict[str, Any]) -> str:
    """Use Ollama to generate SQL from natural language query"""
    try:
        # Prepare the prompt with schema information
        schema_str = json.dumps(schema, indent=2)
        prompt = f"""Given the following database schema:
{schema_str}

Convert this natural language query to SQL:
{natural_query}

Generate only the SQL query without any explanation. The query should be valid PostgreSQL syntax."""

        # Call Ollama API
        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Ollama API error: {response.text}")
        
        # Extract SQL from response
        result = response.json()
        sql_query = result.get("response", "").strip()
        
        # Clean up the response to get only the SQL query
        sql_query = re.sub(r'```sql\n?|\n?```', '', sql_query)
        sql_query = sql_query.strip()
        
        logger.info(f"Generated SQL query: {sql_query}")
        return sql_query
    except Exception as e:
        logger.error(f"Error generating SQL with Ollama: {str(e)}")
        raise Exception(f"Failed to generate SQL query: {str(e)}")

@app.post("/api/execute")
async def execute_query_endpoint(request: Request):
    """Execute a natural language query and return the results."""
    try:
        # Parse request body
        body = await request.json()
        query = body.get('query')
        
        if not query:
            logger.error("No query provided in request")
            return JSONResponse(
                status_code=400,
                content={"detail": "Query parameter is required"},
                headers={"Content-Type": "application/json"}
            )

        logger.info(f"Received natural language query: {query}")
        
        # Get database schema
        schema = get_database_schema()
        
        # Generate SQL using Ollama
        sql_query = generate_sql_with_ollama(query, schema)
        logger.info(f"Generated SQL: {sql_query}")
        
        # Execute query
        df = execute_sql(sql_query)
        
        # Prepare response
        response_data = {
            "sql": sql_query,
            "data": df.to_dict(orient='records'),
            "columns": df.columns.tolist()
        }
        
        logger.info(f"Returning response with {len(df)} rows")
        return JSONResponse(
            content=jsonable_encoder(response_data),
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)},
            headers={"Content-Type": "application/json"}
        )

@app.get("/")
async def root():
    """Health check endpoint"""
    try:
        # Test database connection
        conn = get_connection()
        conn.close()
        return JSONResponse(
            content={"status": "healthy", "service": "sql-executor", "database": "connected"},
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            content={"status": "unhealthy", "service": "sql-executor", "error": str(e)},
            headers={"Content-Type": "application/json"}
        )

if __name__ == "__main__":
    logger.info("Starting SQL Executor API server...")
    uvicorn.run(app, host="0.0.0.0", port=5000)