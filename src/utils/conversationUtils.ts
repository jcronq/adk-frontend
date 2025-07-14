import { /* Agent, */ Conversation, Message, AgentConversations, Session } from '../types'; // Agent type commented out as it's currently unused
import { generateSessionId } from './userUtils';
import { processAgentEvents } from './agentResponseUtils';
import { filterLastMessagePerInvocationCompat } from './invocationFilter';
import { convertAgentEventsToSessionEvents } from './sessionEventUtils';
import apiService from '../services/api';

/**
 * Create a new empty conversation with a fresh session ID or the provided one
 * @param sessionId Optional session ID to use
 * @returns A new empty conversation
 */
export const createEmptyConversation = (sessionId?: string): Conversation => {
  return {
    messages: [],
    sessionId: sessionId || generateSessionId()
  };
};

/**
 * Add a message to a conversation
 * @param conversation Current conversation
 * @param message Message to add
 * @returns Updated conversation with the new message
 */
export const addMessageToConversation = (conversation: Conversation, message: Message): Conversation => {
  return {
    ...conversation,
    messages: [...conversation.messages, message]
  };
};

/**
 * Update conversations state with a new or updated conversation
 * @param conversations Current conversations state
 * @param agentName Agent name to update conversation for
 * @param conversation New conversation state
 * @returns Updated conversations object
 */
