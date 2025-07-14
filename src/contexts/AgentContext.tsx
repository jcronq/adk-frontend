import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { v4 as uuidv4 } from 'uuid'; // Commented out as it's currently unused
import { Agent, Conversation, ConversationWithEvents, Message, SessionEvent, DebugViewFilters } from '../types';
import { getUserId, saveUserId, generateSessionId } from '../utils/userUtils';
import apiService from '../services/api';
import websocketService from '../services/websocket';
import { processAgentEvents } from '../utils/agentResponseUtils';
import { 
  createEmptyConversation,
  addMessageToConversation,
  createUserMessage,
  // createAssistantMessage, // Commented out as it's currently unused
  createErrorMessage,
  sessionToConversation
} from '../utils/conversationUtils';
import {
  convertAgentEventsToSessionEvents,
  createUserMessageEvent,
  createMCPAnswerEvent,
  createSystemEvent,
  filterSessionEvents
} from '../utils/sessionEventUtils';

// Enhanced agent conversations map for session events
interface AgentConversationsWithEvents {
  [agentName: string]: ConversationWithEvents[];
}

// Define the context type
interface AgentContextType {
  agents: Agent[];
  currentAgent: string | null;
  currentConversation: ConversationWithEvents | null;
  conversations: AgentConversationsWithEvents;
  userId: string;
  loadingAgents: boolean;
  sendingMessage: boolean;
  setCurrentAgent: (agentName: string | null) => void;
  setCurrentConversation: (agentName: string, sessionId: string) => void;
  startNewConversation: (agentName: string) => void;
  sendMessage: (message: string, isMCPMessage?: boolean, mcpQuestionId?: string | null) => Promise<void>;
  setUserId: (userId: string) => void;
  fetchAgentSessions: (agentName: string) => Promise<ConversationWithEvents | null>;
  // Session event management functions
  addSessionEvent: (event: SessionEvent, agentName: string) => void;
  getSessionEvents: (agentName: string) => SessionEvent[];
  clearSessionEvents: (agentName: string) => void;
  getFilteredSessionEvents: (agentName: string, filters: DebugViewFilters) => SessionEvent[];
  // Session context helper for MCP routing
  getCurrentSessionContext: () => { agentName: string, sessionId: string } | null;
}

// Create the context with a default value
const AgentContext = createContext<AgentContextType | undefined>(undefined);

// Custom hook for using the Agent context
export const useAgent = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};

interface AgentProviderProps {
  children: ReactNode;
}

