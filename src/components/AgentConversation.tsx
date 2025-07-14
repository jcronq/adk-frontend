import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button,
  SelectChangeEvent
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import ConversationView from './ConversationView';
import MessageInput from './MessageInput';
import { useAgent } from '../contexts/AgentContext';
import { useMCP } from '../contexts/MCPContext';
import AgentSelector from './AgentSelector';
import ConversationList from './ConversationList';
import UserIdSettings from './UserIdSettings';
import Header from './Header';
import MCPQuestionDialog from './MCPQuestionDialog';

const AgentConversation: React.FC = () => {
  const { 
    agents, 
    currentAgent,
    currentConversation,
    conversations, 
    loadingAgents, 
    sendingMessage,
    setCurrentAgent,
    setCurrentConversation,
    startNewConversation, 
    sendMessage,
  } = useAgent();
  
  // MCP context for handling questions
  const { currentQuestion, submitAnswer } = useMCP();
  
  // State for the main area workflow
  const [mainAreaState, setMainAreaState] = useState<'empty' | 'agent-selection' | 'chat'>('empty');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  
  // Update main area state based on current conversation
  useEffect(() => {
    if (currentConversation && currentAgent) {
      setMainAreaState('chat');
    }
    // Don't automatically change to 'empty' - let manual state changes persist
  }, [currentConversation, currentAgent]);
  
  const handleNewChatClick = () => {
    // Start new chat workflow - show agent selection
    setSelectedAgent('');
    setCurrentAgent(null);
    setMainAreaState('agent-selection');
  };
  
  const handleAgentChange = (event: SelectChangeEvent) => {
    const agentName = event.target.value;
    setSelectedAgent(agentName);
  };
  
  const handleStartConversation = () => {
    if (selectedAgent) {
      console.log(`Starting new conversation with agent ${selectedAgent}`);
      // Start the conversation and switch to chat mode
      setCurrentAgent(selectedAgent);
      startNewConversation(selectedAgent);
      setMainAreaState('chat');
    }
  };
  
  const handleContinueConversation = (agentName: string, sessionId: string) => {
    console.log(`Continuing conversation for agent ${agentName} with session ${sessionId}`);
    setCurrentConversation(agentName, sessionId);
    setMainAreaState('chat');
  };
  
  const handleSendMessage = (message: string) => {
    if (message.trim() && currentAgent) {
      sendMessage(message.trim());
    }
  };
  
  const handleQuestionClick = (questionId: string, agentName?: string, conversationId?: string) => {
    console.log(`Question clicked: ${questionId} for agent ${agentName}, conversation ${conversationId}`);
    // If there's an agent and conversation ID, navigate to that conversation
    if (agentName && conversationId) {
      setCurrentConversation(agentName, conversationId);
      setMainAreaState('chat');
    }
  };
  
  const handleAnswerMCP = (answer: string) => {
    if (currentQuestion) {
      submitAnswer(answer);
    }
  };
  
  const handleCloseMCPDialog = () => {
    // For now, we don't clear the current question when closing the dialog
    // The question will remain available in notifications
  };
  
  
  if (loadingAgents) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading available agents...
        </Typography>
      </Box>
    );
  }

  // Render main area content based on state
  const renderMainArea = () => {
    switch (mainAreaState) {
      case 'agent-selection':
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            p: 4
          }}>
            <Box sx={{ maxWidth: 400, width: '100%' }}>
              <Typography variant="h5" gutterBottom textAlign="center" sx={{ mb: 3 }}>
                Choose an Agent
              </Typography>
              <AgentSelector
                agents={agents}
                selectedAgent={selectedAgent}
                onAgentChange={handleAgentChange}
                onStartConversation={handleStartConversation}
              />
            </Box>
          </Box>
        );
      
      case 'chat':
        return currentConversation ? (
          <>
            <ConversationView
              currentAgent={currentAgent}
              currentConversation={currentConversation}
              sendingMessage={sendingMessage}
              onBackToSelection={() => {}} // No back navigation in new workflow
            />
            
            <MessageInput
              currentAgent={currentAgent}
              sendingMessage={sendingMessage}
              onSendMessage={handleSendMessage}
            />
          </>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary'
          }}>
            <Typography variant="h6">
              Starting conversation...
            </Typography>
          </Box>
        );
      
      default: // 'empty'
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary',
            textAlign: 'center'
          }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Welcome to ADK Agent Manager
              </Typography>
              <Typography variant="body1">
                Start a new conversation or select an existing one from the sidebar
              </Typography>
            </Box>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with NotificationCenter */}
      <Header onQuestionClick={handleQuestionClick} />
      
      {/* Main content area */}
      <Box sx={{ height: '100%', display: 'flex', flexGrow: 1 }}>
      {/* Sidebar - Always shows New Chat button and all conversations */}
      <Box sx={{ 
        width: 320, 
        borderRight: 1, 
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper'
      }}>
        {/* Sidebar header with New Chat button */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider'
        }}>
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}>
            <Typography variant="h6">
              ADK Chat
            </Typography>
            <UserIdSettings />
          </Box>
          
          {/* New Chat Button */}
          <Button 
            variant="contained" 
            fullWidth
            onClick={handleNewChatClick}
            startIcon={<AddIcon />}
            sx={{ 
              backgroundColor: 'primary.main',
              '&:hover': { backgroundColor: 'primary.dark' }
            }}
          >
            New Chat
          </Button>
        </Box>

        {/* All Conversations */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {Object.keys(conversations).length > 0 ? (
            <ConversationList 
              agents={agents}
              conversations={conversations}
              onContinueConversation={handleContinueConversation}
            />
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">
                No conversations yet. Start a new chat to begin!
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {renderMainArea()}
      </Box>
      </Box>
      
      {/* MCP Question Dialog */}
      <MCPQuestionDialog
        open={!!currentQuestion}
        question={currentQuestion}
        onAnswer={handleAnswerMCP}
        onClose={handleCloseMCPDialog}
      />
    </Box>
  );
};

export default AgentConversation;
