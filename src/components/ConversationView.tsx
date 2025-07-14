import React, { useRef, useEffect, memo, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  CircularProgress,
  Button,
  Tab,
  Tooltip
} from '@mui/material';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Chat as ChatIcon, BugReport as BugIcon } from '@mui/icons-material';
import { Message, ConversationWithEvents } from '../types';
import { useMCP } from '../contexts/MCPContext';
import DebugView from './DebugView';

interface ConversationViewProps {
  currentAgent: string | null;
  currentConversation: ConversationWithEvents | null;
  sendingMessage: boolean;
  onBackToSelection?: () => void;
}

// Message filtering utility for chat window display
// ENHANCED WITH COMPREHENSIVE DEBUG LOGGING for session_2c13dc67
const chatWindowMessageFilter = (message: Message, index: number, sessionId?: string): boolean => {
  const isDebugSession = sessionId === 'session_2c13dc67';
  
  if (isDebugSession) {
    console.log(`\n🔍 CHAT WINDOW FILTER - Message ${index + 1}:`);
    console.log(`  📝 Message Details:`);
    console.log(`    - Role: "${message.role}"`);
    console.log(`    - Content Length: ${message.content?.length || 0}`);
    console.log(`    - Content Preview: "${message.content?.substring(0, 50)}..."`);
    console.log(`    - Is MCP Message: ${message.isMCPMessage}`);
    console.log(`    - MCP Question ID: ${message.mcpQuestionId || 'N/A'}`);
    console.log(`    - Final Agent: "${message.finalAgent || 'N/A'}"`);
    
    // Log all message properties for complete debugging
    console.log(`    - All message properties:`, {
      role: message.role,
      content: message.content ? `${message.content.length} chars` : 'no content',
      isMCPMessage: message.isMCPMessage,
      mcpQuestionId: message.mcpQuestionId,
      finalAgent: message.finalAgent,
      ...Object.keys(message).reduce((acc, key) => {
        if (!['role', 'content', 'isMCPMessage', 'mcpQuestionId', 'finalAgent'].includes(key)) {
          acc[key] = (message as any)[key];
        }
        return acc;
      }, {} as any)
    });
  }
  
  // ALWAYS INCLUDE: User messages
  if (message.role === 'user') {
    if (isDebugSession) {
      console.log(`  ✅ FILTER DECISION: INCLUDING USER MESSAGE`);
      console.log(`    - Reason: All user messages are always included`);
    }
    return true;
  }
  
  // ALWAYS INCLUDE: ask_user tool messages (MCP questions)  
  if (message.isMCPMessage === true) {
    if (isDebugSession) {
      console.log(`  ✅ FILTER DECISION: INCLUDING MCP MESSAGE`);
      console.log(`    - Reason: isMCPMessage=true (includes questions and responses)`);
      console.log(`    - MCP Question ID: "${message.mcpQuestionId || 'N/A'}"`);
    }
    return true;
  }
  
  // 🚨 EMERGENCY FIX: INCLUSIVE AGENT FILTERING
  // INCLUDE: ALL assistant messages that are NOT internal dialogue
  if (message.role === 'assistant') {
    if (isDebugSession) {
      console.log(`  🤖 EVALUATING ASSISTANT MESSAGE:`);
      console.log(`    - Final Agent: "${message.finalAgent}"`);
      console.log(`    - Internal Dialogue: ${message.internalDialogue ? 'present' : 'none'}`);
    }
    
    // 🚨 EMERGENCY CHANGE: Check for internal dialogue exclusion first
    const hasInternalDialogue = message.internalDialogue && 
      Array.isArray(message.internalDialogue) && 
      message.internalDialogue.length > 0;
    
    if (hasInternalDialogue && !message.isMCPMessage) {
      if (isDebugSession) {
        console.log(`  ❌ FILTER DECISION: EXCLUDING INTERNAL DIALOGUE`);
        console.log(`    - Reason: Has internal dialogue and is not MCP message`);
      }
      return false;
    }
    
    // 🚨 EMERGENCY CHANGE: INCLUSIVE APPROACH - Accept ALL non-internal messages
    if (isDebugSession) {
      console.log(`  ✅ FILTER DECISION: INCLUDING ASSISTANT MESSAGE (INCLUSIVE)`);
      console.log(`    - Reason: Assistant message without internal dialogue (showing all assistant responses)`);
      console.log(`    - Final Agent: "${message.finalAgent || 'unknown'}"`);
    }
    return true;
  }
  
  // Handle edge cases
  if (isDebugSession) {
    console.log(`  ❌ FILTER DECISION: EXCLUDING MESSAGE (NO MATCH)`);
    console.log(`    - Reason: Message role "${message.role}" doesn't match any inclusion criteria`);
  }
  
  return false; // Exclude all other messages
};

