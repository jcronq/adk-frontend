import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';
import { 
  NotificationProvider, 
  useNotifications,
  NotificationContext 
} from '../NotificationContext';

describe('NotificationContext', () => {
  // Mock localStorage
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    jest.clearAllMocks();
  });

  describe('NotificationProvider', () => {
    it('provides notification context to children', () => {
      const TestComponent = () => {
        const context = useNotifications();
        return <div data-testid="test">{context.notifications.length}</div>;
      };

      renderWithProviders(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
        { withNotificationProvider: false }
      );

      expect(screen.getByTestId('test')).toBeInTheDocument();
    });

    it('throws error when used outside provider', () => {
      const TestComponent = () => {
        useNotifications();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderWithProviders(<TestComponent />, { 
          withNotificationProvider: false 
        });
      }).toThrow('useNotifications must be used within a NotificationProvider');

      consoleSpy.mockRestore();
    });

    it('loads notifications from localStorage on mount', () => {
      const savedNotifications = MockDataFactory.createMCPQuestions(3);
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedNotifications));

      const TestComponent = () => {
        const { notifications } = useNotifications();
        return <div data-testid="count">{notifications.length}</div>;
      };

      renderWithProviders(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
        { withNotificationProvider: false }
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mcpNotifications');
      expect(screen.getByTestId('count')).toHaveTextContent('3');
    });

    it('handles corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponent = () => {
        const { notifications } = useNotifications();
        return <div data-testid="count">{notifications.length}</div>;
      };

      renderWithProviders(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
        { withNotificationProvider: false }
      );

      expect(screen.getByTestId('count')).toHaveTextContent('0');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading notifications from localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('saves notifications to localStorage when they change', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const newQuestion = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(newQuestion, 'Test Agent', 'test-conversation');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mcpNotifications',
        expect.stringContaining(newQuestion.id)
      );
    });
  });

  describe('useNotifications hook', () => {
    it('provides initial empty state', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('calculates unread count correctly', () => {
      const savedNotifications = [
        MockDataFactory.createMCPQuestion({ 
          id: '1', 
          isAnswered: false 
        }),
        MockDataFactory.createMCPQuestion({ 
          id: '2', 
          isAnswered: true 
        }),
        MockDataFactory.createMCPQuestion({ 
          id: '3', 
          isAnswered: false 
        }),
      ];

      // Transform to notification format
      const notifications = savedNotifications.map(q => ({
        id: `notification-${q.id}`,
        questionId: q.id,
        question: q.question,
        status: q.isAnswered ? 'answered' as const : 'pending' as const,
        timestamp: Date.now(),
        agentName: q.agentName,
        conversationId: q.conversationId,
      }));

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(notifications));

      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      expect(result.current.unreadCount).toBe(2); // Only non-answered notifications
    });
  });

  describe('addNotification', () => {
    it('adds new notification for MCP question', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        questionId: question.id,
        question: question.question,
        status: 'pending',
        agentName: 'Test Agent',
        conversationId: 'test-conversation',
      });
    });

    it('prevents duplicate notifications for same question', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Notification for question ${question.id} already exists`
      );

      consoleSpy.mockRestore();
    });

    it('handles optional parameters gracefully', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        questionId: question.id,
        agentName: undefined,
        conversationId: undefined,
      });
    });
  });

  describe('markAsDisplayed', () => {
    it('changes notification status from pending to displayed', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.markAsDisplayed(notificationId);
      });

      expect(result.current.notifications[0].status).toBe('displayed');
    });

    it('updates unread count when marking as displayed', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      expect(result.current.unreadCount).toBe(1);

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.markAsDisplayed(notificationId);
      });

      expect(result.current.unreadCount).toBe(1); // Still counts as unread until answered
    });

    it('handles non-existent notification ID gracefully', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      act(() => {
        result.current.markAsDisplayed('non-existent-id');
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('markAsAnswered', () => {
    it('changes notification status to answered', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      act(() => {
        result.current.markAsAnswered(question.id);
      });

      expect(result.current.notifications[0].status).toBe('answered');
    });

    it('reduces unread count when marking as answered', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      expect(result.current.unreadCount).toBe(1);

      act(() => {
        result.current.markAsAnswered(question.id);
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('logs when question is marked as answered', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      act(() => {
        result.current.markAsAnswered(question.id);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        `Marked question ${question.id} as answered`
      );

      consoleSpy.mockRestore();
    });

    it('handles non-existent question ID gracefully', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      act(() => {
        result.current.markAsAnswered('non-existent-question');
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('removeNotification', () => {
    it('removes notification from list', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('updates unread count when removing notification', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      expect(result.current.unreadCount).toBe(1);

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('handles non-existent notification ID gracefully', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      act(() => {
        result.current.removeNotification('non-existent-id');
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  describe('clearAllNotifications', () => {
    it('removes all notifications', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const questions = MockDataFactory.createMCPQuestions(3);

      questions.forEach(question => {
        act(() => {
          result.current.addNotification(question, 'Test Agent', 'test-conversation');
        });
      });

      expect(result.current.notifications).toHaveLength(3);

      act(() => {
        result.current.clearAllNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.unreadCount).toBe(0);
    });

    it('clears localStorage when clearing all notifications', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      act(() => {
        result.current.clearAllNotifications();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mcpNotifications');
    });
  });

  describe('getNotificationByQuestionId', () => {
    it('returns notification for existing question ID', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      const foundNotification = result.current.getNotificationByQuestionId(question.id);

      expect(foundNotification).toBeDefined();
      expect(foundNotification?.questionId).toBe(question.id);
    });

    it('returns undefined for non-existent question ID', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const foundNotification = result.current.getNotificationByQuestionId('non-existent');

      expect(foundNotification).toBeUndefined();
    });
  });

  describe('Complex scenarios', () => {
    it('handles multiple notifications with different statuses', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const questions = MockDataFactory.createMCPQuestions(4);

      // Add notifications
      questions.forEach(question => {
        act(() => {
          result.current.addNotification(question, 'Test Agent', 'test-conversation');
        });
      });

      expect(result.current.notifications).toHaveLength(4);
      expect(result.current.unreadCount).toBe(4);

      // Mark some as displayed
      act(() => {
        result.current.markAsDisplayed(result.current.notifications[0].id);
        result.current.markAsDisplayed(result.current.notifications[1].id);
      });

      expect(result.current.unreadCount).toBe(4); // Still unread until answered

      // Mark some as answered
      act(() => {
        result.current.markAsAnswered(questions[0].id);
        result.current.markAsAnswered(questions[1].id);
      });

      expect(result.current.unreadCount).toBe(2); // Only unanswered count as unread
    });

    it('maintains notification order with newest first', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question1 = MockDataFactory.createMCPQuestion({ id: 'question-1' });
      const question2 = MockDataFactory.createMCPQuestion({ id: 'question-2' });

      act(() => {
        result.current.addNotification(question1, 'Agent 1', 'conversation-1');
      });

      // Small delay to ensure different timestamps
      setTimeout(() => {
        act(() => {
          result.current.addNotification(question2, 'Agent 2', 'conversation-2');
        });
      }, 1);

      // Most recent notification should be first
      expect(result.current.notifications[0].questionId).toBe('question-2');
      expect(result.current.notifications[1].questionId).toBe('question-1');
    });

    it('persists state across provider re-mounts', () => {
      const notifications = MockDataFactory.createMCPQuestions(2).map(q => ({
        id: `notification-${q.id}`,
        questionId: q.id,
        question: q.question,
        status: 'pending' as const,
        timestamp: Date.now(),
        agentName: q.agentName,
        conversationId: q.conversationId,
      }));

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(notifications));

      const { result: result1, unmount } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      expect(result1.current.notifications).toHaveLength(2);

      unmount();

      const { result: result2 } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      expect(result2.current.notifications).toHaveLength(2);
    });
  });

  describe('Performance and edge cases', () => {
    it('handles large numbers of notifications efficiently', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const startTime = performance.now();

      // Add 100 notifications
      const questions = MockDataFactory.createMCPQuestions(100);
      questions.forEach(question => {
        act(() => {
          result.current.addNotification(question, 'Test Agent', 'test-conversation');
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.current.notifications).toHaveLength(100);
      expect(result.current.unreadCount).toBe(100);
    });

    it('handles rapid state changes efficiently', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => (
          <NotificationProvider>{children}</NotificationProvider>
        ),
      });

      const question = MockDataFactory.createMCPQuestion();

      // Rapid state changes
      act(() => {
        result.current.addNotification(question, 'Test Agent', 'test-conversation');
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.markAsDisplayed(notificationId);
        result.current.markAsAnswered(question.id);
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });
});