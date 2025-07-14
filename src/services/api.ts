import axios from 'axios';
import { Agent, AgentRunRequest, AgentEvent, Session, Conversation, SessionsResponse } from '../types';

// API service for communicating with the ADK web server
const apiService = {
  // Create a new session for an agent
  async createSession(appName: string, userId: string, sessionId: string): Promise<boolean> {
    try {
      const url = `/api/apps/${appName}/users/${userId}/sessions/${sessionId}`;
      console.log('Creating session with URL:', url);
      
      const response = await axios.post(url, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Session creation response:', response.data);
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  },
  // Get sessions for a user and app
  async listSessions(appName: string, userId: string): Promise<Session[]> {
    try {
      const url = `/api/apps/${appName}/users/${userId}/sessions`;
      console.log('Fetching sessions with URL:', url);
      
      const response = await axios.get<SessionsResponse>(url);
      console.log('Sessions response:', response.data);
      
      // Check the structure of the response
      if (response.data && Array.isArray(response.data)) {
        console.log('Response is an array, using directly');
        return response.data;
      } else if (response.data && response.data.sessions && Array.isArray(response.data.sessions)) {
        console.log('Response has sessions array property');
        return response.data.sessions;
      } else {
        console.log('Unexpected response structure:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  },
  async getSession(appName: string, userId: string, sessionId: string): Promise<Session> {
    try {
      const response = await axios.get(`/api/apps/${appName}/users/${userId}/sessions/${sessionId}`);
      console.log('Session messages response:', response.data);
      
      // Return the full session data including events (messages)
      return response.data;
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return {
        id: sessionId,
        appName,
        userId,
        state: {},
        events: [],
        lastUpdateTime: Date.now() / 1000
      };
    }
  },
  async getSessionTrace(sessionId: string): Promise<any> {
    try {
      const response = await axios.get(`/api/debug/trace/session/${sessionId}`);
      console.log('Session trace response:', response.data);
      
      // Return the trace data - adjust the return type based on actual response structure
      return response.data;
    } catch (error) {
      console.error('Error fetching session trace:', error);
      return { detail: [] }; // Return empty detail array as fallback
    }
  },
  // Get list of available agents
  async getAvailableAgents(): Promise<Agent[]> {
    try {
      const response = await axios.get<string[]>('/api/list-apps');
      
      // Map app names to agent objects
      return response.data.map(appName => ({
        name: appName,
        description: `ADK agent: ${appName}`,
        appName
      }));
    } catch (error) {
      console.error('Error fetching available agents:', error);
      // Return sample agents as fallback
      return getSampleAgents();
    }
  },

  // Send a message to an agent and get a response
  async sendMessageToAgent(request: AgentRunRequest): Promise<AgentEvent[]> {
    try {
      // Format the request according to the backend API requirements
      const payload = {
        appName: request.appName, // Use appName directly as expected by the API
        userId: request.userId,
        sessionId: request.sessionId,
        newMessage: request.newMessage,
        streaming: false
      };
      
      console.log('Sending request to /api/run endpoint:', payload);
      
      // Send the request directly to /run (no /api prefix)
      const response = await axios.post<AgentEvent[]>(
        '/api/run',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Response from /run:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending message to agent:', error);
      
      // Check if it's a "Session not found" error
      if (error.response && error.response.data && error.response.data.detail === "Session not found") {
        console.log('Session not found, creating a new session...');
        // In a real implementation, we would create a session here
        // For now, we'll simulate a response
      }
      
      // If the API call fails, simulate a response
      return simulateAgentResponse(request);
    }
  }
};

// Function to simulate agent responses for development/testing
function simulateAgentResponse(request: AgentRunRequest): AgentEvent[] {
  const userMessage = request.newMessage.parts[0].text;
  
  // Generate a simple echo response
  const responseText = `This is a simulated response from the ${request.appName} agent. You said: "${userMessage}"`;
  
  return [
    {
      author: 'assistant',
      content: {
        parts: [{ text: responseText }],
        role: 'assistant'
      }
    }
  ];
}

// Sample agents for fallback
function getSampleAgents(): Agent[] {
  return [
    {
      name: 'Planner',
      description: 'Creates high-level plans based on user requests',
      appName: 'planner'
    },
    {
      name: 'File Manager',
      description: 'Helps manage and organize files',
      appName: 'file_manager_agent'
    },
    {
      name: 'Documentation',
      description: 'Provides documentation and help',
      appName: 'extra_docs'
    }
  ];
}

export default apiService;
