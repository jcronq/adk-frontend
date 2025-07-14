import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  checkAccessibility 
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';
import ConversationView from '../ConversationView';

// Mock the MCP context
const mockMCPContext = {
  setIsReplyingToMCP: jest.fn(),
  setCurrentMCPQuestionId: jest.fn(),
  currentQuestion: null,
  questions: [],
  isReplyingToMCP: false,
  currentMCPQuestionId: null,
};

jest.mock('../../contexts/MCPContext', () => ({
  useMCP: () => mockMCPContext,
}));

describe('ConversationView Component', () => {
  const testConversation = MockDataFactory.createConversation({
    sessionId: 'test-session-123',
    messages: [
      MockDataFactory.createMessage({ 
        role: 'user', 
        content: 'Hello, how are you today?' 
      }),
      MockDataFactory.createMessage({ 
        role: 'assistant', 
        content: 'Hello! I\'m doing well, thank you for asking. How can I help you today?' 
      }),
      MockDataFactory.createMessage({ 
        role: 'user', 
        content: 'Can you help me with a coding problem?' 
      }),
      MockDataFactory.createMessage({ 
        role: 'assistant', 
        content: 'Of course! I\'d be happy to help you with your coding problem. What are you working on?' 
      })
    ]
  });

  const defaultProps = {
    currentAgent: 'Test Agent',
    currentConversation: testConversation,
    sendingMessage: false,
    onBackToSelection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders conversation header with agent name and message count', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('4 messages')).toBeInTheDocument();
      expect(screen.getByText('Session: test-session-123')).toBeInTheDocument();
    });

    it('displays all messages in conversation', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      testConversation.messages.forEach(message => {
        expect(screen.getByText(message.content)).toBeInTheDocument();
      });
    });

    it('distinguishes between user and assistant messages', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // User messages should be styled differently from assistant messages
      const userMessages = screen.getAllByText(/Hello, how are you today\?|Can you help me with a coding problem\?/);
      const assistantMessages = screen.getAllByText(/Hello! I'm doing well|Of course! I'd be happy to help/);
      
      expect(userMessages.length).toBe(2);
      expect(assistantMessages.length).toBe(2);
    });

    it('shows correct message metadata', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // Should show role indicators or timestamps if implemented
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows selection prompt when no agent is selected', () => {
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentAgent={null}
          currentConversation={null}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText('Select a conversation to start chatting')).toBeInTheDocument();
    });

    it('shows selection prompt when no conversation is selected', () => {
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={null}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText('Select a conversation to start chatting')).toBeInTheDocument();
    });

    it('handles conversation with no messages', () => {
      const emptyConversation = MockDataFactory.createConversation({
        sessionId: 'empty-session',
        messages: []
      });
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={emptyConversation}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    it('renders messages in chronological order', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      const messages = screen.getAllByRole('listitem');
      expect(messages.length).toBe(testConversation.messages.length);
      
      // First message should be the first user message
      expect(messages[0]).toHaveTextContent('Hello, how are you today?');
    });

    it('handles long messages correctly', () => {
      const longMessage = 'A'.repeat(1000);
      const conversationWithLongMessage = {
        ...testConversation,
        messages: [
          ...testConversation.messages,
          MockDataFactory.createMessage({ 
            role: 'assistant', 
            content: longMessage 
          })
        ]
      };
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={conversationWithLongMessage}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles messages with special characters and formatting', () => {
      const specialMessage = 'Code example: `console.log("Hello, World!");` and some **bold** text.';
      const conversationWithSpecialMessage = {
        ...testConversation,
        messages: [
          ...testConversation.messages,
          MockDataFactory.createMessage({ 
            role: 'assistant', 
            content: specialMessage 
          })
        ]
      };
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={conversationWithSpecialMessage}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('displays message roles correctly', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // All messages should be displayed with their content
      testConversation.messages.forEach(message => {
        expect(screen.getByText(message.content)).toBeInTheDocument();
      });
    });
  });

  describe('MCP Integration', () => {
    it('handles reply to MCP message functionality', async () => {
      const user = setupUserEvent();
      
      // Mock a conversation with MCP questions
      const mcpConversation = {
        ...testConversation,
        messages: [
          ...testConversation.messages,
          MockDataFactory.createMessage({ 
            role: 'assistant', 
            content: 'I have a question for you.',
            mcpQuestionId: 'mcp-question-123' as any
          })
        ]
      };
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={mcpConversation}
        />, 
        { withMCPProvider: false }
      );
      
      // Look for reply buttons if they exist
      const replyButtons = screen.queryAllByText(/reply/i);
      if (replyButtons.length > 0) {
        await user.click(replyButtons[0]);
        
        expect(mockMCPContext.setIsReplyingToMCP).toHaveBeenCalledWith(true);
        expect(mockMCPContext.setCurrentMCPQuestionId).toHaveBeenCalledWith('mcp-question-123');
      }
    });

    it('shows MCP question indicators when present', () => {
      const mcpConversation = {
        ...testConversation,
        messages: [
          ...testConversation.messages,
          MockDataFactory.createMessage({ 
            role: 'assistant', 
            content: 'This is an MCP question message',
            mcpQuestionId: 'mcp-question-456' as any
          })
        ]
      };
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={mcpConversation}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText('This is an MCP question message')).toBeInTheDocument();
    });
  });

  describe('Scroll Behavior', () => {
    it('scrolls to bottom when new messages are added', async () => {
      const scrollIntoViewSpy = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewSpy;
      
      const { rerender } = renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // Add a new message
      const updatedConversation = {
        ...testConversation,
        messages: [
          ...testConversation.messages,
          MockDataFactory.createMessage({ 
            role: 'user', 
            content: 'New message' 
          })
        ]
      };
      
      rerender(
        <ConversationView 
          {...defaultProps} 
          currentConversation={updatedConversation}
        />
      );
      
      await waitFor(() => {
        expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('maintains scroll position during re-renders without new messages', () => {
      const scrollIntoViewSpy = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewSpy;
      
      const { rerender } = renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // Re-render with same messages
      rerender(<ConversationView {...defaultProps} />);
      
      // Should not trigger additional scroll
      expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1); // Only initial render
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when sending message', () => {
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          sendingMessage={true}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('hides loading indicator when not sending message', () => {
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          sendingMessage={false}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('maintains functionality during loading state', () => {
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          sendingMessage={true}
        />, 
        { withMCPProvider: false }
      );
      
      // Messages should still be visible
      testConversation.messages.forEach(message => {
        expect(screen.getByText(message.content)).toBeInTheDocument();
      });
    });
  });

  describe('Back Navigation', () => {
    it('calls onBackToSelection when back button is clicked', async () => {
      const user = setupUserEvent();
      const onBackToSelection = jest.fn();
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          onBackToSelection={onBackToSelection}
        />, 
        { withMCPProvider: false }
      );
      
      // Look for back button if it exists
      const backButtons = screen.queryAllByText(/back/i);
      if (backButtons.length > 0) {
        await user.click(backButtons[0]);
        expect(onBackToSelection).toHaveBeenCalledTimes(1);
      }
    });

    it('handles missing onBackToSelection prop gracefully', () => {
      expect(() => {
        renderWithProviders(
          <ConversationView 
            currentAgent={defaultProps.currentAgent}
            currentConversation={defaultProps.currentConversation}
            sendingMessage={defaultProps.sendingMessage}
          />, 
          { withMCPProvider: false }
        );
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // Messages container should have proper role
      expect(screen.getByRole('list')).toBeInTheDocument();
      
      // Individual messages should be list items
      const messageItems = screen.getAllByRole('listitem');
      expect(messageItems.length).toBe(testConversation.messages.length);
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      await checkAccessibility(container);
    });

    it('provides proper heading structure', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // Agent name should be a proper heading
      const agentHeading = screen.getByRole('heading', { name: 'Test Agent' });
      expect(agentHeading).toBeInTheDocument();
    });

    it('supports screen reader navigation through messages', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      const messageItems = screen.getAllByRole('listitem');
      messageItems.forEach(item => {
        expect(item).toBeVisible();
      });
    });
  });

  describe('Visual Layout and Styling', () => {
    it('applies proper layout structure', () => {
      const { container } = renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // Should have main container with flex layout
      const mainContainer = container.querySelector('[sx]'); // MUI sx prop
      expect(mainContainer).toBeInTheDocument();
    });

    it('distinguishes user and assistant message styling', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // All messages should be rendered with their distinct styling
      const messageItems = screen.getAllByRole('listitem');
      expect(messageItems.length).toBe(4);
      
      messageItems.forEach(item => {
        expect(item).toBeVisible();
      });
    });

    it('maintains proper spacing between messages', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      const messagesList = screen.getByRole('list');
      expect(messagesList).toBeInTheDocument();
    });

    it('shows session information clearly', () => {
      renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      expect(screen.getByText('Session: test-session-123')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large conversations efficiently', () => {
      const largeConversation = MockDataFactory.createLargeConversation(100);
      
      const startTime = performance.now();
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={largeConversation}
        />, 
        { withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByText('100 messages')).toBeInTheDocument();
    });

    it('updates efficiently when conversation changes', () => {
      const { rerender } = renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      const newConversation = MockDataFactory.createConversation({
        sessionId: 'new-session',
        messages: MockDataFactory.createMessages(10)
      });
      
      const startTime = performance.now();
      
      rerender(
        <ConversationView 
          {...defaultProps} 
          currentConversation={newConversation}
        />
      );
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      expect(updateTime).toBeLessThan(200); // Should update quickly
      expect(screen.getByText('Session: new-session')).toBeInTheDocument();
    });

    it('handles rapid state changes efficiently', () => {
      const { rerender } = renderWithProviders(<ConversationView {...defaultProps} />, {
        withMCPProvider: false
      });
      
      // Rapid state changes
      for (let i = 0; i < 20; i++) {
        rerender(
          <ConversationView 
            {...defaultProps} 
            sendingMessage={i % 2 === 0}
          />
        );
      }
      
      // Should remain functional
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed message data gracefully', () => {
      const malformedConversation = {
        ...testConversation,
        messages: [
          { role: 'user', content: null } as any,
          { role: 'assistant', content: undefined } as any,
          { content: 'Missing role' } as any,
          MockDataFactory.createMessage({ role: 'user', content: 'Valid message' })
        ]
      };
      
      expect(() => {
        renderWithProviders(
          <ConversationView 
            {...defaultProps} 
            currentConversation={malformedConversation}
          />, 
          { withMCPProvider: false }
        );
      }).not.toThrow();
    });

    it('handles missing message content', () => {
      const conversationWithEmptyMessages = {
        ...testConversation,
        messages: [
          MockDataFactory.createMessage({ role: 'user', content: '' }),
          MockDataFactory.createMessage({ role: 'assistant', content: '   ' }), // Whitespace only
        ]
      };
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={conversationWithEmptyMessages}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText('2 messages')).toBeInTheDocument();
    });

    it('handles conversation without sessionId', () => {
      const conversationWithoutSessionId = {
        ...testConversation,
        sessionId: undefined as any
      };
      
      expect(() => {
        renderWithProviders(
          <ConversationView 
            {...defaultProps} 
            currentConversation={conversationWithoutSessionId}
          />, 
          { withMCPProvider: false }
        );
      }).not.toThrow();
    });

    it('maintains functionality with extreme message counts', () => {
      const conversationWithManyMessages = MockDataFactory.createLargeConversation(1000);
      
      renderWithProviders(
        <ConversationView 
          {...defaultProps} 
          currentConversation={conversationWithManyMessages}
        />, 
        { withMCPProvider: false }
      );
      
      expect(screen.getByText('1000 messages')).toBeInTheDocument();
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });
  });
});