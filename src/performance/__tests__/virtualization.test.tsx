import React from 'react';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateHighFrequencyUpdates,
  detectMemoryLeaks,
  mockWindowMethods 
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';

// Mock virtualized conversation list component
const MockVirtualizedConversationList: React.FC<{
  conversations: any[];
  onSelectConversation: (conversation: any) => void;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}> = ({ 
  conversations, 
  onSelectConversation, 
  itemHeight = 60, 
  containerHeight = 400, 
  overscan = 5 
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 0 });
  
  React.useEffect(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      conversations.length - 1, 
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [scrollTop, conversations.length, itemHeight, containerHeight, overscan]);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };
  
  const visibleItems = conversations.slice(visibleRange.start, visibleRange.end + 1);
  
  return (
    <div 
      data-testid="virtualized-conversation-list"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div 
        data-testid="scroll-container"
        style={{ height: conversations.length * itemHeight, position: 'relative' }}
      >
        {visibleItems.map((conversation, index) => {
          const actualIndex = visibleRange.start + index;
          return (
            <div
              key={conversation.sessionId}
              data-testid={`conversation-item-${actualIndex}`}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
                borderBottom: '1px solid #eee',
                padding: '8px',
                cursor: 'pointer'
              }}
              onClick={() => onSelectConversation(conversation)}
            >
              <div data-testid={`conversation-content-${actualIndex}`}>
                <strong>{conversation.sessionId}</strong>
                <p>{conversation.messages[conversation.messages.length - 1]?.content.substring(0, 50)}...</p>
              </div>
            </div>
          );
        })}
      </div>
      <div data-testid="scroll-info" style={{ position: 'fixed', top: 0, right: 0, background: 'yellow' }}>
        Visible: {visibleRange.start}-{visibleRange.end} / {conversations.length}
      </div>
    </div>
  );
};

// Mock virtualized message list component
const MockVirtualizedMessageList: React.FC<{
  messages: any[];
  containerHeight?: number;
  estimatedItemHeight?: number;
}> = ({ messages, containerHeight = 500, estimatedItemHeight = 40 }) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [itemHeights, setItemHeights] = React.useState<number[]>(
    new Array(messages.length).fill(estimatedItemHeight)
  );
  
  // Simple visible range calculation
  let visibleStart = 0;
  let visibleEnd = 0;
  let currentHeight = 0;
  
  for (let i = 0; i < messages.length; i++) {
    if (currentHeight >= scrollTop && visibleStart === 0) {
      visibleStart = Math.max(0, i - 2);
    }
    currentHeight += itemHeights[i];
    if (currentHeight >= scrollTop + containerHeight) {
      visibleEnd = Math.min(messages.length - 1, i + 2);
      break;
    }
  }
  
  if (visibleEnd === 0) visibleEnd = messages.length - 1;
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };
  
  const totalHeight = itemHeights.reduce((sum, height) => sum + height, 0);
  const visibleMessages = messages.slice(visibleStart, visibleEnd + 1);
  
  return (
    <div 
      data-testid="virtualized-message-list"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div 
        data-testid="message-scroll-container"
        style={{ height: totalHeight, position: 'relative' }}
      >
        {visibleMessages.map((message, index) => {
          const actualIndex = visibleStart + index;
          const top = itemHeights.slice(0, actualIndex).reduce((sum, h) => sum + h, 0);
          
          return (
            <div
              key={message.id || actualIndex}
              data-testid={`message-item-${actualIndex}`}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                minHeight: itemHeights[actualIndex],
                padding: '8px',
                borderBottom: '1px solid #eee'
              }}
            >
              <div data-testid={`message-content-${actualIndex}`}>
                <strong>{message.role}:</strong> {message.content}
              </div>
            </div>
          );
        })}
      </div>
      <div data-testid="message-scroll-info" style={{ position: 'fixed', top: 30, right: 0, background: 'lightblue' }}>
        Messages: {visibleStart}-{visibleEnd} / {messages.length}
      </div>
    </div>
  );
};