const ConversationView: React.FC<ConversationViewProps> = ({ 
  currentAgent, 
  currentConversation, 
  sendingMessage,
  onBackToSelection
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('chat');
  
  const { 
    setIsReplyingToMCP, 
    setCurrentMCPQuestionId 
  } = useMCP();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  // Reset to chat tab when conversation changes
  useEffect(() => {
    if (currentConversation) {
      setActiveTab('chat');
    }
  }, [currentConversation?.sessionId]);
  
  // Handle reply to MCP message
  const handleReplyToMCP = (mcpQuestionId: string) => {
    setIsReplyingToMCP(true);
    setCurrentMCPQuestionId(mcpQuestionId);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };


  if (!currentAgent || !currentConversation) {
    return (
      <Box 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50'
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Select a conversation to start chatting
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced header with agent info and conversation metadata */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" noWrap>
            {currentAgent}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Session: {currentConversation.sessionId}
        </Typography>
      </Box>

      {/* Tab Interface */}
      <TabContext value={activeTab}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <TabList 
            onChange={handleTabChange} 
            aria-label="conversation tabs"
            variant="fullWidth"
          >
            <Tab 
              label="Chat" 
              value="chat" 
              icon={<ChatIcon />} 
              iconPosition="start"
              aria-label="Chat view"
            />
            <Tab 
              label={
                <Tooltip 
                  title="This debug view shows the internal session events for this conversation, including agent responses, tool calls, and system events. Use the filters below to focus on specific types of events or agents."
                  placement="top"
                  arrow
                >
                  <span>Debug</span>
                </Tooltip>
              } 
              value="debug" 
              icon={<BugIcon />} 
              iconPosition="start"
              aria-label="Debug view"
            />
          </TabList>
        </Box>

        {/* Chat Tab Panel */}
        <TabPanel value="chat" sx={{ p: 0, flexGrow: 1, overflow: 'hidden' }}>
          <Paper 
            elevation={0}
            sx={{ 
              height: '100%',
              overflow: 'auto',
              bgcolor: 'grey.50',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <List sx={{ flexGrow: 1, p: 2 }}>
              {currentConversation?.messages ? (
                currentConversation.messages
                  .filter((message, index) => chatWindowMessageFilter(message, index, currentConversation.sessionId))
                  .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
                  .map((message: Message, index: number) => (
                <ListItem 
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1,
                    padding: 0,
                    width: '100%'
                  }}
                >
                  <Paper 
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '80%',
                      bgcolor: message.isMCPMessage ? 'info.light' : message.role === 'user' ? 'primary.light' : 'white',
                      color: message.role === 'user' ? 'white' : 'text.primary',
                      borderRadius: 2,
                      borderLeft: message.isMCPMessage ? '4px solid #1976d2' : 'none'
                    }}
                  >
                    {message.isMCPMessage && (
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold', color: 'info.dark' }}>
                        MCP Question
                      </Typography>
                    )}
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                    {message.isMCPMessage && message.mcpQuestionId && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="contained" 
                          size="small" 
                          color="info"
                          onClick={() => handleReplyToMCP(message.mcpQuestionId!)}
                        >
                          Reply
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </ListItem>
              ))) : (
                <ListItem>
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                    <Typography variant="body1">
                      No messages yet. Start a conversation by typing a message below.
                    </Typography>
                  </Paper>
                </ListItem>
              )}
              {sendingMessage && (
                <ListItem 
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    mb: 1,
                    padding: 0
                  }}
                >
                  <Paper 
                    elevation={1}
                    sx={{
                      p: 2,
                      bgcolor: 'white',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      Thinking...
                    </Typography>
                  </Paper>
                </ListItem>
              )}
            </List>
            <div ref={messagesEndRef} />
          </Paper>
        </TabPanel>

        {/* Debug Tab Panel */}
        <TabPanel value="debug" sx={{ p: 0, flexGrow: 1, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <DebugView 
              conversation={currentConversation}
              loading={sendingMessage}
              autoScroll={true}
              maxHeight={600}
            />
          </Box>
        </TabPanel>
      </TabContext>
    </Box>
  );
};

export default memo(ConversationView);
