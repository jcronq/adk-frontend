import React from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  SelectChangeEvent 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Agent } from '../types';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: string;
  onAgentChange: (event: SelectChangeEvent) => void;
  onStartConversation: () => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ 
  agents, 
  selectedAgent, 
  onAgentChange, 
  onStartConversation 
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Select an Agent
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="agent-select-label">Choose an agent to chat with</InputLabel>
            <Select
              labelId="agent-select-label"
              id="agent-select"
              value={selectedAgent}
              label="Choose an agent to chat with"
              onChange={onAgentChange}
            >
              {agents.map((agent) => (
                <MenuItem key={agent.name} value={agent.name}>
                  {agent.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onStartConversation}
            disabled={!selectedAgent}
            fullWidth
          >
            Start New Conversation
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AgentSelector;
