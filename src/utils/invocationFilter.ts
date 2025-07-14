import { SessionEvent } from '../types';

/**
 * Filters session events to show only the last message per invocation_id
 * Implements SQL equivalent: SELECT * FROM events WHERE timestamp = MAX(timestamp) GROUP BY invocation_id
 * Compatible implementation avoiding Map iteration issues
 * ENHANCED WITH DEBUG LOGGING for session_2c13dc67
 * 🚨 EMERGENCY FIX: PRESERVE ALL USER MESSAGES AND MCP MESSAGES regardless of invocation grouping
 */
export const filterLastMessagePerInvocationCompat = (events: SessionEvent[]): SessionEvent[] => {
  const isDebugMode = events.some(e => e.invocationId?.includes('session_2c13dc67'));
  
  if (isDebugMode) {
    console.log(`\n🎯 INVOCATION FILTER DEBUG - Processing ${events.length} events`);
    console.log(`🚨 EMERGENCY FIX ACTIVE: Preserving ALL user messages AND MCP messages`);
  }
  
  // 🚨 EMERGENCY FIX: Separate user messages AND MCP messages from other events
  const userMessages = events.filter(event => event.author === 'user');
  const mcpMessages = events.filter(event => 
    event.type === 'mcp_question' || 
    event.type === 'mcp_answer' ||
    (event.content && event.content.parts && event.content.parts.some(part => 
      part.text && (part.text.includes('🤖 **Agent Question:**') || part.text.includes('ask_user'))
    ))
  );
  const nonCriticalEvents = events.filter(event => 
    event.author !== 'user' && 
    event.type !== 'mcp_question' && 
    event.type !== 'mcp_answer' &&
    !(event.content && event.content.parts && event.content.parts.some(part => 
      part.text && (part.text.includes('🤖 **Agent Question:**') || part.text.includes('ask_user'))
    ))
  );
  
  if (isDebugMode) {
    console.log(`📊 EVENT SEPARATION:`);
    console.log(`  - User messages (preserved): ${userMessages.length}`);
    console.log(`  - MCP messages (preserved): ${mcpMessages.length}`);
    console.log(`  - Non-critical events (filtered): ${nonCriticalEvents.length}`);
  }
  
  const invocationGroups = new Map<string, SessionEvent[]>();
  
  // Group NON-CRITICAL events by invocation_id only (excluding user and MCP messages)
  for (const event of nonCriticalEvents) {
    const existing = invocationGroups.get(event.invocationId) || [];
    existing.push(event);
    invocationGroups.set(event.invocationId, existing);
    
    if (isDebugMode) {
      console.log(`  📝 Grouped NON-CRITICAL event: invocationId="${event.invocationId}", author="${event.author}", timestamp=${event.timestamp}`);
      console.log(`    - Group size for this invocation: ${existing.length}`);
    }
  }
  
  if (isDebugMode) {
    console.log(`\n📊 INVOCATION GROUPS ANALYSIS (NON-CRITICAL ONLY):`);
    console.log(`  - Total unique invocation IDs: ${invocationGroups.size}`);
    invocationGroups.forEach((groupEvents, invocationId) => {
      console.log(`    🔍 InvocationID "${invocationId}": ${groupEvents.length} events`);
      groupEvents.forEach((event, index) => {
        console.log(`      Event ${index + 1}: author="${event.author}", timestamp=${event.timestamp}, type="${event.type}"`);
      });
    });
  }
  
  const lastMessagePerInvocation: SessionEvent[] = [];
  
  // Get all invocation IDs and process each group (NON-USER ONLY)
  const invocationIds = Array.from(invocationGroups.keys());
  
  if (isDebugMode) {
    console.log(`\n🔄 PROCESSING ${invocationIds.length} NON-CRITICAL INVOCATION GROUPS:`);
  }
  
  for (const invocationId of invocationIds) {
    const groupEvents = invocationGroups.get(invocationId);
    if (!groupEvents || groupEvents.length === 0) {
      if (isDebugMode) {
        console.log(`  ⚠️ Skipping empty group for invocationId: ${invocationId}`);
      }
      continue;
    }
    
    if (isDebugMode) {
      console.log(`\n  🔍 Processing invocationId "${invocationId}" with ${groupEvents.length} events:`);
    }
    
    // Find the event with the maximum timestamp in this group
    const latestEvent = groupEvents.reduce((latest: SessionEvent, current: SessionEvent): SessionEvent => {
      const isCurrentLatest = current.timestamp > latest.timestamp;
      
      if (isDebugMode) {
        console.log(`    📊 Comparing events:`);
        console.log(`      - Current: timestamp=${current.timestamp}, author="${current.author}"`);
        console.log(`      - Latest so far: timestamp=${latest.timestamp}, author="${latest.author}"`);
        console.log(`      - Current is latest: ${isCurrentLatest}`);
      }
      
      return isCurrentLatest ? current : latest;
    });
    
    if (isDebugMode) {
      console.log(`    ✅ Selected latest event: author="${latestEvent.author}", timestamp=${latestEvent.timestamp}`);
      
      if (groupEvents.length > 1) {
        const filteredOutCount = groupEvents.length - 1;
        console.log(`    📉 Filtered out ${filteredOutCount} older events from this invocation`);
      }
    }
    
    lastMessagePerInvocation.push(latestEvent);
  }
  
  // 🚨 EMERGENCY FIX: Combine preserved user messages, MCP messages, and filtered non-critical events
  const finalResults = [...userMessages, ...mcpMessages, ...lastMessagePerInvocation];
  
  if (isDebugMode) {
    console.log(`\n📈 EMERGENCY FIX FILTERING RESULTS:`);
    console.log(`  - Input events: ${events.length}`);
    console.log(`  - User messages preserved: ${userMessages.length}`);
    console.log(`  - MCP messages preserved: ${mcpMessages.length}`);
    console.log(`  - Non-critical events filtered: ${nonCriticalEvents.length} → ${lastMessagePerInvocation.length}`);
    console.log(`  - Final output events: ${finalResults.length}`);
    console.log(`  - Events removed: ${events.length - finalResults.length}`);
    console.log(`  - User messages lost: 0 (EMERGENCY FIX SUCCESSFUL)`);
    console.log(`  - MCP messages lost: 0 (EMERGENCY FIX SUCCESSFUL)`);
  }
  
  // Sort by timestamp (chronological order)
  const sortedResults = finalResults.sort((a, b) => a.timestamp - b.timestamp);
  
  if (isDebugMode) {
    console.log(`\n📋 FINAL FILTERED EVENTS (chronological order):`);
    sortedResults.forEach((event, index) => {
      const isUser = event.author === 'user';
      const isMCP = event.type === 'mcp_question' || event.type === 'mcp_answer' || 
        (event.content && event.content.parts && event.content.parts.some(part => 
          part.text && (part.text.includes('🤖 **Agent Question:**') || part.text.includes('ask_user'))
        ));
      const icon = isUser ? '👤 USER' : isMCP ? '🤖 MCP' : '🤖 AGENT';
      console.log(`  ${index + 1}. ${icon} InvocationID: "${event.invocationId}", Author: "${event.author}", Timestamp: ${event.timestamp}`);
    });
    console.log(`🎯 INVOCATION FILTER COMPLETE WITH EMERGENCY FIX FOR USER AND MCP MESSAGES\n`);
  }
  
  return sortedResults;
};