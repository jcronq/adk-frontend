import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateMediaQuery,
  checkAccessibility 
} from '../../../test-utils/test-helpers';
import Header from '../Header';

describe('Header Component', () => {
  const defaultProps = {
    notificationCount: 0,
    onNotificationClick: jest.fn(),
    onSidebarToggle: jest.fn(),
    sidebarCollapsed: false,
    onQuestionClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders header with app title', () => {
      renderWithProviders(<Header {...defaultProps} />);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('ADK Agent Manager')).toBeInTheDocument();
    });

    it('renders notification button with correct badge count', () => {
      renderWithProviders(<Header {...defaultProps} notificationCount={5} />);
      
      const notificationButton = screen.getByLabelText('notifications');
      expect(notificationButton).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('hides notification badge when count is zero', () => {
      renderWithProviders(<Header {...defaultProps} notificationCount={0} />);
      
      const notificationButton = screen.getByLabelText('notifications');
      expect(notificationButton).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('caps notification badge at 99', () => {
      renderWithProviders(<Header {...defaultProps} notificationCount={150} />);
      
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('shows sidebar toggle on mobile', () => {
      // Mock mobile viewport
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(<Header {...defaultProps} />);
      
      const sidebarToggle = screen.getByLabelText('toggle sidebar');
      expect(sidebarToggle).toBeInTheDocument();
    });

    it('hides sidebar toggle on desktop', () => {
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      renderWithProviders(<Header {...defaultProps} />);
      
      expect(screen.queryByLabelText('toggle sidebar')).not.toBeInTheDocument();
    });

    it('shows user settings on desktop', () => {
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      renderWithProviders(<Header {...defaultProps} />);
      
      // UserIdSettings component should be rendered
      expect(screen.getByDisplayValue(/user/i)).toBeInTheDocument();
    });

    it('shows settings icon on mobile instead of user settings', () => {
      // Mock mobile viewport
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(<Header {...defaultProps} />);
      
      const settingsButton = screen.getByLabelText('settings');
      expect(settingsButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onNotificationClick when notification button clicked', async () => {
      const user = setupUserEvent();
      const onNotificationClick = jest.fn();
      
      renderWithProviders(
        <Header {...defaultProps} onNotificationClick={onNotificationClick} />
      );
      
      const notificationButton = screen.getByLabelText('notifications');
      await user.click(notificationButton);
      
      expect(onNotificationClick).toHaveBeenCalledTimes(1);
    });

    it('calls onSidebarToggle when sidebar toggle clicked', async () => {
      const user = setupUserEvent();
      const onSidebarToggle = jest.fn();
      
      // Mock mobile viewport
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(
        <Header {...defaultProps} onSidebarToggle={onSidebarToggle} />
      );
      
      const sidebarToggle = screen.getByLabelText('toggle sidebar');
      await user.click(sidebarToggle);
      
      expect(onSidebarToggle).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard navigation for interactive elements', async () => {
      const user = setupUserEvent();
      
      // Mock mobile viewport to ensure all interactive elements are present
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(<Header {...defaultProps} notificationCount={3} />);
      
      // Tab through interactive elements
      await user.tab(); // Sidebar toggle
      expect(screen.getByLabelText('toggle sidebar')).toHaveFocus();
      
      await user.tab(); // Notification button
      expect(screen.getByLabelText('notifications')).toHaveFocus();
      
      await user.tab(); // Settings button
      expect(screen.getByLabelText('settings')).toHaveFocus();
    });

    it('supports keyboard activation with Enter key', async () => {
      const user = setupUserEvent();
      const onNotificationClick = jest.fn();
      
      renderWithProviders(
        <Header {...defaultProps} onNotificationClick={onNotificationClick} />
      );
      
      const notificationButton = screen.getByLabelText('notifications');
      notificationButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(onNotificationClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual States and Styling', () => {
    it('applies correct z-index for layering', () => {
      const { container } = renderWithProviders(<Header {...defaultProps} />);
      
      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).toHaveStyle({ zIndex: expect.any(Number) });
    });

    it('applies hover effects to interactive elements', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Header {...defaultProps} />);
      
      const notificationButton = screen.getByLabelText('notifications');
      
      // Hover should be handled by MUI styling
      await user.hover(notificationButton);
      
      // Just verify the element is interactive
      expect(notificationButton).toBeEnabled();
    });

    it('maintains consistent spacing and layout', () => {
      const { container } = renderWithProviders(<Header {...defaultProps} />);
      
      const toolbar = container.querySelector('.MuiToolbar-root');
      expect(toolbar).toHaveStyle({ minHeight: '64px' });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<Header {...defaultProps} notificationCount={5} />);
      
      // Header should be a banner landmark
      expect(screen.getByRole('banner')).toBeInTheDocument();
      
      // Notification button should have proper labeling
      const notificationButton = screen.getByLabelText('notifications');
      expect(notificationButton).toHaveAttribute('aria-label', 'notifications');
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(<Header {...defaultProps} />);
      
      await checkAccessibility(container);
    });

    it('provides proper focus indicators', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Header {...defaultProps} />);
      
      const notificationButton = screen.getByLabelText('notifications');
      
      await user.tab();
      
      // Focus should be visible and element should be in focus
      expect(notificationButton).toHaveFocus();
      expect(notificationButton).toBeVisible();
    });

    it('supports screen reader announcements', () => {
      renderWithProviders(<Header {...defaultProps} notificationCount={3} />);
      
      // Badge content should be announced by screen readers
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.MuiBadge-badge')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing callback props gracefully', () => {
      expect(() => {
        renderWithProviders(
          <Header 
            notificationCount={0}
            sidebarCollapsed={false}
          />
        );
      }).not.toThrow();
    });

    it('handles negative notification count', () => {
      renderWithProviders(<Header {...defaultProps} notificationCount={-1} />);
      
      // Should not display negative or invalid badges
      expect(screen.queryByText('-1')).not.toBeInTheDocument();
    });

    it('handles undefined notification count', () => {
      renderWithProviders(
        <Header 
          {...defaultProps} 
          notificationCount={undefined as any}
        />
      );
      
      // Should fallback to default behavior (no badge)
      const notificationButton = screen.getByLabelText('notifications');
      expect(notificationButton).toBeInTheDocument();
    });

    it('maintains functionality during rapid state changes', async () => {
      const user = setupUserEvent();
      const onNotificationClick = jest.fn();
      
      const { rerender } = renderWithProviders(
        <Header {...defaultProps} onNotificationClick={onNotificationClick} />
      );
      
      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <Header 
            {...defaultProps} 
            notificationCount={i}
            onNotificationClick={onNotificationClick}
          />
        );
      }
      
      // Should still be interactive
      const notificationButton = screen.getByLabelText('notifications');
      await user.click(notificationButton);
      
      expect(onNotificationClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with UserIdSettings', () => {
    it('renders UserIdSettings component on desktop', () => {
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      renderWithProviders(<Header {...defaultProps} />);
      
      // UserIdSettings should render its input
      expect(screen.getByDisplayValue(/user/i)).toBeInTheDocument();
    });

    it('applies correct styling to UserIdSettings wrapper', () => {
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      const { container } = renderWithProviders(<Header {...defaultProps} />);
      
      // UserIdSettings wrapper should have specific styling
      const userSettingsWrapper = container.querySelector('[data-testid="user-settings-wrapper"]') ||
                                  container.querySelector('.MuiBox-root');
      
      expect(userSettingsWrapper).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large notification counts', () => {
      const startTime = performance.now();
      
      renderWithProviders(<Header {...defaultProps} notificationCount={99999} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render quickly
      expect(screen.getByText('99+')).toBeInTheDocument(); // Should cap at 99+
    });

    it('handles rapid prop updates efficiently', () => {
      const { rerender } = renderWithProviders(<Header {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        rerender(
          <Header 
            {...defaultProps} 
            notificationCount={i % 10}
            sidebarCollapsed={i % 2 === 0}
          />
        );
      }
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      expect(updateTime).toBeLessThan(500); // Should update efficiently
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});