export const updateConversation = (
  conversations: AgentConversations,
  agentName: string,
  conversation: Conversation
): AgentConversations => {
  const existingConversations = conversations[agentName] || [];
  
  // If this conversation already exists (by sessionId), replace it
  // Otherwise, add it to the beginning of the array
  const conversationIndex = existingConversations.findIndex(
    (conv: Conversation) => conv.sessionId === conversation.sessionId
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

/**
 * Create a user message object
 * @param content Message content
 * @param isMCPReply Whether this is a reply to an MCP question
 * @param mcpQuestionId ID of the MCP question being replied to
 * @returns Message object with user role
 */
export const createUserMessage = (content: string, isMCPReply: boolean = false, mcpQuestionId: string | null = null): Message => {
  return { 
    role: 'user', 
    content,
    isMCPMessage: isMCPReply,
    mcpQuestionId: mcpQuestionId,
    timestamp: Date.now()
  };
};

/**
 * Create an assistant message object
 * @param content Message content
 * @param isMCPMessage Whether this is an MCP message
 * @param mcpQuestionId ID of the MCP question
 * @returns Message object with assistant role
 */
export const createAssistantMessage = (content: string, isMCPMessage: boolean = false, mcpQuestionId: string | null = null): Message => {
  return { 
    role: 'assistant', 
    content,
    isMCPMessage,
    mcpQuestionId,
    timestamp: Date.now()
  };
};

/**
 * Create an error message from the assistant
 * @param error Error object or string
 * @returns Message object with error content
 */
export const createErrorMessage = (error: unknown): Message => {
  return {
    role: 'assistant',
    content: `Error: Failed to get response from agent. ${error instanceof Error ? error.message : 'Unknown error'}`,
    timestamp: Date.now()
  };
};

/**
 * Extract messages from session events
 * @param session Session object from API
 * @returns Conversation object with messages extracted from session events
 */
/**
 * Convert multiple sessions to a map of conversations
 * @param sessions Array of sessions from API
 * @param agentName Name of the agent these sessions belong to
 * @returns AgentConversations object with conversations by session ID
 */
export const sessionsToConversations = async (sessions: Session[], agentName: string): Promise<AgentConversations> => {
  const conversations: AgentConversations = {};
  
  if (!sessions || sessions.length === 0) {
    conversations[agentName] = [];
    return conversations;
  }
  
  // Convert all sessions to conversations
  const allConversations = await Promise.all(sessions.map(session => {
    const conversation = sessionToConversation(session);
    console.log(`Converted session ${session.id} to conversation for agent ${agentName}`);
    return conversation;
  }));
  
  // Store all conversations for this agent
  conversations[agentName] = await allConversations;
  
  return conversations;
};

/**
 * Extract messages from session events
 * @param session Session object from API
 * @returns Conversation object with messages extracted from session events
 */
export const sessionToConversation = async (session_shell: Session): Promise<Conversation> => {
  const messages: Message[] = [];
  const session = await apiService.getSession(session_shell.appName, session_shell.userId, session_shell.id);
  
  // 🚨 EMERGENCY FIX: Pre-extract user messages and MCP questions to prevent loss during invocation filtering
  const preservedUserMessages: Message[] = [];
  const preservedMCPQuestions: Message[] = [];
  
  // ENHANCED DEBUG LOGGING FOR MESSAGE DISAPPEARANCE INVESTIGATION
  const isDebugSession = session.id === 'session_2c13dc67';
  
  if (isDebugSession) {
    console.log(`\n🚨 ===== ENHANCED DEBUG LOGGING FOR session_2c13dc67 =====`);
    console.log(`📊 STEP 1: Raw Session Analysis`);
    console.log(`  - Session ID: ${session.id}`);
    console.log(`  - Total Events: ${session.events?.length || 0}`);
    console.log(`  - Session Metadata:`, {
      appName: session.appName,
      userId: session.userId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });
    
    if (session.events && session.events.length > 0) {
      console.log(`\n📋 STEP 2: Raw Events Detailed Analysis:`);
      session.events.forEach((event, index) => {
        console.log(`\n  📌 Raw Event ${index + 1}/${session.events?.length || 0}:`);
        console.log(`    - ID: ${event.id}`);
        console.log(`    - Author: "${event.author}"`);
        console.log(`    - InvocationID: "${event.invocationId}"`);
        console.log(`    - Timestamp: ${event.timestamp}`);
        console.log(`    - Has Content: ${!!event.content}`);
        
        if (event.content) {
          console.log(`    - Content Role: "${event.content.role}"`);
          console.log(`    - Content Parts Count: ${event.content.parts?.length || 0}`);
          
          if (event.content.parts) {
            event.content.parts.forEach((part, partIndex) => {
              console.log(`      📄 Part ${partIndex + 1}:`);
              if (part.text) {
                console.log(`        - Text Length: ${part.text.length}`);
                console.log(`        - Text Preview: "${part.text.substring(0, 100)}..."`);
              }
              if (part.functionCall) {
                console.log(`        - Function Call: ${part.functionCall.name}`);
                console.log(`        - Function Args:`, part.functionCall.args);
              }
              if (part.functionResponse) {
                console.log(`        - Function Response: ${part.functionResponse.name}`);
              }
            });
          }
        }
        
        if (event.usageMetadata) {
          console.log(`    - Usage Metadata:`, event.usageMetadata);
        }
      });
    } else {
      console.log(`❌ No events found in session!`);
    }
  }
  
  console.log(`Converting session ${session.id} with ${session.events?.length || 0} events`);
  
  // If session has events, process them to extract messages
  if (session.events && session.events.length > 0) {
    if (isDebugSession) {
      console.log(`\n🔄 STEP 3: Pre-extracting User Messages and MCP Questions (Emergency Fix)`);
    }
    
    // 🚨 EMERGENCY FIX: Extract user messages AND MCP questions BEFORE invocation filtering
    // This ensures both user messages and MCP questions are preserved regardless of invocation grouping issues
    for (const event of session.events) {
      if (event.author === 'user' && event.content) {
        const parts = event.content.parts || [];
        let userMessageContent = '';
        
        for (const part of parts) {
          if (typeof part === 'object' && part !== null && 'text' in part) {
            userMessageContent += part.text;
          } else if (typeof part === 'string') {
            userMessageContent += part;
          }
        }
        
        if (userMessageContent.trim()) {
          const userMessage = {
            role: 'user' as const,
            content: userMessageContent.trim(),
            timestamp: event.timestamp || Date.now()
          };
          preservedUserMessages.push(userMessage);
          
          if (isDebugSession) {
            console.log(`    ✅ PRE-EXTRACTED USER MESSAGE: "${userMessageContent.substring(0, 100)}..."`);
          }
        }
      }
      
      // 🚨 PRE-EXTRACT MCP QUESTIONS: Extract ask_user tool calls BEFORE invocation filtering
      if (event.content?.parts) {
        for (const part of event.content.parts) {
          if (part.functionCall && part.functionCall.name === 'ask_user') {
            const question = part.functionCall.args?.question || part.functionCall.args?.message || 'Question content not found';
            const mcpMessage = {
              role: 'assistant' as const,
              content: question,
              isMCPMessage: true,
              mcpQuestionId: part.functionCall.id || `mcp_${Date.now()}`,
              timestamp: event.timestamp || Date.now()
            };
            
            preservedMCPQuestions.push(mcpMessage);
            
            if (isDebugSession) {
              console.log(`    ❓ PRE-EXTRACTED MCP QUESTION: "${question.substring(0, 100)}..."`);
            }
          }
        }
      }
    }
    
    if (isDebugSession) {
      console.log(`    📊 Pre-extracted ${preservedUserMessages.length} user messages`);
      console.log(`    📊 Pre-extracted ${preservedMCPQuestions.length} MCP questions`);
      console.log(`\n🔄 STEP 4: Converting AgentEvents to SessionEvents`);
    }
    
    // Convert AgentEvents to SessionEvents first, then apply invocation filtering
    const sessionEvents = convertAgentEventsToSessionEvents(session.events, session.id);
    
    if (isDebugSession) {
      console.log(`✅ Conversion Complete: ${session.events.length} AgentEvents → ${sessionEvents.length} SessionEvents`);
      
      if (sessionEvents.length !== session.events.length) {
        console.log(`⚠️  EVENT COUNT MISMATCH! ${session.events.length} input vs ${sessionEvents.length} output`);
      }
      
      console.log(`\n📋 STEP 5: SessionEvents Detailed Analysis:`);
      sessionEvents.forEach((event, index) => {
        console.log(`\n  📌 SessionEvent ${index + 1}/${sessionEvents.length}:`);
        console.log(`    - ID: ${event.id}`);
        console.log(`    - Author: "${event.author}"`);
        console.log(`    - InvocationID: "${event.invocationId}"`);
        console.log(`    - Type: "${event.type}"`);
        console.log(`    - Timestamp: ${event.timestamp}`);
        
        if (event.content?.parts?.length) {
          console.log(`    - Content Parts: ${event.content.parts.length}`);
          event.content.parts.forEach((part, partIndex) => {
            if (part.text) {
              console.log(`      📄 Part ${partIndex + 1}: "${part.text.substring(0, 60)}..."`);
            }
          });
        }
      });
      
      console.log(`\n🎯 STEP 6: Applying Invocation Filtering`);
    }
    
    const filteredEvents = filterLastMessagePerInvocationCompat(sessionEvents);
    
    if (isDebugSession) {
      console.log(`✅ Filtering Complete: ${sessionEvents.length} SessionEvents → ${filteredEvents.length} FilteredEvents`);
      
      if (filteredEvents.length < sessionEvents.length) {
        const removedCount = sessionEvents.length - filteredEvents.length;
        console.log(`📉 ${removedCount} events were filtered out by invocation filtering`);
        
        // Show which invocation IDs were consolidated
        const originalInvocations = new Set(sessionEvents.map(e => e.invocationId));
        const filteredInvocations = new Set(filteredEvents.map(e => e.invocationId));
        console.log(`    Original unique invocations: ${originalInvocations.size}`);
        console.log(`    Filtered unique invocations: ${filteredInvocations.size}`);
      }
      
      console.log(`\n📋 STEP 7: FilteredEvents Final Analysis:`);
      filteredEvents.forEach((event, index) => {
        console.log(`\n  📌 FilteredEvent ${index + 1}/${filteredEvents.length}:`);
        console.log(`    - Author: "${event.author}"`);
        console.log(`    - InvocationID: "${event.invocationId}"`);
        console.log(`    - Type: "${event.type}"`);
        console.log(`    - Timestamp: ${event.timestamp}`);
        console.log(`    - Will be processed for message extraction: ${event.content?.parts?.length > 0}`);
      });
      
      console.log(`\n🔍 STEP 8: Processing FilteredEvents for Message Extraction`);
    }
    
    // Group events by their role/author to reconstruct the conversation flow
    let currentUserMessage = '';
    let processedEventCount = 0;
    let userMessageCount = 0;
    let assistantMessageCount = 0;
    let mcpQuestionCount = 0;
    let skippedEventCount = 0;
    
    // 🚨 EMERGENCY FIX: Add preserved user messages and MCP questions first
    if (preservedUserMessages.length > 0) {
      messages.push(...preservedUserMessages);
      
      if (isDebugSession) {
        console.log(`\n🚨 EMERGENCY FIX: Added ${preservedUserMessages.length} pre-extracted user messages`);
        preservedUserMessages.forEach((msg, index) => {
          console.log(`    User Message ${index + 1}: "${msg.content.substring(0, 100)}..."`);
        });
      }
    }
    
    if (preservedMCPQuestions.length > 0) {
      messages.push(...preservedMCPQuestions);
      
      if (isDebugSession) {
        console.log(`\n🚨 EMERGENCY FIX: Added ${preservedMCPQuestions.length} pre-extracted MCP questions`);
        preservedMCPQuestions.forEach((msg, index) => {
          console.log(`    MCP Question ${index + 1}: "${msg.content.substring(0, 100)}..."`);
        });
      }
    }
    
    for (const event of filteredEvents) {
      processedEventCount++;
      
      if (isDebugSession) {
        console.log(`\n🔍 PROCESSING Event ${processedEventCount}/${filteredEvents.length}:`);
        console.log(`  - Author: "${event.author}"`);
        console.log(`  - Type: "${event.type}"`);
        console.log(`  - InvocationID: "${event.invocationId}"`);
        console.log(`  - Has Content: ${!!event.content}`);
        console.log(`  - Content Parts Count: ${event.content?.parts?.length || 0}`);
      }
      
      // 🚨 SKIP user message processing since they're already pre-extracted
      if (event.author === 'user') {
        if (isDebugSession) {
          console.log(`  ⏭️  SKIPPING user event (already pre-extracted)`);
        }
        continue;
      }
      // Assistant/model messages - INCLUSIVE FILTERING (accept all non-user agents)
      if (event.content) {
        if (isDebugSession) {
          console.log(`  🤖 EVALUATING ASSISTANT MESSAGE from: "${event.author}"`);
        }
        
        // \ud83d\udea8 EMERGENCY FIX: Expanded agent pattern detection to prevent message loss
        // Use inclusive filtering: accept any agent that is NOT a user
        // Enhanced patterns based on debug analysis of session_2c13dc67
        const isNonUserAgent = event.author !== 'user';
        
        // Enhanced final agent detection for better coverage
        const isFinalAgent = event.author === 'response_agent' ||
          event.author === 'assistant' ||
          event.author === 'model' ||
          event.author.includes('response') ||
          event.author.includes('final') ||
          event.author.includes('output') ||
          event.author.includes('summary') ||
          event.author.includes('result') ||
          event.author.includes('answer') ||
          event.author.includes('exec') ||
          event.author.includes('plan') ||
          event.author.endsWith('_agent');
        
        if (isDebugSession) {
          console.log(`    - Is Non-User Agent: ${isNonUserAgent}`);
          console.log(`    - Author: "${event.author}"`);
          console.log(`    - Using inclusive filtering (NOT user) instead of restrictive patterns`);
        }
        
        if (isNonUserAgent) {
          assistantMessageCount++;
          
          if (isDebugSession) {
            console.log(`    ✅ PROCESSING NON-USER AGENT #${assistantMessageCount}: "${event.author}"`);
            console.log(`      - About to call processAgentEvents`);
          }
          
          // Process the single event directly instead of wrapping in array
          const agentMessages = processAgentEvents(event, { messages: [], sessionId: session.id });
          
          if (isDebugSession) {
            console.log(`      - processAgentEvents returned ${agentMessages.length} messages`);
            agentMessages.forEach((msg, msgIndex) => {
              console.log(`        Message ${msgIndex + 1}: role="${msg.role}", content="${msg.content.substring(0, 50)}...", finalAgent="${msg.finalAgent}"`);
            });
          }
          
          const messagesBeforeAdd = messages.length;
          messages.push(...agentMessages);
          
          if (isDebugSession) {
            console.log(`      ✅ ADDED ${agentMessages.length} MESSAGES TO FINAL ARRAY`);
            console.log(`        - Messages before: ${messagesBeforeAdd}`);
            console.log(`        - Messages after: ${messages.length}`);
            console.log(`        - Total messages in array now: ${messages.length}`);
          }
        } else {
          skippedEventCount++;
          if (isDebugSession) {
            console.log(`    ⏭️  SKIPPING USER AGENT #${skippedEventCount}: "${event.author}"`);
          }
        }
      }
      
      // 🚨 SKIP MCP QUESTION PROCESSING: Already pre-extracted to prevent invocation filtering loss
      // MCP questions are now processed before invocation filtering to ensure they're never lost
      if (event.content?.parts) {
        for (const part of event.content.parts) {
          if (part.functionCall && part.functionCall.name === 'ask_user') {
            mcpQuestionCount++;
            
            if (isDebugSession) {
              console.log(`    ⏭️ SKIPPING ASK_USER TOOL CALL #${mcpQuestionCount} (already pre-extracted)`);
            }
          }
        }
      }
      
      if (isDebugSession) {
        console.log(`  📊 Current totals after this event:`);
        console.log(`    - Messages in final array: ${messages.length}`);
        console.log(`    - User messages processed: ${userMessageCount}`);
        console.log(`    - Assistant messages processed: ${assistantMessageCount}`);
        console.log(`    - MCP questions processed: ${mcpQuestionCount}`);
        console.log(`    - Events skipped: ${skippedEventCount}`);
      }
    }
    
    // 🚨 EMERGENCY FIX: Fallback logic when no assistant messages are found
    const assistantMessagesCount = messages.filter(m => m.role === 'assistant').length;
    if (assistantMessagesCount === 0 && filteredEvents.length > 0) {
      if (isDebugSession) {
        console.log(`\n⚠️  FALLBACK TRIGGERED: No assistant messages found, adding fallback response`);
      }
      
      // Find the last non-user event with content
      const lastAgentEvent = filteredEvents
        .filter(e => e.author !== 'user' && e.content?.parts?.length > 0)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
        
      if (lastAgentEvent?.content?.parts?.[0]) {
        let fallbackContent = '';
        const part = lastAgentEvent.content.parts[0];
        
        if (typeof part === 'object' && part !== null && 'text' in part) {
          fallbackContent = part.text || '';
        } else if (typeof part === 'string') {
          fallbackContent = part;
        }
        
        if (fallbackContent.trim()) {
          const fallbackMessage = {
            role: 'assistant' as const,
            content: fallbackContent.trim(),
            finalAgent: lastAgentEvent.author,
            isFallback: true,
            timestamp: lastAgentEvent.timestamp || Date.now()
          };
          
          messages.push(fallbackMessage);
          
          if (isDebugSession) {
            console.log(`    ✅ ADDED FALLBACK MESSAGE from "${lastAgentEvent.author}"`);
            console.log(`      - Content: "${fallbackContent.substring(0, 100)}..."`);
          }
        }
      }
    }
    
    if (isDebugSession) {
      console.log(`\n📊 STEP 9: Message Processing Summary:`);
      console.log(`  - Total events processed: ${processedEventCount}`);
      console.log(`  - User messages found (pre-extracted): ${preservedUserMessages.length}`);
      console.log(`  - MCP questions found (pre-extracted): ${preservedMCPQuestions.length}`);
      console.log(`  - Assistant messages found: ${assistantMessageCount}`);
      console.log(`  - MCP questions in events (skipped): ${mcpQuestionCount}`);
      console.log(`  - Events skipped: ${skippedEventCount}`);
      console.log(`  - Fallback messages added: ${messages.filter(m => m.isFallback).length}`);
      console.log(`  - FINAL MESSAGES ARRAY LENGTH: ${messages.length}`);
    }
  }
  
  if (isDebugSession) {
    console.log(`\n🎯 FINAL RESULT ANALYSIS for session_2c13dc67:`);
    console.log(`  - TOTAL MESSAGES IN FINAL ARRAY: ${messages.length}`);
    
    if (messages.length === 0) {
      console.log(`❌ NO MESSAGES GENERATED! This explains why the conversation appears empty.`);
      console.log(`🔍 DEBUG SUMMARY:`);
      console.log(`  - Raw session events: ${session.events?.length || 0}`);
      console.log(`  - After AgentEvent→SessionEvent conversion: ${session.events ? 'check logs above' : 'N/A'}`);
      console.log(`  - After invocation filtering: check logs above`);
      console.log(`  - Messages extracted: ${messages.length}`);
    } else {
      console.log(`\n📋 FINAL MESSAGES BREAKDOWN:`);
      messages.forEach((msg, index) => {
        console.log(`\n  📌 Final Message ${index + 1}/${messages.length}:`);
        console.log(`    - Role: ${msg.role}`);
        console.log(`    - Content Length: ${msg.content.length}`);
        console.log(`    - Content Preview: "${msg.content.substring(0, 80)}..."`);
        console.log(`    - Is MCP Message: ${msg.isMCPMessage || false}`);
        console.log(`    - MCP Question ID: ${msg.mcpQuestionId || 'N/A'}`);
        console.log(`    - Final Agent: ${msg.finalAgent || 'N/A'}`);
      });
    }
    
    console.log(`\n✅ CONVERSION COMPLETE FOR session_2c13dc67`);
    console.log(`===== END ENHANCED DEBUG LOGGING =====\n`);
  }
  
  console.log(`Session ${session.id} converted to conversation with ${messages.length} messages`);
  
  return {
    sessionId: session.id,
    messages
  };
};
