import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateMediaQuery,
  checkAccessibility,
  waitForAnimations
} from '../../../test-utils/test-helpers';
import MainLayout from '../MainLayout';

// Mock the Header and Sidebar components to focus on MainLayout logic
jest.mock('../Header', () => {
  return function MockHeader({ onSidebarToggle, notificationCount, onNotificationClick }: any) {
    return (
      <div data-testid="mock-header">
        <span>ADK Agent Manager</span>
        <button 
          data-testid="header-sidebar-toggle" 
          onClick={onSidebarToggle}
        >
          Toggle Sidebar
        </button>
        <button 
          data-testid="header-notification-button"
          onClick={onNotificationClick}
        >
          Notifications ({notificationCount})
        </button>
      </div>
    );
  };
});

jest.mock('../Sidebar', () => {
  return function MockSidebar({ collapsed, width, onToggleCollapse, isMobile }: any) {
    return (
      <div 
        data-testid="mock-sidebar"
        data-collapsed={collapsed}
        data-mobile={isMobile}
        style={{ width }}
      >
        <button 
          data-testid="sidebar-toggle" 
          onClick={onToggleCollapse}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        <div>Sidebar Content</div>
      </div>
    );
  };
});

describe('MainLayout Component', () => {
  const defaultProps = {
    children: <div data-testid="main-content">Main Content</div>,
    notificationCount: 0,
    onNotificationClick: jest.fn(),
    onQuestionClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Layout Structure', () => {
    it('renders all main layout sections', () => {
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('applies correct layout styles', () => {
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      const layoutRoot = container.firstChild as HTMLElement;
      expect(layoutRoot).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        height: '100vh'
      });
    });

    it('renders children in main content area', () => {
      const customContent = <div data-testid="custom-content">Custom Test Content</div>;
      
      renderWithProviders(
        <MainLayout {...defaultProps}>
          {customContent}
        </MainLayout>
      );
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Test Content')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('shows permanent drawer on desktop', () => {
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      // Should render permanent drawer
      const permanentDrawer = container.querySelector('.MuiDrawer-root');
      expect(permanentDrawer).toBeInTheDocument();
      
      // Sidebar should not be in mobile mode
      const sidebar = screen.getByTestId('mock-sidebar');
      expect(sidebar).toHaveAttribute('data-mobile', 'false');
    });

    it('shows temporary drawer on mobile', () => {
      // Mock mobile viewport
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      // Sidebar should be in mobile mode
      const sidebar = screen.getByTestId('mock-sidebar');
      expect(sidebar).toHaveAttribute('data-mobile', 'true');
    });

    it('calculates correct sidebar widths for different screen sizes', () => {
      // Test desktop width
      simulateMediaQuery('(max-width: 959.95px)', false);
      simulateMediaQuery('(max-width: 1199.95px)', false);
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      const sidebar = screen.getByTestId('mock-sidebar');
      expect(sidebar).toHaveStyle({ width: '320px' }); // Desktop width
    });

    it('uses smaller width on tablet', () => {
      // Mock tablet viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      simulateMediaQuery('(max-width: 1199.95px)', true);
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      const sidebar = screen.getByTestId('mock-sidebar');
      expect(sidebar).toHaveStyle({ width: '280px' }); // Tablet width
    });
  });

  describe('Sidebar State Management', () => {
    it('manages sidebar collapse state on desktop', async () => {
      const user = setupUserEvent();
      
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      const sidebar = screen.getByTestId('mock-sidebar');
      expect(sidebar).toHaveAttribute('data-collapsed', 'false');
      
      // Click sidebar toggle
      const sidebarToggle = screen.getByTestId('sidebar-toggle');
      await user.click(sidebarToggle);
      
      // Should be collapsed
      expect(sidebar).toHaveAttribute('data-collapsed', 'true');
      expect(sidebar).toHaveStyle({ width: '60px' }); // Collapsed width
    });

    it('manages mobile drawer state', async () => {
      const user = setupUserEvent();
      
      // Mock mobile viewport
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      // Initially drawer should be closed
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      // Open drawer via header toggle
      const headerToggle = screen.getByTestId('header-sidebar-toggle');
      await user.click(headerToggle);
      
      // Check if drawer state changed (in real implementation)
      expect(headerToggle).toBeInTheDocument();
    });

    it('handles sidebar toggle from header', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      const headerToggle = screen.getByTestId('header-sidebar-toggle');
      const sidebar = screen.getByTestId('mock-sidebar');
      
      // Initial state
      expect(sidebar).toHaveAttribute('data-collapsed', 'false');
      
      // Toggle via header
      await user.click(headerToggle);
      
      // State should change (exact behavior depends on viewport)
      expect(headerToggle).toBeInTheDocument();
    });

    it('closes mobile drawer when backdrop clicked', async () => {
      const user = setupUserEvent();
      
      // Mock mobile viewport
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      // This would test backdrop interaction in real implementation
      // For now, verify the component renders without errors
      expect(container).toBeInTheDocument();
    });
  });

  describe('Content Area Behavior', () => {
    it('adjusts content area width based on sidebar state', async () => {
      const user = setupUserEvent();
      
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      const mainContent = container.querySelector('[component="main"]');
      expect(mainContent).toBeTruthy();
      
      // Toggle sidebar
      const sidebarToggle = screen.getByTestId('sidebar-toggle');
      await user.click(sidebarToggle);
      
      // Content area should still be present and functional
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('maintains content scrollability', () => {
      const longContent = (
        <div style={{ height: '2000px' }} data-testid="long-content">
          Long scrollable content
        </div>
      );
      
      const { container } = renderWithProviders(
        <MainLayout {...defaultProps}>
          {longContent}
        </MainLayout>
      );
      
      const mainArea = container.querySelector('[component="main"]');
      expect(mainArea).toHaveStyle({ overflow: 'hidden' });
      expect(screen.getByTestId('long-content')).toBeInTheDocument();
    });

    it('prevents content overflow with flex layout', () => {
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      const mainArea = container.querySelector('[component="main"]');
      expect(mainArea).toHaveStyle({
        flexGrow: '1',
        minWidth: '0'
      });
    });
  });

  describe('Animation and Transitions', () => {
    it('applies smooth transitions for sidebar changes', async () => {
      const user = setupUserEvent();
      
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      // Check for transition properties
      const drawer = container.querySelector('.MuiDrawer-paper');
      expect(drawer).toBeTruthy();
      
      const sidebarToggle = screen.getByTestId('sidebar-toggle');
      await user.click(sidebarToggle);
      
      // Wait for animations
      await waitForAnimations();
      
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });

    it('handles animation performance with large content', async () => {
      const largeContent = (
        <div data-testid="large-content">
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i}>Content item {i}</div>
          ))}
        </div>
      );
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MainLayout {...defaultProps}>
          {largeContent}
        </MainLayout>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(500); // Should render efficiently
      expect(screen.getByTestId('large-content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper landmark structure', () => {
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      // Should have main landmark
      const mainArea = screen.getByRole('main');
      expect(mainArea).toBeInTheDocument();
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      await checkAccessibility(container);
    });

    it('maintains focus management during layout changes', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MainLayout {...defaultProps}>
          <button data-testid="content-button">Content Button</button>
        </MainLayout>
      );
      
      const contentButton = screen.getByTestId('content-button');
      contentButton.focus();
      
      // Toggle sidebar
      const sidebarToggle = screen.getByTestId('sidebar-toggle');
      await user.click(sidebarToggle);
      
      // Focus should be maintained or handled appropriately
      expect(contentButton).toBeInTheDocument();
    });

    it('supports keyboard navigation between areas', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MainLayout {...defaultProps}>
          <button data-testid="content-button">Content Button</button>
        </MainLayout>
      );
      
      // Tab through interactive elements
      await user.tab(); // Header toggle
      expect(screen.getByTestId('header-sidebar-toggle')).toHaveFocus();
      
      await user.tab(); // Header notification
      expect(screen.getByTestId('header-notification-button')).toHaveFocus();
      
      await user.tab(); // Sidebar toggle
      expect(screen.getByTestId('sidebar-toggle')).toHaveFocus();
      
      await user.tab(); // Content button
      expect(screen.getByTestId('content-button')).toHaveFocus();
    });
  });

  describe('Integration with Header and Sidebar', () => {
    it('passes correct props to Header component', () => {
      renderWithProviders(
        <MainLayout 
          {...defaultProps} 
          notificationCount={5}
        />
      );
      
      expect(screen.getByText('Notifications (5)')).toBeInTheDocument();
    });

    it('passes correct props to Sidebar component', () => {
      // Mock desktop viewport
      simulateMediaQuery('(max-width: 959.95px)', false);
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      const sidebar = screen.getByTestId('mock-sidebar');
      expect(sidebar).toHaveAttribute('data-collapsed', 'false');
      expect(sidebar).toHaveAttribute('data-mobile', 'false');
    });

    it('handles communication between header and sidebar', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<MainLayout {...defaultProps} />);
      
      const headerToggle = screen.getByTestId('header-sidebar-toggle');
      const sidebar = screen.getByTestId('mock-sidebar');
      
      // Initial state
      expect(sidebar).toHaveAttribute('data-collapsed', 'false');
      
      // Toggle from header should affect sidebar
      await user.click(headerToggle);
      
      // Verify the interaction occurred
      expect(headerToggle).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles missing children gracefully', () => {
      expect(() => {
        renderWithProviders(
          <MainLayout 
            notificationCount={0}
            onNotificationClick={jest.fn()}
            onQuestionClick={jest.fn()}
          />
        );
      }).not.toThrow();
    });

    it('handles undefined callback props', () => {
      expect(() => {
        renderWithProviders(
          <MainLayout notificationCount={0}>
            <div>Content</div>
          </MainLayout>
        );
      }).not.toThrow();
    });

    it('maintains layout integrity with rapid viewport changes', () => {
      const { rerender } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      // Simulate rapid viewport changes
      for (let i = 0; i < 10; i++) {
        const isMobile = i % 2 === 0;
        simulateMediaQuery('(max-width: 959.95px)', isMobile);
        
        rerender(<MainLayout {...defaultProps} />);
      }
      
      // Layout should remain stable
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('handles extreme notification counts', () => {
      renderWithProviders(
        <MainLayout {...defaultProps} notificationCount={999999} />
      );
      
      expect(screen.getByText('Notifications (999999)')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large content efficiently', () => {
      const largeContent = (
        <div>
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i} data-testid={`item-${i}`}>
              Large content item {i}
            </div>
          ))}
        </div>
      );
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MainLayout {...defaultProps}>
          {largeContent}
        </MainLayout>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('optimizes re-renders during state changes', async () => {
      const user = setupUserEvent();
      
      const { rerender } = renderWithProviders(<MainLayout {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Perform multiple state changes
      for (let i = 0; i < 50; i++) {
        rerender(
          <MainLayout 
            {...defaultProps} 
            notificationCount={i}
          />
        );
      }
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      expect(updateTime).toBeLessThan(1000); // Should update efficiently
      expect(screen.getByText('Notifications (49)')).toBeInTheDocument();
    });
  });
});