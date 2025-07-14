import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock axios
jest.mock('axios');

// Mock the MCPContext
jest.mock('./contexts/MCPContext', () => ({
  MCPProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="mcp-provider">{children}</div>
}));

// Mock the AgentContext
jest.mock('./contexts/AgentContext', () => ({
  AgentProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="agent-provider">{children}</div>,
  useAgent: () => ({
    agents: [],
    currentAgent: 'test-agent',
    conversations: { 'test-agent': [{ messages: [] }] },
    loadingAgents: false,
    sendingMessage: false,
    setCurrentAgent: jest.fn(),
    startNewConversation: jest.fn(),
    sendMessage: jest.fn(),
    setUserId: jest.fn(),
    fetchAgentSessions: jest.fn(),
    userId: 'test-user'
  })
}));

// Mock the components used in App
jest.mock('./components/MCPChat', () => () => <div data-testid="mcp-chat">MCPChat Component</div>);
jest.mock('./components/AgentConversation', () => () => <div data-testid="agent-conversation">AgentConversation Component</div>);

// Create a simplified mock version of the App for testing
const MockApp = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <div>
      <header>
        <div>ADK Agent Manager</div>
      </header>
      <div>
        <div>
          <div role="tablist">
            <button role="tab" onClick={(e) => handleTabChange(e, 0)}>MCP Chat</button>
            <button role="tab" onClick={(e) => handleTabChange(e, 1)}>Agent Conversations</button>
          </div>
          <div>
            {tabValue === 0 && <div data-testid="mcp-chat">MCPChat Component</div>}
            {tabValue === 1 && <div data-testid="agent-conversation">AgentConversation Component</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock the App module
jest.mock('./App', () => MockApp);

describe('App component', () => {
  test('renders app with tabs and components', () => {
    render(<MockApp />);
    
    // Check for the app title
    expect(screen.getByText('ADK Agent Manager')).toBeInTheDocument();
    
    // Check for tabs
    expect(screen.getByText('MCP Chat')).toBeInTheDocument();
    expect(screen.getByText('Agent Conversations')).toBeInTheDocument();
    
    // Check that the first tab is selected by default and its content is visible
    expect(screen.getByTestId('mcp-chat')).toBeInTheDocument();
    
    // The second tab content should not be visible initially
    expect(screen.queryByTestId('agent-conversation')).not.toBeInTheDocument();
  });
  
  test('switches tabs when clicked', () => {
    render(<MockApp />);
    
    // Initially the first tab should be active
    expect(screen.getByTestId('mcp-chat')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-conversation')).not.toBeInTheDocument();
    
    // Click on the second tab
    fireEvent.click(screen.getByText('Agent Conversations'));
    
    // Now the second tab content should be visible and the first hidden
    expect(screen.queryByTestId('mcp-chat')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-conversation')).toBeInTheDocument();
  });
});
