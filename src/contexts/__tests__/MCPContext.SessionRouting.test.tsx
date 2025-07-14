import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MCPProvider, useMCP } from '../MCPContext';
import { NotificationProvider } from '../NotificationContext';
import { MCPQuestion, Conversation } from '../../types';
import websocketService from '../../services/websocket';

// Mock the websocket service
jest.mock('../../services/websocket', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(),
    sendAnswer: jest.fn(),
    setActiveSessionContext: jest.fn(),
    clearActiveSessionContext: jest.fn()
  }
}));

// Test wrapper component
const TestWrapper: React.FC<{ 
  children: React.ReactNode; 
  currentAgent?: string | null; 
  conversations?: Record<string, Conversation[]>;
  getCurrentSessionContext?: () => { agentName: string, sessionId: string } | null;
  sendMessage?: jest.Mock;
}> = ({ 
  children, 
  currentAgent = null, 
  conversations = {},
  getCurrentSessionContext = () => null,
  sendMessage = jest.fn()
}) => (
  <NotificationProvider>
    <MCPProvider 
      currentAgent={currentAgent}
      conversations={conversations}
      sendMessage={sendMessage}
      getCurrentSessionContext={getCurrentSessionContext}
    >
      {children}
    </MCPProvider>
  </NotificationProvider>
);

// Mock timer functions
jest.useFakeTimers();

// Test component that exposes MCP context functionality
const SessionRoutingTestComponent = () => {
  const { currentQuestion, submitAnswer, isServerRunning } = useMCP();
  
  return (
    <div>
      <div data-testid="server-status">
        {isServerRunning ? 'Server Running' : 'Server Not Running'}
      </div>
      <div data-testid="current-question">
        {currentQuestion ? JSON.stringify(currentQuestion) : 'No Question'}
      </div>
      <button 
        data-testid="submit-answer" 
        onClick={() => submitAnswer('Test Answer')}
        disabled={!currentQuestion}
      >
        Submit Answer
      </button>
    </div>
  );
};

