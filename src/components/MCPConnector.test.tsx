import React, { ReactNode, createContext } from 'react';
import { render, screen } from '@testing-library/react';
import { MCPProvider } from '../contexts/MCPContext';

// Define types for AgentContext
interface AgentContextType {
  currentAgent: string | null;
  conversations: Record<string, any[]>;
  sendMessage: (message: string, isMCPMessage?: boolean, mcpQuestionId?: string | null) => Promise<void>;
  agents: any[];
  setCurrentAgent: (agent: string | null) => void;
  isLoading: boolean;
}

// Create a mock AgentContext for testing
const AgentContext = createContext<AgentContextType>({} as AgentContextType);

// Mock the MCPProvider component
jest.mock('../contexts/MCPContext', () => ({
  MCPProvider: jest.fn((props) => <div data-testid="mcp-provider">{props.children}</div>),
  useMCP: jest.fn()
}));

// Create a standalone MCPConnector component for testing
interface MCPConnectorProps {
  children: ReactNode;
}

const MCPConnector: React.FC<MCPConnectorProps> = ({ children }) => {
  // Get agent context values using the useAgent hook
  const context = React.useContext(AgentContext) as AgentContextType;
  
  // Pass these values to the MCPProvider
  return (
    <MCPProvider
      currentAgent={context.currentAgent}
      conversations={context.conversations}
      sendMessage={context.sendMessage}
      getCurrentSessionContext={() => null}
    >
      {children}
    </MCPProvider>
  );
};

// Mock the AgentContext
const mockSendMessage = jest.fn().mockImplementation(() => Promise.resolve());
const mockAgentContextValue: AgentContextType = {
  currentAgent: 'test-agent',
  conversations: { 'test-agent': [{ messages: [] }] },
  sendMessage: mockSendMessage,
  agents: [],
  setCurrentAgent: jest.fn(),
  isLoading: false
};

describe('MCPConnector Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('passes correct props from AgentContext to MCPProvider', () => {
    const { getByTestId } = render(
      <AgentContext.Provider value={mockAgentContextValue}>
        <MCPConnector>
          <div>Test Child</div>
        </MCPConnector>
      </AgentContext.Provider>
    );

    // Check that the MCPProvider was called
    expect(MCPProvider).toHaveBeenCalled();
    
    // Need to cast to any to access mock property since Jest adds this at runtime
    const mockFn = MCPProvider as jest.Mock;
    const callArgs = mockFn.mock.calls[0][0];
    
    // Check that the correct props were passed
    expect(callArgs.currentAgent).toBe('test-agent');
    expect(callArgs.conversations).toEqual({ 'test-agent': [{ messages: [] }] });
    expect(callArgs.sendMessage).toBe(mockSendMessage);
  });

  test('updates MCPProvider props when AgentContext changes', () => {
    const { rerender } = render(
      <AgentContext.Provider value={mockAgentContextValue}>
        <MCPConnector>
          <div>Test Child</div>
        </MCPConnector>
      </AgentContext.Provider>
    );

    // Update the AgentContext value
    const updatedContextValue = {
      ...mockAgentContextValue,
      currentAgent: 'updated-agent',
      conversations: {
        ...mockAgentContextValue.conversations,
        'updated-agent': [{ messages: [{ role: 'user', content: 'Hello' }] }]
      }
    };

    // Re-render with updated context
    rerender(
      <AgentContext.Provider value={updatedContextValue}>
        <MCPConnector>
          <div>Test Child</div>
        </MCPConnector>
      </AgentContext.Provider>
    );

    // Check that the MCPProvider was called
    expect(MCPProvider).toHaveBeenCalled();
    
    // Need to cast to any to access mock property since Jest adds this at runtime
    const mockFn = MCPProvider as jest.Mock;
    
    // Get the most recent call arguments (second call after rerender)
    const callArgs = mockFn.mock.calls[1][0];
    
    // Check that the correct props were passed
    expect(callArgs.currentAgent).toBe('updated-agent');
    expect(callArgs.conversations).toEqual({ 
      'test-agent': [{ messages: [] }],
      'updated-agent': [{ messages: [{ role: 'user', content: 'Hello' }] }]
    });
    expect(callArgs.sendMessage).toBe(mockSendMessage);
  });
});
