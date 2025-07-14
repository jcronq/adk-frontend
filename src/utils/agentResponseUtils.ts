import { AgentEvent, Conversation, Message } from '../types';

/**
 * Extracts text content from a content part
 * @param part Content part which could be an object with text or a string
 * @returns Extracted text string
 */
const extractTextFromPart = (part: any): string => {
  if (typeof part === 'object' && part !== null && 'text' in part) {
    return part.text;
  } else if (typeof part === 'string') {
    return part;
  }
  return '';
};

/**
 * Extracts text content from an array of content parts
 * @param contentParts Array of content parts
 * @returns Combined text from all parts
 */
const extractTextFromParts = (contentParts: any[]): string => {
  if (!Array.isArray(contentParts)) return '';
  
  return contentParts.reduce((text, part) => {
    return text + extractTextFromPart(part);
  }, '');
};

/**
 * Processes a non-array response object to extract message content
 * @param eventObj Response object that is not in array format
 * @returns Extracted content string
 */
const processNonArrayEvent = (eventObj: Record<string, any>): string => {
  let content = '';
  
  if ('text' in eventObj && typeof eventObj.text === 'string') {
    content = eventObj.text;
  } else if ('content' in eventObj) {
    if (typeof eventObj.content === 'string') {
      content = eventObj.content;
    } else if (eventObj.content && typeof eventObj.content === 'object' && 'parts' in eventObj.content) {
      content = extractTextFromParts(eventObj.content.parts);
    }
  } else if ('message' in eventObj) {
    content = typeof eventObj.message === 'string' ? eventObj.message : JSON.stringify(eventObj.message);
  }
  
  return content;
};

/**
 * Process agent response events and convert them to message format
 * @param events Agent events from API response
 * @param conversation Current conversation
 * @returns Array of messages extracted from events
 */
export const processAgentEvents = (events: AgentEvent[] | any, conversation: Conversation): Message[] => {
  const newMessages: Message[] = [];
  console.log('Processing agent events:', JSON.stringify(events, null, 2));
  
  // Handle case where events is not an array but a direct response object
  if (!Array.isArray(events)) {
    console.log('Events is not an array, treating as single event');
    let content = '';
    
    if (typeof events === 'object' && events !== null) {
      content = processNonArrayEvent(events as Record<string, any>);
    } else if (typeof events === 'string') {
      content = events;
    }
    
    if (content) {
      newMessages.push({
        role: 'assistant',
        content: content,
        finalAgent: events.author || 'unknown_agent',
        timestamp: events.timestamp || Date.now()
      });
      return newMessages;
    }
    
    // If we couldn't extract content, return a default message
    newMessages.push({
      role: 'assistant',
      content: 'Received a response but could not parse it correctly.',
      finalAgent: events.author || 'unknown_agent',
      timestamp: events.timestamp || Date.now()
    });
    return newMessages;
  }
  
  // Handle multi-agent system responses
  console.log(`Processing ${events.length} agent events`);
  
  // Store the full internal dialogue for modal viewing
  const internalDialogue = events.map((event: any) => ({
    agent: event.author,
    content: event.content?.parts?.[0]?.text || 'No content',
    timestamp: event.timestamp,
    id: event.id,
    invocationId: event.invocationId,
    usageMetadata: event.usageMetadata
  }));
  
  // Process each agent event that has meaningful content
  for (const event of events) {
    let agentContent = '';
    let agentName = event.author;
    
    // Extract content from the event
    if (event.content?.parts?.[0]?.text) {
      agentContent = event.content.parts[0].text.trim();
    }
    
    // Skip events without meaningful content
    if (!agentContent) {
      console.log(`Skipping event from ${agentName} - no content`);
      continue;
    }
    
    console.log(`Processing event with author: ${agentName}`);
    
    // Format the message with agent identification
    let formattedContent = agentContent;
    
    // Add agent identification for multi-agent systems
    if (agentName && agentName !== 'assistant' && agentName !== 'model') {
      formattedContent = `**${agentName}:** ${agentContent}`;
    }
    
    // Create a message for this agent
    newMessages.push({
      role: 'assistant',
      content: formattedContent,
      // Store internal dialogue as metadata for modal access
      internalDialogue: internalDialogue,
      finalAgent: agentName,
      timestamp: event.timestamp || Date.now()
    });
    
    console.log(`Created message from ${agentName}`);
  }
  
  // Also handle legacy formats for backward compatibility
  if (newMessages.length === 0) {
    for (const event of events) {
      if ((event.author === 'root_agent' || event.author === 'model' || event.author === 'assistant') && event.content?.parts) {
        const agentResponse = extractTextFromParts(event.content.parts);
        if (agentResponse.trim()) {
          newMessages.push({
            role: 'assistant',
            content: agentResponse,
            internalDialogue: internalDialogue,
            finalAgent: event.author,
            timestamp: event.timestamp || Date.now()
          });
          console.log(`Using legacy format from: ${event.author}`);
          break;
        }
      }
    }
  }
  
  // If no response was generated, add a default message
  if (newMessages.length === 0) {
    newMessages.push({
      role: 'assistant',
      content: 'I received your message but didn\'t generate a response. Please try again.'
    });
  }
  
  return newMessages;
};