describe('MCPContext Session Routing', () => {
  const mockSendMessage = jest.fn();
  const mockGetCurrentSessionContext = jest.fn();
  const mockWebSocketService = websocketService as jest.Mocked<typeof websocketService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Reset websocket mock implementations
    mockWebSocketService.isConnected.mockReturnValue(true);
    mockWebSocketService.addEventListener.mockImplementation(() => {});
    mockWebSocketService.removeEventListener.mockImplementation(() => {});
    mockWebSocketService.connect.mockImplementation(() => {});
    mockWebSocketService.disconnect.mockImplementation(() => {});
    mockWebSocketService.sendAnswer.mockImplementation(() => {});
  });

  describe('Session Context Routing', () => {
    test('routes MCP question to correct agent based on session context', async () => {
      const conversations = {
        'agent-1': [{ sessionId: 'session-1', messages: [] }],
        'agent-2': [{ sessionId: 'session-2', messages: [] }]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      // Mock addEventListener to capture the question handler
      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent="agent-1"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
          sendMessage={mockSendMessage}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Simulate receiving a question with session context for agent-2
      const questionWithContext: MCPQuestion = {
        id: 'test-question-123',
        question: 'What should I do?',
        sessionContext: {
          agentName: 'agent-2',
          sessionId: 'session-2'
        }
      };

      act(() => {
        if (questionHandler) {
          questionHandler(questionWithContext);
        }
      });

      // Verify the question was routed correctly (not injected since we're viewing agent-1)
      expect(mockSendMessage).not.toHaveBeenCalled();
      
      // Check that question is stored with proper context
      const currentQuestion = screen.getByTestId('current-question').textContent;
      expect(currentQuestion).toContain('agent-2');
      expect(currentQuestion).toContain('session-2');
    });

    test('injects MCP question when viewing the target agent', async () => {
      const conversations = {
        'target-agent': [{ sessionId: 'target-session', messages: [] }]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent="target-agent"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
          sendMessage={mockSendMessage}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Simulate receiving a question for the currently viewed agent
      const questionForCurrentAgent: MCPQuestion = {
        id: 'current-agent-question',
        question: 'Current agent question?',
        sessionContext: {
          agentName: 'target-agent',
          sessionId: 'target-session'
        }
      };

      act(() => {
        if (questionHandler) {
          questionHandler(questionForCurrentAgent);
        }
      });

      // Verify the question was injected into the conversation
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('🤖 **Agent Question:**'),
        true,
        'current-agent-question'
      );
    });

    test('handles questions without session context using fallback', async () => {
      const conversations = {
        'current-agent': [{ sessionId: 'current-session', messages: [] }]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent="current-agent"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Simulate receiving a question without session context
      const questionWithoutContext: MCPQuestion = {
        id: 'no-context-question',
        question: 'Question without context?'
      };

      act(() => {
        if (questionHandler) {
          questionHandler(questionWithoutContext);
        }
      });

      // Verify fallback behavior - should inject since we're on current agent
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('🤖 **Agent Question:**'),
        true,
        'no-context-question'
      );
    });
  });

  describe('Answer Submission with Session Context', () => {
    test('submits answer with session context when question has context', async () => {
      const conversations = {
        'agent-1': [{ sessionId: 'session-1', messages: [] }]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent="agent-1"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
          sendMessage={mockSendMessage}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Inject a question with session context
      const questionWithContext: MCPQuestion = {
        id: 'context-question',
        question: 'Question with context?',
        sessionContext: {
          agentName: 'agent-1',
          sessionId: 'session-1'
        }
      };

      act(() => {
        if (questionHandler) {
          questionHandler(questionWithContext);
        }
      });

      // Submit answer
      await userEvent.click(screen.getByTestId('submit-answer'));

      // Verify answer was sent with session context
      expect(mockWebSocketService.sendAnswer).toHaveBeenCalledWith(
        'context-question',
        'Test Answer',
        {
          agentName: 'agent-1',
          sessionId: 'session-1'
        }
      );

      // Verify sendMessage was called since we're viewing the target agent
      expect(mockSendMessage).toHaveBeenCalledWith('Test Answer');
    });

    test('submits answer with fallback context when question lacks context', async () => {
      const conversations = {
        'current-agent': [{ sessionId: 'current-session', messages: [] }]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent="current-agent"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Inject a question without session context
      const questionWithoutContext: MCPQuestion = {
        id: 'no-context-question',
        question: 'Question without context?'
      };

      act(() => {
        if (questionHandler) {
          questionHandler(questionWithoutContext);
        }
      });

      // Submit answer
      await userEvent.click(screen.getByTestId('submit-answer'));

      // Verify answer was sent with fallback context
      expect(mockWebSocketService.sendAnswer).toHaveBeenCalledWith(
        'no-context-question',
        'Test Answer',
        {
          agentName: 'current-agent',
          sessionId: 'current-session'
        }
      );
    });

    test('does not send message to UI when answering cross-session question', async () => {
      const conversations = {
        'agent-1': [{ sessionId: 'session-1', messages: [] }],
        'agent-2': [{ sessionId: 'session-2', messages: [] }]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent="agent-1"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
          sendMessage={mockSendMessage}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Inject a question for a different agent
      const crossSessionQuestion: MCPQuestion = {
        id: 'cross-session-question',
        question: 'Question for different agent?',
        sessionContext: {
          agentName: 'agent-2',
          sessionId: 'session-2'
        }
      };

      act(() => {
        if (questionHandler) {
          questionHandler(crossSessionQuestion);
        }
      });

      // Clear any previous calls
      mockSendMessage.mockClear();

      // Submit answer
      await userEvent.click(screen.getByTestId('submit-answer'));

      // Verify answer was sent to WebSocket with correct context
      expect(mockWebSocketService.sendAnswer).toHaveBeenCalledWith(
        'cross-session-question',
        'Test Answer',
        {
          agentName: 'agent-2',
          sessionId: 'session-2'
        }
      );

      // Verify sendMessage was NOT called since we're not viewing the target agent
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Session Contamination Prevention', () => {
    test('prevents contamination by not injecting questions from other sessions', async () => {
      const conversations = {
        'shared-agent': [
          { sessionId: 'session-a', messages: [] },
          { sessionId: 'session-b', messages: [] }
        ]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      // Mock getCurrentSessionContext to return specific session we're viewing
      mockGetCurrentSessionContext.mockReturnValue({
        agentName: 'shared-agent',
        sessionId: 'session-a'
      });

      render(
        <TestWrapper
          currentAgent="shared-agent"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Simulate question for session-b while viewing session-a
      const questionForDifferentSession: MCPQuestion = {
        id: 'different-session-question',
        question: 'Question for session B?',
        sessionContext: {
          agentName: 'shared-agent',
          sessionId: 'session-b'
        }
      };

      // Simulate that we're currently viewing session-a
      act(() => {
        if (questionHandler) {
          questionHandler(questionForDifferentSession);
        }
      });

      // Since the question is for session-b but we're viewing session-a,
      // the question should NOT be injected into the conversation
      expect(mockSendMessage).not.toHaveBeenCalled();
      
      // But question should still be stored for answering
      const currentQuestion = screen.getByTestId('current-question').textContent;
      expect(currentQuestion).toContain('session-b');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty conversations gracefully', async () => {
      const conversations = {};

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent={null}
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Simulate receiving a question with no agent selected
      const question: MCPQuestion = {
        id: 'no-agent-question',
        question: 'Question with no agent?',
        sessionContext: {
          agentName: 'some-agent',
          sessionId: 'some-session'
        }
      };

      act(() => {
        if (questionHandler) {
          questionHandler(question);
        }
      });

      // Should not inject question since no current agent
      expect(mockSendMessage).not.toHaveBeenCalled();
      
      // But question should still be stored
      const currentQuestion = screen.getByTestId('current-question').textContent;
      expect(currentQuestion).toContain('some-agent');
    });

    test('handles null session context gracefully', async () => {
      const conversations = {
        'agent-1': [{ sessionId: 'session-1', messages: [] }]
      };

      let questionHandler: ((question: MCPQuestion) => void) | null = null;

      mockWebSocketService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'question') {
          questionHandler = handler as (question: MCPQuestion) => void;
        }
      });

      render(
        <TestWrapper
          currentAgent="agent-1"
          conversations={conversations}
          getCurrentSessionContext={mockGetCurrentSessionContext}
          sendMessage={mockSendMessage}
        >
          <SessionRoutingTestComponent />
        </TestWrapper>
      );

      // Simulate WebSocket connection
      act(() => {
        const connectedHandler = mockWebSocketService.addEventListener.mock.calls
          .find(call => call[0] === 'connected')?.[1];
        if (connectedHandler) connectedHandler({ connected: true });
      });

      // Simulate question with undefined session context
      const questionWithoutContext: MCPQuestion = {
        id: 'null-context-question',
        question: 'Question with null context?'
      };

      act(() => {
        if (questionHandler) {
          questionHandler(questionWithoutContext);
        }
      });

      // Should use fallback behavior
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('🤖 **Agent Question:**'),
        true,
        'null-context-question'
      );
    });
  });
});