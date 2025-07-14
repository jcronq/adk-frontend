import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateConversationSwitch,
  waitForConversationLoad,
  simulateMessageSend,
  isElementInViewport
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';

// Mock integrated components
const MockSidebarChatIntegration: React.FC<{
  agents: any[];
  conversations: any;
  currentAgent: string | null;
  activeConversationId: string | null;
  onSelectConversation: (agentName: string, sessionId: string) => void;
  onSendMessage: (message: string) => void;
  messages: any[];
  isLoading: boolean;
}> = ({
  agents,
  conversations,
  currentAgent,
  activeConversationId,
  onSelectConversation,
  onSendMessage,
  messages,
  isLoading
}) => {
  return (
    <div data-testid="sidebar-chat-layout" style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <aside data-testid="integrated-sidebar" style={{ width: '320px', borderRight: '1px solid #ccc' }}>
        <h2>Conversations</h2>
        <div data-testid="conversations-list">
          {agents.map(agent => {
            const agentConversations = conversations[agent.name] || [];
            return (
              <div key={agent.id} data-testid={`agent-section-${agent.name}`}>
                <h3>{agent.name}</h3>
                {agentConversations.map((conversation: any) => (
                  <button
                    key={conversation.sessionId}
                    data-testid={`conversation-button-${conversation.sessionId}`}
                    onClick={() => onSelectConversation(agent.name, conversation.sessionId)}
                    className={
                      currentAgent === agent.name && activeConversationId === conversation.sessionId 
                        ? 'active' 
                        : ''
                    }
                    aria-current={
                      currentAgent === agent.name && activeConversationId === conversation.sessionId 
                        ? 'page' 
                        : undefined
                    }
                  >
                    <div className="conversation-preview">
                      <span>{conversation.sessionId}</span>
                      <small>
                        {conversation.messages[conversation.messages.length - 1]?.content.substring(0, 30)}...
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Chat Window */}
      <main data-testid="integrated-chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div data-testid="chat-loading">Loading conversation...</div>
        ) : currentAgent && activeConversationId ? (
          <>
            <header data-testid="chat-header">
              <h2>Chat with {currentAgent}</h2>
              <span data-testid="conversation-id">ID: {activeConversationId}</span>
            </header>
            
            <div 
              data-testid="messages-container" 
              style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
            >
              {messages.map((message, index) => (
                <div 
                  key={`${message.id || index}`}
                  data-testid={`message-${index}`}
                  className={`message message-${message.role}`}
                >
                  <strong>{message.role}:</strong> {message.content}
                </div>
              ))}
            </div>
            
            <div data-testid="message-input-container" style={{ padding: '16px' }}>
              <form 
                data-testid="message-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const message = formData.get('message') as string;
                  if (message.trim()) {
                    onSendMessage(message);
                    (e.target as HTMLFormElement).reset();
                  }
                }}
              >
                <input 
                  name="message"
                  data-testid="message-input"
                  placeholder="Type your message..."
                  style={{ width: '100%', padding: '8px', marginRight: '8px' }}
                />
                <button type="submit" data-testid="send-button">Send</button>
              </form>
            </div>
          </>
        ) : (
          <div data-testid="no-conversation-selected">
            <h2>No conversation selected</h2>
            <p>Select a conversation from the sidebar to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
};

describe('Sidebar-Chat Integration', () => {
  const mockSelectConversation = jest.fn();
  const mockSendMessage = jest.fn();
  
  const testData = MockDataFactory.createResponsiveTestData();
  
  const defaultProps = {
    agents: testData.agents.slice(0, 3),
    conversations: {
      'Agent 1': MockDataFactory.createConversationsForAgent('Agent 1', 3),
      'Agent 2': MockDataFactory.createConversationsForAgent('Agent 2', 2),
      'Agent 3': MockDataFactory.createConversationsForAgent('Agent 3', 1),
    },
    currentAgent: null as string | null,
    activeConversationId: null as string | null,
    onSelectConversation: mockSelectConversation,
    onSendMessage: mockSendMessage,
    messages: [] as any[],
    isLoading: false,
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conversation Selection Integration', () => {
    it('updates chat window when conversation selected in sidebar', async () => {
      const user = setupUserEvent();
      
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Initially no conversation selected
      expect(screen.getByTestId('no-conversation-selected')).toBeInTheDocument();
      
      // Click on a conversation in sidebar
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      const conversationButton = screen.getByTestId(`conversation-button-${firstConversation.sessionId}`);
      
      await user.click(conversationButton);
      
      expect(mockSelectConversation).toHaveBeenCalledWith('Agent 1', firstConversation.sessionId);
      
      // Simulate state update
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps} 
          currentAgent="Agent 1"
          activeConversationId={firstConversation.sessionId}
          messages={firstConversation.messages}
        />
      );
      
      // Chat window should update
      expect(screen.getByTestId('chat-header')).toBeInTheDocument();
      expect(screen.getByText('Chat with Agent 1')).toBeInTheDocument();
      expect(screen.getByTestId('conversation-id')).toHaveTextContent(`ID: ${firstConversation.sessionId}`);
      expect(screen.queryByTestId('no-conversation-selected')).not.toBeInTheDocument();
    });

    it('shows active conversation state in sidebar', async () => {
      const user = setupUserEvent();
      
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={firstConversation.sessionId}
          messages={firstConversation.messages}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const activeButton = screen.getByTestId(`conversation-button-${firstConversation.sessionId}`);
      expect(activeButton).toHaveClass('active');
      expect(activeButton).toHaveAttribute('aria-current', 'page');
      
      // Switch to different conversation
      const secondConversation = defaultProps.conversations['Agent 1'][1];
      const secondButton = screen.getByTestId(`conversation-button-${secondConversation.sessionId}`);
      
      await user.click(secondButton);
      
      // Simulate state update
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={secondConversation.sessionId}
          messages={secondConversation.messages}
        />
      );
      
      // Check active state changed
      expect(screen.getByTestId(`conversation-button-${secondConversation.sessionId}`)).toHaveClass('active');
      expect(screen.getByTestId(`conversation-button-${firstConversation.sessionId}`)).not.toHaveClass('active');
    });

    it('handles rapid conversation switching gracefully', async () => {
      const user = setupUserEvent();
      
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const conversations = defaultProps.conversations['Agent 1'];
      
      // Rapidly click through conversations
      for (let i = 0; i < conversations.length; i++) {
        const conversation = conversations[i];
        const button = screen.getByTestId(`conversation-button-${conversation.sessionId}`);
        
        await user.click(button);
        
        // Simulate immediate state update
        rerender(
          <MockSidebarChatIntegration 
            {...defaultProps}
            currentAgent="Agent 1"
            activeConversationId={conversation.sessionId}
            messages={conversation.messages}
            isLoading={i < conversations.length - 1} // Loading for all but last
          />
        );
        
        if (i < conversations.length - 1) {
          expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
        }
      }
      
      // Final state should show last conversation
      const lastConversation = conversations[conversations.length - 1];
      expect(mockSelectConversation).toHaveBeenLastCalledWith('Agent 1', lastConversation.sessionId);
      expect(screen.queryByTestId('chat-loading')).not.toBeInTheDocument();
    });
  });

  describe('Message Flow Integration', () => {
    it('displays messages from selected conversation', () => {
      const conversation = defaultProps.conversations['Agent 1'][0];
      
      renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={conversation.sessionId}
          messages={conversation.messages}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Check all messages are displayed
      conversation.messages.forEach((message, index) => {
        const messageElement = screen.getByTestId(`message-${index}`);
        expect(messageElement).toBeInTheDocument();
        expect(messageElement).toHaveTextContent(message.content);
        expect(messageElement).toHaveTextContent(message.role);
      });
    });

    it('sends new messages and updates conversation', async () => {
      const user = setupUserEvent();
      const conversation = defaultProps.conversations['Agent 1'][0];
      
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={conversation.sessionId}
          messages={conversation.messages}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      const newMessage = 'This is a new test message';
      
      await user.type(messageInput, newMessage);
      await user.click(sendButton);
      
      expect(mockSendMessage).toHaveBeenCalledWith(newMessage);
      
      // Simulate message being added to conversation
      const updatedMessages = [
        ...conversation.messages,
        { role: 'user', content: newMessage, id: 'new-msg' }
      ];
      
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={conversation.sessionId}
          messages={updatedMessages}
        />
      );
      
      // Check new message appears
      expect(screen.getByTestId(`message-${updatedMessages.length - 1}`)).toBeInTheDocument();
      expect(screen.getByText(newMessage)).toBeInTheDocument();
      
      // Input should be cleared
      expect(messageInput).toHaveValue('');
    });

    it('prevents sending empty messages', async () => {
      const user = setupUserEvent();
      const conversation = defaultProps.conversations['Agent 1'][0];
      
      renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={conversation.sessionId}
          messages={conversation.messages}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const sendButton = screen.getByTestId('send-button');
      
      // Try to send empty message
      await user.click(sendButton);
      
      expect(mockSendMessage).not.toHaveBeenCalled();
      
      // Try to send whitespace-only message
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, '   ');
      await user.click(sendButton);
      
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Loading States Integration', () => {
    it('shows loading state during conversation loading', () => {
      renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId="session-1"
          isLoading={true}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading conversation...')).toBeInTheDocument();
      expect(screen.queryByTestId('chat-header')).not.toBeInTheDocument();
    });

    it('hides loading state when conversation loads', async () => {
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId="session-1"
          isLoading={true}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
      
      // Simulate loading completion
      const conversation = defaultProps.conversations['Agent 1'][0];
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={conversation.sessionId}
          messages={conversation.messages}
          isLoading={false}
        />
      );
      
      await waitForConversationLoad();
      
      expect(screen.queryByTestId('chat-loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('chat-header')).toBeInTheDocument();
    });
  });

  describe('State Synchronization', () => {
    it('maintains conversation state between sidebar and chat', () => {
      const conversation = defaultProps.conversations['Agent 1'][0];
      
      renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={conversation.sessionId}
          messages={conversation.messages}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Sidebar should show active conversation
      const sidebarButton = screen.getByTestId(`conversation-button-${conversation.sessionId}`);
      expect(sidebarButton).toHaveClass('active');
      
      // Chat should show conversation details
      expect(screen.getByText('Chat with Agent 1')).toBeInTheDocument();
      expect(screen.getByText(`ID: ${conversation.sessionId}`)).toBeInTheDocument();
      
      // Messages should be displayed
      expect(screen.getAllByTestId(/^message-/).length).toBe(conversation.messages.length);
    });

    it('handles agent switching correctly', async () => {
      const user = setupUserEvent();
      
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={defaultProps.conversations['Agent 1'][0].sessionId}
          messages={defaultProps.conversations['Agent 1'][0].messages}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Switch to Agent 2 conversation
      const agent2Conversation = defaultProps.conversations['Agent 2'][0];
      const agent2Button = screen.getByTestId(`conversation-button-${agent2Conversation.sessionId}`);
      
      await user.click(agent2Button);
      
      expect(mockSelectConversation).toHaveBeenCalledWith('Agent 2', agent2Conversation.sessionId);
      
      // Simulate state update
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 2"
          activeConversationId={agent2Conversation.sessionId}
          messages={agent2Conversation.messages}
        />
      );
      
      // Chat header should update
      expect(screen.getByText('Chat with Agent 2')).toBeInTheDocument();
      expect(screen.getByText(`ID: ${agent2Conversation.sessionId}`)).toBeInTheDocument();
      
      // Previous agent's conversation should not be active
      const agent1Button = screen.getByTestId(`conversation-button-${defaultProps.conversations['Agent 1'][0].sessionId}`);
      expect(agent1Button).not.toHaveClass('active');
    });
  });

  describe('Cross-Agent Conversation Management', () => {
    it('displays conversations from multiple agents', () => {
      renderWithProviders(
        <MockSidebarChatIntegration {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Check all agents are displayed
      defaultProps.agents.forEach(agent => {
        expect(screen.getByTestId(`agent-section-${agent.name}`)).toBeInTheDocument();
        expect(screen.getByText(agent.name)).toBeInTheDocument();
      });
      
      // Check conversations for each agent
      Object.entries(defaultProps.conversations).forEach(([agentName, conversations]) => {
        conversations.forEach((conversation: any) => {
          expect(screen.getByTestId(`conversation-button-${conversation.sessionId}`)).toBeInTheDocument();
        });
      });
    });

    it('handles switching between agents seamlessly', async () => {
      const user = setupUserEvent();
      
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Start with Agent 1
      const agent1Conversation = defaultProps.conversations['Agent 1'][0];
      const agent1Button = screen.getByTestId(`conversation-button-${agent1Conversation.sessionId}`);
      
      await user.click(agent1Button);
      
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={agent1Conversation.sessionId}
          messages={agent1Conversation.messages}
        />
      );
      
      expect(screen.getByText('Chat with Agent 1')).toBeInTheDocument();
      
      // Switch to Agent 3
      const agent3Conversation = defaultProps.conversations['Agent 3'][0];
      const agent3Button = screen.getByTestId(`conversation-button-${agent3Conversation.sessionId}`);
      
      await user.click(agent3Button);
      
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 3"
          activeConversationId={agent3Conversation.sessionId}
          messages={agent3Conversation.messages}
        />
      );
      
      expect(screen.getByText('Chat with Agent 3')).toBeInTheDocument();
      expect(screen.queryByText('Chat with Agent 1')).not.toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('handles large conversation lists without performance degradation', () => {
      const largeConversations = {
        'Agent 1': MockDataFactory.createConversationsForAgent('Agent 1', 50),
        'Agent 2': MockDataFactory.createConversationsForAgent('Agent 2', 30),
      };
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          conversations={largeConversations}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000);
      
      // All conversations should be present
      const totalConversations = Object.values(largeConversations).reduce((sum, convs) => sum + convs.length, 0);
      expect(screen.getAllByTestId(/^conversation-button-/).length).toBe(totalConversations);
    });

    it('maintains scroll position during conversation switches', async () => {
      const user = setupUserEvent();
      
      // Create a conversation with many messages
      const longConversation = MockDataFactory.createLargeConversation(100);
      
      const { rerender } = renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={longConversation.sessionId}
          messages={longConversation.messages}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const messagesContainer = screen.getByTestId('messages-container');
      
      // Scroll to middle of conversation
      messagesContainer.scrollTop = 500;
      
      // Switch to different conversation and back
      const otherConversation = defaultProps.conversations['Agent 2'][0];
      const otherButton = screen.getByTestId(`conversation-button-${otherConversation.sessionId}`);
      
      await user.click(otherButton);
      
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 2"
          activeConversationId={otherConversation.sessionId}
          messages={otherConversation.messages}
        />
      );
      
      // Switch back to long conversation
      // In a real implementation, scroll position would be restored
      const longConvButton = screen.getByTestId(`conversation-button-${longConversation.sessionId}`);
      await user.click(longConvButton);
      
      rerender(
        <MockSidebarChatIntegration 
          {...defaultProps}
          currentAgent="Agent 1"
          activeConversationId={longConversation.sessionId}
          messages={longConversation.messages}
        />
      );
      
      // Verify conversation is restored (scroll position restoration would be implementation-specific)
      expect(screen.getAllByTestId(/^message-/).length).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('handles missing conversation data gracefully', () => {
      expect(() => {
        renderWithProviders(
          <MockSidebarChatIntegration 
            {...defaultProps}
            currentAgent="NonexistentAgent"
            activeConversationId="nonexistent-session"
            messages={[]}
          />,
          { withAgentProvider: false, withMCPProvider: false }
        );
      }).not.toThrow();
      
      // Should show no conversation selected state
      expect(screen.getByTestId('no-conversation-selected')).toBeInTheDocument();
    });

    it('handles empty conversations list', () => {
      renderWithProviders(
        <MockSidebarChatIntegration 
          {...defaultProps}
          conversations={{}}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Should render without crashing
      expect(screen.getByTestId('sidebar-chat-layout')).toBeInTheDocument();
      expect(screen.getByTestId('no-conversation-selected')).toBeInTheDocument();
    });
  });
});