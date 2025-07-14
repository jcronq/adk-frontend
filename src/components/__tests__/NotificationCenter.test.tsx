import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  checkAccessibility,
  simulateMediaQuery
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';
import NotificationCenter from '../NotificationCenter';

// Mock the useNotifications hook
const mockNotifications = MockDataFactory.createMCPQuestions(5, ['Agent 1', 'Agent 2']).map(q => ({
  id: `notification-${q.id}`,
  questionId: q.id,
  question: q.question,
  status: 'pending' as const,
  timestamp: Date.now(),
  agentName: q.agentName,
  conversationId: q.conversationId,
}));

const mockNotificationContext = {
  notifications: mockNotifications,
  unreadCount: 3,
  markAsDisplayed: jest.fn(),
  markAsAnswered: jest.fn(),
  removeNotification: jest.fn(),
  clearAllNotifications: jest.fn(),
};

jest.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationContext,
}));

describe('NotificationCenter Component', () => {
  const defaultProps = {
    onQuestionClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Trigger Button', () => {
    it('renders notification trigger button', () => {
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      expect(triggerButton).toBeInTheDocument();
    });

    it('displays correct badge count', () => {
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('caps badge count at 99', () => {
      Object.assign(mockNotificationContext, { unreadCount: 150 });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('hides badge when count is zero', () => {
      Object.assign(mockNotificationContext, { unreadCount: 0 });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('opens menu when trigger button clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Menu Content', () => {
    it('displays menu header with title and count', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByText('MCP Questions')).toBeInTheDocument();
      expect(screen.getByText('3 unread notifications')).toBeInTheDocument();
    });

    it('shows clear all button when notifications exist', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByLabelText('Clear all notifications')).toBeInTheDocument();
    });

    it('displays all notifications in list', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      mockNotifications.forEach(notification => {
        expect(screen.getByText(notification.question)).toBeInTheDocument();
      });
    });

    it('shows empty state when no notifications', async () => {
      const user = setupUserEvent();
      Object.assign(mockNotificationContext, { notifications: [], unreadCount: 0 });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByText(/no mcp questions yet/i)).toBeInTheDocument();
    });
  });

  describe('Notification Items', () => {
    it('displays notification details correctly', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const firstNotification = mockNotifications[0];
      expect(screen.getByText(firstNotification.question)).toBeInTheDocument();
      expect(screen.getByText(firstNotification.agentName!)).toBeInTheDocument();
    });

    it('shows status indicators for different notification states', async () => {
      const user = setupUserEvent();
      
      // Mock notifications with different statuses
      const mixedNotifications = [
        { ...mockNotifications[0], status: 'pending' as const },
        { ...mockNotifications[1], status: 'displayed' as const },
        { ...mockNotifications[2], status: 'answered' as const },
      ];
      
      Object.assign(mockNotificationContext, { notifications: mixedNotifications });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Seen')).toBeInTheDocument();
      expect(screen.getByText('Answered')).toBeInTheDocument();
    });

    it('formats timestamps correctly', async () => {
      const user = setupUserEvent();
      
      const recentNotification = {
        ...mockNotifications[0],
        timestamp: Date.now() - 30000 // 30 seconds ago
      };
      
      Object.assign(mockNotificationContext, { 
        notifications: [recentNotification, ...mockNotifications.slice(1)]
      });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onQuestionClick when notification is clicked', async () => {
      const user = setupUserEvent();
      const onQuestionClick = jest.fn();
      
      renderWithProviders(
        <NotificationCenter onQuestionClick={onQuestionClick} />, 
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const firstNotification = screen.getByText(mockNotifications[0].question);
      await user.click(firstNotification);
      
      expect(onQuestionClick).toHaveBeenCalledWith(
        mockNotifications[0].questionId,
        mockNotifications[0].agentName,
        mockNotifications[0].conversationId
      );
    });

    it('marks notification as answered when answer button clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const answerButtons = screen.getAllByRole('button', { name: /mark as answered/i });
      await user.click(answerButtons[0]);
      
      expect(mockNotificationContext.markAsAnswered).toHaveBeenCalledWith(
        mockNotifications[0].questionId
      );
    });

    it('removes notification when remove button clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const removeButtons = screen.getAllByRole('button', { name: /remove notification/i });
      await user.click(removeButtons[0]);
      
      expect(mockNotificationContext.removeNotification).toHaveBeenCalledWith(
        mockNotifications[0].id
      );
    });

    it('clears all notifications when clear all button clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const clearAllButton = screen.getByLabelText('Clear all notifications');
      await user.click(clearAllButton);
      
      expect(mockNotificationContext.clearAllNotifications).toHaveBeenCalledTimes(1);
    });

    it('closes menu when clicking outside', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Click outside the menu
      await user.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pending Notifications Auto-Display', () => {
    it('marks pending notifications as displayed when menu opens', async () => {
      const user = setupUserEvent();
      
      const pendingNotifications = mockNotifications.map(n => ({ 
        ...n, 
        status: 'pending' as const 
      }));
      
      Object.assign(mockNotificationContext, { notifications: pendingNotifications });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      // Should mark all pending notifications as displayed
      expect(mockNotificationContext.markAsDisplayed).toHaveBeenCalledTimes(
        pendingNotifications.length
      );
    });

    it('does not mark already displayed notifications', async () => {
      const user = setupUserEvent();
      
      const displayedNotifications = mockNotifications.map(n => ({ 
        ...n, 
        status: 'displayed' as const 
      }));
      
      Object.assign(mockNotificationContext, { notifications: displayedNotifications });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(mockNotificationContext.markAsDisplayed).not.toHaveBeenCalled();
    });
  });

  describe('Menu Positioning and Styling', () => {
    it('positions menu correctly relative to trigger', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      
      // Menu should have proper width and max height
      expect(menu).toHaveStyle({
        width: '400px',
        maxHeight: '500px'
      });
    });

    it('makes menu scrollable when content overflows', async () => {
      const user = setupUserEvent();
      
      // Create many notifications to test overflow
      const manyNotifications = Array.from({ length: 20 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`,
        questionId: `question-${i}`,
        question: `Test question ${i}`
      }));
      
      Object.assign(mockNotificationContext, { notifications: manyNotifications });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const menu = screen.getByRole('menu');
      expect(menu).toHaveStyle({ overflow: 'auto' });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      expect(triggerButton).toHaveAttribute('aria-label', 'MCP Notifications');
      
      await user.click(triggerButton);
      
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-labelledby');
    });

    it('passes accessibility audit', async () => {
      const user = setupUserEvent();
      
      const { container } = renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      await checkAccessibility(container);
    });

    it('supports keyboard navigation', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      
      // Focus and open with keyboard
      triggerButton.focus();
      await user.keyboard('{Enter}');
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Should be able to tab through interactive elements
      await user.tab();
      
      const clearAllButton = screen.getByLabelText('Clear all notifications');
      expect(clearAllButton).toHaveFocus();
    });

    it('closes menu with Escape key', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing onQuestionClick prop gracefully', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const firstNotification = screen.getByText(mockNotifications[0].question);
      
      expect(() => user.click(firstNotification)).not.toThrow();
    });

    it('handles malformed notification data', async () => {
      const user = setupUserEvent();
      
      const malformedNotifications = [
        { id: 'bad-1', questionId: null, question: null, status: 'pending' },
        { id: 'bad-2', questionId: '', question: '', status: 'answered' },
      ];
      
      Object.assign(mockNotificationContext, { 
        notifications: malformedNotifications as any 
      });
      
      expect(() => {
        renderWithProviders(<NotificationCenter {...defaultProps} />, {
          withNotificationProvider: false
        });
      }).not.toThrow();
    });

    it('handles extremely long notification text', async () => {
      const user = setupUserEvent();
      
      const longNotification = {
        ...mockNotifications[0],
        question: 'A'.repeat(1000) // Very long question
      };
      
      Object.assign(mockNotificationContext, { 
        notifications: [longNotification] 
      });
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      // Should render without breaking layout
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('maintains state during rapid open/close cycles', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      
      // Rapid open/close cycles
      for (let i = 0; i < 5; i++) {
        await user.click(triggerButton);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        
        await user.keyboard('{Escape}');
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      }
      
      // Should still work normally
      await user.click(triggerButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large notification lists', async () => {
      const user = setupUserEvent();
      
      const largeNotificationList = Array.from({ length: 100 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`,
        questionId: `question-${i}`,
        question: `Performance test question ${i}`
      }));
      
      Object.assign(mockNotificationContext, { notifications: largeNotificationList });
      
      const startTime = performance.now();
      
      renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('updates efficiently when notification list changes', () => {
      const { rerender } = renderWithProviders(<NotificationCenter {...defaultProps} />, {
        withNotificationProvider: false
      });
      
      const startTime = performance.now();
      
      // Simulate rapid notification updates
      for (let i = 0; i < 50; i++) {
        Object.assign(mockNotificationContext, {
          notifications: mockNotifications.slice(0, i % 5 + 1),
          unreadCount: i % 5 + 1
        });
        
        rerender(<NotificationCenter {...defaultProps} />);
      }
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      expect(updateTime).toBeLessThan(500); // Should update efficiently
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });
  });
});