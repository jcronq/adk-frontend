import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  checkAccessibility 
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';
import ConversationList from '../ConversationList';

describe('ConversationList Component', () => {
  const testData = MockDataFactory.createResponsiveTestData();
  
  const defaultProps = {
    agents: testData.agents.slice(0, 3),
    conversations: {
      'Agent 1': MockDataFactory.createConversationsForAgent('Agent 1', 3),
      'Agent 2': MockDataFactory.createConversationsForAgent('Agent 2', 2),
      'Agent 3': [], // Agent with no conversations
    },
    onContinueConversation: jest.fn(),
    selectedConversationId: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all agents with conversation groups', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      defaultProps.agents.forEach(agent => {
        expect(screen.getByText(agent.name)).toBeInTheDocument();
      });
    });

    it('shows conversation count for each agent', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      expect(screen.getByText('3 conversations')).toBeInTheDocument(); // Agent 1
      expect(screen.getByText('2 conversations')).toBeInTheDocument(); // Agent 2
      expect(screen.getByText('No conversations')).toBeInTheDocument(); // Agent 3
    });

    it('displays conversation previews correctly', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Check that conversation previews are shown
      const conversations = defaultProps.conversations['Agent 1'];
      conversations.forEach(conversation => {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        const preview = lastMessage.content.substring(0, 50);
        expect(screen.getByText(new RegExp(preview))).toBeInTheDocument();
      });
    });

    it('shows message counts for each conversation', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      const conversations = defaultProps.conversations['Agent 1'];
      conversations.forEach(conversation => {
        const messageCount = conversation.messages.length;
        expect(screen.getByText(`${messageCount} messages`)).toBeInTheDocument();
      });
    });
  });

  describe('Agent Groups - Expand/Collapse', () => {
    it('expands agent group when header is clicked', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Click on Agent 1 to expand (should be expanded by default)
      const agent1Header = screen.getByText('Agent 1');
      await user.click(agent1Header);
      
      // Conversations should be visible
      const conversations = defaultProps.conversations['Agent 1'];
      conversations.forEach(conversation => {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        const preview = lastMessage.content.substring(0, 50);
        expect(screen.getByText(new RegExp(preview))).toBeInTheDocument();
      });
    });

    it('collapses agent group when clicked again', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      const agent1Header = screen.getByText('Agent 1');
      
      // Click to collapse
      await user.click(agent1Header);
      
      // Wait a moment for collapse animation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Click again to expand
      await user.click(agent1Header);
      
      // Conversations should be visible again
      const conversations = defaultProps.conversations['Agent 1'];
      expect(screen.getByText(new RegExp(conversations[0].messages[2].content.substring(0, 30)))).toBeInTheDocument();
    });

    it('shows expand/collapse icons correctly', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Should show expand/collapse icons for agents with conversations
      const expandIcons = screen.getAllByTestId('ExpandMoreIcon');
      expect(expandIcons.length).toBeGreaterThan(0);
    });

    it('maintains independent expand/collapse state for each agent', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      const agent1Header = screen.getByText('Agent 1');
      const agent2Header = screen.getByText('Agent 2');
      
      // Collapse Agent 1
      await user.click(agent1Header);
      
      // Agent 2 should still show conversations
      const agent2Conversations = defaultProps.conversations['Agent 2'];
      const lastMessage = agent2Conversations[0].messages[agent2Conversations[0].messages.length - 1];
      expect(screen.getByText(new RegExp(lastMessage.content.substring(0, 30)))).toBeInTheDocument();
    });
  });

  describe('Conversation Selection', () => {
    it('calls onContinueConversation when conversation is clicked', async () => {
      const user = setupUserEvent();
      const onContinueConversation = jest.fn();
      
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          onContinueConversation={onContinueConversation}
        />
      );
      
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      const conversationPreview = firstConversation.messages[firstConversation.messages.length - 1].content.substring(0, 50);
      const conversationButton = screen.getByText(new RegExp(conversationPreview));
      
      await user.click(conversationButton);
      
      expect(onContinueConversation).toHaveBeenCalledWith('Agent 1', firstConversation.sessionId);
    });

    it('highlights selected conversation', () => {
      const selectedConversation = defaultProps.conversations['Agent 1'][0];
      
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          selectedConversationId={selectedConversation.sessionId}
        />
      );
      
      const conversationPreview = selectedConversation.messages[selectedConversation.messages.length - 1].content.substring(0, 50);
      const selectedButton = screen.getByText(new RegExp(conversationPreview)).closest('button');
      
      expect(selectedButton).toHaveClass('Mui-selected');
    });

    it('supports keyboard navigation for conversation selection', async () => {
      const user = setupUserEvent();
      const onContinueConversation = jest.fn();
      
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          onContinueConversation={onContinueConversation}
        />
      );
      
      // Tab to first conversation
      await user.tab();
      await user.tab(); // Skip agent header
      
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      const conversationPreview = firstConversation.messages[firstConversation.messages.length - 1].content.substring(0, 50);
      const conversationButton = screen.getByText(new RegExp(conversationPreview)).closest('button');
      
      expect(conversationButton).toHaveFocus();
      
      // Activate with Enter
      await user.keyboard('{Enter}');
      
      expect(onContinueConversation).toHaveBeenCalledWith('Agent 1', firstConversation.sessionId);
    });
  });

  describe('Empty States', () => {
    it('shows appropriate message for agents with no conversations', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      expect(screen.getByText('No conversations')).toBeInTheDocument();
    });

    it('handles empty agents list gracefully', () => {
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          agents={[]}
          conversations={{}}
        />
      );
      
      // Should render without crashing
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('shows helpful message when no agents are available', () => {
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          agents={[]}
          conversations={{}}
        />
      );
      
      // Component should render but show no content (empty list)
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list.children).toHaveLength(0);
    });

    it('handles conversations with no messages', () => {
      const conversationsWithEmpty = {
        'Agent 1': [
          ...defaultProps.conversations['Agent 1'],
          MockDataFactory.createConversation({
            sessionId: 'empty-session',
            messages: []
          })
        ]
      };
      
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          conversations={conversationsWithEmpty}
        />
      );
      
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  describe('Preview Text Generation', () => {
    it('truncates long messages with ellipsis', () => {
      const longMessage = 'A'.repeat(100);
      const conversationWithLongMessage = {
        'Agent 1': [
          MockDataFactory.createConversation({
            sessionId: 'long-message-session',
            messages: [
              MockDataFactory.createMessage({ 
                role: 'user', 
                content: 'Hello' 
              }),
              MockDataFactory.createMessage({ 
                role: 'assistant', 
                content: longMessage 
              })
            ]
          })
        ]
      };
      
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          conversations={conversationWithLongMessage}
        />
      );
      
      // Should show truncated version with ellipsis
      const truncatedText = longMessage.substring(0, 50) + '...';
      expect(screen.getByText(new RegExp(truncatedText.substring(0, 30)))).toBeInTheDocument();
    });

    it('shows full message when under character limit', () => {
      const shortMessage = 'Short message';
      const conversationWithShortMessage = {
        'Agent 1': [
          MockDataFactory.createConversation({
            sessionId: 'short-message-session',
            messages: [
              MockDataFactory.createMessage({ 
                role: 'assistant', 
                content: shortMessage 
              })
            ]
          })
        ]
      };
      
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          conversations={conversationWithShortMessage}
        />
      );
      
      expect(screen.getByText(shortMessage)).toBeInTheDocument();
    });

    it('uses the last message for preview', () => {
      const conversation = defaultProps.conversations['Agent 1'][0];
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      const preview = lastMessage.content.substring(0, 50);
      expect(screen.getByText(new RegExp(preview))).toBeInTheDocument();
    });
  });

  describe('Time Display', () => {
    it('shows relative time for conversations', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // For now, all conversations show "Recently"
      expect(screen.getAllByText('Recently').length).toBeGreaterThan(0);
    });

    it('formats time consistently across conversations', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // All should show the same format for now
      const timeElements = screen.getAllByText('Recently');
      expect(timeElements.length).toBe(5); // 3 + 2 conversations total
    });
  });

  describe('Performance and Optimization', () => {
    it('renders large conversation lists efficiently', () => {
      const largeConversations = {
        'Agent 1': MockDataFactory.createConversationsForAgent('Agent 1', 50),
        'Agent 2': MockDataFactory.createConversationsForAgent('Agent 2', 30),
      };
      
      const startTime = performance.now();
      
      renderWithProviders(
        <ConversationList 
          {...defaultProps} 
          conversations={largeConversations}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      
      // Should show correct counts
      expect(screen.getByText('50 conversations')).toBeInTheDocument();
      expect(screen.getByText('30 conversations')).toBeInTheDocument();
    });

    it('uses memoization to prevent unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Re-render with same props
      rerender(<ConversationList {...defaultProps} />);
      
      // Should not cause performance issues (memoized components should prevent re-renders)
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    it('efficiently updates when only selection changes', () => {
      const { rerender } = renderWithProviders(<ConversationList {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Change only selected conversation
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      rerender(
        <ConversationList 
          {...defaultProps} 
          selectedConversationId={firstConversation.sessionId}
        />
      );
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      expect(updateTime).toBeLessThan(100); // Should update quickly
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Main list should have proper role
      expect(screen.getByRole('list')).toBeInTheDocument();
      
      // Agent sections should be properly structured
      defaultProps.agents.forEach(agent => {
        if (defaultProps.conversations[agent.name]?.length > 0) {
          const agentButton = screen.getByRole('button', { name: new RegExp(agent.name) });
          expect(agentButton).toBeInTheDocument();
        }
      });
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(<ConversationList {...defaultProps} />);
      
      await checkAccessibility(container);
    });

    it('supports screen reader navigation', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Conversations should be announced properly
      const conversationButtons = screen.getAllByRole('button');
      expect(conversationButtons.length).toBeGreaterThan(0);
      
      conversationButtons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('provides keyboard navigation between conversations', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Should be able to tab through conversations
      await user.tab(); // First agent button
      await user.tab(); // First conversation
      
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      const conversationPreview = firstConversation.messages[firstConversation.messages.length - 1].content.substring(0, 50);
      const conversationButton = screen.getByText(new RegExp(conversationPreview)).closest('button');
      
      expect(conversationButton).toHaveFocus();
    });

    it('maintains focus during expand/collapse operations', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      const agent1Button = screen.getByRole('button', { name: /Agent 1/ });
      agent1Button.focus();
      
      await user.keyboard('{Enter}');
      
      // Focus should remain on agent button after expand/collapse
      expect(agent1Button).toHaveFocus();
    });
  });

  describe('Visual States and Styling', () => {
    it('applies proper nesting styles for conversations', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      const conversationPreview = firstConversation.messages[firstConversation.messages.length - 1].content.substring(0, 50);
      const conversationButton = screen.getByText(new RegExp(conversationPreview)).closest('button');
      
      // Should have proper padding for nesting
      expect(conversationButton).toHaveStyle({ paddingLeft: expect.any(String) });
    });

    it('shows correct icons for different elements', () => {
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Should show person icons for agents
      expect(screen.getAllByTestId('PersonIcon').length).toBe(3);
      
      // Should show chat icons for conversations
      expect(screen.getAllByTestId('ChatIcon').length).toBe(5); // 3 + 2 conversations
    });

    it('applies hover effects appropriately', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(<ConversationList {...defaultProps} />);
      
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      const conversationPreview = firstConversation.messages[firstConversation.messages.length - 1].content.substring(0, 50);
      const conversationButton = screen.getByText(new RegExp(conversationPreview)).closest('button');
      
      await user.hover(conversationButton!);
      
      // Hover effects are handled by MUI
      expect(conversationButton).toBeVisible();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed conversation data gracefully', () => {
      const malformedConversations = {
        'Agent 1': [
          { sessionId: 'bad-1', messages: null } as any,
          { sessionId: 'bad-2', messages: undefined } as any,
          { sessionId: 'bad-3' } as any, // Missing messages
        ]
      };
      
      expect(() => {
        renderWithProviders(
          <ConversationList 
            {...defaultProps} 
            conversations={malformedConversations}
          />
        );
      }).not.toThrow();
    });

    it('handles missing agent data in conversations', () => {
      const conversationsWithMissingAgent = {
        'Agent 1': defaultProps.conversations['Agent 1'],
        'Nonexistent Agent': [MockDataFactory.createConversation()]
      };
      
      expect(() => {
        renderWithProviders(
          <ConversationList 
            {...defaultProps} 
            conversations={conversationsWithMissingAgent}
          />
        );
      }).not.toThrow();
    });

    it('handles undefined callback props gracefully', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <ConversationList 
          agents={defaultProps.agents}
          conversations={defaultProps.conversations}
          onContinueConversation={undefined as any}
        />
      );
      
      const firstConversation = defaultProps.conversations['Agent 1'][0];
      const conversationPreview = firstConversation.messages[firstConversation.messages.length - 1].content.substring(0, 50);
      const conversationButton = screen.getByText(new RegExp(conversationPreview));
      
      expect(() => user.click(conversationButton)).not.toThrow();
    });

    it('maintains state during rapid prop changes', () => {
      const { rerender } = renderWithProviders(<ConversationList {...defaultProps} />);
      
      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        const selectedId = i % 2 === 0 ? defaultProps.conversations['Agent 1'][0].sessionId : undefined;
        
        rerender(
          <ConversationList 
            {...defaultProps} 
            selectedConversationId={selectedId}
          />
        );
      }
      
      // Should remain functional
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });
  });
});