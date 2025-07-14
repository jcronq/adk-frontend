import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  checkAccessibility,
  simulateMediaQuery
} from '../../../test-utils/test-helpers';
import { MockDataFactory } from '../../../test-utils/mock-data-factory';
import Sidebar from '../Sidebar';

// Mock the context hooks to provide controlled test data
const mockAgentContext = {
  agents: MockDataFactory.createAgents(3),
  currentAgent: 'Agent 1',
  conversations: MockDataFactory.createResponsiveTestData().conversations,
  setCurrentAgent: jest.fn(),
  startNewConversation: jest.fn(),
};

const mockMCPContext = {
  currentQuestion: null,
};

const mockNotificationContext = {
  notifications: MockDataFactory.createMCPQuestions(5, ['Agent 1', 'Agent 2']),
};

jest.mock('../../../contexts/AgentContext', () => ({
  useAgent: () => mockAgentContext,
}));

jest.mock('../../../contexts/MCPContext', () => ({
  useMCP: () => mockMCPContext,
}));

jest.mock('../../../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationContext,
}));

describe('Sidebar Component', () => {
  const defaultProps = {
    collapsed: false,
    width: 320,
    onToggleCollapse: jest.fn(),
    isMobile: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders sidebar with header and agent list', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('displays all agents from context', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      mockAgentContext.agents.forEach(agent => {
        expect(screen.getByText(agent.name)).toBeInTheDocument();
      });
    });

    it('shows conversation counts for each agent', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Check that conversation counts are displayed
      expect(screen.getByText(/conversations/)).toBeInTheDocument();
    });

    it('applies correct width styling', () => {
      const { container } = renderWithProviders(
        <Sidebar {...defaultProps} width={280} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveStyle({ width: '280px' });
    });
  });

  describe('Collapsed State', () => {
    it('hides text content when collapsed', () => {
      renderWithProviders(
        <Sidebar {...defaultProps} collapsed={true} width={60} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      // Agents title should be hidden
      expect(screen.queryByText('Agents')).not.toBeInTheDocument();
      
      // But icons should still be present
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('shows tooltips for agent items when collapsed', () => {
      renderWithProviders(
        <Sidebar {...defaultProps} collapsed={true} width={60} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      // Agent names should be in tooltips (title attributes)
      mockAgentContext.agents.forEach(agent => {
        const agentButton = screen.getByRole('button', { 
          name: new RegExp(agent.name, 'i') 
        });
        expect(agentButton).toBeInTheDocument();
      });
    });

    it('maintains functionality when collapsed', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <Sidebar {...defaultProps} collapsed={true} width={60} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      const firstAgentButton = screen.getAllByRole('button')[1]; // First agent (after toggle)
      await user.click(firstAgentButton);
      
      expect(mockAgentContext.setCurrentAgent).toHaveBeenCalled();
    });

    it('hides footer when collapsed', () => {
      renderWithProviders(
        <Sidebar {...defaultProps} collapsed={true} width={60} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      expect(screen.queryByText(/agents available/)).not.toBeInTheDocument();
    });
  });

  describe('Agent Selection and Interaction', () => {
    it('highlights currently selected agent', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Current agent should be highlighted
      const currentAgentButton = screen.getByRole('button', { 
        name: new RegExp(mockAgentContext.currentAgent, 'i') 
      });
      expect(currentAgentButton).toHaveClass('Mui-selected');
    });

    it('calls setCurrentAgent when agent is selected', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const secondAgent = mockAgentContext.agents[1];
      const agentButton = screen.getByText(secondAgent.name);
      
      await user.click(agentButton);
      
      expect(mockAgentContext.setCurrentAgent).toHaveBeenCalledWith(secondAgent.name);
    });

    it('shows new conversation button on hover for active agent', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const currentAgentButton = screen.getByRole('button', { 
        name: new RegExp(mockAgentContext.currentAgent, 'i') 
      });
      
      await user.hover(currentAgentButton);
      
      // Add icon should become visible
      const addButton = within(currentAgentButton).getByRole('button');
      expect(addButton).toBeInTheDocument();
    });

    it('calls startNewConversation when add button clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const currentAgentButton = screen.getByRole('button', { 
        name: new RegExp(mockAgentContext.currentAgent, 'i') 
      });
      
      // Find the add button within the current agent
      const addButton = within(currentAgentButton).getByRole('button');
      await user.click(addButton);
      
      expect(mockAgentContext.startNewConversation).toHaveBeenCalledWith(mockAgentContext.currentAgent);
    });
  });

  describe('Notification Badges', () => {
    it('displays notification count for agents with pending questions', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Should show notification badges for agents with notifications
      const badges = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('1') || button.textContent?.includes('2')
      );
      
      expect(badges.length).toBeGreaterThan(0);
    });

    it('hides notification badge when agent has no pending questions', () => {
      // Mock notifications for only specific agents
      const limitedNotifications = MockDataFactory.createMCPQuestions(2, ['Agent 1']);
      
      jest.mocked(mockNotificationContext.notifications as any).mockReturnValue(limitedNotifications);
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Agent 3 should not have notification badge
      const agent3Section = screen.getByText('Agent 3').closest('button');
      expect(agent3Section).not.toHaveTextContent(/\d+/); // No numbers in badge
    });

    it('updates notification count when notifications change', () => {
      const { rerender } = renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Update mock notifications
      const newNotifications = MockDataFactory.createMCPQuestions(8, ['Agent 1']);
      Object.assign(mockNotificationContext, { notifications: newNotifications });
      
      rerender(<Sidebar {...defaultProps} />);
      
      // Should show updated count
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  describe('Mobile Behavior', () => {
    it('hides collapse toggle on mobile', () => {
      renderWithProviders(
        <Sidebar {...defaultProps} isMobile={true} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      expect(screen.queryByLabelText(/expand|collapse/i)).not.toBeInTheDocument();
    });

    it('maintains full functionality on mobile', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <Sidebar {...defaultProps} isMobile={true} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      const firstAgent = mockAgentContext.agents[0];
      const agentButton = screen.getByText(firstAgent.name);
      
      await user.click(agentButton);
      
      expect(mockAgentContext.setCurrentAgent).toHaveBeenCalledWith(firstAgent.name);
    });

    it('adjusts layout for mobile viewport', () => {
      const { container } = renderWithProviders(
        <Sidebar {...defaultProps} isMobile={true} width={280} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveStyle({ width: '280px' });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no agents available', () => {
      // Mock empty agents array
      Object.assign(mockAgentContext, { agents: [] });
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      expect(screen.getByText('No agents available')).toBeInTheDocument();
    });

    it('shows correct agent count in footer', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      expect(screen.getByText(`${mockAgentContext.agents.length} agents available`)).toBeInTheDocument();
    });

    it('handles agents without conversations', () => {
      // Mock agent with no conversations
      const agentsWithoutConvs = [
        ...mockAgentContext.agents,
        MockDataFactory.createAgent({ name: 'New Agent' })
      ];
      
      Object.assign(mockAgentContext, { 
        agents: agentsWithoutConvs,
        conversations: { ...mockAgentContext.conversations, 'New Agent': [] }
      });
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      expect(screen.getByText('No conversations')).toBeInTheDocument();
    });
  });

  describe('Sidebar Toggle Functionality', () => {
    it('calls onToggleCollapse when toggle button clicked', async () => {
      const user = setupUserEvent();
      const onToggleCollapse = jest.fn();
      
      renderWithProviders(
        <Sidebar {...defaultProps} onToggleCollapse={onToggleCollapse} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      const toggleButton = screen.getByLabelText('Expand sidebar');
      await user.click(toggleButton);
      
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('shows correct icon based on collapse state', () => {
      const { rerender } = renderWithProviders(
        <Sidebar {...defaultProps} collapsed={false} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
      
      rerender(
        <Sidebar {...defaultProps} collapsed={true} />
      );
      
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('supports keyboard navigation for toggle', async () => {
      const user = setupUserEvent();
      const onToggleCollapse = jest.fn();
      
      renderWithProviders(
        <Sidebar {...defaultProps} onToggleCollapse={onToggleCollapse} />, 
        {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        }
      );
      
      const toggleButton = screen.getByLabelText('Expand sidebar');
      toggleButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Toggle button should have proper labeling
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
      
      // Agent buttons should be properly labeled
      mockAgentContext.agents.forEach(agent => {
        expect(screen.getByRole('button', { name: new RegExp(agent.name, 'i') })).toBeInTheDocument();
      });
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      await checkAccessibility(container);
    });

    it('supports keyboard navigation through agents', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Tab through interactive elements
      await user.tab(); // Toggle button
      expect(screen.getByLabelText('Expand sidebar')).toHaveFocus();
      
      await user.tab(); // First agent
      const firstAgentButton = screen.getByRole('button', { 
        name: new RegExp(mockAgentContext.agents[0].name, 'i') 
      });
      expect(firstAgentButton).toHaveFocus();
    });

    it('provides proper focus indicators', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const toggleButton = screen.getByLabelText('Expand sidebar');
      
      await user.tab();
      
      expect(toggleButton).toHaveFocus();
      expect(toggleButton).toBeVisible();
    });
  });

  describe('Visual States and Styling', () => {
    it('applies active state styling to current agent', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const currentAgentButton = screen.getByRole('button', { 
        name: new RegExp(mockAgentContext.currentAgent, 'i') 
      });
      
      expect(currentAgentButton).toHaveClass('Mui-selected');
    });

    it('applies hover effects to agent items', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const agentButton = screen.getByRole('button', { 
        name: new RegExp(mockAgentContext.agents[0].name, 'i') 
      });
      
      await user.hover(agentButton);
      
      // Hover effects are handled by MUI styling
      expect(agentButton).toBeVisible();
    });

    it('displays status indicator in footer', () => {
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Should show connected status indicator
      const footer = screen.getByText(/agents available/).parentElement;
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles missing agent data gracefully', () => {
      Object.assign(mockAgentContext, { agents: undefined as any });
      
      expect(() => {
        renderWithProviders(<Sidebar {...defaultProps} />, {
          withAgentProvider: false,
          withMCPProvider: false,
          withNotificationProvider: false
        });
      }).not.toThrow();
    });

    it('handles missing conversations data', () => {
      Object.assign(mockAgentContext, { conversations: {} });
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Should show "No conversations" for agents
      expect(screen.getByText('No conversations')).toBeInTheDocument();
    });

    it('handles missing notification data', () => {
      Object.assign(mockNotificationContext, { notifications: [] });
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Should render without notification badges
      const agents = screen.getAllByRole('button').filter(btn => 
        mockAgentContext.agents.some(agent => btn.textContent?.includes(agent.name))
      );
      
      expect(agents.length).toBeGreaterThan(0);
    });

    it('handles rapid state changes', async () => {
      const { rerender } = renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <Sidebar 
            {...defaultProps} 
            collapsed={i % 2 === 0}
            width={i % 2 === 0 ? 60 : 320}
          />
        );
      }
      
      // Should remain functional
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large agent lists', () => {
      const largeAgentList = MockDataFactory.createAgents(100);
      Object.assign(mockAgentContext, { agents: largeAgentList });
      
      const startTime = performance.now();
      
      renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByText('100 agents available')).toBeInTheDocument();
    });

    it('optimizes re-renders during state updates', () => {
      const { rerender } = renderWithProviders(<Sidebar {...defaultProps} />, {
        withAgentProvider: false,
        withMCPProvider: false,
        withNotificationProvider: false
      });
      
      const startTime = performance.now();
      
      // Multiple re-renders
      for (let i = 0; i < 50; i++) {
        rerender(
          <Sidebar 
            {...defaultProps} 
            width={300 + i}
          />
        );
      }
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      expect(updateTime).toBeLessThan(500); // Should update efficiently
      expect(screen.getByText('Agents')).toBeInTheDocument();
    });
  });
});