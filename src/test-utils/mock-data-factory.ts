import { Agent, Message, Conversation, AgentConversations } from '../types';

export interface MCPQuestion {
  id: string;
  question: string;
  agentName: string;
  conversationId: string;
  timestamp: Date;
  isAnswered: boolean;
}

/**
 * Factory for creating consistent mock data for testing
 */
export class MockDataFactory {
  /**
   * Create a mock agent
   */
  static createAgent(overrides: Partial<Agent> = {}): Agent {
    return {
      name: 'Test Agent',
      description: 'A test agent for testing purposes',
      appName: 'test-app',
      ...overrides,
    };
  }

  /**
   * Create a mock message
   */
  static createMessage(overrides: Partial<Message> = {}): Message {
    return {
      role: 'user',
      content: 'Test message content',
      ...overrides,
    };
  }

  /**
   * Create a mock conversation
   */
  static createConversation(overrides: Partial<Conversation> = {}): Conversation {
    return {
      sessionId: 'test-session-123',
      messages: [
        MockDataFactory.createMessage({ role: 'user', content: 'Hello' }),
        MockDataFactory.createMessage({ role: 'assistant', content: 'Hi there!' }),
      ],
      ...overrides,
    };
  }

  /**
   * Create mock agent conversations
   */
  static createAgentConversations(agentNames: string[] = ['Test Agent']): AgentConversations {
    const conversations: AgentConversations = {};
    
    agentNames.forEach((agentName, index) => {
      conversations[agentName] = [
        MockDataFactory.createConversation({
          sessionId: `session-${index}-1`,
          messages: [
            MockDataFactory.createMessage({ role: 'user', content: `Hello ${agentName}` }),
            MockDataFactory.createMessage({ role: 'assistant', content: `Hello! I'm ${agentName}` }),
          ],
        }),
        MockDataFactory.createConversation({
          sessionId: `session-${index}-2`,
          messages: [
            MockDataFactory.createMessage({ role: 'user', content: 'Previous conversation' }),
          ],
        }),
      ];
    });
    
    return conversations;
  }

  /**
   * Create multiple mock agents
   */
  static createAgents(count: number = 3): Agent[] {
    return Array.from({ length: count }, (_, index) => 
      MockDataFactory.createAgent({
        name: `Agent ${index + 1}`,
        description: `Description for Agent ${index + 1}`,
        appName: `app-${index + 1}`,
      })
    );
  }

  /**
   * Create mock MCP question
   */
  static createMCPQuestion(overrides: Partial<MCPQuestion> = {}): MCPQuestion {
    return {
      id: 'mcp-question-123',
      question: 'This is a test MCP question',
      agentName: 'Test Agent',
      conversationId: 'test-conversation-123',
      timestamp: new Date(),
      isAnswered: false,
      ...overrides,
    };
  }

  /**
   * Create multiple mock MCP questions
   */
  static createMCPQuestions(count: number = 3, agentNames: string[] = ['Test Agent']): MCPQuestion[] {
    return Array.from({ length: count }, (_, index) => 
      MockDataFactory.createMCPQuestion({
        id: `mcp-question-${index + 1}`,
        question: `Test MCP question ${index + 1}`,
        agentName: agentNames[index % agentNames.length],
        conversationId: `conversation-${index + 1}`,
        isAnswered: index % 2 === 0,
      })
    );
  }

  /**
   * Create conversations for a specific agent
   */
  static createConversationsForAgent(agentName: string, count: number = 3, startIndex: number = 1): Conversation[] {
    return Array.from({ length: count }, (_, index) => 
      MockDataFactory.createConversation({
        sessionId: `${agentName.toLowerCase().replace(/\s+/g, '-')}-session-${startIndex + index}`,
        messages: [
          MockDataFactory.createMessage({ 
            role: 'user', 
            content: `Hello ${agentName}, this is conversation ${startIndex + index}` 
          }),
          MockDataFactory.createMessage({ 
            role: 'assistant', 
            content: `Hi! I'm ${agentName}, how can I help you today?` 
          }),
          MockDataFactory.createMessage({ 
            role: 'user', 
            content: `Can you help me with task ${startIndex + index}?` 
          }),
        ],
      })
    );
  }

  /**
   * Create multiple messages for testing
   */
  static createMessages(count: number = 5): Message[] {
    return Array.from({ length: count }, (_, index) => {
      const isUser = index % 2 === 0;
      return MockDataFactory.createMessage({
        role: isUser ? 'user' : 'assistant',
        content: isUser 
          ? `User message ${Math.floor(index / 2) + 1}` 
          : `Assistant response ${Math.floor(index / 2) + 1}`,
      });
    });
  }

  /**
   * Create a large conversation for performance testing
   */
  static createLargeConversation(messageCount: number = 1000): Conversation {
    const messages = Array.from({ length: messageCount }, (_, index) => {
      const isUser = index % 2 === 0;
      return MockDataFactory.createMessage({
        role: isUser ? 'user' : 'assistant',
        content: `${isUser ? 'User' : 'Assistant'} message ${index + 1} with content of varying length. ${
          index % 5 === 0 ? 'This is a longer message to test variable height handling in virtualized lists.' : ''
        }`,
      });
    });

    return MockDataFactory.createConversation({
      sessionId: `large-conversation-${messageCount}`,
      messages,
    });
  }

  /**
   * Create responsive test data for different screen sizes
   */
  static createResponsiveTestData() {
    const agents = MockDataFactory.createAgents(5);
    const conversations: AgentConversations = {};
    
    agents.forEach((agent, index) => {
      conversations[agent.name] = MockDataFactory.createConversationsForAgent(
        agent.name, 
        Math.floor(Math.random() * 5) + 2 // 2-6 conversations per agent
      );
    });

    return {
      agents,
      conversations,
      notifications: MockDataFactory.createMCPQuestions(
        10, 
        agents.slice(0, 3).map(a => a.name)
      ),
    };
  }
}