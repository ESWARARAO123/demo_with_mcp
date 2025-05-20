import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, Paper, Typography, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const Chat2SQL = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();
      
      // Add API response to chat
      const apiMessage = {
        type: 'api',
        content: data.data,
        columns: data.columns,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, apiMessage]);
    } catch (error) {
      console.error('Error:', error);
      // Add error message to chat
      const errorMessage = {
        type: 'error',
        content: 'Failed to get response from server',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    const isError = message.type === 'error';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '70%',
            backgroundColor: isError ? '#ffebee' : isUser ? '#e3f2fd' : '#f5f5f5',
            borderRadius: 2,
          }}
        >
          {isError ? (
            <Typography color="error">{message.content}</Typography>
          ) : isUser ? (
            <Typography>{message.content}</Typography>
          ) : (
            <Box>
              {message.columns && (
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Columns: {message.columns.join(', ')}
                </Typography>
              )}
              {Array.isArray(message.content) ? (
                <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                  {message.content.map((row, index) => (
                    <Typography key={index} sx={{ mb: 0.5 }}>
                      {JSON.stringify(row)}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography>{message.content}</Typography>
              )}
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message, index) => (
          <div key={index}>{renderMessage(message)}</div>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box sx={{ p: 2, backgroundColor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your SQL query in natural language..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <Button
            variant="contained"
            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Chat2SQL; 