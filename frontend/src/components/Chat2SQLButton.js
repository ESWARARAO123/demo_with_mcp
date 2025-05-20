import React from 'react';
import { Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';

const Chat2SQLButton = ({ onClick, enabled }) => {
  return (
    <Button
      variant={enabled ? "contained" : "outlined"}
      color={enabled ? "primary" : "inherit"}
      startIcon={<ChatIcon />}
      onClick={onClick}
      sx={{ mb: 2 }}
    >
      {enabled ? "Disable Chat2SQL" : "Enable Chat2SQL"}
    </Button>
  );
};

export default Chat2SQLButton; 