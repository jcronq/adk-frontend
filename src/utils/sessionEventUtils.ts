import { SessionEvent, AgentEvent, MCPQuestion } from '../types';

/**
 * Converts agent events from API response to SessionEvent format
 * Works with any agent system - dynamically handles agent names and types
 * ENHANCED WITH DEBUG LOGGING for session_2c13dc67
 */
export const convertAgentEventsToSessionEvents = (
  events: AgentEvent[],
  invocationId: string
): SessionEvent[] => {
  const isDebugMode = invocationId === 'session_2c13dc67';
  
  if (isDebugMode) {
    console.log(`\n🔄 AGENT→SESSION EVENT CONVERSION DEBUG`);
    console.log(`  - Input: ${events.length} AgentEvents`);
    console.log(`  - Target invocationId: "${invocationId}"`);
  }
  
  const sessionEvents: SessionEvent[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    if (isDebugMode) {
      console.log(`\n  📌 Converting AgentEvent ${i + 1}/${events.length}:`);
      console.log(`    - ID: ${event.id}`);
      console.log(`    - Author: "${event.author}"`);
      console.log(`    - Original InvocationID: "${event.invocationId}"`);
      console.log(`    - Timestamp: ${event.timestamp}`);
      console.log(`    - Has Content: ${!!event.content}`);
      console.log(`    - Content Parts Count: ${event.content?.parts?.length || 0}`);
    }
    
    // Determine event type based on content and structure
    let eventType: SessionEvent['type'] = 'agent_response';
    
    // Check for tool calls in the content parts
    const hasToolCall = event.content?.parts?.some(part => part.functionCall);
    const hasToolResponse = event.content?.parts?.some(part => part.functionResponse);
    
    if (hasToolCall) {
      eventType = 'tool_call';
    } else if (hasToolResponse) {
      eventType = 'tool_response';
    } else if (event.author === 'user') {
      eventType = 'user_message';
    }
    
    if (isDebugMode) {
      console.log(`    - Event Type Analysis:`);
      console.log(`      - Has tool call: ${hasToolCall}`);
      console.log(`      - Has tool response: ${hasToolResponse}`);
      console.log(`      - Is user: ${event.author === 'user'}`);
      console.log(`      - Final event type: "${eventType}"`);
    }

    const sessionEvent: SessionEvent = {
      id: event.id || generateEventId(),
      timestamp: event.timestamp || Date.now() / 1000,
      invocationId: event.invocationId || invocationId,
      type: eventType,
      author: event.author || 'unknown',
      content: {
        parts: event.content?.parts?.map(part => ({
          text: part.text,
          functionCall: part.functionCall,
          functionResponse: part.functionResponse
        })) || [],
        role: event.content?.role as 'user' | 'model' | undefined
      },
      usageMetadata: event.usageMetadata,
      actions: event.actions,
      longRunningToolIds: event.longRunningToolIds,
      rawEvent: event
    };
    
    if (isDebugMode) {
      console.log(`    ✅ Created SessionEvent:`);
      console.log(`      - ID: ${sessionEvent.id}`);
      console.log(`      - Author: "${sessionEvent.author}"`);
      console.log(`      - InvocationID: "${sessionEvent.invocationId}"`);
      console.log(`      - Type: "${sessionEvent.type}"`);
      console.log(`      - Timestamp: ${sessionEvent.timestamp}`);
      console.log(`      - Content parts: ${sessionEvent.content.parts.length}`);
      
      if (sessionEvent.content.parts.length > 0) {
        sessionEvent.content.parts.forEach((part, partIndex) => {
          console.log(`        Part ${partIndex + 1}:`);
          if (part.text) {
            console.log(`          - Text: "${part.text.substring(0, 60)}..."`);
          }
          if (part.functionCall) {
            console.log(`          - Function Call: ${part.functionCall.name}`);
          }
          if (part.functionResponse) {
            console.log(`          - Function Response: ${part.functionResponse.name}`);
          }
        });
      }
    }

    sessionEvents.push(sessionEvent);
  }
  
  if (isDebugMode) {
    console.log(`\n✅ CONVERSION COMPLETE:`);
    console.log(`  - Input AgentEvents: ${events.length}`);
    console.log(`  - Output SessionEvents: ${sessionEvents.length}`);
    console.log(`  - Conversion ratio: ${sessionEvents.length === events.length ? 'Perfect 1:1' : 'MISMATCH!'}`);
    console.log(`🔄 AGENT→SESSION CONVERSION DONE\n`);
  }

  return sessionEvents;
};

/**
 * Creates a session event for user messages
 */
export const createUserMessageEvent = (
  message: string,
  sessionId: string,
  timestamp?: number
): SessionEvent => {
  return {
    id: generateEventId(),
    timestamp: timestamp || Date.now() / 1000,
    invocationId: generateInvocationId(),
    type: 'user_message',
    author: 'user',
    content: {
      parts: [{ text: message }],
      role: 'user'
    },
    rawEvent: { message, sessionId, timestamp }
  };
};

/**
 * Creates a session event for MCP questions
 */
