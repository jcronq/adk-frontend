import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Tooltip,
  useTheme,
  alpha,
  Chip
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Chat as ChatIcon,
  SmartToy as AgentIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { useAgent } from '../../contexts/AgentContext';
import { useMCP } from '../../contexts/MCPContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface SidebarProps {
  /** Whether the sidebar is in collapsed state */
  collapsed: boolean;
  /** Width of the sidebar */
  width: number;
  /** Callback to toggle collapse state */
  onToggleCollapse: () => void;
  /** Whether this is mobile view */
  isMobile?: boolean;
}

/**
 * Sidebar component for ChatGPT-style interface
 * 
 * Features:
 * - Collapsible/expandable layout
 * - Agent and conversation management
 * - Notification badges for unanswered questions
 * - Responsive design for mobile/desktop
 * - New conversation creation
 */
const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  width,
  onToggleCollapse,
  isMobile = false
}) => {
  const theme = useTheme();
  const { 
    agents, 
    currentAgent, 
    conversations, 
    setCurrentAgent, 
    startNewConversation 
  } = useAgent();
  
  const { currentQuestion } = useMCP();
  const { notifications } = useNotifications();

  // Calculate notification counts for each agent
  const getAgentNotificationCount = (agentName: string) => {
    return notifications.filter(notification => 
      notification.agentName === agentName && 
      (notification.status === 'pending' || notification.status === 'displayed')
    ).length;
  };

  const handleAgentSelect = (agentName: string) => {
    setCurrentAgent(agentName);
  };

  const handleNewConversation = (agentName: string) => {
    startNewConversation(agentName);
  };

  // Render agent item
  const renderAgentItem = (agent: any, isCollapsed: boolean) => {
    const notificationCount = getAgentNotificationCount(agent.name);
    const isActive = currentAgent === agent.name;
    const hasConversations = conversations[agent.name]?.length > 0;

    const content = (
      <ListItemButton
        selected={isActive}
        onClick={() => handleAgentSelect(agent.name)}
        sx={{
          minHeight: 48,
          px: isCollapsed ? 1 : 2,
          py: 1,
          borderRadius: 1,
          mx: isCollapsed ? 0.5 : 1,
          mb: 0.5,
          backgroundColor: isActive 
            ? alpha(theme.palette.primary.main, 0.1) 
            : 'transparent',
          '&:hover': {
            backgroundColor: isActive
              ? alpha(theme.palette.primary.main, 0.15)
              : alpha(theme.palette.action.hover, 0.08),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
            }
          }
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: isCollapsed ? 'auto' : 40,
            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
            justifyContent: 'center',
          }}
        >
          <AgentIcon />
        </ListItemIcon>
        
        {!isCollapsed && (
          <>
            <ListItemText
              primary={agent.name}
              secondary={hasConversations ? `${conversations[agent.name].length} conversations` : 'No conversations'}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
              }}
              secondaryTypographyProps={{
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
              }}
            />
            
            {/* Notification badge */}
            {notificationCount > 0 && (
              <Chip
                size="small"
                label={notificationCount}
                color="error"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  '& .MuiChip-label': {
                    px: 0.5,
                  }
                }}
              />
            )}

            {/* New conversation button */}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleNewConversation(agent.name);
              }}
              sx={{
                ml: 1,
                opacity: isActive ? 1 : 0,
                transition: theme.transitions.create('opacity'),
                '&:hover': {
                  opacity: 1,
                }
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </ListItemButton>
    );

    return isCollapsed ? (
      <Tooltip key={agent.name} title={agent.name} placement="right">
        {content}
      </Tooltip>
    ) : content;
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width,
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: 56,
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            Agents
          </Typography>
        )}

        {/* Collapse toggle - only show on desktop */}
        {!isMobile && (
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.08),
              }
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>

      {/* Agent List */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          py: 1,
        }}
      >
        {agents.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              px: 2,
              color: theme.palette.text.secondary,
            }}
          >
            {!collapsed && (
              <>
                <AgentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body2" align="center">
                  No agents available
                </Typography>
              </>
            )}
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {agents.map((agent) => renderAgentItem(agent, collapsed))}
          </List>
        )}
      </Box>

      {/* Footer */}
      {!collapsed && (
        <>
          <Divider />
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CircleIcon
              sx={{
                fontSize: 8,
                color: theme.palette.success.main,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.75rem',
              }}
            >
              {agents.length} agents available
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Sidebar;