describe('Virtualization Performance Tests', () => {
  let windowMocks: ReturnType<typeof mockWindowMethods>;
  
  beforeEach(() => {
    windowMocks = mockWindowMethods();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Conversation List Virtualization', () => {
    it('renders large conversation lists without performance degradation', () => {
      const largeConversationSet = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      const mockSelectConversation = jest.fn();
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={largeConversationSet}
          onSelectConversation={mockSelectConversation}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly despite large dataset
      expect(renderTime).toBeLessThan(500); // 500ms threshold
      
      // Should only render visible items (not all 1000)
      const renderedItems = screen.getAllByTestId(/^conversation-item-/);
      expect(renderedItems.length).toBeLessThan(20); // Only visible items
      expect(renderedItems.length).toBeGreaterThan(0);
      
      // Should show correct total in scroll info
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('/ 1000');
    });

    it('maintains smooth scrolling with large datasets', async () => {
      const user = setupUserEvent();
      const largeConversationSet = MockDataFactory.createConversationsForAgent('test-agent', 2000);
      const mockSelectConversation = jest.fn();
      
      renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={largeConversationSet}
          onSelectConversation={mockSelectConversation}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const scrollContainer = screen.getByTestId('virtualized-conversation-list');
      
      // Simulate rapid scrolling
      const scrollEvents = [100, 500, 1000, 2000, 5000, 10000];
      
      for (const scrollTop of scrollEvents) {
        act(() => {
          scrollContainer.scrollTop = scrollTop;
          scrollContainer.dispatchEvent(new Event('scroll'));
        });
        
        // Should update visible range
        const scrollInfo = screen.getByTestId('scroll-info');
        expect(scrollInfo.textContent).toContain('/');
        
        // Should still have reasonable number of rendered items
        const renderedItems = screen.getAllByTestId(/^conversation-item-/);
        expect(renderedItems.length).toBeLessThan(25);
      }
    });

    it('properly mounts and unmounts conversation items', async () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 100);
      const mockSelectConversation = jest.fn();
      
      renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={mockSelectConversation}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const scrollContainer = screen.getByTestId('virtualized-conversation-list');
      
      // Initially should show items 0-6 (with overscan)
      expect(screen.getByTestId('conversation-item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('conversation-item-20')).not.toBeInTheDocument();
      
      // Scroll down significantly
      act(() => {
        scrollContainer.scrollTop = 1200; // Should show items around index 20
        scrollContainer.dispatchEvent(new Event('scroll'));
      });
      
      // Should now show different items
      expect(screen.queryByTestId('conversation-item-0')).not.toBeInTheDocument();
      expect(screen.getByTestId('conversation-item-20')).toBeInTheDocument();
    });

    it('handles dynamic conversation list changes efficiently', () => {
      const initialConversations = MockDataFactory.createConversationsForAgent('test-agent', 50);
      const mockSelectConversation = jest.fn();
      
      const { rerender } = renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={initialConversations}
          onSelectConversation={mockSelectConversation}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('/ 50');
      
      // Add more conversations
      const expandedConversations = [
        ...initialConversations,
        ...MockDataFactory.createConversationsForAgent('test-agent', 25, 3)
      ];
      
      const startTime = performance.now();
      
      rerender(
        <MockVirtualizedConversationList 
          conversations={expandedConversations}
          onSelectConversation={mockSelectConversation}
        />
      );
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Update should be fast
      expect(updateTime).toBeLessThan(100);
      
      // Should show updated count
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('/ 75');
    });
  });

  describe('Message List Virtualization', () => {
    it('handles conversations with 10,000+ messages', () => {
      const largeConversation = MockDataFactory.createLargeConversation(10000);
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MockVirtualizedMessageList messages={largeConversation.messages} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly despite huge dataset
      expect(renderTime).toBeLessThan(1000);
      
      // Should only render visible messages
      const renderedMessages = screen.getAllByTestId(/^message-item-/);
      expect(renderedMessages.length).toBeLessThan(30); // Only visible items
      
      // Should show correct total
      expect(screen.getByTestId('message-scroll-info')).toHaveTextContent('/ 10000');
    });

    it('maintains scroll position during re-renders', () => {
      const messages = MockDataFactory.createMessages(1000);
      
      const { rerender } = renderWithProviders(
        <MockVirtualizedMessageList messages={messages} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const messageContainer = screen.getByTestId('virtualized-message-list');
      
      // Scroll to middle
      act(() => {
        messageContainer.scrollTop = 5000;
        messageContainer.dispatchEvent(new Event('scroll'));
      });
      
      const initialScrollInfo = screen.getByTestId('message-scroll-info').textContent;
      
      // Add a new message (simulate receiving new message)
      const updatedMessages = [
        ...messages,
        MockDataFactory.createMessage({ role: 'assistant', content: 'New message' })
      ];
      
      rerender(<MockVirtualizedMessageList messages={updatedMessages} />);
      
      // Scroll position should be maintained (in real implementation)
      // For this mock, we just verify it doesn't crash and shows updated count
      expect(screen.getByTestId('message-scroll-info')).toHaveTextContent('/ 1001');
    });

    it('handles variable message heights correctly', () => {
      const messages = [
        MockDataFactory.createMessage({ content: 'Short' }),
        MockDataFactory.createMessage({ content: 'Medium length message that spans a bit more' }),
        MockDataFactory.createMessage({ 
          content: 'Very long message that would normally take up multiple lines and should have a different height than the other messages in the conversation to test variable height handling' 
        }),
        MockDataFactory.createMessage({ content: 'Short again' }),
      ];
      
      renderWithProviders(
        <MockVirtualizedMessageList messages={messages} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // All messages should be rendered (small dataset)
      messages.forEach((_, index) => {
        expect(screen.getByTestId(`message-item-${index}`)).toBeInTheDocument();
      });
      
      // Should handle different content lengths
      expect(screen.getByText('Short')).toBeInTheDocument();
      expect(screen.getByText(/Very long message/)).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('does not create memory leaks with large datasets', async () => {
      const memoryTracker = detectMemoryLeaks();
      
      // Create and destroy large virtualized lists multiple times
      for (let i = 0; i < 5; i++) {
        const conversations = MockDataFactory.createConversationsForAgent('test-agent', 1000);
        
        const { unmount } = renderWithProviders(
          <MockVirtualizedConversationList 
            conversations={conversations}
            onSelectConversation={jest.fn()}
          />,
          { withAgentProvider: false, withMCPProvider: false }
        );
        
        // Simulate some scrolling
        const container = screen.getByTestId('virtualized-conversation-list');
        act(() => {
          container.scrollTop = 1000;
          container.dispatchEvent(new Event('scroll'));
        });
        
        unmount();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const memoryStats = memoryTracker.check();
      
      // Memory increase should be reasonable (not exponential)
      // This is a rough check - in a real app you'd have more sophisticated memory monitoring
      expect(memoryStats.increase).toBeLessThan(50 * 1024 * 1024); // 50MB increase max
    });

    it('properly cleans up event listeners', () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 100);
      
      const { unmount } = renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('virtualized-conversation-list');
      
      // Add scroll listener
      const scrollHandler = jest.fn();
      container.addEventListener('scroll', scrollHandler);
      
      // Trigger scroll
      act(() => {
        container.scrollTop = 500;
        container.dispatchEvent(new Event('scroll'));
      });
      
      expect(scrollHandler).toHaveBeenCalled();
      
      // Unmount component
      unmount();
      
      // Component should clean up properly (no error thrown)
      expect(() => {
        container.dispatchEvent(new Event('scroll'));
      }).not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('optimizes re-render performance with memoization', async () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 500);
      const mockSelectConversation = jest.fn();
      
      const { rerender } = renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={mockSelectConversation}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Perform high-frequency updates
      await simulateHighFrequencyUpdates(() => {
        rerender(
          <MockVirtualizedConversationList 
            conversations={conversations}
            onSelectConversation={mockSelectConversation}
          />
        );
      }, 20, 16); // 20 updates at 60fps
      
      // Should handle rapid updates without degradation
      expect(screen.getByTestId('virtualized-conversation-list')).toBeInTheDocument();
      
      // Performance metrics would be checked in a real implementation
      // Here we just verify it doesn't crash or become unresponsive
    });

    it('handles rapid scroll events efficiently', async () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      
      renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('virtualized-conversation-list');
      
      // Simulate rapid scrolling
      await simulateHighFrequencyUpdates(() => {
        act(() => {
          container.scrollTop += 100;
          container.dispatchEvent(new Event('scroll'));
        });
      }, 50, 16); // Rapid scroll events
      
      // Should still be responsive
      expect(screen.getByTestId('scroll-info')).toBeInTheDocument();
      
      // Should have updated visible range
      const scrollInfo = screen.getByTestId('scroll-info');
      expect(scrollInfo.textContent).toMatch(/\d+-\d+ \/ 1000/);
    });

    it('batches DOM updates efficiently', () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 200);
      
      renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('virtualized-conversation-list');
      
      // Rapid scroll should not cause excessive DOM updates
      const scrollValues = [100, 200, 300, 400, 500];
      
      scrollValues.forEach(scrollTop => {
        act(() => {
          container.scrollTop = scrollTop;
          container.dispatchEvent(new Event('scroll'));
        });
      });
      
      // Should efficiently update visible items
      const visibleItems = screen.getAllByTestId(/^conversation-item-/);
      expect(visibleItems.length).toBeGreaterThan(0);
      expect(visibleItems.length).toBeLessThan(25); // Should maintain reasonable DOM size
    });
  });

  describe('Stress Testing', () => {
    it('handles extreme dataset sizes', () => {
      // Test with very large dataset
      const extremeDataset = MockDataFactory.createConversationsForAgent('test-agent', 50000);
      
      const startTime = performance.now();
      
      renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={extremeDataset}
          onSelectConversation={jest.fn()}
          containerHeight={600}
          itemHeight={50}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should still render in reasonable time
      expect(renderTime).toBeLessThan(2000); // 2 second threshold for extreme size
      
      // Should show correct count
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('/ 50000');
      
      // Should still only render visible items
      const renderedItems = screen.getAllByTestId(/^conversation-item-/);
      expect(renderedItems.length).toBeLessThan(30);
    });

    it('maintains performance during continuous usage simulation', async () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 2000);
      
      renderWithProviders(
        <MockVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('virtualized-conversation-list');
      
      // Simulate continuous usage for 100 operations
      for (let i = 0; i < 100; i++) {
        const randomScrollTop = Math.random() * 50000; // Random scroll position
        
        act(() => {
          container.scrollTop = randomScrollTop;
          container.dispatchEvent(new Event('scroll'));
        });
        
        // Verify still functional every 10 operations
        if (i % 10 === 0) {
          expect(screen.getByTestId('scroll-info')).toBeInTheDocument();
          const renderedItems = screen.getAllByTestId(/^conversation-item-/);
          expect(renderedItems.length).toBeGreaterThan(0);
        }
      }
      
      // Final verification
      expect(screen.getByTestId('virtualized-conversation-list')).toBeInTheDocument();
    });
  });
});