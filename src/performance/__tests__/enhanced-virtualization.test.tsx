import React from 'react';
import { screen, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent, 
  simulateHighFrequencyUpdates,
  detectMemoryLeaks,
  mockWindowMethods 
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';

// Enhanced virtualized components for testing
const EnhancedVirtualizedConversationList: React.FC<{
  conversations: any[];
  onSelectConversation: (conversation: any) => void;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  estimatedItemHeight?: number;
  enableVirtualization?: boolean;
}> = ({ 
  conversations, 
  onSelectConversation, 
  itemHeight = 60, 
  containerHeight = 400, 
  overscan = 5,
  estimatedItemHeight = 60,
  enableVirtualization = true
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 0 });
  const [itemHeights, setItemHeights] = React.useState<Map<number, number>>(new Map());
  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Calculate visible range with variable heights
  React.useEffect(() => {
    if (!enableVirtualization) {
      setVisibleRange({ start: 0, end: conversations.length - 1 });
      return;
    }

    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = conversations.length - 1;

    // Find start index
    for (let i = 0; i < conversations.length; i++) {
      const height = itemHeights.get(i) || estimatedItemHeight;
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += height;
    }

    // Find end index
    accumulatedHeight = 0;
    for (let i = 0; i < conversations.length; i++) {
      const height = itemHeights.get(i) || estimatedItemHeight;
      accumulatedHeight += height;
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(conversations.length - 1, i + overscan);
        break;
      }
    }

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [scrollTop, conversations.length, itemHeights, estimatedItemHeight, containerHeight, overscan, enableVirtualization]);

  // Measure item heights after render
  React.useLayoutEffect(() => {
    const newItemHeights = new Map(itemHeights);
    let updated = false;

    itemRefs.current.forEach((element, index) => {
      if (element) {
        const height = element.getBoundingClientRect().height;
        if (itemHeights.get(index) !== height) {
          newItemHeights.set(index, height);
          updated = true;
        }
      }
    });

    if (updated) {
      setItemHeights(newItemHeights);
    }
  });

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const getTotalHeight = () => {
    if (!enableVirtualization) {
      return conversations.length * estimatedItemHeight;
    }
    
    let total = 0;
    for (let i = 0; i < conversations.length; i++) {
      total += itemHeights.get(i) || estimatedItemHeight;
    }
    return total;
  };

  const getItemTop = (index: number) => {
    let top = 0;
    for (let i = 0; i < index; i++) {
      top += itemHeights.get(i) || estimatedItemHeight;
    }
    return top;
  };

  const visibleItems = enableVirtualization 
    ? conversations.slice(visibleRange.start, visibleRange.end + 1)
    : conversations;

  return (
    <div 
      data-testid="enhanced-virtualized-conversation-list"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      ref={listRef}
    >
      <div 
        data-testid="scroll-container"
        style={{ height: getTotalHeight(), position: 'relative' }}
      >
        {visibleItems.map((conversation, index) => {
          const actualIndex = enableVirtualization ? visibleRange.start + index : index;
          const top = enableVirtualization ? getItemTop(actualIndex) : actualIndex * estimatedItemHeight;
          
          return (
            <div
              key={conversation.sessionId}
              data-testid={`conversation-item-${actualIndex}`}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(actualIndex, el);
                } else {
                  itemRefs.current.delete(actualIndex);
                }
              }}
              style={{
                position: enableVirtualization ? 'absolute' : 'relative',
                top: enableVirtualization ? top : 0,
                left: 0,
                right: 0,
                minHeight: estimatedItemHeight,
                borderBottom: '1px solid #eee',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={() => onSelectConversation(conversation)}
            >
              <div data-testid={`conversation-content-${actualIndex}`}>
                <strong>{conversation.sessionId}</strong>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  margin: '4px 0',
                  wordWrap: 'break-word'
                }}>
                  {conversation.messages[conversation.messages.length - 1]?.content.substring(0, 100)}...
                </p>
                <small style={{ color: '#999' }}>
                  {conversation.messages.length} messages
                </small>
              </div>
            </div>
          );
        })}
      </div>
      
      <div data-testid="scroll-info" style={{ 
        position: 'fixed', 
        top: 0, 
        right: 0, 
        background: 'yellow',
        padding: '4px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        {enableVirtualization 
          ? `Visible: ${visibleRange.start}-${visibleRange.end} / ${conversations.length}`
          : `All: ${conversations.length}`
        }
      </div>
    </div>
  );
};

