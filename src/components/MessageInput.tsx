import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import { useMCP } from '../contexts/MCPContext';

interface MessageInputProps {
  currentAgent: string | null;
  sendingMessage: boolean;
  onSendMessage: (message: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  currentAgent, 
  sendingMessage, 
  onSendMessage 
}) => {
  const [inputValue, setInputValue] = useState('');
  const { 
    isReplyingToMCP, 
    setIsReplyingToMCP, 
    currentMCPQuestionId, 
    setCurrentMCPQuestionId,
    submitAnswer
  } = useMCP();

  // Reset input when switching between normal mode and MCP reply mode
  useEffect(() => {
    setInputValue('');
  }, [isReplyingToMCP]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentAgent) {
      if (isReplyingToMCP && currentMCPQuestionId) {
        // Handle MCP reply
        submitAnswer(inputValue.trim());
      } else {
        // Normal message
        onSendMessage(inputValue.trim());
      }
      setInputValue('');
    }
  };
  
  const cancelMCPReply = () => {
    setIsReplyingToMCP(false);
    setCurrentMCPQuestionId(null);
  };

  if (!currentAgent) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {isReplyingToMCP && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: 'info.light', 
          p: 1, 
          borderRadius: 1, 
          mb: 1 
        }}>
          <ReplyIcon sx={{ mr: 1, color: 'info.dark' }} />
          <Typography variant="body2" sx={{ flexGrow: 1, color: 'info.dark', fontWeight: 'medium' }}>
            Replying to MCP Question
          </Typography>
          <Button 
            size="small" 
            variant="outlined" 
            color="info" 
            onClick={cancelMCPReply}
          >
            Cancel
          </Button>
        </Box>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={isReplyingToMCP ? 'Type your reply to MCP...' : `Message ${currentAgent}...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={sendingMessage}
          sx={{ 
            mr: 1,
            '& .MuiOutlinedInput-root': {
              borderColor: isReplyingToMCP ? 'info.main' : 'inherit',
              '&:hover fieldset': {
                borderColor: isReplyingToMCP ? 'info.dark' : 'inherit',
              },
              '&.Mui-focused fieldset': {
                borderColor: isReplyingToMCP ? 'info.dark' : 'primary.main',
              },
            },
          }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          color={isReplyingToMCP ? 'info' : 'primary'}
          endIcon={isReplyingToMCP ? <ReplyIcon /> : <SendIcon />}
          disabled={sendingMessage || !inputValue.trim()}
        >
          {isReplyingToMCP ? 'Reply' : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default MessageInput;
