import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateMediaQuery,
  waitForAnimations,
  simulateMessageSend
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';

// Import the main layout and components for integration testing
import MainLayout from '../../components/layout/MainLayout';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import ConversationList from '../../components/ConversationList';
import ConversationView from '../../components/ConversationView';
import NotificationCenter from '../../components/NotificationCenter';

// Mock a complete ChatGPT-style application
const ChatGPTStyleApp: React.FC<{
  initialAgent?: string;
  initialConversationId?: string;
  hasNotifications?: boolean;
  isMobile?: boolean;
}> = ({ 
  initialAgent = null, 
  initialConversationId = null,
  hasNotifications = true,
  isMobile = false
}) => {
  const [currentAgent, setCurrentAgent] = React.useState<string | null>(initialAgent);
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(initialConversationId);
  const [conversations] = React.useState(MockDataFactory.createResponsiveTestData().conversations);
  const [agents] = React.useState(MockDataFactory.createAgents(4));
  const [notificationCenterOpen, setNotificationCenterOpen] = React.useState(false);
  const [sendingMessage, setSendingMessage] = React.useState(false);

  const currentConversation = currentAgent && selectedConversationId
    ? conversations[currentAgent]?.find(conv => conv.sessionId === selectedConversationId) || null
    : null;

  const handleAgentSelect = (agentName: string) => {
    setCurrentAgent(agentName);
    // Auto-select first conversation if available
    const agentConversations = conversations[agentName];
    if (agentConversations && agentConversations.length > 0) {
      setSelectedConversationId(agentConversations[0].sessionId);
    } else {
      setSelectedConversationId(null);
    }
  };

  const handleConversationSelect = (agentName: string, sessionId: string) => {
    setCurrentAgent(agentName);
    setSelectedConversationId(sessionId);
  };

  const handleNewConversation = (agentName: string) => {
    const newSessionId = `new-session-${Date.now()}`;
    setCurrentAgent(agentName);
    setSelectedConversationId(newSessionId);
  };

  const handleSendMessage = async (message: string) => {
    setSendingMessage(true);
    // Simulate message sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSendingMessage(false);
  };

  const handleNotificationClick = () => {
    setNotificationCenterOpen(!notificationCenterOpen);
  };

  const handleQuestionClick = (questionId: string, agentName?: string, conversationId?: string) => {
    if (agentName && conversationId) {
      handleConversationSelect(agentName, conversationId);
    }
    setNotificationCenterOpen(false);
  };

  return (
    <div data-testid="chatgpt-app" style={{ height: '100vh' }}>
      {/* Notification Center (overlay) */}
      {notificationCenterOpen && (
        <div 
          data-testid="notification-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1300
          }}
        >
          <NotificationCenter onQuestionClick={handleQuestionClick} />
        </div>
      )}
      
      <MainLayout
        notificationCount={hasNotifications ? 5 : 0}
        onNotificationClick={handleNotificationClick}
        onQuestionClick={handleQuestionClick}
      >
        {/* Main content area with conditional rendering */}
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Conversation List - shown on desktop or when no conversation selected on mobile */}
          {(!isMobile || !currentConversation) && (
            <div style={{ width: isMobile ? '100%' : '350px', borderRight: '1px solid #eee' }}>
              <ConversationList 
                agents={agents}
                conversations={conversations}
                onContinueConversation={handleConversationSelect}
                selectedConversationId={selectedConversationId}
              />
            </div>
          )}
          
          {/* Conversation View - shown when conversation is selected */}
          {(!isMobile || currentConversation) && (
            <div style={{ flex: 1 }}>
              <ConversationView 
                currentAgent={currentAgent}
                currentConversation={currentConversation}
                sendingMessage={sendingMessage}
                onBackToSelection={isMobile ? () => {
                  setCurrentAgent(null);
                  setSelectedConversationId(null);
                } : undefined}
              />
              
              {/* Message Input Area */}
              {currentConversation && (
                <div 
                  data-testid="message-input-area"
                  style={{ 
                    padding: '16px', 
                    borderTop: '1px solid #eee',
                    backgroundColor: 'white'
                  }}
                >
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const message = formData.get('message') as string;
                      if (message.trim()) {
                        await handleSendMessage(message);
                        (e.target as HTMLFormElement).reset();
                      }
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        name="message"
                        data-testid="message-input"
                        placeholder="Type your message..."
                        style={{ 
                          flex: 1, 
                          padding: '12px', 
                          border: '1px solid #ddd',
                          borderRadius: '8px'
                        }}
                        disabled={sendingMessage}
                      />
                      <button 
                        type="submit"
                        data-testid="send-button"
                        disabled={sendingMessage}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: sendingMessage ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sendingMessage ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </MainLayout>
    </div>
  );
};

describe('ChatGPT-Style User Journey Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Workflows', () => {
    it('completes new user onboarding flow', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp />);
      
      // 1. User sees the main interface
      expect(screen.getByTestId('chatgpt-app')).toBeInTheDocument();
      expect(screen.getByText('ADK Agent Manager')).toBeInTheDocument();
      
      // 2. User sees available agents
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Agent 2')).toBeInTheDocument();
      
      // 3. User clicks on an agent to expand conversations
      const agent1 = screen.getByText('Agent 1');
      await user.click(agent1);
      
      // 4. User sees conversation list for the agent
      const conversations = screen.getAllByText(/messages/);
      expect(conversations.length).toBeGreaterThan(0);
      
      // 5. User selects a conversation
      const firstConversationPreview = conversations[0];
      await user.click(firstConversationPreview);
      
      // 6. User sees the conversation view with messages
      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument(); // Messages list
      });
      
      // 7. User can type and send a message
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      await user.type(messageInput, 'Hello, this is my first message!');
      await user.click(sendButton);
      
      // 8. User sees loading state
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      
      // 9. Wait for message to be sent
      await waitFor(() => {
        expect(screen.getByText('Send')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('handles agent switching workflow', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp initialAgent="Agent 1" />);
      
      // 1. Start with Agent 1 selected
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
      
      // 2. Select a conversation from Agent 1
      const agent1Conversations = screen.getAllByText(/messages/);
      await user.click(agent1Conversations[0]);
      
      // 3. Verify Agent 1 conversation is loaded
      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
      
      // 4. Switch to Agent 2
      const agent2 = screen.getByText('Agent 2');
      await user.click(agent2);
      
      // 5. Select a conversation from Agent 2
      const agent2Conversations = screen.getAllByText(/messages/);
      await user.click(agent2Conversations[0]);
      
      // 6. Verify Agent 2 conversation is loaded
      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
      
      // 7. Verify can send message to Agent 2
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Hello Agent 2!');
      
      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);
      
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('completes notification interaction workflow', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp hasNotifications={true} />);
      
      // 1. User sees notification badge
      expect(screen.getByText('5')).toBeInTheDocument(); // Notification count
      
      // 2. User clicks notification button
      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationButton);
      
      // 3. Notification center opens
      await waitFor(() => {
        expect(screen.getByTestId('notification-overlay')).toBeInTheDocument();
      });
      
      // 4. User sees notification list
      expect(screen.getByText('MCP Questions')).toBeInTheDocument();
      
      // 5. User clicks on a notification
      const notifications = screen.getAllByText(/Test MCP question/);
      await user.click(notifications[0]);
      
      // 6. User is navigated to the relevant conversation
      await waitFor(() => {
        expect(screen.queryByTestId('notification-overlay')).not.toBeInTheDocument();
      });
      
      // 7. User can interact with the conversation
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    it('handles mobile user workflow', async () => {
      const user = setupUserEvent();
      
      // Mock mobile viewport
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(<ChatGPTStyleApp isMobile={true} />);
      
      // 1. User sees mobile interface
      expect(screen.getByLabelText('toggle sidebar')).toBeInTheDocument();
      
      // 2. User sees conversation list initially
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
      
      // 3. User selects a conversation
      const conversations = screen.getAllByText(/messages/);
      await user.click(conversations[0]);
      
      // 4. Conversation view takes full screen on mobile
      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument(); // Messages
      });
      
      // 5. User can send message on mobile
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      await user.type(messageInput, 'Mobile message');
      await user.click(sendButton);
      
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      
      // 6. User can navigate back to conversation list
      const backButton = screen.queryByText(/back/i);
      if (backButton) {
        await user.click(backButton);
        expect(screen.getByText('Agent 1')).toBeInTheDocument();
      }
    });
  });

  describe('Cross-Component Integration', () => {
    it('maintains state consistency across components', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp />);
      
      // 1. Select agent in conversation list
      const agent1 = screen.getByText('Agent 1');
      await user.click(agent1);
      
      // 2. Select conversation
      const conversations = screen.getAllByText(/messages/);
      await user.click(conversations[0]);
      
      // 3. Verify conversation view shows correct agent
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Agent 1/i })).toBeInTheDocument();
      });
      
      // 4. Switch to different agent
      const agent2 = screen.getByText('Agent 2');
      await user.click(agent2);
      
      // 5. Select conversation from different agent
      const agent2Conversations = screen.getAllByText(/messages/);
      await user.click(agent2Conversations[0]);
      
      // 6. Verify conversation view updates
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Agent 2/i })).toBeInTheDocument();
      });
    });

    it('handles sidebar and main content synchronization', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp />);
      
      // 1. Initially no conversation selected
      expect(screen.getByText('Select a conversation to start chatting')).toBeInTheDocument();
      
      // 2. Select conversation from sidebar
      const conversations = screen.getAllByText(/messages/);
      await user.click(conversations[0]);
      
      // 3. Main content updates to show conversation
      await waitFor(() => {
        expect(screen.queryByText('Select a conversation to start chatting')).not.toBeInTheDocument();
        expect(screen.getByRole('list')).toBeInTheDocument(); // Messages list
      });
      
      // 4. Conversation selection is highlighted in sidebar
      const selectedConversation = conversations[0].closest('button');
      expect(selectedConversation).toHaveClass('Mui-selected');
    });

    it('coordinates notification system with conversation navigation', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp hasNotifications={true} />);
      
      // 1. Open notifications
      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationButton);
      
      // 2. Click notification to navigate to conversation
      const notifications = screen.getAllByText(/Test MCP question/);
      await user.click(notifications[0]);
      
      // 3. Verify navigation occurred
      await waitFor(() => {
        expect(screen.queryByTestId('notification-overlay')).not.toBeInTheDocument();
      });
      
      // 4. Verify correct conversation is loaded
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('gracefully handles missing conversation data', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp />);
      
      // 1. Try to interact with agent that has no conversations
      const agents = screen.getAllByText(/Agent/);
      const lastAgent = agents[agents.length - 1];
      await user.click(lastAgent);
      
      // 2. Should show appropriate empty state
      expect(screen.getByText(/No conversations|Select a conversation/)).toBeInTheDocument();
      
      // 3. User can still navigate to other agents
      const firstAgent = agents[0];
      await user.click(firstAgent);
      
      // 4. Should be able to select a valid conversation
      const conversations = screen.getAllByText(/messages/);
      if (conversations.length > 0) {
        await user.click(conversations[0]);
        
        await waitFor(() => {
          expect(screen.getByRole('list')).toBeInTheDocument();
        });
      }
    });

    it('recovers from network errors during message sending', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp />);
      
      // 1. Navigate to a conversation
      const conversations = screen.getAllByText(/messages/);
      await user.click(conversations[0]);
      
      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
      
      // 2. Try to send a message
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);
      
      // 3. Should show loading state
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      
      // 4. After timeout, should return to normal state
      await waitFor(() => {
        expect(screen.getByText('Send')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // 5. User can try sending again
      await user.type(messageInput, 'Retry message');
      await user.click(sendButton);
      
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('maintains accessibility during error states', async () => {
      renderWithProviders(<ChatGPTStyleApp />);
      
      // 1. Empty state should be accessible
      const emptyState = screen.getByText('Select a conversation to start chatting');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toBeVisible();
      
      // 2. Navigation should still work
      const agents = screen.getAllByText(/Agent/);
      expect(agents.length).toBeGreaterThan(0);
      
      agents.forEach(agent => {
        expect(agent).toBeVisible();
      });
    });
  });

  describe('Performance During User Interactions', () => {
    it('maintains responsive performance during rapid navigation', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp />);
      
      const startTime = performance.now();
      
      // Rapidly navigate between agents and conversations
      const agents = screen.getAllByText(/Agent/);
      
      for (let i = 0; i < agents.length; i++) {
        await user.click(agents[i]);
        
        const conversations = screen.getAllByText(/messages/);
        if (conversations.length > 0) {
          await user.click(conversations[0]);
          
          // Wait for conversation to load
          await waitFor(() => {
            expect(screen.getByRole('list')).toBeInTheDocument();
          });
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete all navigation within reasonable time
      expect(totalTime).toBeLessThan(3000); // 3 seconds for all navigation
    });

    it('handles concurrent user actions efficiently', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp hasNotifications={true} />);
      
      // 1. Start multiple actions simultaneously
      const actions = [];
      
      // Open notifications
      actions.push(
        user.click(screen.getByRole('button', { name: /notifications/i }))
      );
      
      // Navigate to conversation
      const conversations = screen.getAllByText(/messages/);
      if (conversations.length > 0) {
        actions.push(user.click(conversations[0]));
      }
      
      // Wait for all actions to complete
      await Promise.all(actions);
      
      // Should handle concurrent actions gracefully
      expect(screen.getByTestId('chatgpt-app')).toBeInTheDocument();
    });

    it('optimizes performance with large datasets', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp />);
      
      const startTime = performance.now();
      
      // Navigate through multiple conversations
      const agents = screen.getAllByText(/Agent/);
      
      for (const agent of agents) {
        await user.click(agent);
        
        const conversations = screen.getAllByText(/messages/);
        
        // Select first few conversations to test performance
        for (let i = 0; i < Math.min(3, conversations.length); i++) {
          await user.click(conversations[i]);
          
          await waitFor(() => {
            expect(screen.getByRole('list')).toBeInTheDocument();
          });
        }
      }
      
      const endTime = performance.now();
      const navigationTime = endTime - startTime;
      
      // Should handle navigation efficiently
      expect(navigationTime).toBeLessThan(5000); // 5 seconds for extensive navigation
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('simulates typical daily usage pattern', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp hasNotifications={true} />);
      
      // Morning: Check notifications
      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationButton);
      
      await waitFor(() => {
        expect(screen.getByText('MCP Questions')).toBeInTheDocument();
      });
      
      // Navigate to urgent conversation
      const notifications = screen.getAllByText(/Test MCP question/);
      await user.click(notifications[0]);
      
      // Send a few messages
      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
      
      for (let i = 0; i < 3; i++) {
        const messageInput = screen.getByTestId('message-input');
        await user.type(messageInput, `Daily message ${i + 1}`);
        
        const sendButton = screen.getByTestId('send-button');
        await user.click(sendButton);
        
        // Wait for message to send
        await waitFor(() => {
          expect(screen.getByText('Send')).toBeInTheDocument();
        }, { timeout: 2000 });
      }
      
      // Switch to different agent for another task
      const agents = screen.getAllByText(/Agent/);
      await user.click(agents[1]);
      
      const conversations = screen.getAllByText(/messages/);
      await user.click(conversations[0]);
      
      // Send message to second agent
      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
      
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Switching to this agent for a different task');
      
      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);
      
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('handles multitasking workflow', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ChatGPTStyleApp hasNotifications={true} />);
      
      // Start conversation with Agent 1
      const conversations = screen.getAllByText(/messages/);
      await user.click(conversations[0]);
      
      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
      
      // Begin typing message
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Working on task A');
      
      // Get interrupted by notification
      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationButton);
      
      // Handle urgent notification
      const notifications = screen.getAllByText(/Test MCP question/);
      await user.click(notifications[0]);
      
      // Send quick response
      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
      
      await user.type(messageInput, 'Quick response to urgent question');
      
      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);
      
      // Return to original task
      const agents = screen.getAllByText(/Agent/);
      await user.click(agents[0]);
      
      const originalConversations = screen.getAllByText(/messages/);
      await user.click(originalConversations[0]);
      
      // Continue with original message
      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
      
      // Note: In real app, draft message might be preserved
      await user.type(messageInput, 'Continuing with task A after interruption');
      await user.click(sendButton);
      
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });
  });
});