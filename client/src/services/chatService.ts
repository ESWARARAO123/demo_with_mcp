import { config } from '../config';

export interface ChatResponse {
  response: string;
  message?: string;
}

export interface ChatService {
  sendMessage(message: string): Promise<string>;
}

class ChatServiceImpl implements ChatService {
  async sendMessage(message: string): Promise<string> {
    try {
      // Get the selected model from localStorage or use default
      const selectedModel = localStorage.getItem('selectedModel') || 'llama2';
      
      const response = await fetch(`${config.apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{
            role: 'user',
            content: message
          }],
          stream: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Chat API Error:', errorData);
        if (errorData?.error) {
          throw new Error(errorData.error);
        }
        return '';
      }

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
      } else if (data.response) {
        return data.response;
      } else {
        console.error('Unexpected response format:', data);
        return '';
      }
    } catch (error) {
      console.error('Error in chat service:', error);
      return '';
    }
  }
}

export const chatService: ChatService = new ChatServiceImpl(); 