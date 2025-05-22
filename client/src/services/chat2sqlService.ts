import { config } from '../config';

interface Chat2SQLResponse {
  data: any[];
  columns: string[];
  detail?: string;
}

export const chat2sqlService = {
  async executeQuery(query: string): Promise<Chat2SQLResponse> {
    try {
      console.log('Sending query to Chat2SQL API:', query);
      const apiUrl = 'http://localhost:5000/chat2sql/execute';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (!data || !data.columns || !Array.isArray(data.data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }
      
      // Return only the raw data without any processing
      return {
        data: data.data,
        columns: data.columns,
        detail: data.detail
      };
    } catch (error) {
      console.error('Error executing query:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Failed to connect to the server. Please check if the server is running at http://localhost:5000');
      }
      throw error;
    }
  }
}; 