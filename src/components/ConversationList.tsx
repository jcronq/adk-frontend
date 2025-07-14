import React, { useState, memo } from 'react';
import { 
  Box, 
  Typography, 
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Chat as ChatIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { Agent, AgentConversations, Conversation } from '../types';

interface ConversationListProps {
  agents: Agent[];
  conversations: AgentConversations;
  onContinueConversation: (agentName: string, sessionId: string) => void;
  selectedConversationId?: string;
}

// Helper function to get conversation preview text
const getConversationPreview = (conversation: Conversation): string => {
  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return 'No messages yet';
  }
  
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  if (!lastMessage || !lastMessage.content) {
    return 'No content';
  }
  
  const preview = lastMessage.content.substring(0, 50);
  return preview.length < lastMessage.content.length ? `${preview}...` : preview;
};

// Helper function to format relative time
const getRelativeTime = (sessionId: string): string => {
  // For now, we'll use session ID timestamp if available, otherwise show "Recently"
  // This could be enhanced with actual timestamp data
  return 'Recently';
};

// Memoized conversation item component for performance
const ConversationItem = memo(({ 
  conversation, 
  agentName, 
  isSelected, 
  onClick 
}: {
  conversation: Conversation;
  agentName: string;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const preview = getConversationPreview(conversation);
  const messageCount = conversation.messages?.length || 0;
  const timeText = getRelativeTime(conversation.sessionId);

  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={isSelected}
        onClick={onClick}
        sx={{
          pl: 4,
          borderRadius: 1,
          mx: 1,
          my: 0.5,
          '&.Mui-selected': {
            backgroundColor: 'primary.light',
            '&:hover': {
              backgroundColor: 'primary.main',
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <ChatIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body2" noWrap>
              {preview}
            </Typography>
          }
          secondary={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography variant="caption" color="text.secondary" component="span">
                {messageCount} messages
              </Typography>
              <Typography variant="caption" color="text.secondary" component="span">
                • {timeText}
              </Typography>
            </span>
          }
        />
      </ListItemButton>
    </ListItem>
  );
});

ConversationItem.displayName = 'ConversationItem';

const ConversationList: React.FC<ConversationListProps> = ({ 
  agents, 
  conversations, 
  onContinueConversation,
  selectedConversationId
}) => {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  if (agents.length === 0 || Object.keys(conversations).length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No conversations yet. Start a new conversation to see it here.
        </Typography>
      </Box>
    );
  }

  const agentsWithConversations = agents.filter(
    agent => conversations[agent.name] && conversations[agent.name].length > 0
  );

  if (agentsWithConversations.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No conversations found for the current agents.
        </Typography>
      </Box>
    );
  }

  const toggleAgentExpansion = (agentName: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentName)) {
      newExpanded.delete(agentName);
    } else {
      newExpanded.add(agentName);
    }
    setExpandedAgents(newExpanded);
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" color="text.primary">
          Conversations
        </Typography>
      </Box>
      
      <List disablePadding>
        {agentsWithConversations.map((agent) => {
          const agentConversations = conversations[agent.name] || [];
          const isExpanded = expandedAgents.has(agent.name);
          
          return (
            <React.Fragment key={agent.name}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => toggleAgentExpansion(agent.name)}
                  sx={{ px: 2, py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight="medium">
                        {agent.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {agentConversations.length} conversation{agentConversations.length !== 1 ? 's' : ''}
                      </Typography>
                    }
                  />
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {agentConversations.map((conversation, index) => (
                    <ConversationItem
                      key={conversation.sessionId}
                      conversation={conversation}
                      agentName={agent.name}
                      isSelected={selectedConversationId === conversation.sessionId}
                      onClick={() => onContinueConversation(agent.name, conversation.sessionId)}
                    />
                  ))}
                </List>
              </Collapse>
              
              {/* Add divider between agents except for the last one */}
              {agent !== agentsWithConversations[agentsWithConversations.length - 1] && (
                <Divider sx={{ mx: 2 }} />
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default memo(ConversationList);
