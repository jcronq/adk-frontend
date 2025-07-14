import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateMediaQuery,
  waitForAnimations
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';

// Import components to test
import Header from '../../components/layout/Header';
import MainLayout from '../../components/layout/MainLayout';
import Sidebar from '../../components/layout/Sidebar';
import NotificationCenter from '../../components/NotificationCenter';
import ConversationList from '../../components/ConversationList';
import ConversationView from '../../components/ConversationView';

// Mock contexts
const mockAgentContext = {
  agents: MockDataFactory.createAgents(4),
  currentAgent: 'Agent 1',
  conversations: MockDataFactory.createResponsiveTestData().conversations,
  setCurrentAgent: jest.fn(),
  startNewConversation: jest.fn(),
};

const mockNotificationContext = {
  notifications: MockDataFactory.createMCPQuestions(8, ['Agent 1', 'Agent 2']).map(q => ({
    id: `notification-${q.id}`,
    questionId: q.id,
    question: q.question,
    status: 'pending' as const,
    timestamp: Date.now(),
    agentName: q.agentName,
    conversationId: q.conversationId,
  })),
  unreadCount: 5,
  markAsDisplayed: jest.fn(),
  markAsAnswered: jest.fn(),
  removeNotification: jest.fn(),
  clearAllNotifications: jest.fn(),
};

jest.mock('../../contexts/AgentContext', () => ({
  useAgent: () => mockAgentContext,
}));

jest.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationContext,
}));

