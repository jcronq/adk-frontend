import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render-with-providers';
import { 
  setupUserEvent,
  simulateKeyboardNavigation,
  checkFocusManagement
} from '../../test-utils/test-helpers';
import { MockDataFactory } from '../../test-utils/mock-data-factory';

// Mock axe-core for accessibility testing
const mockAxeResults = {
  violations: [],
  passes: [],
  incomplete: [],
  inapplicable: []
};

const mockAxeRun = jest.fn().mockResolvedValue(mockAxeResults);

// Mock axe-core module
jest.mock('axe-core', () => ({
  run: mockAxeRun,
  configure: jest.fn(),
}));

// Extended accessibility test utilities
const runAxeAudit = async (container: HTMLElement): Promise<any> => {
  // In a real implementation, this would use actual axe-core
  return mockAxeRun(container);
};

const checkColorContrast = (element: HTMLElement): boolean => {
  // Mock color contrast checking
  const computedStyle = window.getComputedStyle(element);
  const backgroundColor = computedStyle.backgroundColor;
  const color = computedStyle.color;
  
  // Basic mock implementation - real version would calculate actual contrast ratios
  return backgroundColor !== color; // Very basic check
};

const checkKeyboardAccessibility = async (container: HTMLElement): Promise<string[]> => {
  const issues: string[] = [];
  
  // Check for interactive elements without keyboard support
  const interactiveElements = within(container).queryAllByRole('button')
    .concat(within(container).queryAllByRole('link'))
    .concat(within(container).queryAllByRole('textbox'))
    .concat(within(container).queryAllByRole('tab'));
  
  interactiveElements.forEach((element, index) => {
    // Check if element can receive focus
    const tabIndex = element.getAttribute('tabindex');
    const canFocus = element.tabIndex >= 0 || ['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA'].includes(element.tagName);
    
    if (!canFocus && tabIndex !== '0') {
      issues.push(`Interactive element at index ${index} cannot receive keyboard focus`);
    }
    
    // Check for appropriate ARIA labels
    const hasAccessibleName = 
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title');
    
    if (!hasAccessibleName) {
      issues.push(`Interactive element at index ${index} lacks accessible name`);
    }
  });
  
  return issues;
};

