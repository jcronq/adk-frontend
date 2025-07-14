// API endpoint to serve browser logs
import express from 'express';
import logService, { LogEntry } from './logService';

// This will be used to serve logs via a mock server endpoint
// Since we're using Create React App, we'll use the public folder approach

declare global {
  interface Window {
    __BROWSER_LOG_SERVICE__: {
      getLogs: () => LogEntry[];
      getRecentLogs: (count?: number) => LogEntry[];
      searchLogs: (query: string) => LogEntry[];
      clearLogs: () => void;
      getLogsAsText: () => string;
    };
  }
}

// Expose log service to global window for API access
window.__BROWSER_LOG_SERVICE__ = {
  getLogs: () => logService.getLogs(),
  getRecentLogs: (count?: number) => logService.getRecentLogs(count),
  searchLogs: (query: string) => logService.searchLogs(query),
  clearLogs: () => logService.clearLogs(),
  getLogsAsText: () => logService.getLogsAsText()
};

// Function to periodically send logs to a backend endpoint
export const setupLogReporting = () => {
  // Send logs to backend every 30 seconds
  setInterval(async () => {
    try {
      const logs = logService.getRecentLogs(100);
      if (logs.length > 0) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs }),
        });
      }
    } catch (error) {
      // Silently fail - don't log to avoid infinite loops
    }
  }, 30000);
};

// Function to create a simple HTTP server endpoint (for local development)
export const createLogEndpoint = () => {
  // This would be implemented in the backend
  // For now, we'll create a way to access logs via fetch requests
  
  // Override fetch to handle /api/logs requests locally
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    
    if (url.includes('/api/logs')) {
      // Handle log endpoint requests
      if (init?.method === 'GET' || !init?.method) {
        // GET request - return logs
        const searchParams = new URLSearchParams(url.split('?')[1] || '');
        const query = searchParams.get('q');
        const count = searchParams.get('count');
        const level = searchParams.get('level');
        
        let logs = logService.getLogs();
        
        if (query) {
          logs = logService.searchLogs(query);
        }
        
        if (level) {
          logs = logs.filter(log => log.level === level);
        }
        
        if (count) {
          logs = logs.slice(-parseInt(count));
        }
        
        const response = new Response(JSON.stringify({
          success: true,
          logs,
          total: logs.length,
          timestamp: Date.now()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        return Promise.resolve(response);
      }
      
      if (init?.method === 'DELETE') {
        // DELETE request - clear logs
        logService.clearLogs();
        
        const response = new Response(JSON.stringify({
          success: true,
          message: 'Logs cleared'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        return Promise.resolve(response);
      }
    }
    
    // For all other requests, use original fetch
    return originalFetch(input, init);
  };
};

export default logService;