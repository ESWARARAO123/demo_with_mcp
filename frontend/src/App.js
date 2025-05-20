import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import Chat2SQL from './components/Chat2SQL';
import Chat2SQLButton from './components/Chat2SQLButton';

function App() {
  const [chatEnabled, setChatEnabled] = useState(false);

  const toggleChat = () => {
    setChatEnabled(!chatEnabled);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Chat2SQLButton onClick={toggleChat} enabled={chatEnabled} />
        {chatEnabled && <Chat2SQL />}
      </Box>
    </Container>
  );
}

export default App; 