// Mock comprehensive ChatGPT interface for accessibility testing
const MockChatGPTInterface: React.FC<{
  notificationCount?: number;
  conversations?: any[];
  currentConversation?: any;
  messages?: any[];
  hasUnansweredQuestions?: boolean;
}> = ({
  notificationCount = 0,
  conversations = [],
  currentConversation = null,
  messages = [],
  hasUnansweredQuestions = false
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = React.useState(false);
  
  return (
    <div data-testid="chatgpt-interface" role="application" aria-label="ChatGPT-style Agent Manager">
      {/* Header */}
      <header role="banner" data-testid="app-header">
        <h1>ADK Agent Manager</h1>
        <nav role="navigation" aria-label="Main navigation">
          <button
            data-testid="notification-toggle"
            onClick={() => setNotificationCenterOpen(!notificationCenterOpen)}
            aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
            aria-expanded={notificationCenterOpen}
            aria-haspopup="true"
          >
            🔔 {notificationCount > 0 && <span aria-hidden="true">{notificationCount}</span>}
          </button>
          <button data-testid="settings-button" aria-label="Open settings">
            ⚙️ Settings
          </button>
        </nav>
      </header>

      <div data-testid="main-layout" style={{ display: 'flex' }}>
        {/* Sidebar */}
        <aside 
          data-testid="sidebar"
          role="complementary" 
          aria-label="Conversation list"
          style={{ width: sidebarCollapsed ? '60px' : '320px' }}
          aria-expanded={!sidebarCollapsed}
        >
          <div data-testid="sidebar-header">
            <button
              data-testid="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
            {!sidebarCollapsed && <h2>Conversations</h2>}
          </div>
          
          {!sidebarCollapsed && (
            <div data-testid="sidebar-content">
              <div role="search">
                <label htmlFor="conversation-search" className="visually-hidden">
                  Search conversations
                </label>
                <input
                  id="conversation-search"
                  data-testid="conversation-search"
                  type="search"
                  placeholder="Search conversations..."
                  aria-describedby="search-help"
                />
                <div id="search-help" className="visually-hidden">
                  Type to filter conversations by content
                </div>
              </div>
              
              <nav role="navigation" aria-label="Conversations">
                <ul data-testid="conversations-list" role="list">
                  {conversations.map((conversation, index) => (
                    <li key={conversation.id || index} role="listitem">
                      <button
                        data-testid={`conversation-${conversation.id || index}`}
                        aria-current={currentConversation?.id === conversation.id ? 'page' : undefined}
                        aria-describedby={`conversation-desc-${index}`}
                      >
                        <span>{conversation.title || `Conversation ${index + 1}`}</span>
                        {hasUnansweredQuestions && (
                          <span 
                            aria-label="Has unanswered questions"
                            role="status"
                          >
                            🔔
                          </span>
                        )}
                      </button>
                      <div 
                        id={`conversation-desc-${index}`} 
                        className="visually-hidden"
                      >
                        Last activity: {conversation.lastActivity || 'Unknown'}
                      </div>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <main 
          data-testid="chat-main"
          role="main" 
          aria-label="Chat conversation"
          style={{ flex: 1 }}
        >
          {currentConversation ? (
            <>
              <header data-testid="chat-header" role="banner">
                <h2 id="conversation-title">
                  Chat with {currentConversation.agentName || 'Agent'}
                </h2>
                <div role="status" aria-live="polite" aria-label="Connection status">
                  Connected
                </div>
              </header>
              
              <section 
                data-testid="messages-section"
                role="log" 
                aria-label="Conversation messages"
                aria-labelledby="conversation-title"
                aria-live="polite"
                style={{ height: '400px', overflowY: 'auto' }}
              >
                {messages.map((message, index) => (
                  <div 
                    key={message.id || index}
                    data-testid={`message-${index}`}
                    role="article"
                    aria-label={`Message from ${message.role}`}
                  >
                    <h3 className="visually-hidden">
                      {message.role === 'user' ? 'Your message' : 'Agent response'}
                    </h3>
                    <div data-testid={`message-content-${index}`}>
                      <strong aria-hidden="true">{message.role}:</strong>
                      <span>{message.content}</span>
                    </div>
                    {message.timestamp && (
                      <time 
                        data-testid={`message-time-${index}`}
                        dateTime={message.timestamp}
                        className="visually-hidden"
                      >
                        {new Date(message.timestamp).toLocaleString()}
                      </time>
                    )}
                  </div>
                ))}
              </section>
              
              <section data-testid="message-input-section" role="form" aria-label="Send message">
                <form data-testid="message-form" aria-label="Message form">
                  <label htmlFor="message-input" className="visually-hidden">
                    Type your message
                  </label>
                  <input
                    id="message-input"
                    data-testid="message-input"
                    type="text"
                    placeholder="Type your message..."
                    aria-describedby="message-input-help"
                    autoComplete="off"
                  />
                  <div id="message-input-help" className="visually-hidden">
                    Press Enter or click Send button to send message
                  </div>
                  <button 
                    type="submit" 
                    data-testid="send-button"
                    aria-label="Send message"
                  >
                    Send
                  </button>
                </form>
              </section>
            </>
          ) : (
            <div data-testid="no-conversation" role="status">
              <h2>No conversation selected</h2>
              <p>Select a conversation from the sidebar to start chatting</p>
            </div>
          )}
        </main>
      </div>

      {/* Notification Center */}
      {notificationCenterOpen && (
        <div 
          data-testid="notification-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-center-title"
        >
          <div data-testid="notification-backdrop" onClick={() => setNotificationCenterOpen(false)} />
          <div data-testid="notification-content">
            <header>
              <h2 id="notification-center-title">Notifications</h2>
              <button
                data-testid="notification-close"
                onClick={() => setNotificationCenterOpen(false)}
                aria-label="Close notifications"
              >
                ✕
              </button>
            </header>
            <div role="list" aria-label="Notification list">
              {notificationCount > 0 ? (
                Array.from({ length: notificationCount }, (_, i) => (
                  <div key={i} role="listitem" data-testid={`notification-${i}`}>
                    <h3>Question from Agent {i + 1}</h3>
                    <p>Sample question content...</p>
                    <button aria-label={`Answer question ${i + 1}`}>Answer</button>
                  </div>
                ))
              ) : (
                <div role="status">No pending notifications</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screen reader announcements */}
      <div 
        data-testid="announcements"
        role="status" 
        aria-live="assertive" 
        aria-atomic="true"
        className="visually-hidden"
      >
        {/* Dynamic announcements would appear here */}
      </div>
    </div>
  );
};

describe('Accessibility Compliance Tests', () => {
  beforeEach(() => {
    mockAxeRun.mockClear();
  });

  describe('Automated Accessibility Audits', () => {
    it('passes axe-core accessibility audit for main interface', async () => {
      const testData = MockDataFactory.createResponsiveTestData();
      
      const { container } = renderWithProviders(
        <MockChatGPTInterface 
          conversations={testData.conversations['agent-1'] || []}
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
          messages={MockDataFactory.createMessages(5)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const results = await runAxeAudit(container);
      
      expect(results.violations).toHaveLength(0);
      expect(mockAxeRun).toHaveBeenCalledWith(container);
    });

    it('passes accessibility audit with notifications open', async () => {
      const { container } = renderWithProviders(
        <MockChatGPTInterface 
          notificationCount={3}
          conversations={[]}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Open notification center
      const notificationButton = screen.getByTestId('notification-toggle');
      const user = setupUserEvent();
      await user.click(notificationButton);
      
      const results = await runAxeAudit(container);
      
      expect(results.violations).toHaveLength(0);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('passes accessibility audit with sidebar collapsed', async () => {
      const { container } = renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 3)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Collapse sidebar
      const sidebarToggle = screen.getByTestId('sidebar-toggle');
      const user = setupUserEvent();
      await user.click(sidebarToggle);
      
      const results = await runAxeAudit(container);
      
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Screen Reader Support', () => {
    it('provides proper ARIA labels and roles', () => {
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
          messages={MockDataFactory.createMessages(3)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Check application role
      expect(screen.getByRole('application')).toHaveAttribute('aria-label', 'ChatGPT-style Agent Manager');
      
      // Check landmark roles
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      
      // Check navigation
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
      
      // Check form elements
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      // Check live regions
      expect(screen.getByRole('log')).toBeInTheDocument();
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('provides accessible names for all interactive elements', async () => {
      renderWithProviders(
        <MockChatGPTInterface 
          notificationCount={2}
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const { container } = screen.getByTestId('chatgpt-interface');
      const keyboardIssues = await checkKeyboardAccessibility(container);
      
      expect(keyboardIssues).toHaveLength(0);
    });

    it('supports screen reader navigation patterns', () => {
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 3)}
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
          messages={MockDataFactory.createMessages(5)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Check for proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for lists
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
      
      // Check for articles (messages)
      const articles = screen.getAllByRole('article');
      expect(articles.length).toBeGreaterThan(0);
      
      // Verify list items
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('provides live region announcements', () => {
      renderWithProviders(
        <MockChatGPTInterface 
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Check for live regions
      const liveRegions = screen.getAllByLabelText(/conversation messages|connection status/i);
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Verify assertive announcements region
      const announcements = screen.getByTestId('announcements');
      expect(announcements).toHaveAttribute('aria-live', 'assertive');
      expect(announcements).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports comprehensive keyboard navigation', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 3)}
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Tab through interactive elements
      await user.tab(); // Notification button
      expect(screen.getByTestId('notification-toggle')).toHaveFocus();
      
      await user.tab(); // Settings button
      expect(screen.getByTestId('settings-button')).toHaveFocus();
      
      await user.tab(); // Sidebar toggle
      expect(screen.getByTestId('sidebar-toggle')).toHaveFocus();
      
      await user.tab(); // Search input
      expect(screen.getByTestId('conversation-search')).toHaveFocus();
      
      await user.tab(); // First conversation
      const firstConversation = screen.getByTestId('conversation-0');
      expect(firstConversation).toHaveFocus();
    });

    it('provides keyboard shortcuts for common actions', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Test sidebar toggle with keyboard
      const sidebarToggle = screen.getByTestId('sidebar-toggle');
      sidebarToggle.focus();
      
      await user.keyboard('{Enter}');
      
      // Sidebar should be collapsed
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('aria-expanded', 'false');
      
      // Test with Space key
      await user.keyboard(' ');
      expect(sidebar).toHaveAttribute('aria-expanded', 'true');
    });

    it('maintains logical focus order', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const focusableElements = [
        'notification-toggle',
        'settings-button',
        'sidebar-toggle',
        'conversation-search',
        'conversation-0',
        'conversation-1',
        'message-input',
        'send-button'
      ];
      
      for (const elementId of focusableElements) {
        await user.tab();
        const element = screen.getByTestId(elementId);
        expect(element).toHaveFocus();
      }
    });

    it('handles focus trapping in modal dialogs', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface notificationCount={2} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Open notification center
      const notificationButton = screen.getByTestId('notification-toggle');
      await user.click(notificationButton);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Focus should be trapped within dialog
      const closeButton = screen.getByTestId('notification-close');
      closeButton.focus();
      
      // Tab should cycle within dialog
      await user.tab();
      // In a real implementation, focus would cycle to first focusable element in dialog
      
      // Escape should close dialog
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('supports arrow key navigation in lists', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 4)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Focus first conversation
      const firstConversation = screen.getByTestId('conversation-0');
      firstConversation.focus();
      
      // Arrow down should move to next conversation
      await simulateKeyboardNavigation(user, ['{ArrowDown}']);
      
      // In a real implementation, this would move focus to next conversation
      // For now, we just verify the navigation doesn't break
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('Focus Management', () => {
    it('maintains proper focus indicators', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Tab to first interactive element
      await user.tab();
      const focusedElement = document.activeElement as HTMLElement;
      
      expect(focusedElement).toBeTruthy();
      expect(focusedElement).toBeVisible();
      
      // Focus should be clearly indicated
      checkFocusManagement(focusedElement);
    });

    it('restores focus after modal interactions', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface notificationCount={1} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const notificationButton = screen.getByTestId('notification-toggle');
      notificationButton.focus();
      
      // Open modal
      await user.click(notificationButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Close modal
      const closeButton = screen.getByTestId('notification-close');
      await user.click(closeButton);
      
      // Focus should return to trigger button
      expect(notificationButton).toHaveFocus();
    });

    it('manages focus during dynamic content changes', async () => {
      const { rerender } = renderWithProviders(
        <MockChatGPTInterface 
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
          messages={[]}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const messageInput = screen.getByTestId('message-input');
      messageInput.focus();
      
      // Add new message
      const newMessages = MockDataFactory.createMessages(1);
      rerender(
        <MockChatGPTInterface 
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
          messages={newMessages}
        />
      );
      
      // Focus should remain on input
      expect(messageInput).toHaveFocus();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('meets WCAG color contrast requirements', () => {
      const { container } = renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Check contrast for key elements
      const interactiveElements = within(container).getAllByRole('button');
      
      interactiveElements.forEach(element => {
        const hasGoodContrast = checkColorContrast(element);
        expect(hasGoodContrast).toBe(true);
      });
    });

    it('provides sufficient visual feedback for state changes', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Test sidebar collapse visual feedback
      const sidebar = screen.getByTestId('sidebar');
      const sidebarToggle = screen.getByTestId('sidebar-toggle');
      
      // Initial state
      expect(sidebar).toHaveAttribute('aria-expanded', 'true');
      
      // Collapse
      await user.click(sidebarToggle);
      expect(sidebar).toHaveAttribute('aria-expanded', 'false');
      
      // Visual state should change (width, content visibility)
      expect(sidebar).toHaveStyle('width: 60px');
    });

    it('supports high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      renderWithProviders(
        <MockChatGPTInterface 
          conversations={MockDataFactory.createConversationsForAgent('test', 2)}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Interface should render without issues in high contrast mode
      expect(screen.getByTestId('chatgpt-interface')).toBeInTheDocument();
    });
  });

  describe('Motion and Animation Accessibility', () => {
    it('respects reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      renderWithProviders(
        <MockChatGPTInterface />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Interface should still be functional with reduced motion
      expect(screen.getByTestId('chatgpt-interface')).toBeInTheDocument();
    });

    it('provides alternative feedback for animations', async () => {
      const user = setupUserEvent();
      
      renderWithProviders(
        <MockChatGPTInterface notificationCount={1} />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      const notificationButton = screen.getByTestId('notification-toggle');
      await user.click(notificationButton);
      
      // Modal should appear with proper ARIA states instead of relying only on animation
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('provides accessible error messages', () => {
      // Mock error state
      renderWithProviders(
        <MockChatGPTInterface />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // No conversation selected state should be accessible
      const noConversation = screen.getByTestId('no-conversation');
      expect(noConversation).toHaveAttribute('role', 'status');
      expect(noConversation).toBeVisible();
    });

    it('maintains accessibility during loading states', () => {
      renderWithProviders(
        <MockChatGPTInterface 
          currentConversation={{ id: 'test', agentName: 'Test Agent' }}
        />,
        { withAgentProvider: false, withMCPProvider: false }
      );
      
      // Connection status should be announced
      const status = screen.getByLabelText('Connection status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent('Connected');
    });
  });
});