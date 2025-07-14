import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAgent } from '../contexts/AgentContext';

/**
 * Component for viewing and editing the user ID
 */
const UserIdSettings: React.FC = () => {
  const { userId, setUserId } = useAgent();
  const [open, setOpen] = useState(false);
  const [newUserId, setNewUserId] = useState(userId);
  const [error, setError] = useState('');

  const handleOpen = () => {
    setOpen(true);
    setNewUserId(userId);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = () => {
    // Basic validation
    if (!newUserId || newUserId.trim() === '') {
      setError('User ID cannot be empty');
      return;
    }

    // Save the new user ID
    setUserId(newUserId.trim());
    setOpen(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ mr: 1 }}>
          User ID: {userId}
        </Typography>
        <IconButton size="small" onClick={handleOpen} title="Edit User ID">
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Edit User ID</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your user ID is used to identify your conversations with agents.
            Changing it will affect new conversations.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="User ID"
            fullWidth
            variant="outlined"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserIdSettings;
