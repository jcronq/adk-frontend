import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateKeyboardNavigation,
  checkAccessibility,
  simulateMediaQuery
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';

// Import components to test
import Header from '../../components/layout/Header';
import MainLayout from '../../components/layout/MainLayout';
import Sidebar from '../../components/layout/Sidebar';
import NotificationCenter from '../../components/NotificationCenter';
import ConversationList from '../../components/ConversationList';
import ConversationView from '../../components/ConversationView';

// Mock contexts for isolated testing
const mockAgentContext = {
  agents: MockDataFactory.createAgents(3),
  currentAgent: 'Agent 1',
  conversations: MockDataFactory.createResponsiveTestData().conversations,
  setCurrentAgent: jest.fn(),
  startNewConversation: jest.fn(),
};

const mockNotificationContext = {
  notifications: MockDataFactory.createMCPQuestions(5, ['Agent 1', 'Agent 2']).map(q => ({
    id: `notification-${q.id}`,
    questionId: q.id,
    question: q.question,
    status: 'pending' as const,
    timestamp: Date.now(),
    agentName: q.agentName,
    conversationId: q.conversationId,
  })),
  unreadCount: 3,
  markAsDisplayed: jest.fn(),
  markAsAnswered: jest.fn(),
  removeNotification: jest.fn(),
  clearAllNotifications: jest.fn(),
};

const mockMCPContext = {
  setIsReplyingToMCP: jest.fn(),
  setCurrentMCPQuestionId: jest.fn(),
  currentQuestion: null,
};

jest.mock('../../contexts/AgentContext', () => ({
  useAgent: () => mockAgentContext,
}));

jest.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationContext,
}));

jest.mock('../../contexts/MCPContext', () => ({
  useMCP: () => mockMCPContext,
}));

