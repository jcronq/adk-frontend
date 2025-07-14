import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DebugView from '../../../components/DebugView';
import { ConversationWithEvents } from '../../../types';

// Create a theme for testing
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('DebugView Component', () => {
  const mockConversation: ConversationWithEvents = {
    messages: [],
    sessionId: 'test-session-123',
    sessionEvents: [
      {
        id: 'event-1',
        timestamp: Date.now(),
        invocationId: 'inv-1',
        type: 'user_message',
        author: 'user',
        content: {
          parts: [{ text: 'Hello, this is a test message' }],
        },
      },
      {
        id: 'event-2',
        timestamp: Date.now() + 1000,
        invocationId: 'inv-2',
        type: 'agent_response',
        author: 'test_agent',
        content: {
          parts: [{ text: 'This is an agent response' }],
        },
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      },
      {
        id: 'event-3',
        timestamp: Date.now() + 2000,
        invocationId: 'inv-3',
        type: 'tool_call',
        author: 'test_agent',
        content: {
          parts: [{
            functionCall: {
              id: 'func-1',
              name: 'test_function',
              args: { param1: 'value1' },
            },
          }],
        },
      },
    ],
  };

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <DebugView conversation={mockConversation} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Debug View')).toBeInTheDocument();
  });

  it('displays session statistics', () => {
    render(
      <TestWrapper>
        <DebugView conversation={mockConversation} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Session Statistics')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total events
    expect(screen.getByText('30')).toBeInTheDocument(); // Total tokens
  });

  it('shows session ID', () => {
    render(
      <TestWrapper>
        <DebugView conversation={mockConversation} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Session ID: test-session-123')).toBeInTheDocument();
  });

  it('displays event filters', () => {
    render(
      <TestWrapper>
        <DebugView conversation={mockConversation} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Event Filters')).toBeInTheDocument();
    expect(screen.getByText('(3 total events)')).toBeInTheDocument();
  });

  it('handles empty conversation', () => {
    const emptyConversation: ConversationWithEvents = {
      messages: [],
      sessionId: 'empty-session',
      sessionEvents: [],
    };

    render(
      <TestWrapper>
        <DebugView conversation={emptyConversation} />
      </TestWrapper>
    );
    
    expect(screen.getByText('No Session Events Available')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <TestWrapper>
        <DebugView conversation={mockConversation} loading={true} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Loading debug view...')).toBeInTheDocument();
  });
});