// Agent Provider component
export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgentState] = useState<string | null>(null);
  const [currentConversation, setCurrentConversationState] = useState<ConversationWithEvents | null>(null);
  const [conversations, setConversations] = useState<AgentConversationsWithEvents>({});
  
  // Initialize userId from localStorage or create a new one if it doesn't exist
  const [userId, setUserIdState] = useState<string>(() => getUserId());
  
  const [loadingAgents, setLoadingAgents] = useState<boolean>(true);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  
  // Function to update userId
  const setUserId = (newUserId: string) => {
    saveUserId(newUserId);
    setUserIdState(newUserId);
  };

  // Helper function to convert Conversation to ConversationWithEvents
  const ensureConversationWithEvents = (conversation: Conversation): ConversationWithEvents => {
    if ('sessionEvents' in conversation) {
      return conversation as ConversationWithEvents;
    }
    return {
      ...conversation,
      sessionEvents: []
    };
  };

  // Helper function to update conversations with ConversationWithEvents
  const updateConversationWithEvents = (
    conversations: AgentConversationsWithEvents,
    agentName: string,
    conversation: ConversationWithEvents
  ): AgentConversationsWithEvents => {
    const existingConversations = conversations[agentName] || [];
    
    // If this conversation already exists (by sessionId), replace it
    // Otherwise, add it to the beginning of the array
    const conversationIndex = existingConversations.findIndex(
      (conv: ConversationWithEvents) => conv.sessionId === conversation.sessionId
    );
    
    let updatedConversations;
    if (conversationIndex >= 0) {
      // Replace existing conversation
      updatedConversations = [...existingConversations];
      updatedConversations[conversationIndex] = conversation;
    } else {
      // Add new conversation at the beginning
      updatedConversations = [conversation, ...existingConversations];
    }
    
    return {
      ...conversations,
      [agentName]: updatedConversations
    };
  };

  // Session event management functions
  const addSessionEvent = (event: SessionEvent, agentName: string) => {
    setConversations((prev: AgentConversationsWithEvents) => {
      const agentConversations = prev[agentName] || [];
      if (agentConversations.length === 0) {
        console.warn(`No conversations found for agent ${agentName} when adding session event`);
        return prev;
      }

      // Add the event to the most recent conversation (first in array)
      const updatedConversations = [...agentConversations];
      const currentConversation = updatedConversations[0];
      
      updatedConversations[0] = {
        ...currentConversation,
        sessionEvents: [...currentConversation.sessionEvents, event]
      };

      return {
        ...prev,
        [agentName]: updatedConversations
      };
    });
  };

  const getSessionEvents = (agentName: string): SessionEvent[] => {
    const agentConversations = conversations[agentName];
    if (!agentConversations || agentConversations.length === 0) {
      return [];
    }
    
    // Return events from the most recent conversation
    return agentConversations[0].sessionEvents || [];
  };

  const clearSessionEvents = (agentName: string) => {
    setConversations((prev: AgentConversationsWithEvents) => {
      const agentConversations = prev[agentName];
      if (!agentConversations || agentConversations.length === 0) {
        return prev;
      }

      const updatedConversations = agentConversations.map(conversation => ({
        ...conversation,
        sessionEvents: []
      }));

      return {
        ...prev,
        [agentName]: updatedConversations
      };
    });
  };

  const getFilteredSessionEvents = (agentName: string, filters: DebugViewFilters): SessionEvent[] => {
    const sessionEvents = getSessionEvents(agentName);
    return filterSessionEvents(sessionEvents, {
      agentTypes: filters.agentTypes,
      eventTypes: filters.eventTypes,
      searchText: filters.searchText,
      timeRange: filters.timeRange
    });
  };

  // Get current session context for MCP routing
  const getCurrentSessionContext = (): { agentName: string, sessionId: string } | null => {
    if (!currentAgent) {
      return null;
    }
    
    const agentConversations = conversations[currentAgent];
    if (!agentConversations || agentConversations.length === 0) {
      return null;
    }
    
    // Use the current conversation if set, otherwise use the most recent one
    const targetConversation = currentConversation || agentConversations[0];
    
    return {
      agentName: currentAgent,
      sessionId: targetConversation.sessionId
    };
  };
  
  // Function to fetch sessions for an agent and convert them to conversations
  const fetchAgentSessions = async (agentName: string) => {
    try {
      const agent = agents.find(a => a.name === agentName);
      if (!agent) {
        console.log(`Agent ${agentName} not found in available agents`);
        return null;
      }
      
      const appName = agent.appName || agent.name;
      console.log(`Fetching sessions for agent ${agentName} (app: ${appName})`);
      
      const sessions = await apiService.listSessions(appName, userId);
      console.log(`Found ${sessions.length} sessions for agent ${agentName}:`, sessions);
      
      if (sessions && sessions.length > 0) {
        // Sort sessions by timestamp if available, otherwise use the last one
        const sortedSessions = [...sessions].sort((a, b) => {
          // If sessions have timestamps, sort by timestamp
          const aTime = a.timestamp || a.updatedAt || a.createdAt || a.lastUpdateTime;
          const bTime = b.timestamp || b.updatedAt || b.createdAt || b.lastUpdateTime;
          
          if (aTime && bTime) {
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          }
          return 0; // Keep original order if no time fields available
        });
        
        // Convert all sessions to conversations with events
        const agentConversations = await Promise.all(sortedSessions.map(async (session) => {
          // Fetch the full session data with events
          console.log(`[DEBUG] Fetching full session: ${session.id}`);
          const fullSession = await apiService.getSession(appName, userId, session.id);
          console.log(`[DEBUG] Session ${session.id} loaded with ${fullSession.events?.length || 0} events`);
          
          const conversation = await sessionToConversation(fullSession);
          const conversationWithEvents = ensureConversationWithEvents(conversation);
          
          // Convert session events to session events if they exist
          if (fullSession.events && fullSession.events.length > 0) {
            console.log(`Converting ${fullSession.events.length} events for session ${fullSession.id}`);
            const sessionEvents = convertAgentEventsToSessionEvents(fullSession.events, fullSession.id);
            conversationWithEvents.sessionEvents = sessionEvents;
            console.log(`✅ Created ${sessionEvents.length} session events for ${fullSession.id}`);
          } else {
            console.log(`⚠️ No events to convert for session ${fullSession.id}`);
          }
          
          return conversationWithEvents;
        }));
        
        // Update conversations state with all sessions
        setConversations((prev: AgentConversationsWithEvents) => {
          const newConversations = {
            ...prev,
            [agentName]: agentConversations
          };
          console.log(`Updated conversations state with ${agentConversations.length} conversations for ${agentName}:`, newConversations);
          return newConversations;
        });
        
        // Return the most recent conversation for current use
        return agentConversations[0];
      } else {
        console.log(`No sessions found for agent ${agentName}`);
      }
    } catch (error) {
      console.error(`Error fetching sessions for agent ${agentName}:`, error);
    }
    
    return null;
  };
  
  // Function to set the current conversation
  const setCurrentConversation = (agentName: string, sessionId: string) => {
    console.log(`Setting current conversation: agent=${agentName}, session=${sessionId}`);
    
    // Find the conversation
    const agentConversations = conversations[agentName];
    if (agentConversations) {
      const conversation = agentConversations.find(conv => conv.sessionId === sessionId);
      if (conversation) {
        setCurrentAgentState(agentName);
        setCurrentConversationState(conversation);
        console.log(`[AgentContext] Successfully set current conversation: ${conversation.sessionId} (${conversation.sessionEvents?.length || 0} events)`);
        if (conversation.sessionEvents && conversation.sessionEvents.length > 0) {
          console.log(`[AgentContext] ✅ Conversation has ${conversation.sessionEvents.length} session events`);
        } else {
          console.log(`[AgentContext] ⚠️ Conversation has no session events`);
        }
      } else {
        console.error(`Conversation with session ${sessionId} not found for agent ${agentName}`);
      }
    } else {
      console.error(`No conversations found for agent ${agentName}`);
    }
  };

  // Function to set the current agent (without auto-selecting conversation)
  const setCurrentAgent = async (agentName: string | null) => {
    console.log(`Setting current agent to: ${agentName}`);
    setCurrentAgentState(agentName);
    
    // Clear current conversation when changing agents
    if (agentName !== currentAgent) {
      setCurrentConversationState(null);
    }
    
    if (agentName) {
      // Check if we already have a conversation for this agent
      const existingConversation = conversations[agentName];
      console.log(`Existing conversation for ${agentName}:`, existingConversation ? 'Found' : 'Not found');
      
      if (!existingConversation) {
        console.log(`No existing conversation for ${agentName}, fetching sessions...`);
        // If no existing conversation, try to fetch sessions from the server
        const conversation = await fetchAgentSessions(agentName);
        console.log(`Fetch sessions result:`, conversation ? 'Conversation loaded' : 'No sessions found');
        
        // If no sessions found, we'll create a new conversation when the user sends a message
      }
    }
  };
  
  // Function to load conversations for all agents
  const loadAllConversations = async (agents: Agent[]) => {
    console.log('Loading conversations for all agents on startup...');
    for (const agent of agents) {
      try {
        const appName = agent.appName || agent.name;
        console.log(`Fetching sessions for agent ${agent.name} (app: ${appName})`);
        
        const sessions = await apiService.listSessions(appName, userId);
        console.log(`Found ${sessions.length} sessions for agent ${agent.name}:`, sessions);
        
        if (sessions && sessions.length > 0) {
          // Sort sessions by timestamp if available, otherwise use the last one
          const sortedSessions = [...sessions].sort((a, b) => {
            // If sessions have timestamps, sort by timestamp
            const aTime = a.timestamp || a.updatedAt || a.createdAt || a.lastUpdateTime;
            const bTime = b.timestamp || b.updatedAt || b.createdAt || b.lastUpdateTime;
            
            if (aTime && bTime) {
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            }
            return 0; // Keep original order if no time fields available
          });
          
          // Convert all sessions to conversations with events
          const agentConversations = await Promise.all(sortedSessions.map(async (session) => {
            // Fetch the full session data with events (same as fetchAgentSessions)
            console.log(`[DEBUG] Fetching full session: ${session.id}`);
            const fullSession = await apiService.getSession(appName, userId, session.id);
            console.log(`[DEBUG] Session ${session.id} loaded with ${fullSession.events?.length || 0} events`);
            
            const conversation = await sessionToConversation(fullSession);
            const conversationWithEvents = ensureConversationWithEvents(conversation);
            
            // Convert session events to session events if they exist
            if (fullSession.events && fullSession.events.length > 0) {
              console.log(`Converting ${fullSession.events.length} events for session ${fullSession.id}`);
              const sessionEvents = convertAgentEventsToSessionEvents(fullSession.events, fullSession.id);
              conversationWithEvents.sessionEvents = sessionEvents;
              console.log(`✅ Created ${sessionEvents.length} session events for ${fullSession.id}`);
            } else {
              console.log(`⚠️ No events to convert for session ${fullSession.id}`);
            }
            
            console.log(`Converted session ${session.id} to conversation with events:`, conversationWithEvents);
            return conversationWithEvents;
          }));
          
          // Update conversations state with all sessions
          setConversations((prev: AgentConversationsWithEvents) => {
            const newConversations = {
              ...prev,
              [agent.name]: agentConversations
            };
            console.log(`Updated conversations state with ${agentConversations.length} conversations for ${agent.name}:`, newConversations);
            return newConversations;
          });
        } else {
          console.log(`No sessions found for agent ${agent.name}`);
        }
      } catch (error) {
        console.error(`Error loading conversations for ${agent.name} on startup:`, error);
      }
    }
    console.log('Finished loading conversations for all agents');
  };

  // Load available agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const availableAgents = await apiService.getAvailableAgents();
        setAgents(availableAgents);
        
        // Create system event for successful agent loading
        const agentLoadEvent = createSystemEvent(
          `Successfully loaded ${availableAgents.length} agents: ${availableAgents.map(a => a.name).join(', ')}`,
          { agentCount: availableAgents.length, agentNames: availableAgents.map(a => a.name) }
        );
        console.log('Agent load event created:', agentLoadEvent);
        
        // Load conversations for all agents on startup
        await loadAllConversations(availableAgents);
      } catch (error) {
        console.error('Error loading agents:', error);
        
        // Create system event for agent loading error
        const agentLoadErrorEvent = createSystemEvent(
          `Failed to load agents: ${error instanceof Error ? error.message : String(error)}`,
          { error, type: 'agent_load_error' }
        );
        console.log('Agent load error event created:', agentLoadErrorEvent);
      } finally {
        setLoadingAgents(false);
      }
    };
    
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update current conversation when conversations change
  useEffect(() => {
    if (currentConversation && currentAgent) {
      const agentConversations = conversations[currentAgent];
      if (agentConversations) {
        const updatedConversation = agentConversations.find(
          conv => conv.sessionId === currentConversation.sessionId
        );
        if (updatedConversation && updatedConversation !== currentConversation) {
          console.log(`Updating current conversation with latest messages`);
          setCurrentConversationState(updatedConversation);
        }
      }
    }
  }, [conversations, currentAgent, currentConversation]);
  
  // Start a new conversation with an agent
  const startNewConversation = async (agentName: string) => {
    const sessionId = generateSessionId();
    
    // First create the session on the server
    try {
      const agent = agents.find(a => a.name === agentName);
      if (!agent) return;
      
      const appName = agent.appName || agent.name;
      const sessionCreated = await apiService.createSession(appName, userId, sessionId);
      
      if (sessionCreated) {
        console.log(`Session ${sessionId} created successfully for agent ${agentName}`);
        
        // Create a new empty conversation with events
        const newConversation = ensureConversationWithEvents(createEmptyConversation(sessionId));
        
        // Add system event for session creation
        const sessionCreateEvent = createSystemEvent(
          `New session created for agent ${agentName}`,
          { agentName, sessionId, type: 'session_created' }
        );
        newConversation.sessionEvents = [sessionCreateEvent];
        
        // Update local state with the new conversation at the beginning of the array
        setConversations((prev: AgentConversationsWithEvents) => {
          const existingConversations = prev[agentName] || [];
          
          return {
            ...prev,
            [agentName]: [newConversation, ...existingConversations]
          };
        });
        
        // Set this as the current conversation
        setCurrentAgentState(agentName);
        setCurrentConversationState(newConversation);
      } else {
        console.error(`Failed to create session for agent ${agentName}`);
      }
    } catch (error) {
      console.error('Error in startNewConversation:', error);
    }
  };
  
  // Note: processAgentEvents has been moved to utils/agentResponseUtils.ts
  
  // Send a message to the current agent
  const sendMessage = async (message: string, isMCPMessage: boolean = false, mcpQuestionId: string | null = null) => {
    if (!currentAgent) return;
    
    const agent = agents.find(a => a.name === currentAgent);
    if (!agent) return;
    
    setSendingMessage(true);
    
    const agentConversations = conversations[currentAgent] || [];
    const appName = agent.appName || agent.name;
    
    // Get the most recent conversation or create a new one
    let currentConversation: ConversationWithEvents;
    
    // If no conversations exist, we need to create a new session first
    if (agentConversations.length === 0) {
      console.log(`No existing conversation for ${currentAgent}, creating new session`);
      const sessionId = generateSessionId();
      
      // Create the session on the server
      try {
        const sessionCreated = await apiService.createSession(appName, userId, sessionId);
        if (sessionCreated) {
          console.log(`Session ${sessionId} created successfully for agent ${currentAgent}`);
          currentConversation = ensureConversationWithEvents(createEmptyConversation(sessionId));
          
          // Add system event for session creation
          const sessionCreateEvent = createSystemEvent(
            `New session created for agent ${currentAgent}`,
            { agentName: currentAgent, sessionId, type: 'session_created' }
          );
          currentConversation.sessionEvents = [sessionCreateEvent];
        } else {
          console.error(`Failed to create session for agent ${currentAgent}`);
          // Create system event for session creation failure
          const sessionFailEvent = createSystemEvent(
            `Failed to create session for agent ${currentAgent}`,
            { agentName: currentAgent, sessionId, type: 'session_creation_failed' }
          );
          console.log('Session creation failed event:', sessionFailEvent);
          return;
        }
      } catch (error) {
        console.error('Error creating session:', error);
        // Create system event for session creation error
        const sessionErrorEvent = createSystemEvent(
          `Error creating session for agent ${currentAgent}: ${error instanceof Error ? error.message : String(error)}`,
          { agentName: currentAgent, sessionId, error, type: 'session_creation_error' }
        );
        console.log('Session creation error event:', sessionErrorEvent);
        return;
      }
    } else {
      // Use the most recent conversation
      currentConversation = agentConversations[0];
    }
    
    // Add user message to conversation
    const userMessage = createUserMessage(message, isMCPMessage, mcpQuestionId);
    const updatedConversation = addMessageToConversation(currentConversation, userMessage) as ConversationWithEvents;
    
    // Create and add user message session event
    const userMessageEvent = createUserMessageEvent(message, updatedConversation.sessionId);
    updatedConversation.sessionEvents = [...(updatedConversation.sessionEvents || []), userMessageEvent];
    
    // If this is an MCP answer, create an MCP answer event
    if (isMCPMessage && mcpQuestionId) {
      const mcpAnswerEvent = createMCPAnswerEvent(mcpQuestionId, message);
      updatedConversation.sessionEvents = [...updatedConversation.sessionEvents, mcpAnswerEvent];
    }
    
    // Update conversations state with the user message
    setConversations((prev: AgentConversationsWithEvents) => {
      const existingConversations = prev[currentAgent] || [];
      
      // Replace the first conversation with the updated one, or add it if none exists
      const updatedConversations = existingConversations.length > 0 
        ? [updatedConversation, ...existingConversations.slice(1)]
        : [updatedConversation];
      
      return {
        ...prev,
        [currentAgent]: updatedConversations
      };
    });
    
    // Send message to agent
    try {
      // Set active session context for proper MCP question routing
      websocketService.setActiveSessionContext({
        agentName: currentAgent,
        sessionId: updatedConversation.sessionId
      });
      
      const request = {
        appName,
        userId,
        sessionId: updatedConversation.sessionId,
        newMessage: {
          role: 'user',
          parts: [{ text: message }]
        },
        streaming: false
      };
      
      const events = await apiService.sendMessageToAgent(request);
      
      // Process agent response
      const agentMessages = processAgentEvents(events, updatedConversation);
      
      // Convert agent events to session events and add them
      const agentSessionEvents = convertAgentEventsToSessionEvents(events, updatedConversation.sessionId);
      
      // Update conversation with agent response by adding all agent messages
      let finalConversation = agentMessages.reduce(
        (conv: ConversationWithEvents, msg: Message) => addMessageToConversation(conv, msg) as ConversationWithEvents,
        updatedConversation
      );
      
      // Add agent session events to the conversation
      finalConversation.sessionEvents = [...finalConversation.sessionEvents, ...agentSessionEvents];
      
      // Update conversations state with the agent response
      setConversations((prev: AgentConversationsWithEvents) => updateConversationWithEvents(prev, currentAgent, finalConversation));
      
      // Clear session context after processing is complete
      websocketService.clearActiveSessionContext();
    } catch (error) {
      // Clear session context on error as well
      websocketService.clearActiveSessionContext();
      console.error('Error sending message:', error);
      
      // Add error message to conversation
      const errorMessage = createErrorMessage(error);
      let errorConversation = addMessageToConversation(updatedConversation, errorMessage) as ConversationWithEvents;
      
      // Create system event for the error
      const errorEvent = createSystemEvent(
        `Error sending message: ${error instanceof Error ? error.message : String(error)}`,
        { error, type: 'send_message_error' }
      );
      errorConversation.sessionEvents = [...errorConversation.sessionEvents, errorEvent];
      
      // Update conversations state with the error message
      setConversations((prev: AgentConversationsWithEvents) => updateConversationWithEvents(prev, currentAgent, errorConversation));
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Provide the context value
  const contextValue: AgentContextType = {
    agents,
    currentAgent,
    currentConversation,
    conversations,
    userId,
    loadingAgents,
    sendingMessage,
    setCurrentAgent,
    setCurrentConversation,
    startNewConversation,
    sendMessage,
    setUserId,
    fetchAgentSessions,
    addSessionEvent,
    getSessionEvents,
    clearSessionEvents,
    getFilteredSessionEvents,
    getCurrentSessionContext
  };
  
  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};
