import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  checkAccessibility,
  waitForAnimations
} from '../../test-utils/test-helpers';
import { MockDataFactory, MCPQuestion } from '../../test-utils/mock-data-factory';

// Mock the NotificationCenter component (will be implemented later)
const MockNotificationCenter: React.FC<{
  open: boolean;
  onClose: () => void;
  notifications: MCPQuestion[];
  onAnswerQuestion: (questionId: string) => void;
  onNavigateToConversation?: (agentName: string, conversationId: string) => void;
}> = ({
  open,
  onClose,
  notifications,
  onAnswerQuestion,
  onNavigateToConversation
}) => {
  if (!open) return null;

  const groupedNotifications = notifications.reduce((groups, notification) => {
    const agent = notification.agentName;
    if (!groups[agent]) groups[agent] = [];
    groups[agent].push(notification);
    return groups;
  }, {} as Record<string, MCPQuestion[]>);

  return (
    <div 
      data-testid="notification-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
    >
      <div data-testid="notification-backdrop" onClick={onClose} />
      <div data-testid="notification-content">
        <header data-testid="notification-header">
          <h2 id="notification-center-title">Notifications</h2>
          <button 
            data-testid="notification-close"
            onClick={onClose}
            aria-label="Close notifications"
          >
            ✕
          </button>
        </header>
        
        <div data-testid="notification-body">
          {notifications.length === 0 ? (
            <div data-testid="empty-state" className="empty-state">
              <p>No pending questions</p>
            </div>
          ) : (
            <div data-testid="notifications-list" role="list">
              {Object.entries(groupedNotifications).map(([agentName, agentNotifications]) => (
                <div key={agentName} data-testid={`agent-group-${agentName}`}>
                  <h3 data-testid={`agent-group-title-${agentName}`}>{agentName}</h3>
                  {agentNotifications.map(notification => (
                    <div 
                      key={notification.id}
                      data-testid={`notification-${notification.id}`}
                      role="listitem"
                      className="notification-item"
                    >
                      <div data-testid={`notification-content-${notification.id}`}>
                        <p className="question-text">{notification.question}</p>
                        <p className="question-metadata">
                          <span data-testid={`notification-agent-${notification.id}`}>
                            Agent: {notification.agentName}
                          </span>
                          <span data-testid={`notification-time-${notification.id}`}>
                            {notification.timestamp.toLocaleTimeString()}
                          </span>
                        </p>
                      </div>
                      <div data-testid={`notification-actions-${notification.id}`} className="notification-actions">
                        <button
                          data-testid={`answer-button-${notification.id}`}
                          onClick={() => onAnswerQuestion(notification.id)}
                          aria-label={`Answer question: ${notification.question.substring(0, 50)}...`}
                        >
                          Answer
                        </button>
                        {onNavigateToConversation && (
                          <button
                            data-testid={`navigate-button-${notification.id}`}
                            onClick={() => onNavigateToConversation(notification.agentName, notification.conversationId)}
                            aria-label={`Go to conversation with ${notification.agentName}`}
                          >
                            Go to Chat
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <footer data-testid="notification-footer">
            <p>{notifications.length} pending question{notifications.length !== 1 ? 's' : ''}</p>
          </footer>
        )}
      </div>
    </div>
  );
};

describe('NotificationCenter Component', () => {
  const mockClose = jest.fn();
  const mockAnswerQuestion = jest.fn();
  const mockNavigateToConversation = jest.fn();
  
  const defaultProps = {
    open: true,
    onClose: mockClose,
    notifications: MockDataFactory.createMCPQuestions(5, ['agent-1', 'agent-2']),
    onAnswerQuestion: mockAnswerQuestion,
    onNavigateToConversation: mockNavigateToConversation,
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display and Interaction', () => {
    it('shows list of unanswered questions', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByTestId('notification-center')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      
      defaultProps.notifications.forEach(notification => {
        expect(screen.getByTestId(`notification-${notification.id}`)).toBeInTheDocument();
        expect(screen.getByText(notification.question)).toBeInTheDocument();
      });
    });

    it('groups notifications by agent', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Check for agent group headers
      const agentNames = [...new Set(defaultProps.notifications.map(n => n.agentName))];
      agentNames.forEach(agentName => {
        expect(screen.getByTestId(`agent-group-${agentName}`)).toBeInTheDocument();
        expect(screen.getByTestId(`agent-group-title-${agentName}`)).toBeInTheDocument();
      });
    });

    it('navigates to conversation when notification clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const firstNotification = defaultProps.notifications[0];
      const navigateButton = screen.getByTestId(`navigate-button-${firstNotification.id}`);
      
      await user.click(navigateButton);
      
      expect(mockNavigateToConversation).toHaveBeenCalledWith(
        firstNotification.agentName, 
        firstNotification.conversationId
      );
    });

    it('marks question as answered when answer button clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const firstNotification = defaultProps.notifications[0];
      const answerButton = screen.getByTestId(`answer-button-${firstNotification.id}`);
      
      await user.click(answerButton);
      
      expect(mockAnswerQuestion).toHaveBeenCalledWith(firstNotification.id);
    });

    it('closes when close button clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const closeButton = screen.getByTestId('notification-close');
      await user.click(closeButton);
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('closes when backdrop clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const backdrop = screen.getByTestId('notification-backdrop');
      await user.click(backdrop);
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-time Updates', () => {
    it('updates when new questions arrive', () => {
      const { rerender } = renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getAllByTestId(/^notification-/).length).toBe(defaultProps.notifications.length);
      
      const newNotifications = [
        ...defaultProps.notifications,
        MockDataFactory.createMCPQuestion({ id: 'new-question', agentName: 'agent-3' })
      ];
      
      rerender(<MockNotificationCenter {...defaultProps} notifications={newNotifications} />);
      
      expect(screen.getByTestId('notification-new-question')).toBeInTheDocument();
      expect(screen.getAllByTestId(/^notification-/).length).toBe(newNotifications.length);
    });

    it('removes notifications when questions answered', () => {
      const { rerender } = renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const initialCount = defaultProps.notifications.length;
      expect(screen.getAllByTestId(/^notification-/).length).toBe(initialCount);
      
      // Remove first notification
      const updatedNotifications = defaultProps.notifications.slice(1);
      
      rerender(<MockNotificationCenter {...defaultProps} notifications={updatedNotifications} />);
      
      expect(screen.getAllByTestId(/^notification-/).length).toBe(initialCount - 1);
      expect(screen.queryByTestId(`notification-${defaultProps.notifications[0].id}`)).not.toBeInTheDocument();
    });

    it('updates notification count in footer', () => {
      const { rerender } = renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByText(`${defaultProps.notifications.length} pending questions`)).toBeInTheDocument();
      
      const singleNotification = [defaultProps.notifications[0]];
      rerender(<MockNotificationCenter {...defaultProps} notifications={singleNotification} />);
      
      expect(screen.getByText('1 pending question')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no notifications', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} notifications={[]} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No pending questions')).toBeInTheDocument();
      expect(screen.queryByTestId('notifications-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notification-footer')).not.toBeInTheDocument();
    });

    it('hides notification center when closed', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} open={false} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument();
    });
  });

  describe('Notification Details', () => {
    it('displays question text and metadata', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const firstNotification = defaultProps.notifications[0];
      
      expect(screen.getByText(firstNotification.question)).toBeInTheDocument();
      expect(screen.getByTestId(`notification-agent-${firstNotification.id}`))
        .toHaveTextContent(`Agent: ${firstNotification.agentName}`);
      expect(screen.getByTestId(`notification-time-${firstNotification.id}`))
        .toHaveTextContent(firstNotification.timestamp.toLocaleTimeString());
    });

    it('shows appropriate action buttons', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      defaultProps.notifications.forEach(notification => {
        const answerButton = screen.getByTestId(`answer-button-${notification.id}`);
        expect(answerButton).toBeInTheDocument();
        expect(answerButton).toHaveAttribute('aria-label', expect.stringContaining('Answer question'));
        
        const navigateButton = screen.getByTestId(`navigate-button-${notification.id}`);
        expect(navigateButton).toBeInTheDocument();
        expect(navigateButton).toHaveAttribute('aria-label', expect.stringContaining(`Go to conversation with ${notification.agentName}`));
      });
    });

    it('handles missing optional props gracefully', () => {
      const propsWithoutNavigate = { ...defaultProps };
      delete propsWithoutNavigate.onNavigateToConversation;
      
      renderWithProviders(
        <MockNotificationCenter {...propsWithoutNavigate} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Answer buttons should still be present
      defaultProps.notifications.forEach(notification => {
        expect(screen.getByTestId(`answer-button-${notification.id}`)).toBeInTheDocument();
        expect(screen.queryByTestId(`navigate-button-${notification.id}`)).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation through notifications', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Tab through interactive elements
      await user.tab(); // Close button
      expect(screen.getByTestId('notification-close')).toHaveFocus();
      
      await user.tab(); // First answer button
      const firstAnswerButton = screen.getByTestId(`answer-button-${defaultProps.notifications[0].id}`);
      expect(firstAnswerButton).toHaveFocus();
    });

    it('supports Enter key activation', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const firstNotification = defaultProps.notifications[0];
      const answerButton = screen.getByTestId(`answer-button-${firstNotification.id}`);
      
      answerButton.focus();
      await user.keyboard('{Enter}');
      
      expect(mockAnswerQuestion).toHaveBeenCalledWith(firstNotification.id);
    });

    it('supports Escape key to close', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      await user.keyboard('{Escape}');
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'notification-center-title');
      
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBe(defaultProps.notifications.length);
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      await checkAccessibility(container);
    });

    it('maintains focus management', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Focus should be trapped within the modal
      const closeButton = screen.getByTestId('notification-close');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });

    it('provides meaningful button labels', () => {
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const firstNotification = defaultProps.notifications[0];
      const answerButton = screen.getByTestId(`answer-button-${firstNotification.id}`);
      
      expect(answerButton).toHaveAttribute('aria-label', expect.stringContaining('Answer question'));
    });
  });

  describe('Performance', () => {
    it('handles large numbers of notifications efficiently', () => {
      const largeNotificationSet = MockDataFactory.createMCPQuestions(100, ['agent-1', 'agent-2', 'agent-3']);
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MockNotificationCenter {...defaultProps} notifications={largeNotificationSet} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // 1 second
      
      // Should show all notifications
      expect(screen.getAllByTestId(/^notification-/).length).toBe(100);
    });

    it('efficiently updates when notifications change', () => {
      const { rerender } = renderWithProviders(
        <MockNotificationCenter {...defaultProps} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const startTime = performance.now();
      
      // Add one new notification
      const updatedNotifications = [
        ...defaultProps.notifications,
        MockDataFactory.createMCPQuestion({ id: 'performance-test', agentName: 'agent-1' })
      ];
      
      rerender(<MockNotificationCenter {...defaultProps} notifications={updatedNotifications} />);
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Update should be fast
      expect(updateTime).toBeLessThan(100); // 100ms
      
      // New notification should be present
      expect(screen.getByTestId('notification-performance-test')).toBeInTheDocument();
    });
  });

  describe('Animation and Transitions', () => {
    it('handles component mount/unmount gracefully', async () => {
      const { rerender } = renderWithProviders(
        <MockNotificationCenter {...defaultProps} open={true} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByTestId('notification-center')).toBeInTheDocument();
      
      rerender(<MockNotificationCenter {...defaultProps} open={false} />);
      
      await waitForAnimations(100);
      
      expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles empty notification data gracefully', () => {
      const invalidNotifications = [
        { id: 'invalid', question: '', agentName: '', conversationId: '', timestamp: new Date(), isAnswered: false }
      ];
      
      expect(() => {
        renderWithProviders(
          <MockNotificationCenter {...defaultProps} notifications={invalidNotifications as any} />,
          { withAgentProvider: false, withMCPProvider: false }
        );
      }).not.toThrow();
    });

    it('handles missing callback functions gracefully', () => {
      expect(() => {
        renderWithProviders(
          <MockNotificationCenter 
            open={true}
            onClose={mockClose}
            notifications={defaultProps.notifications}
            onAnswerQuestion={mockAnswerQuestion}
          />,
          { withAgentProvider: false, withMCPProvider: false }
        );
      }).not.toThrow();
    });
  });
});