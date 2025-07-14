import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { MCPQuestion } from '../types';

interface MCPQuestionDialogProps {
  open: boolean;
  question: MCPQuestion | null;
  onAnswer: (answer: string) => void;
  onClose: () => void;
}

const MCPQuestionDialog: React.FC<MCPQuestionDialogProps> = ({
  open,
  question,
  onAnswer,
  onClose,
}) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswer(answer.trim());
      setAnswer('');
    }
  };

  const handleClose = () => {
    setAnswer('');
    onClose();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          Agent Question
        </Typography>
        <IconButton
          edge="end"
          onClick={handleClose}
          aria-label="close"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            An agent is asking for your input:
          </Typography>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              borderLeft: 4,
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
              "{question?.question}"
            </Typography>
          </Box>
        </Box>

        <TextField
          autoFocus
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          label="Your answer"
          placeholder="Type your response here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ mb: 2 }}
        />

        <Typography variant="caption" color="text.secondary">
          Press Enter to submit, or Shift+Enter for a new line
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!answer.trim()}
        >
          Send Answer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MCPQuestionDialog;