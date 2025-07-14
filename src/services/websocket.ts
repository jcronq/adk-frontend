import { MCPQuestion } from '../types';

// Event types for WebSocket communication
type WebSocketEventType = 'question' | 'connected' | 'disconnected' | 'error';

// Event listener type
type WebSocketEventListener = (data: any) => void;

// WebSocket service for MCP communication
class MCPWebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<WebSocketEventType, WebSocketEventListener[]> = new Map();
  private url: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;
  // Session context registry for proper MCP question routing
  private activeSessionContext: { agentName: string, sessionId: string } | null = null;
  private sessionContextTimeout: NodeJS.Timeout | null = null;

  constructor(url: string = `ws://localhost:8080/ws`) {
    this.url = url;
    
    // Initialize listener arrays
    this.listeners.set('question', []);
    this.listeners.set('connected', []);
    this.listeners.set('disconnected', []);
    this.listeners.set('error', []);
  }

  // Connect to the WebSocket server
  public connect(): void {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Already connected, skipping connection');
        return;
      } else if (this.socket.readyState === WebSocket.CONNECTING) {
        console.log('[WebSocket] Already connecting, skipping connection');
        return;
      }
    }

    this.isManualDisconnect = false;

    try {
      console.log(`[WebSocket] Connecting to MCP WebSocket server at ${this.url}`);
      console.log(`[WebSocket] Window location: ${window.location.host}, full URL: ${window.location.href}`);
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('[WebSocket] Connected to MCP WebSocket server');
        this.reconnectAttempts = 0;
        
        // Send required connect message to MCP server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "connect" }));
          console.log('[WebSocket] Sent connect message to MCP server');
        } else {
          console.error('[WebSocket] Socket is null or not open in onopen callback');
        }
        
        this.notifyListeners('connected', { connected: true });
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message from MCP server:', data);
          
          if (data.type === 'ask_user') {
            const question: MCPQuestion = {
              id: data.request_id,
              question: data.question,
              // Use session context from server, or fallback to active session context
              sessionContext: data.session_context || this.activeSessionContext || undefined
            };
            console.log('MCP Question received:', {
              questionId: question.id,
              serverContext: data.session_context,
              activeContext: this.activeSessionContext,
              finalContext: question.sessionContext
            });
            this.notifyListeners('question', question);
          } else if (data.type === 'connect_ack') {
            console.log('Received connection acknowledgment from MCP server');
          } else if (data.type === 'ping') {
            // Respond to application-level ping with pong
            console.log('[WebSocket] Received ping, sending pong');
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(JSON.stringify({ type: 'pong' }));
            }
          } else if (data.type === 'pong') {
            console.log('[WebSocket] Received pong response');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: ${event.code} - ${event.reason} (wasClean: ${event.wasClean})`);
        this.socket = null;
        this.stopHeartbeat();
        this.notifyListeners('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect if not manually disconnected and not too many attempts
        if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts + 1}`);
          this.scheduleReconnect();
        } else {
          console.log(`[WebSocket] Not reconnecting: manual=${this.isManualDisconnect}, attempts=${this.reconnectAttempts}`);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyListeners('error', { error });
      };
    } catch (error) {
      console.error('Error connecting to WebSocket server:', error);
      this.scheduleReconnect();
    }
  }

  // Disconnect from the WebSocket server
  public disconnect(): void {
    console.log('[WebSocket] Disconnect called');
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.clearActiveSessionContext(); // Clear session context on disconnect
    
    if (this.socket) {
      console.log('[WebSocket] Closing existing socket');
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      console.log('[WebSocket] Clearing reconnect timeout');
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Set active session context for upcoming MCP questions
  public setActiveSessionContext(sessionContext: { agentName: string, sessionId: string }): void {
    this.activeSessionContext = sessionContext;
    console.log(`Set active session context: ${sessionContext.agentName}, session: ${sessionContext.sessionId}`);
    
    // Clear any existing timeout
    if (this.sessionContextTimeout) {
      clearTimeout(this.sessionContextTimeout);
    }
    
    // Auto-clear session context after 30 seconds to prevent stale context
    this.sessionContextTimeout = setTimeout(() => {
      console.log('Auto-clearing stale session context');
      this.activeSessionContext = null;
    }, 30000);
  }

  // Clear active session context
  public clearActiveSessionContext(): void {
    this.activeSessionContext = null;
    if (this.sessionContextTimeout) {
      clearTimeout(this.sessionContextTimeout);
      this.sessionContextTimeout = null;
    }
    console.log('Cleared active session context');
  }

  // Send an answer to the MCP server
  public sendAnswer(questionId: string, answer: string, sessionContext?: { agentName: string, sessionId: string }): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send answer: WebSocket is not connected');
      return;
    }

    const message = JSON.stringify({
      type: 'user_response',
      request_id: questionId,
      answer,
      session_context: sessionContext // Include session context for proper routing
    });

    this.socket.send(message);
    console.log(`Sent answer for question ${questionId}: ${answer}`, sessionContext ? `(session: ${sessionContext.sessionId}, agent: ${sessionContext.agentName})` : '');
  }

  // Add event listener
  public addEventListener(event: WebSocketEventType, callback: WebSocketEventListener): void {
    const listeners = this.listeners.get(event) || [];
    listeners.push(callback);
    this.listeners.set(event, listeners);
  }

  // Remove event listener
  public removeEventListener(event: WebSocketEventType, callback: WebSocketEventListener): void {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.listeners.set(event, listeners);
    }
  }

  // Notify all listeners of an event
  private notifyListeners(event: WebSocketEventType, data: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Much more conservative backoff: start at 5 seconds, max 2 minutes
    const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 120000);
    console.log(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, delay);
  }

  // Check if the WebSocket is connected
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    // Send a ping every 45 seconds (server expects response within 60 seconds)
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          // Send a simple ping message
          this.socket.send(JSON.stringify({ type: 'ping' }));
          console.log('[WebSocket] Sent heartbeat ping');
        } catch (error) {
          console.error('[WebSocket] Error sending heartbeat:', error);
          this.stopHeartbeat(); // Stop heartbeat if sending fails
        }
      }
    }, 45000);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Create and export a singleton instance
const websocketService = new MCPWebSocketService();
export default websocketService;
