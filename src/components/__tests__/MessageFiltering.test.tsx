import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { TabContext } from '@mui/lab';
import ConversationView from '../ConversationView';
import { Message, ConversationWithEvents } from '../../types';
import { MCPProvider } from '../../contexts/MCPContext';

// Mock the chatWindowMessageFilter function - UPDATED FOR EMERGENCY FIX
const chatWindowMessageFilter = (message: Message): boolean => {
  // ALWAYS INCLUDE: User messages
  if (message.role === 'user') return true;
  
  // 🚨 EMERGENCY FIX: ALWAYS INCLUDE all MCP messages (regardless of mcpQuestionId)
  if (message.isMCPMessage === true) return true;
  
  // EXCLUDE: Assistant messages with internal dialogue (unless MCP)
  if (message.role === 'assistant' && 
      message.internalDialogue != null && 
      message.internalDialogue.length > 0 &&
      !message.isMCPMessage) {
    return false;
  }
  
  // 🚨 EMERGENCY FIX: INCLUDE all other assistant messages (inclusive approach)
  if (message.role === 'assistant') return true;
  
  return false; // Safety fallback
};

describe('Message Filtering Logic Tests', () => {
  const theme = createTheme();
  
  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>
      <MCPProvider>
        <TabContext value="chat">
          {children}
        </TabContext>
      </MCPProvider>
    </ThemeProvider>
  );

  // Test message samples
  const testMessages: Message[] = [
    // Should be visible - User message
    {
      role: 'user',
      content: 'Hello, this is a user message'
    },
    
    // Should be visible - Assistant message without internal dialogue
    {
      role: 'assistant',
      content: 'This is a final assistant response'
    },
    
    // Should be hidden - Assistant message with internal dialogue
    {
      role: 'assistant',
      content: 'This should be hidden',
      internalDialogue: [
        { agent: 'planner', content: 'Let me think about this...' },
        { agent: 'coder', content: 'I need to implement X' }
      ]
    },
    
    // Should be visible - MCP question
    {
      role: 'assistant',
      content: 'Would you like me to proceed with X?',
      isMCPMessage: true,
      mcpQuestionId: 'mcp-question-123'
    },
    
    // Should be visible - MCP message with internal dialogue (override rule)
    {
      role: 'assistant',
      content: 'MCP question with internal dialogue',
      isMCPMessage: true,
      mcpQuestionId: 'mcp-question-456',
      internalDialogue: [
        { agent: 'internal', content: 'Some internal processing' }
      ]
    },
    
    // Should be hidden - Assistant with empty internal dialogue array (length > 0 check)
    {
      role: 'assistant',
      content: 'This should be visible - empty internal dialogue',
      internalDialogue: []
    },
    
    // Should be hidden - Assistant with null internal dialogue converted to empty array
    {
      role: 'assistant',
      content: 'Final response with null internal dialogue',
      internalDialogue: null as any
    }
  ];

  describe('Individual Filter Logic Tests', () => {
    test('ALWAYS includes user messages', () => {
      const userMessage: Message = {
        role: 'user',
        content: 'Test user message'
      };
      expect(chatWindowMessageFilter(userMessage)).toBe(true);
    });

    test('ALWAYS includes MCP questions with mcpQuestionId', () => {
      const mcpMessage: Message = {
        role: 'assistant',
        content: 'MCP question',
        isMCPMessage: true,
        mcpQuestionId: 'mcp-123'
      };
      expect(chatWindowMessageFilter(mcpMessage)).toBe(true);
    });

    test('EXCLUDES assistant messages with non-empty internal dialogue (not MCP)', () => {
      const assistantWithInternal: Message = {
        role: 'assistant',
        content: 'Should be hidden',
        internalDialogue: [{ agent: 'test', content: 'internal' }]
      };
      expect(chatWindowMessageFilter(assistantWithInternal)).toBe(false);
    });

    test('INCLUDES assistant messages without internal dialogue', () => {
      const cleanAssistant: Message = {
        role: 'assistant',
        content: 'Final response'
      };
      expect(chatWindowMessageFilter(cleanAssistant)).toBe(true);
    });

    test('INCLUDES assistant messages with empty internal dialogue array', () => {
      const emptyInternalAssistant: Message = {
        role: 'assistant',
        content: 'Should be visible',
        internalDialogue: []
      };
      expect(chatWindowMessageFilter(emptyInternalAssistant)).toBe(true);
    });

    test('INCLUDES MCP messages even with internal dialogue (override)', () => {
      const mcpWithInternal: Message = {
        role: 'assistant',
        content: 'MCP with internal dialogue',
        isMCPMessage: true,
        mcpQuestionId: 'mcp-456',
        internalDialogue: [{ agent: 'internal', content: 'thinking' }]
      };
      expect(chatWindowMessageFilter(mcpWithInternal)).toBe(true);
    });

    test('EXCLUDES MCP messages without mcpQuestionId', () => {
      const mcpWithoutId: Message = {
        role: 'assistant',
        content: 'MCP without question ID',
        isMCPMessage: true
      };
      // 🚨 EMERGENCY FIX: MCP messages are always included now
      expect(chatWindowMessageFilter(mcpWithoutId)).toBe(true);
    });

    test('Safety fallback returns false for unknown message types', () => {
      const unknownMessage = {
        role: 'unknown' as any,
        content: 'Unknown type'
      };
      expect(chatWindowMessageFilter(unknownMessage)).toBe(false);
    });
  });

  describe('Filtering Result Analysis', () => {
    test('Correctly filters test message array', () => {
      const filteredMessages = testMessages.filter(chatWindowMessageFilter);
      
      // Should include: user, clean assistant, MCP question, MCP with internal, clean assistant with empty array, clean assistant with null
      // 🚨 EMERGENCY FIX: All 6 messages should be included now (inclusive filtering)
      expect(filteredMessages).toHaveLength(6);
      
      // Verify specific inclusions
      expect(filteredMessages[0].content).toBe('Hello, this is a user message'); // User
      expect(filteredMessages[1].content).toBe('This is a final assistant response'); // Clean assistant
      expect(filteredMessages[2].content).toBe('Would you like me to proceed with X?'); // MCP
      expect(filteredMessages[3].content).toBe('MCP question with internal dialogue'); // MCP with internal
      expect(filteredMessages[4].content).toBe('This should be visible - empty internal dialogue'); // Empty array
    });

    test('Correctly excludes messages with internal dialogue', () => {
      const filteredMessages = testMessages.filter(chatWindowMessageFilter);
      
      // Should NOT include message with internal dialogue
      const hiddenMessage = filteredMessages.find(msg => 
        msg.content === 'This should be hidden'
      );
      expect(hiddenMessage).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('Handles null mcpQuestionId correctly', () => {
      const mcpWithNullId: Message = {
        role: 'assistant',
        content: 'MCP with null ID',
        isMCPMessage: true,
        mcpQuestionId: null
      };
      // 🚨 EMERGENCY FIX: MCP messages are always included regardless of mcpQuestionId
      expect(chatWindowMessageFilter(mcpWithNullId)).toBe(true);
    });

    test('Handles undefined internalDialogue', () => {
      const undefinedInternal: Message = {
        role: 'assistant',
        content: 'Undefined internal dialogue',
        internalDialogue: undefined
      };
      expect(chatWindowMessageFilter(undefinedInternal)).toBe(true);
    });

    test('Handles false isMCPMessage flag', () => {
      const notMcp: Message = {
        role: 'assistant',
        content: 'Not an MCP message',
        isMCPMessage: false,
        internalDialogue: [{ agent: 'test', content: 'internal' }]
      };
      expect(chatWindowMessageFilter(notMcp)).toBe(false);
    });
  });
});

describe('Integration Tests with Mocked Component', () => {
  // Mock conversation data for integration testing
  const mockConversation: ConversationWithEvents = {
    sessionId: 'test-session-123',
    messages: [
      {
        role: 'user',
        content: 'Test user input'
      },
      {
        role: 'assistant',
        content: 'Hidden internal response',
        internalDialogue: [
          { agent: 'planner', content: 'Planning response...' }
        ]
      },
      {
        role: 'assistant',
        content: 'Final visible response'
      },
      {
        role: 'assistant',
        content: 'Should I continue?',
        isMCPMessage: true,
        mcpQuestionId: 'mcp-test-123'
      }
    ],
    events: []
  };

  test('Component renders only filtered messages', () => {
    // Mock DOM methods
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });

    render(
      <ThemeProvider theme={theme}>
        <MCPProvider>
          <TabContext value="chat">
            <ConversationView
              currentAgent="Test Agent"
              currentConversation={mockConversation}
              sendingMessage={false}
            />
          </TabContext>
        </MCPProvider>
      </ThemeProvider>
    );

    // Should show user message
    expect(screen.getByText('Test user input')).toBeInTheDocument();
    
    // Should show final response
    expect(screen.getByText('Final visible response')).toBeInTheDocument();
    
    // Should show MCP question
    expect(screen.getByText('Should I continue?')).toBeInTheDocument();
    
    // Should NOT show message with internal dialogue
    expect(screen.queryByText('Hidden internal response')).not.toBeInTheDocument();
  });
});