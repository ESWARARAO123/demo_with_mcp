import { config } from '../config';

interface Chat2SQLResponse {
  sql: string;
  data: any[];
  columns: string[];
  detail?: string;
}

export const chat2sqlService = {
  async executeQuery(query: string): Promise<Chat2SQLResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to execute query');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }
}; 