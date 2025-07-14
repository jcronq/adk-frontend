/**
 * Example usage of the DebugView component system
 * 
 * This file demonstrates how to integrate the DebugView component
 * into your React application for debugging multi-agent conversations.
 */

import React, { useState, useCallback } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import DebugView from '../DebugView';
import { ConversationWithEvents, SessionEvent } from '../../types';

// Example session events data
const generateExampleEvents = (): SessionEvent[] => {
  const baseTime = Date.now();
  
  return [
    {
      id: 'event-1',
      timestamp: baseTime,
      invocationId: 'inv-12345',
      type: 'user_message',
      author: 'user',
      content: {
        parts: [{ text: 'Can you help me write a function to calculate fibonacci numbers?' }],
        role: 'user',
      },
    },
    {
      id: 'event-2',
      timestamp: baseTime + 1000,
      invocationId: 'inv-12346',
      type: 'agent_response',
      author: 'planning_agent',
      content: {
        parts: [{ text: 'I\'ll help you create a fibonacci function. Let me start by writing a simple recursive implementation.' }],
        role: 'model',
      },
      usageMetadata: {
        promptTokenCount: 25,
        candidatesTokenCount: 30,
        totalTokenCount: 55,
      },
    },
    {
      id: 'event-3',
      timestamp: baseTime + 2000,
      invocationId: 'inv-12347',
      type: 'tool_call',
      author: 'coding_agent',
      content: {
        parts: [{
          functionCall: {
            id: 'func-1',
            name: 'write_code',
            args: {
              language: 'python',
              code: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
              description: 'Recursive fibonacci implementation'
            },
          },
        }],
      },
    },
    {
      id: 'event-4',
      timestamp: baseTime + 3000,
      invocationId: 'inv-12348',
      type: 'tool_response',
      author: 'coding_agent',
      content: {
        parts: [{
          functionResponse: {
            id: 'func-1',
            name: 'write_code',
            response: {
              result: {
                content: [{ type: 'text', text: 'Code written successfully to fibonacci.py' }],
                isError: false,
              },
            },
          },
        }],
      },
    },
    {
      id: 'event-5',
      timestamp: baseTime + 4000,
      invocationId: 'inv-12349',
      type: 'agent_response',
      author: 'critique_agent',
      content: {
        parts: [{ 
          text: 'The recursive implementation works but has exponential time complexity. For better performance, consider using dynamic programming or memoization.' 
        }],
        role: 'model',
      },
      usageMetadata: {
        promptTokenCount: 45,
        candidatesTokenCount: 35,
        totalTokenCount: 80,
      },
    },
    {
      id: 'event-6',
      timestamp: baseTime + 5000,
      invocationId: 'inv-12350',
      type: 'mcp_question',
      author: 'system',
      content: {
        parts: [{ text: 'Should I optimize the fibonacci function for better performance?' }],
      },
    },
    {
      id: 'event-7',
      timestamp: baseTime + 6000,
      invocationId: 'inv-12351',
      type: 'mcp_answer',
      author: 'user',
      content: {
        parts: [{ text: 'Yes, please optimize it using dynamic programming.' }],
        role: 'user',
      },
    },
    {
      id: 'event-8',
      timestamp: baseTime + 7000,
      invocationId: 'inv-12352',
      type: 'tool_call',
      author: 'coding_agent',
      content: {
        parts: [{
          functionCall: {
            id: 'func-2',
            name: 'write_code',
            args: {
              language: 'python',
              code: 'def fibonacci_dp(n):\n    if n <= 1:\n        return n\n    dp = [0, 1]\n    for i in range(2, n + 1):\n        dp.append(dp[i-1] + dp[i-2])\n    return dp[n]',
              description: 'Dynamic programming fibonacci implementation'
            },
          },
        }],
      },
    },
    {
      id: 'event-9',
      timestamp: baseTime + 8000,
      invocationId: 'inv-12353',
      type: 'tool_response',
      author: 'coding_agent',
      content: {
        parts: [{
          functionResponse: {
            id: 'func-2',
            name: 'write_code',
            response: {
              result: {
                content: [{ type: 'text', text: 'Optimized fibonacci function written successfully' }],
                isError: false,
              },
            },
          },
        }],
      },
    },
    {
      id: 'event-10',
      timestamp: baseTime + 9000,
      invocationId: 'inv-12354',
      type: 'system_event',
      author: 'system',
      content: {
        parts: [{ text: 'Session completed successfully. All agents collaborated effectively.' }],
      },
      actions: {
        stateDelta: {
          sessionComplete: true,
          successfulCollaboration: true,
        },
      },
    },
  ];
};

const DebugViewExample: React.FC = () => {
  const [conversation, setConversation] = useState<ConversationWithEvents>({
    messages: [],
    sessionId: 'example-session-abc123',
    sessionEvents: generateExampleEvents(),
  });
  
  const [loading, setLoading] = useState(false);

  // Simulate refreshing events
  const handleRefresh = useCallback(() => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setConversation(prev => ({
        ...prev,
        sessionEvents: generateExampleEvents(),
      }));
      setLoading(false);
    }, 1000);
  }, []);

  // Add a new event to demonstrate real-time updates
  const addNewEvent = useCallback(() => {
    const newEvent: SessionEvent = {
      id: `event-${Date.now()}`,
      timestamp: Date.now(),
      invocationId: `inv-${Date.now()}`,
      type: 'user_message',
      author: 'user',
      content: {
        parts: [{ text: 'This is a new message added dynamically!' }],
        role: 'user',
      },
    };

    setConversation(prev => ({
      ...prev,
      sessionEvents: [...prev.sessionEvents, newEvent],
    }));
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          DebugView Component Example
        </Typography>
        <Typography variant="body1" paragraph>
          This example demonstrates the DebugView component system with a simulated
          multi-agent conversation involving planning, coding, and critique agents.
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleRefresh} 
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh Events
          </Button>
          <Button 
            variant="outlined" 
            onClick={addNewEvent}
          >
            Add New Event
          </Button>
        </Box>
      </Paper>

      <DebugView
        conversation={conversation}
        loading={loading}
        onRefresh={handleRefresh}
        autoScroll={true}
        maxHeight={800}
      />
    </Box>
  );
};

export default DebugViewExample;