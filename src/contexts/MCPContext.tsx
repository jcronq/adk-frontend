import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MCPQuestion } from '../types';
import { useNotifications } from './NotificationContext';
import websocketService from '../services/websocket';

// Define the context type
interface MCPContextType {
  currentQuestion: MCPQuestion | null;
  submitAnswer: (answer: string) => void;
  isServerRunning: boolean;
  isReplyingToMCP: boolean;
  setIsReplyingToMCP: (isReplying: boolean) => void;
  currentMCPQuestionId: string | null;
  setCurrentMCPQuestionId: (id: string | null) => void;
}

// Create the context with a default value
export const MCPContext = createContext<MCPContextType | undefined>(undefined);

// Custom hook for using the MCP context
export const useMCP = () => {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  return context;
};

// Props for the MCPProvider component
interface MCPProviderProps {
  children: ReactNode;
  // We'll receive these from the parent component (App.tsx)
  currentAgent: string | null;
  conversations: Record<string, any[]>;
  sendMessage: (message: string, isMCPMessage?: boolean, mcpQuestionId?: string | null) => Promise<void>;
  getCurrentSessionContext: () => { agentName: string, sessionId: string } | null;
}

// MCP Provider component
export const MCPProvider: React.FC<MCPProviderProps> = ({
  children,
  currentAgent,
  conversations,
  sendMessage,
  getCurrentSessionContext
}) => {
  // Create state variables for MCP functionality
  const [currentQuestion, setCurrentQuestion] = useState<MCPQuestion | null>(null);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isReplyingToMCP, setIsReplyingToMCP] = useState(false);
  const [currentMCPQuestionId, setCurrentMCPQuestionId] = useState<string | null>(null);
  
  // Get notification system functions
  const { addNotification, markAsAnswered } = useNotifications();
  
  // Function to submit an answer to a question
  const submitAnswer = (answer: string) => {
    if (currentQuestion) {
      // Determine session context for the answer
      let sessionContext: { agentName: string, sessionId: string } | undefined;
      
      if (currentQuestion.sessionContext) {
        // Use the question's session context for proper routing
        sessionContext = currentQuestion.sessionContext;
      } else if (currentAgent) {
        // Fallback to current UI state
        const currentSessionId = conversations[currentAgent]?.[0]?.sessionId;
        if (currentSessionId) {
          sessionContext = { agentName: currentAgent, sessionId: currentSessionId };
        }
      }
      
      // Send the answer through the regular agent message flow (only if currently viewing the target agent)
      if (sessionContext && currentAgent === sessionContext.agentName) {
        sendMessage(answer);
      }
      
      // Send the answer to the MCP server via WebSocket with session context
      websocketService.sendAnswer(currentQuestion.id, answer, sessionContext);
      
      // Mark the question as answered in the notification system
      markAsAnswered(currentQuestion.id);
      
      // Clear the current question and reset MCP reply state
      setCurrentQuestion(null);
      setIsReplyingToMCP(false);
      setCurrentMCPQuestionId(null);
    }
  };
  
  // Effect to handle WebSocket connection and message handling
  useEffect(() => {
    console.log('[MCPContext] useEffect mounting - setting up WebSocket');
    
    // Set up WebSocket event listeners
    const handleConnected = () => {
      console.log('[MCPContext] Connected to MCP WebSocket server');
      setIsServerRunning(true);
    };

    const handleDisconnected = () => {
      console.log('[MCPContext] Disconnected from MCP WebSocket server');
      setIsServerRunning(false);
    };

    const handleQuestion = (question: MCPQuestion) => {
      console.log(`Received question ${question.id}: ${question.question}`);
      console.log('Question session context:', question.sessionContext);
      
      // Determine agent and session from question context, not current UI state
      let targetAgent: string | undefined;
      let targetSessionId: string | undefined;
      
      if (question.sessionContext) {
        // Use session context from the question (proper routing)
        targetAgent = question.sessionContext.agentName;
        targetSessionId = question.sessionContext.sessionId;
        console.log(`Routing question to agent ${targetAgent}, session ${targetSessionId}`);
      } else {
        // Fallback to current UI state (legacy behavior)
        targetAgent = currentAgent || undefined;
        targetSessionId = currentAgent && conversations[currentAgent]?.[0]?.sessionId;
        console.warn('No session context in question, falling back to current UI state');
      }
      
      // Add the question to the notification system with proper routing
      addNotification(question, targetAgent, targetSessionId);
      
      // Set as current question for answering purposes
      setCurrentQuestion(question);
      setCurrentMCPQuestionId(question.id);
      
      // Inject the question into the correct conversation based on session context
      // Only inject if we're currently viewing the target agent/session
      if (targetAgent && currentAgent === targetAgent) {
        const agentConversations = conversations[targetAgent] || [];
        let targetConversation = null;
        
        if (targetSessionId) {
          // Find the specific session conversation
          targetConversation = agentConversations.find(conv => conv.sessionId === targetSessionId);
        } else if (agentConversations.length > 0) {
          // Fallback to most recent conversation
          targetConversation = agentConversations[0];
        }
        
        if (targetConversation) {
          console.log(`Injecting MCP question into conversation for agent ${targetAgent}, session ${targetConversation.sessionId}`);
          // Format the question with a clear indicator that it's from the agent
          const formattedQuestion = `🤖 **Agent Question:**\n\n${question.question}`;
          // Inject the question as an MCP message in the conversation
          sendMessage(formattedQuestion, true, question.id);
        }
      }
    };

    // Register event listeners
    websocketService.addEventListener('connected', handleConnected);
    websocketService.addEventListener('disconnected', handleDisconnected);
    websocketService.addEventListener('question', handleQuestion);
    
    // Connect to the WebSocket server only if not already connected
    if (!websocketService.isConnected()) {
      console.log('[MCPContext] Connecting to WebSocket server');
      websocketService.connect();
    } else {
      console.log('[MCPContext] WebSocket already connected');
      setIsServerRunning(true);
    }
    
    // Cleanup function to remove event listeners and disconnect
    return () => {
      console.log('[MCPContext] useEffect cleanup - disconnecting WebSocket');
      websocketService.removeEventListener('connected', handleConnected);
      websocketService.removeEventListener('disconnected', handleDisconnected);
      websocketService.removeEventListener('question', handleQuestion);
      websocketService.disconnect();
    };
  }, []); // Only run once on mount
  
  // Provide the context value
  const contextValue: MCPContextType = {
    currentQuestion,
    submitAnswer,
    isServerRunning,
    isReplyingToMCP,
    setIsReplyingToMCP,
    currentMCPQuestionId,
    setCurrentMCPQuestionId
  };
  
  return (
    <MCPContext.Provider value={contextValue}>
      {children}
    </MCPContext.Provider>
  );
};