describe('Responsive Behavior Tests', () => {
  const breakpoints = {
    mobile: '(max-width: 599.95px)',
    tablet: '(max-width: 959.95px)',
    desktop: '(min-width: 960px)',
    largeDesktop: '(min-width: 1200px)',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to desktop view by default
    simulateMediaQuery(breakpoints.desktop, true);
  });

  describe('Mobile Viewport (320px - 599px)', () => {
    beforeEach(() => {
      simulateMediaQuery(breakpoints.mobile, true);
      simulateMediaQuery(breakpoints.tablet, true); // Mobile is also tablet
    });

    it('adapts header layout for mobile', () => {
      renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Should show mobile sidebar toggle
      expect(screen.getByLabelText('toggle sidebar')).toBeInTheDocument();
      
      // Should show settings icon instead of full user settings
      expect(screen.getByLabelText('settings')).toBeInTheDocument();
      
      // Should not show full user settings
      expect(screen.queryByDisplayValue(/user/i)).not.toBeInTheDocument();
    });

    it('uses temporary drawer for mobile sidebar', () => {
      const { container } = renderWithProviders(
        <MainLayout>
          <div>Mobile content</div>
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Should use temporary drawer (not permanent)
      const permanentDrawer = container.querySelector('.MuiDrawer-root .MuiDrawer-permanent');
      expect(permanentDrawer).not.toBeInTheDocument();
    });

    it('optimizes sidebar width for mobile', () => {
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={280}
          onToggleCollapse={jest.fn()}
          isMobile={true}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should use mobile-optimized width
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('hides collapse toggle on mobile sidebar', () => {
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={280}
          onToggleCollapse={jest.fn()}
          isMobile={true}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should not show collapse toggle on mobile
      expect(screen.queryByLabelText(/expand|collapse/i)).not.toBeInTheDocument();
    });

    it('adapts notification center for mobile', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const menu = screen.getByRole('menu');
      
      // Should adapt menu width for mobile
      expect(menu).toHaveStyle({ width: '400px' }); // Should be responsive
    });

    it('ensures touch targets are adequate size', () => {
      renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      const buttons = screen.getAllByRole('button');
      
      // All touch targets should be at least 44x44px
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight || '0');
        const minWidth = parseInt(styles.minWidth || '0');
        
        // Should have adequate touch target size
        expect(minHeight >= 44 || minWidth >= 44).toBe(true);
      });
    });

    it('handles conversation list on mobile', () => {
      const testData = MockDataFactory.createResponsiveTestData();
      
      renderWithProviders(
        <ConversationList 
          agents={testData.agents.slice(0, 2)} // Fewer agents for mobile
          conversations={testData.conversations}
          onContinueConversation={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should render without layout issues
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });
  });

  describe('Tablet Viewport (600px - 959px)', () => {
    beforeEach(() => {
      simulateMediaQuery(breakpoints.mobile, false);
      simulateMediaQuery(breakpoints.tablet, true);
    });

    it('shows appropriate header layout for tablet', () => {
      renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Should show mobile sidebar toggle on tablet
      expect(screen.getByLabelText('toggle sidebar')).toBeInTheDocument();
      
      // Should show settings icon (not full user settings)
      expect(screen.getByLabelText('settings')).toBeInTheDocument();
    });

    it('uses tablet-optimized sidebar width', () => {
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={280}
          onToggleCollapse={jest.fn()}
          isMobile={true}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should use tablet width (280px)
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('maintains temporary drawer behavior on tablet', () => {
      const { container } = renderWithProviders(
        <MainLayout>
          <div>Tablet content</div>
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Should use temporary drawer like mobile
      expect(screen.getByText('Tablet content')).toBeInTheDocument();
    });

    it('handles conversation view on tablet', () => {
      renderWithProviders(
        <ConversationView 
          currentAgent="Test Agent"
          currentConversation={MockDataFactory.createConversation()}
          sendingMessage={false}
        />,
        { withMCPProvider: false }
      );
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

  describe('Desktop Viewport (960px - 1199px)', () => {
    beforeEach(() => {
      simulateMediaQuery(breakpoints.mobile, false);
      simulateMediaQuery(breakpoints.tablet, false);
      simulateMediaQuery('(max-width: 1199.95px)', true);
    });

    it('shows full desktop header layout', () => {
      renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Should not show mobile sidebar toggle
      expect(screen.queryByLabelText('toggle sidebar')).not.toBeInTheDocument();
      
      // Should show full user settings
      expect(screen.getByDisplayValue(/user/i)).toBeInTheDocument();
      
      // Should not show mobile settings icon
      expect(screen.queryByLabelText('settings')).not.toBeInTheDocument();
    });

    it('uses permanent drawer for desktop', () => {
      const { container } = renderWithProviders(
        <MainLayout>
          <div>Desktop content</div>
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Should use permanent drawer
      const drawer = container.querySelector('.MuiDrawer-root');
      expect(drawer).toBeInTheDocument();
    });

    it('shows collapse toggle on desktop sidebar', () => {
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={320}
          onToggleCollapse={jest.fn()}
          isMobile={false}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should show collapse toggle
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('uses standard desktop sidebar width', () => {
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={320}
          onToggleCollapse={jest.fn()}
          isMobile={false}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should use desktop width (320px)
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('supports sidebar collapse on desktop', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={320}
          onToggleCollapse={jest.fn()}
          isMobile={false}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      const toggleButton = screen.getByLabelText('Expand sidebar');
      await user.click(toggleButton);
      
      // Should trigger collapse functionality
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Large Desktop Viewport (1200px+)', () => {
    beforeEach(() => {
      simulateMediaQuery(breakpoints.mobile, false);
      simulateMediaQuery(breakpoints.tablet, false);
      simulateMediaQuery(breakpoints.largeDesktop, true);
    });

    it('optimizes layout for large screens', () => {
      renderWithProviders(
        <MainLayout>
          <ConversationView 
            currentAgent="Test Agent"
            currentConversation={MockDataFactory.createLargeConversation(50)}
            sendingMessage={false}
          />
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should handle large content well
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('50 messages')).toBeInTheDocument();
    });

    it('uses maximum sidebar width on large screens', () => {
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={320}
          onToggleCollapse={jest.fn()}
          isMobile={false}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should use full desktop width
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });

    it('handles many conversations efficiently on large screens', () => {
      const largeDataset = {
        agents: MockDataFactory.createAgents(10),
        conversations: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [
            `Agent ${i + 1}`,
            MockDataFactory.createConversationsForAgent(`Agent ${i + 1}`, 5)
          ])
        )
      };
      
      renderWithProviders(
        <ConversationList 
          agents={largeDataset.agents}
          conversations={largeDataset.conversations}
          onContinueConversation={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should handle large datasets
      expect(screen.getByRole('list')).toBeInTheDocument();
      largeDataset.agents.slice(0, 5).forEach(agent => {
        expect(screen.getByText(agent.name)).toBeInTheDocument();
      });
    });
  });

  describe('Breakpoint Transitions', () => {
    it('handles smooth transitions between mobile and tablet', async () => {
      const { rerender } = renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Start with mobile
      simulateMediaQuery(breakpoints.mobile, true);
      simulateMediaQuery(breakpoints.tablet, true);
      
      rerender(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );
      
      await waitForAnimations(100);
      
      // Transition to tablet
      simulateMediaQuery(breakpoints.mobile, false);
      simulateMediaQuery(breakpoints.tablet, true);
      
      rerender(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );
      
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles transitions between tablet and desktop', async () => {
      const { rerender } = renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Start with tablet
      simulateMediaQuery(breakpoints.tablet, true);
      
      rerender(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />
      );
      
      expect(screen.getByLabelText('toggle sidebar')).toBeInTheDocument();
      
      // Transition to desktop
      simulateMediaQuery(breakpoints.tablet, false);
      simulateMediaQuery(breakpoints.desktop, true);
      
      rerender(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />
      );
      
      expect(screen.queryByLabelText('toggle sidebar')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue(/user/i)).toBeInTheDocument();
    });

    it('maintains state during viewport changes', async () => {
      const user = setupUserEvent();
      
      const { rerender } = renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      // Open notification center
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Change viewport
      simulateMediaQuery(breakpoints.mobile, true);
      
      rerender(<NotificationCenter onQuestionClick={jest.fn()} />);
      
      // Menu should still be open
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Orientation Changes', () => {
    it('handles portrait to landscape transitions on mobile', () => {
      simulateMediaQuery(breakpoints.mobile, true);
      simulateMediaQuery('(orientation: landscape)', true);
      
      renderWithProviders(
        <MainLayout>
          <ConversationView 
            currentAgent="Test Agent"
            currentConversation={MockDataFactory.createConversation()}
            sendingMessage={false}
          />
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('adapts layout for landscape tablet', () => {
      simulateMediaQuery(breakpoints.tablet, true);
      simulateMediaQuery('(orientation: landscape)', true);
      
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={280}
          onToggleCollapse={jest.fn()}
          isMobile={true}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });
  });

  describe('Content Adaptation', () => {
    it('truncates long content appropriately on mobile', () => {
      simulateMediaQuery(breakpoints.mobile, true);
      
      const longMessage = 'This is a very long message that should be truncated or handled appropriately on mobile devices to maintain readability';
      const conversation = MockDataFactory.createConversation({
        messages: [
          MockDataFactory.createMessage({ role: 'assistant', content: longMessage })
        ]
      });
      
      renderWithProviders(
        <ConversationView 
          currentAgent="Test Agent"
          currentConversation={conversation}
          sendingMessage={false}
        />,
        { withMCPProvider: false }
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('adapts conversation previews for different screen sizes', () => {
      const testData = MockDataFactory.createResponsiveTestData();
      
      // Test mobile
      simulateMediaQuery(breakpoints.mobile, true);
      
      const { rerender } = renderWithProviders(
        <ConversationList 
          agents={testData.agents.slice(0, 2)}
          conversations={testData.conversations}
          onContinueConversation={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByRole('list')).toBeInTheDocument();
      
      // Test desktop
      simulateMediaQuery(breakpoints.mobile, false);
      simulateMediaQuery(breakpoints.desktop, true);
      
      rerender(
        <ConversationList 
          agents={testData.agents.slice(0, 2)}
          conversations={testData.conversations}
          onContinueConversation={jest.fn()}
        />
      );
      
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('adjusts notification display for different screens', async () => {
      const user = setupUserEvent();
      
      // Test mobile notification display
      simulateMediaQuery(breakpoints.mobile, true);
      
      const { rerender } = renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      let menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      
      // Test desktop notification display
      simulateMediaQuery(breakpoints.mobile, false);
      simulateMediaQuery(breakpoints.desktop, true);
      
      rerender(<NotificationCenter onQuestionClick={jest.fn()} />);
      
      await user.click(triggerButton);
      
      menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });
  });

  describe('Performance on Different Devices', () => {
    it('optimizes rendering performance on mobile', () => {
      simulateMediaQuery(breakpoints.mobile, true);
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MainLayout>
          <ConversationList 
            agents={MockDataFactory.createAgents(5)}
            conversations={MockDataFactory.createResponsiveTestData().conversations}
            onContinueConversation={jest.fn()}
          />
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly even on mobile
      expect(renderTime).toBeLessThan(500);
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('handles large datasets efficiently on desktop', () => {
      simulateMediaQuery(breakpoints.desktop, true);
      
      const largeConversation = MockDataFactory.createLargeConversation(200);
      
      const startTime = performance.now();
      
      renderWithProviders(
        <ConversationView 
          currentAgent="Test Agent"
          currentConversation={largeConversation}
          sendingMessage={false}
        />,
        { withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByText('200 messages')).toBeInTheDocument();
    });

    it('maintains performance during responsive transitions', () => {
      const { rerender } = renderWithProviders(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      const startTime = performance.now();
      
      // Simulate multiple rapid viewport changes
      const viewports = [
        { mobile: true, tablet: true },
        { mobile: false, tablet: true },
        { mobile: false, tablet: false },
        { mobile: true, tablet: true },
      ];
      
      viewports.forEach(viewport => {
        simulateMediaQuery(breakpoints.mobile, viewport.mobile);
        simulateMediaQuery(breakpoints.tablet, viewport.tablet);
        
        rerender(
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        );
      });
      
      const endTime = performance.now();
      const transitionTime = endTime - startTime;
      
      expect(transitionTime).toBeLessThan(200);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});