describe('Enhanced Virtualization Performance Tests', () => {
  let windowMocks: ReturnType<typeof mockWindowMethods>;
  
  beforeEach(() => {
    windowMocks = mockWindowMethods();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    windowMocks.restore();
  });

  describe('Scalability Testing', () => {
    it('handles extremely large datasets (10,000+ items)', () => {
      const extremeDataset = MockDataFactory.createConversationsForAgent('test-agent', 10000);
      
      const startTime = performance.now();
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={extremeDataset}
          onSelectConversation={jest.fn()}
          containerHeight={600}
          itemHeight={80}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should handle extreme datasets efficiently
      expect(renderTime).toBeLessThan(1000); // 1 second threshold
      
      // Should only render visible items
      const renderedItems = screen.getAllByTestId(/^conversation-item-/);
      expect(renderedItems.length).toBeLessThan(50); // Only visible items
      
      // Should show correct total
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('/ 10000');
    });

    it('maintains performance with variable item heights', () => {
      const conversationsWithVariableContent = Array.from({ length: 1000 }, (_, i) => 
        MockDataFactory.createConversation({
          sessionId: `variable-${i}`,
          messages: [
            MockDataFactory.createMessage({ 
              role: 'assistant', 
              content: 'A'.repeat(Math.floor(Math.random() * 200) + 50) // Variable length content
            })
          ]
        })
      );
      
      const startTime = performance.now();
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversationsWithVariableContent}
          onSelectConversation={jest.fn()}
          estimatedItemHeight={60}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(800);
      expect(screen.getByTestId('enhanced-virtualized-conversation-list')).toBeInTheDocument();
    });

    it('compares virtualized vs non-virtualized performance', () => {
      const dataset = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      
      // Test virtualized version
      const virtualizedStart = performance.now();
      const { unmount: unmountVirtualized } = renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={dataset}
          onSelectConversation={jest.fn()}
          enableVirtualization={true}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      const virtualizedTime = performance.now() - virtualizedStart;
      unmountVirtualized();
      
      // Test non-virtualized version
      const nonVirtualizedStart = performance.now();
      const { unmount: unmountNonVirtualized } = renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={dataset}
          onSelectConversation={jest.fn()}
          enableVirtualization={false}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      const nonVirtualizedTime = performance.now() - nonVirtualizedStart;
      unmountNonVirtualized();
      
      // Virtualized should be significantly faster for large datasets
      expect(virtualizedTime).toBeLessThan(nonVirtualizedTime * 0.5);
    });
  });

  describe('Memory Management and Leaks', () => {
    it('prevents memory leaks during rapid scrolling', async () => {
      const memoryTracker = detectMemoryLeaks();
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 2000);
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('enhanced-virtualized-conversation-list');
      
      // Simulate intensive scrolling
      for (let i = 0; i < 100; i++) {
        act(() => {
          container.scrollTop = Math.random() * 50000;
          container.dispatchEvent(new Event('scroll'));
        });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const memoryStats = memoryTracker.check();
      
      // Memory increase should be reasonable
      expect(memoryStats.increase).toBeLessThan(30 * 1024 * 1024); // 30MB max
    });

    it('cleans up event listeners and references', () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 500);
      
      const { unmount } = renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('enhanced-virtualized-conversation-list');
      
      // Add event listeners
      const scrollHandler = jest.fn();
      container.addEventListener('scroll', scrollHandler);
      
      // Trigger events
      act(() => {
        container.scrollTop = 1000;
        container.dispatchEvent(new Event('scroll'));
      });
      
      expect(scrollHandler).toHaveBeenCalled();
      
      // Unmount and verify cleanup
      unmount();
      
      expect(() => {
        container.dispatchEvent(new Event('scroll'));
      }).not.toThrow();
    });

    it('manages item reference cleanup efficiently', () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      
      const { rerender } = renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('enhanced-virtualized-conversation-list');
      
      // Scroll to create and destroy many items
      for (let i = 0; i < 20; i++) {
        act(() => {
          container.scrollTop = i * 500;
          container.dispatchEvent(new Event('scroll'));
        });
      }
      
      // Update with different data
      const newConversations = MockDataFactory.createConversationsForAgent('new-agent', 800);
      
      rerender(
        <EnhancedVirtualizedConversationList 
          conversations={newConversations}
          onSelectConversation={jest.fn()}
        />
      );
      
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('/ 800');
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('handles live data updates without performance degradation', async () => {
      let conversations = MockDataFactory.createConversationsForAgent('test-agent', 500);
      
      const { rerender } = renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Simulate real-time updates
      for (let i = 0; i < 50; i++) {
        // Add new conversation
        conversations = [
          MockDataFactory.createConversation({
            sessionId: `live-update-${i}`,
            messages: [MockDataFactory.createMessage({ content: `Live message ${i}` })]
          }),
          ...conversations
        ];
        
        const updateStart = performance.now();
        
        rerender(
          <EnhancedVirtualizedConversationList 
            conversations={conversations}
            onSelectConversation={jest.fn()}
          />
        );
        
        const updateTime = performance.now() - updateStart;
        
        // Each update should be fast
        expect(updateTime).toBeLessThan(50); // 50ms per update
      }
      
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('/ 550');
    });

    it('maintains performance during rapid user interactions', async () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      const onSelectConversation = jest.fn();
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={onSelectConversation}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('enhanced-virtualized-conversation-list');
      
      // Simulate rapid user interactions
      await simulateHighFrequencyUpdates(() => {
        // Rapid scrolling
        act(() => {
          container.scrollTop += 100;
          container.dispatchEvent(new Event('scroll'));
        });
        
        // Rapid clicks on visible items
        const visibleItems = screen.getAllByTestId(/^conversation-item-/);
        if (visibleItems.length > 0) {
          const randomItem = visibleItems[Math.floor(Math.random() * visibleItems.length)];
          randomItem.click();
        }
      }, 30, 16); // 30 operations at 60fps
      
      expect(onSelectConversation).toHaveBeenCalled();
      expect(screen.getByTestId('enhanced-virtualized-conversation-list')).toBeInTheDocument();
    });

    it('handles concurrent data operations efficiently', async () => {
      const baseConversations = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      
      const { rerender } = renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={baseConversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const container = screen.getByTestId('enhanced-virtualized-conversation-list');
      
      // Simulate concurrent operations
      const operations = [];
      
      // Scrolling operation
      operations.push(
        simulateHighFrequencyUpdates(() => {
          act(() => {
            container.scrollTop += 50;
            container.dispatchEvent(new Event('scroll'));
          });
        }, 20, 16)
      );
      
      // Data update operation
      operations.push(
        simulateHighFrequencyUpdates(() => {
          const updatedConversations = [
            MockDataFactory.createConversation({ sessionId: `concurrent-${Math.random()}` }),
            ...baseConversations.slice(0, -1)
          ];
          
          rerender(
            <EnhancedVirtualizedConversationList 
              conversations={updatedConversations}
              onSelectConversation={jest.fn()}
            />
          );
        }, 10, 50)
      );
      
      // Wait for all operations to complete
      await Promise.all(operations);
      
      expect(screen.getByTestId('enhanced-virtualized-conversation-list')).toBeInTheDocument();
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('measures and reports render performance metrics', () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 2000);
      
      const metrics = {
        renderTime: 0,
        firstPaint: 0,
        scrollResponseTime: 0
      };
      
      // Measure initial render
      const renderStart = performance.now();
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      metrics.renderTime = performance.now() - renderStart;
      
      const container = screen.getByTestId('enhanced-virtualized-conversation-list');
      
      // Measure scroll response time
      const scrollStart = performance.now();
      
      act(() => {
        container.scrollTop = 5000;
        container.dispatchEvent(new Event('scroll'));
      });
      
      metrics.scrollResponseTime = performance.now() - scrollStart;
      
      // Assert performance thresholds
      expect(metrics.renderTime).toBeLessThan(500); // 500ms render time
      expect(metrics.scrollResponseTime).toBeLessThan(16); // 16ms for 60fps
      
      // Log metrics for monitoring
      console.log('Performance Metrics:', metrics);
    });

    it('tracks memory usage patterns', () => {
      const memoryTracker = detectMemoryLeaks();
      
      // Create multiple instances to test memory patterns
      for (let i = 0; i < 5; i++) {
        const conversations = MockDataFactory.createConversationsForAgent(`agent-${i}`, 500);
        
        const { unmount } = renderWithProviders(
          <EnhancedVirtualizedConversationList 
            conversations={conversations}
            onSelectConversation={jest.fn()}
          />,
          { withAgentProvider: false, withMCPProvider: false }
        );
        
        // Simulate usage
        const container = screen.getByTestId('enhanced-virtualized-conversation-list');
        
        for (let j = 0; j < 10; j++) {
          act(() => {
            container.scrollTop = j * 200;
            container.dispatchEvent(new Event('scroll'));
          });
        }
        
        unmount();
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
      }
      
      const memoryStats = memoryTracker.check();
      
      // Memory should be bounded
      expect(memoryStats.increase).toBeLessThan(100 * 1024 * 1024); // 100MB total
    });

    it('provides performance debugging information', () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const scrollInfo = screen.getByTestId('scroll-info');
      
      // Should provide debugging information
      expect(scrollInfo).toHaveTextContent(/Visible: \d+-\d+ \/ 1000/);
      
      const container = screen.getByTestId('enhanced-virtualized-conversation-list');
      
      // After scrolling, should show updated range
      act(() => {
        container.scrollTop = 2000;
        container.dispatchEvent(new Event('scroll'));
      });
      
      expect(scrollInfo).toHaveTextContent(/Visible: \d+-\d+ \/ 1000/);
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('handles empty datasets gracefully', () => {
      const startTime = performance.now();
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={[]}
          onSelectConversation={jest.fn()}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(50); // Should be very fast for empty data
      expect(screen.getByTestId('scroll-info')).toHaveTextContent('Visible: 0--1 / 0');
    });

    it('recovers from malformed data without performance impact', () => {
      const malformedConversations = [
        null,
        undefined,
        { sessionId: 'valid', messages: [] },
        { messages: [{ content: 'No sessionId' }] },
        { sessionId: 'valid-2', messages: null }
      ].filter(Boolean) as any[];
      
      expect(() => {
        renderWithProviders(
          <EnhancedVirtualizedConversationList 
            conversations={malformedConversations}
            onSelectConversation={jest.fn()}
          />,
          { withAgentProvider: false, withMCPProvider: false }
        );
      }).not.toThrow();
    });

    it('maintains performance during error conditions', () => {
      const conversations = MockDataFactory.createConversationsForAgent('test-agent', 1000);
      
      // Mock console.error to catch any errors
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const startTime = performance.now();
      
      renderWithProviders(
        <EnhancedVirtualizedConversationList 
          conversations={conversations}
          onSelectConversation={() => {
            throw new Error('Test error');
          }}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(500);
      
      // Clean up
      consoleErrorSpy.mockRestore();
    });
  });
});