export const createMCPQuestionEvent = (
  question: MCPQuestion,
  timestamp?: number
): SessionEvent => {
  return {
    id: generateEventId(),
    timestamp: timestamp || Date.now() / 1000,
    invocationId: generateInvocationId(),
    type: 'mcp_question',
    author: 'system',
    content: {
      parts: [{ text: question.question }],
      role: 'model'
    },
    rawEvent: { question, type: 'mcp_question' }
  };
};

/**
 * Creates a session event for MCP answers
 */
export const createMCPAnswerEvent = (
  questionId: string,
  answer: string,
  timestamp?: number
): SessionEvent => {
  return {
    id: generateEventId(),
    timestamp: timestamp || Date.now() / 1000,
    invocationId: generateInvocationId(),
    type: 'mcp_answer',
    author: 'user',
    content: {
      parts: [{ text: answer }],
      role: 'user'
    },
    rawEvent: { questionId, answer, type: 'mcp_answer' }
  };
};

/**
 * Creates a system event (connections, errors, etc.)
 */
export const createSystemEvent = (
  message: string,
  eventData?: any,
  timestamp?: number
): SessionEvent => {
  return {
    id: generateEventId(),
    timestamp: timestamp || Date.now() / 1000,
    invocationId: generateInvocationId(),
    type: 'system_event',
    author: 'system',
    content: {
      parts: [{ text: message }],
      role: 'model'
    },
    rawEvent: { message, eventData, type: 'system_event' }
  };
};

/**
 * Filters session events based on criteria
 */
export const filterSessionEvents = (
  events: SessionEvent[],
  filters: {
    agentTypes?: string[];
    eventTypes?: string[];
    searchText?: string;
    timeRange?: { start: number; end: number };
  }
): SessionEvent[] => {
  return events.filter(event => {
    // Filter by agent types
    if (filters.agentTypes && filters.agentTypes.length > 0) {
      if (!filters.agentTypes.includes(event.author)) {
        return false;
      }
    }

    // Filter by event types
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      if (!filters.eventTypes.includes(event.type)) {
        return false;
      }
    }

    // Filter by search text
    if (filters.searchText && filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      const eventText = event.content.parts
        .map(part => part.text || '')
        .join(' ')
        .toLowerCase();
      
      const agentName = event.author.toLowerCase();
      const eventType = event.type.toLowerCase();
      
      if (!eventText.includes(searchLower) && 
          !agentName.includes(searchLower) && 
          !eventType.includes(searchLower)) {
        return false;
      }
    }

    // Filter by time range
    if (filters.timeRange) {
      if (event.timestamp < filters.timeRange.start || 
          event.timestamp > filters.timeRange.end) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Gets unique agent types from session events
 */
export const getUniqueAgentTypes = (events: SessionEvent[]): string[] => {
  const agentTypes = new Set<string>();
  events.forEach(event => agentTypes.add(event.author));
  return Array.from(agentTypes).sort();
};

/**
 * Gets unique event types from session events
 */
export const getUniqueEventTypes = (events: SessionEvent[]): string[] => {
  const eventTypes = new Set<string>();
  events.forEach(event => eventTypes.add(event.type));
  return Array.from(eventTypes).sort();
};

/**
 * Formats timestamp for display
 */
export const formatEventTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
};

/**
 * Extracts tool calls from an event
 */
export const extractToolCalls = (event: SessionEvent): Array<{
  id: string;
  name: string;
  args: Record<string, any>;
}> => {
  const toolCalls: Array<{
    id: string;
    name: string;
    args: Record<string, any>;
  }> = [];

  event.content.parts.forEach(part => {
    if (part.functionCall) {
      toolCalls.push({
        id: part.functionCall.id,
        name: part.functionCall.name,
        args: part.functionCall.args
      });
    }
  });

  return toolCalls;
};

/**
 * Extracts tool responses from an event
 */
export const extractToolResponses = (event: SessionEvent): Array<{
  id: string;
  name: string;
  response: any;
}> => {
  const toolResponses: Array<{
    id: string;
    name: string;
    response: any;
  }> = [];

  event.content.parts.forEach(part => {
    if (part.functionResponse) {
      toolResponses.push({
        id: part.functionResponse.id,
        name: part.functionResponse.name,
        response: part.functionResponse.response
      });
    }
  });

  return toolResponses;
};

/**
 * Calculates token usage statistics for events
 */
export const calculateTokenStats = (events: SessionEvent[]): {
  totalTokens: number;
  promptTokens: number;
  candidateTokens: number;
  eventCount: number;
} => {
  let totalTokens = 0;
  let promptTokens = 0;
  let candidateTokens = 0;
  let eventCount = 0;

  events.forEach(event => {
    if (event.usageMetadata) {
      totalTokens += event.usageMetadata.totalTokenCount || 0;
      promptTokens += event.usageMetadata.promptTokenCount || 0;
      candidateTokens += event.usageMetadata.candidatesTokenCount || 0;
      eventCount++;
    }
  });

  return {
    totalTokens,
    promptTokens,
    candidateTokens,
    eventCount
  };
};

// Helper functions
function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateInvocationId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}