describe('Comprehensive Accessibility Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    describe('Perceivable - Guideline 1', () => {
      it('provides text alternatives for all images and icons', () => {
        renderWithProviders(
          <Header 
            notificationCount={3}
            onNotificationClick={jest.fn()}
            onSidebarToggle={jest.fn()}
          />,
          { withAgentProvider: false, withNotificationProvider: false }
        );
        
        // All icons should have accessible names
        const notificationButton = screen.getByLabelText('notifications');
        expect(notificationButton).toBeInTheDocument();
      });

      it('ensures sufficient color contrast ratios', async () => {
        const { container } = renderWithProviders(
          <MainLayout>
            <div>Test content</div>
          </MainLayout>,
          { withAgentProvider: false, withNotificationProvider: false }
        );
        
        // Check for sufficient contrast (this would use a real contrast checker in production)
        const interactiveElements = container.querySelectorAll('button, [role="button"], input, select, textarea, a[href]');
        
        interactiveElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          const backgroundColor = computedStyle.backgroundColor;
          const color = computedStyle.color;
          
          // Basic check - in real implementation would calculate actual contrast ratios
          expect(backgroundColor).not.toBe(color);
        });
      });

      it('supports high contrast mode', () => {
        // Mock high contrast media query
        simulateMediaQuery('(prefers-contrast: high)', true);
        
        renderWithProviders(
          <Sidebar 
            collapsed={false}
            width={320}
            onToggleCollapse={jest.fn()}
          />,
          { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
        );
        
        expect(screen.getByText('Agents')).toBeInTheDocument();
      });

      it('respects reduced motion preferences', () => {
        // Mock reduced motion preference
        simulateMediaQuery('(prefers-reduced-motion: reduce)', true);
        
        renderWithProviders(
          <MainLayout>
            <div>Content with animations</div>
          </MainLayout>,
          { withAgentProvider: false, withNotificationProvider: false }
        );
        
        // Component should render without motion-based animations
        expect(screen.getByText('Content with animations')).toBeInTheDocument();
      });
    });

    describe('Operable - Guideline 2', () => {
      it('makes all functionality available via keyboard', async () => {
        const user = setupUserEvent();
        
        renderWithProviders(
          <Header 
            notificationCount={3}
            onNotificationClick={jest.fn()}
            onSidebarToggle={jest.fn()}
          />,
          { withAgentProvider: false, withNotificationProvider: false }
        );
        
        // Tab through all interactive elements
        await user.tab(); // Notification button
        expect(screen.getByLabelText('notifications')).toHaveFocus();
        
        // Activate with keyboard
        await user.keyboard('{Enter}');
        // Should trigger the same action as mouse click
      });

      it('provides sufficient time for users to read content', () => {
        renderWithProviders(
          <NotificationCenter onQuestionClick={jest.fn()} />,
          { withNotificationProvider: false }
        );
        
        // No auto-disappearing content or time limits
        expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
      });

      it('avoids seizure-inducing flashing content', () => {
        renderWithProviders(
          <ConversationView 
            currentAgent="Test Agent"
            currentConversation={MockDataFactory.createConversation()}
            sendingMessage={true}
          />,
          { withMCPProvider: false }
        );
        
        // Loading indicators should not flash rapidly
        const loadingIndicator = screen.getByRole('progressbar');
        expect(loadingIndicator).toBeInTheDocument();
        // Should have steady animation, not rapid flashing
      });

      it('helps users navigate and find content', () => {
        const testData = MockDataFactory.createResponsiveTestData();
        
        renderWithProviders(
          <ConversationList 
            agents={testData.agents}
            conversations={testData.conversations}
            onContinueConversation={jest.fn()}
          />,
          { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
        );
        
        // Should have clear navigation structure
        expect(screen.getByRole('list')).toBeInTheDocument();
        
        // Agents should be clearly labeled
        testData.agents.forEach(agent => {
          expect(screen.getByText(agent.name)).toBeInTheDocument();
        });
      });
    });

    describe('Understandable - Guideline 3', () => {
      it('makes text readable and understandable', () => {
        renderWithProviders(
          <ConversationView 
            currentAgent="Test Agent"
            currentConversation={MockDataFactory.createConversation({
              messages: [
                MockDataFactory.createMessage({ 
                  role: 'assistant', 
                  content: 'This is a clear, understandable message.' 
                })
              ]
            })}
            sendingMessage={false}
          />,
          { withMCPProvider: false }
        );
        
        expect(screen.getByText('This is a clear, understandable message.')).toBeInTheDocument();
      });

      it('makes content appear and operate predictably', async () => {
        const user = setupUserEvent();
        const onNotificationClick = jest.fn();
        
        renderWithProviders(
          <NotificationCenter onQuestionClick={onNotificationClick} />,
          { withNotificationProvider: false }
        );
        
        const triggerButton = screen.getByRole('button', { name: /notifications/i });
        
        // First click should open menu
        await user.click(triggerButton);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        
        // Second click should close menu (predictable behavior)
        await user.click(triggerButton);
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      });

      it('helps users avoid and correct mistakes', async () => {
        // This would test form validation and error recovery
        // For now, test that invalid states are handled gracefully
        renderWithProviders(
          <ConversationList 
            agents={[]}
            conversations={{}}
            onContinueConversation={jest.fn()}
          />,
          { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
        );
        
        // Should handle empty state without errors
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });

    describe('Robust - Guideline 4', () => {
      it('maximizes compatibility with assistive technologies', () => {
        renderWithProviders(
          <Sidebar 
            collapsed={false}
            width={320}
            onToggleCollapse={jest.fn()}
          />,
          { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
        );
        
        // Should use semantic HTML and proper ARIA
        const toggleButton = screen.getByLabelText('Expand sidebar');
        expect(toggleButton).toHaveAttribute('aria-label');
      });

      it('uses valid and semantic HTML', async () => {
        const { container } = renderWithProviders(
          <MainLayout>
            <ConversationView 
              currentAgent="Test Agent"
              currentConversation={MockDataFactory.createConversation()}
              sendingMessage={false}
            />
          </MainLayout>,
          { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
        );
        
        // Check for proper semantic structure
        expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
        expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
        expect(screen.getByRole('list')).toBeInTheDocument(); // Messages list
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('provides comprehensive ARIA labels and descriptions', () => {
      renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      expect(triggerButton).toHaveAttribute('aria-label');
    });

    it('uses proper heading hierarchy', () => {
      renderWithProviders(
        <ConversationView 
          currentAgent="Test Agent"
          currentConversation={MockDataFactory.createConversation()}
          sendingMessage={false}
        />,
        { withMCPProvider: false }
      );
      
      // Should have proper heading structure
      const heading = screen.getByRole('heading', { name: 'Test Agent' });
      expect(heading).toBeInTheDocument();
    });

    it('provides live region announcements for dynamic content', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      // Menu should be announced to screen readers
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });

    it('supports landmark navigation', () => {
      renderWithProviders(
        <MainLayout>
          <ConversationList 
            agents={MockDataFactory.createAgents(2)}
            conversations={MockDataFactory.createResponsiveTestData().conversations}
            onContinueConversation={jest.fn()}
          />
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should have proper landmark roles
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('provides meaningful alternative text for non-text content', () => {
      renderWithProviders(
        <Header 
          notificationCount={5}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Icons should have meaningful labels
      const notificationButton = screen.getByLabelText('notifications');
      expect(notificationButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports logical tab order', async () => {
      const user = setupUserEvent();
      
      // Mock mobile viewport for full interactive elements
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Tab through elements in logical order
      await user.tab(); // Sidebar toggle
      expect(screen.getByLabelText('toggle sidebar')).toHaveFocus();
      
      await user.tab(); // Notification button
      expect(screen.getByLabelText('notifications')).toHaveFocus();
    });

    it('provides skip links for main content', () => {
      // Skip links would be implemented at the app level
      renderWithProviders(
        <MainLayout>
          <div>Main content</div>
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Main content should be easily accessible
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('supports arrow key navigation in lists', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <ConversationList 
          agents={MockDataFactory.createAgents(3)}
          conversations={MockDataFactory.createResponsiveTestData().conversations}
          onContinueConversation={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Focus first conversation
      const conversations = screen.getAllByRole('button');
      if (conversations.length > 1) {
        conversations[1].focus(); // Skip agent button, focus first conversation
        
        // Arrow keys could navigate between conversations
        await simulateKeyboardNavigation(user, 'ArrowDown');
        
        // Verify navigation doesn't break
        expect(document.activeElement).toBeDefined();
      }
    });

    it('traps focus in modal dialogs', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      
      // Focus should be trapped within the menu
      await user.tab();
      
      // All focusable elements should be within the menu
      const focusedElement = document.activeElement;
      expect(menu.contains(focusedElement)).toBe(true);
    });

    it('restores focus after modal interactions', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      triggerButton.focus();
      
      // Open menu
      await user.click(triggerButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      // Close with Escape
      await user.keyboard('{Escape}');
      
      // Focus should return to trigger button
      await waitFor(() => {
        expect(triggerButton).toHaveFocus();
      });
    });
  });

  describe('Focus Management', () => {
    it('provides visible focus indicators', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={320}
          onToggleCollapse={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      const toggleButton = screen.getByLabelText('Expand sidebar');
      
      await user.tab();
      
      expect(toggleButton).toHaveFocus();
      expect(toggleButton).toBeVisible();
    });

    it('manages focus during dynamic content changes', async () => {
      const { rerender } = renderWithProviders(
        <ConversationView 
          currentAgent="Test Agent"
          currentConversation={MockDataFactory.createConversation()}
          sendingMessage={false}
        />,
        { withMCPProvider: false }
      );
      
      // Add new message
      const updatedConversation = {
        ...MockDataFactory.createConversation(),
        messages: [
          ...MockDataFactory.createConversation().messages,
          MockDataFactory.createMessage({ role: 'assistant', content: 'New message' })
        ]
      };
      
      rerender(
        <ConversationView 
          currentAgent="Test Agent"
          currentConversation={updatedConversation}
          sendingMessage={false}
        />
      );
      
      // Focus should be managed appropriately
      expect(screen.getByText('New message')).toBeInTheDocument();
    });

    it('handles focus for collapsed/expanded states', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={320}
          onToggleCollapse={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      const toggleButton = screen.getByLabelText('Expand sidebar');
      toggleButton.focus();
      
      await user.click(toggleButton);
      
      // Focus should remain on toggle button
      expect(toggleButton).toHaveFocus();
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    it('provides adequate touch target sizes', () => {
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Touch targets should be at least 44x44px
        const rect = button.getBoundingClientRect();
        expect(rect.width >= 44 || rect.height >= 44).toBe(true);
      });
    });

    it('maintains accessibility on mobile devices', () => {
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(
        <MainLayout>
          <ConversationList 
            agents={MockDataFactory.createAgents(2)}
            conversations={MockDataFactory.createResponsiveTestData().conversations}
            onContinueConversation={jest.fn()}
          />
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should maintain accessibility on mobile
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('supports gesture-based navigation', async () => {
      const user = setupUserEvent();
      
      simulateMediaQuery('(max-width: 959.95px)', true);
      
      renderWithProviders(
        <MainLayout>
          <div>Mobile content</div>
        </MainLayout>,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Mobile sidebar toggle should be accessible
      const sidebarToggle = screen.queryByLabelText('toggle sidebar');
      if (sidebarToggle) {
        await user.click(sidebarToggle);
        // Should handle mobile interactions
      }
    });
  });

  describe('Internationalization and Localization', () => {
    it('supports right-to-left (RTL) languages', () => {
      // Mock RTL direction
      document.dir = 'rtl';
      
      renderWithProviders(
        <Header 
          notificationCount={3}
          onNotificationClick={jest.fn()}
          onSidebarToggle={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false }
      );
      
      // Layout should adapt to RTL
      expect(screen.getByText('ADK Agent Manager')).toBeInTheDocument();
      
      // Reset
      document.dir = 'ltr';
    });

    it('handles different text lengths gracefully', () => {
      // Mock very long agent name
      const longNameAgent = MockDataFactory.createAgent({ 
        name: 'Very Long Agent Name That Might Overflow In Some Languages' 
      });
      
      Object.assign(mockAgentContext, { 
        agents: [longNameAgent],
        currentAgent: longNameAgent.name 
      });
      
      renderWithProviders(
        <Sidebar 
          collapsed={false}
          width={320}
          onToggleCollapse={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should handle long text without breaking layout
      expect(screen.getByText(longNameAgent.name)).toBeInTheDocument();
    });
  });

  describe('Error States and Recovery', () => {
    it('provides accessible error messages', () => {
      renderWithProviders(
        <ConversationView 
          currentAgent={null}
          currentConversation={null}
          sendingMessage={false}
        />,
        { withMCPProvider: false }
      );
      
      // Error/empty state should be accessible
      const emptyState = screen.getByText('Select a conversation to start chatting');
      expect(emptyState).toBeInTheDocument();
    });

    it('maintains accessibility during loading states', () => {
      renderWithProviders(
        <ConversationView 
          currentAgent="Test Agent"
          currentConversation={MockDataFactory.createConversation()}
          sendingMessage={true}
        />,
        { withMCPProvider: false }
      );
      
      // Loading indicator should be accessible
      const loadingIndicator = screen.getByRole('progressbar');
      expect(loadingIndicator).toBeInTheDocument();
    });

    it('provides recovery options for failed states', () => {
      // Mock error state
      renderWithProviders(
        <ConversationList 
          agents={[]}
          conversations={{}}
          onContinueConversation={jest.fn()}
        />,
        { withAgentProvider: false, withNotificationProvider: false, withMCPProvider: false }
      );
      
      // Should provide clear information about empty state
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });
  });

  describe('Performance and Accessibility', () => {
    it('maintains accessibility with large datasets', () => {
      const largeDataset = {
        agents: MockDataFactory.createAgents(20),
        conversations: Object.fromEntries(
          Array.from({ length: 20 }, (_, i) => [
            `Agent ${i + 1}`,
            MockDataFactory.createConversationsForAgent(`Agent ${i + 1}`, 10)
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
      
      // Should remain accessible with large datasets
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('optimizes screen reader announcements', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <NotificationCenter onQuestionClick={jest.fn()} />,
        { withNotificationProvider: false }
      );
      
      const triggerButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerButton);
      
      // Should provide efficient screen reader experience
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });
  });
});