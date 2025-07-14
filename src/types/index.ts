// Message types
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  mcpQuestionId?: string | null; // ID of the MCP question if this message is from MCP
  isMCPMessage?: boolean; // Flag to identify if this is an MCP message
  internalDialogue?: any[]; // Internal dialogue from multi-agent systems for modal viewing
  finalAgent?: string; // Which agent provided the final response
  invocationId?: string; // Invocation ID for grouping multi-agent conversation sequences
  timestamp?: number; // Timestamp for chronological ordering and MAX() selection
  isFallback?: boolean; // 🚨 EMERGENCY FIX: Flag to identify fallback messages when no final agents found
}

// Agent types
export interface Agent {
  name: string;
  description: string;
  appName?: string;
  module?: string;
  agentVar?: string;
}

// Conversation types
export interface Conversation {
  messages: Message[];
  sessionId: string;
}

// Agent conversations map
export interface AgentConversations {
  [agentName: string]: Conversation[];
}

// MCP Question type
export interface MCPQuestion {
  id: string;
  question: string;
  sessionContext?: {
    agentName: string;
    sessionId: string;
  };
}

// API request types
export interface AgentRunRequest {
  appName: string;
  userId: string;
  sessionId: string;
  newMessage: {
    role: string;
    parts: {
      text: string;
    }[];
  };
  streaming: boolean;
}

// API response types
export interface ContentPart {
  text?: string;
  [key: string]: any;
}

export interface EventContent {
  parts: ContentPart[];
  role?: string;
}

export interface AgentEvent {
  author: string;
  content?: EventContent;
  [key: string]: any;
}

// Session types
export interface Session {
  id: string;
  appName: string;
  userId: string;
  state?: Record<string, any>;
  events?: AgentEvent[];
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string | number; // Add timestamp property for sorting
  lastUpdateTime?: number;
}

export interface SessionsResponse {
  sessions: Session[];
}

// Notification types
export type NotificationStatus = 'pending' | 'displayed' | 'answered';

export interface MCPNotification {
  id: string;
  questionId: string;
  question: string;
  status: NotificationStatus;
  timestamp: number;
  agentName?: string;
  conversationId?: string;
}

export interface NotificationContextType {
  notifications: MCPNotification[];
  unreadCount: number;
  addNotification: (question: MCPQuestion, agentName?: string, conversationId?: string) => void;
  markAsDisplayed: (notificationId: string) => void;
  markAsAnswered: (questionId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  getNotificationByQuestionId: (questionId: string) => MCPNotification | undefined;
}

// Debug view session event types
export interface SessionEvent {
  id: string;
  timestamp: number;
  invocationId: string;
  type: 'user_message' | 'agent_response' | 'tool_call' | 'tool_response' | 'system_event' | 'mcp_question' | 'mcp_answer';
  author: string; // Dynamic agent names like 'user', 'planning_agent', 'critique_agent', etc.
  content: {
    parts: SessionEventContentPart[];
    role?: 'user' | 'model';
  };
  usageMetadata?: {
    candidatesTokenCount?: number;
    candidatesTokensDetails?: Array<{modality: string, tokenCount: number}>;
    promptTokenCount?: number;
    promptTokensDetails?: Array<{modality: string, tokenCount: number}>;
    totalTokenCount?: number;
  };
  actions?: {
    stateDelta?: any;
    artifactDelta?: any;
    requestedAuthConfigs?: any;
  };
  longRunningToolIds?: string[];
  rawEvent?: any; // Store original event for debugging
}

export interface SessionEventContentPart {
  text?: string;
  functionCall?: {
    id: string;
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: {
    id: string;
    name: string;
    response: {
      result: {
        content: Array<{type: string, text: string}>;
        isError: boolean;
      };
    };
  };
}

// Enhanced conversation with session events
export interface ConversationWithEvents extends Conversation {
  sessionEvents: SessionEvent[];
}

// Debug view filter types
export interface DebugViewFilters {
  agentTypes: string[];
  eventTypes: string[];
  searchText: string;
  timeRange?: {
    start: number;
    end: number;
  };
}

export interface DebugViewProps {
  conversation: ConversationWithEvents;
  onFiltersChange: (filters: DebugViewFilters) => void;
}
