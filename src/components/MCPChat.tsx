import React, { useRef, useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Alert, 
  CircularProgress,
  List,
  ListItem
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useMCP } from '../contexts/MCPContext';
import { Message } from '../types';

const MCPChat: React.FC = () => {
  const { currentQuestion, submitAnswer, isServerRunning } = useMCP();
  const [inputValue, setInputValue] = useState('');
  const [messages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Since we're now using the agent's conversation for MCP messages,
  // we don't need to maintain a separate messages state in this component
  // This component is now just a placeholder for future dedicated MCP UI
  
  // Scroll to bottom when messages change
  useEffect(() => {
    // Check if the ref exists and has scrollIntoView method before calling it
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentQuestion) {
      submitAnswer(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Agent-User Chat via MCP
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        This tab allows agents to ask you questions through the MCP server.
      </Alert>
      
      {!isServerRunning && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Starting MCP server...
          </Typography>
        </Box>
      )}
      
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          flexGrow: 1, 
          mb: 2, 
          maxHeight: 'calc(100vh - 250px)', 
          overflow: 'auto',
          bgcolor: 'grey.100'
        }}
      >
        <List>
          {messages.map((message: Message, index: number) => (
            <ListItem 
              key={index}
              sx={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 1,
                padding: 0
              }}
            >
              <Paper 
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: '80%',
                  bgcolor: message.role === 'user' ? 'primary.light' : 'white',
                  color: message.role === 'user' ? 'white' : 'text.primary',
                  borderRadius: 2
                }}
              >
                <Typography variant="body1">
                  {message.content}
                </Typography>
              </Paper>
            </ListItem>
          ))}

        </List>
        <div ref={messagesEndRef} />
      </Paper>
      
      <Box component="form" onSubmit={handleSubmit} data-testid="mcp-form" sx={{ display: 'flex' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={currentQuestion ? "Your reply..." : "Waiting for a question..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={!currentQuestion || !isServerRunning}
          sx={{ mr: 1 }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          endIcon={<SendIcon />}
          disabled={!currentQuestion || !isServerRunning || !inputValue.trim()}
        >
          Send
        </Button>
      </Box>
      
      {currentQuestion && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please answer the question above.
        </Alert>
      )}
    </Box>
  );
};

export default MCPChat;
