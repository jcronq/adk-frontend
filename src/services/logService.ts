// Browser log collection service
interface LogEntry {
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any[];
  source?: string;
}

class LogService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private originalConsole: any = {};

  constructor() {
    this.initializeConsoleInterceptor();
  }

  private initializeConsoleInterceptor() {
    // Store original console methods
    this.originalConsole.log = console.log;
    this.originalConsole.info = console.info;
    this.originalConsole.warn = console.warn;
    this.originalConsole.error = console.error;
    this.originalConsole.debug = console.debug;

    // Intercept console methods
    console.log = (...args) => {
      this.addLog('log', args[0], args.slice(1));
      this.originalConsole.log.apply(console, args);
    };

    console.info = (...args) => {
      this.addLog('info', args[0], args.slice(1));
      this.originalConsole.info.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args[0], args.slice(1));
      this.originalConsole.warn.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('error', args[0], args.slice(1));
      this.originalConsole.error.apply(console, args);
    };

    console.debug = (...args) => {
      this.addLog('debug', args[0], args.slice(1));
      this.originalConsole.debug.apply(console, args);
    };

    // Intercept unhandled errors
    window.addEventListener('error', (event) => {
      this.addLog('error', `Unhandled Error: ${event.message}`, [
        { filename: event.filename, lineno: event.lineno, colno: event.colno }
      ]);
    });

    // Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', `Unhandled Promise Rejection: ${event.reason}`, [event.reason]);
    });
  }

  private addLog(level: LogEntry['level'], message: string, data?: any[]) {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: this.formatMessage(message),
      data,
      source: this.getCallSource()
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private formatMessage(message: any): string {
    if (typeof message === 'string') return message;
    if (typeof message === 'object') {
      try {
        return JSON.stringify(message, null, 2);
      } catch (e) {
        return String(message);
      }
    }
    return String(message);
  }

  private getCallSource(): string {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Find the first line that's not this service
        for (let i = 3; i < lines.length && i < 6; i++) {
          const line = lines[i];
          if (line && !line.includes('logService') && !line.includes('console.')) {
            // Extract just the function/file name
            const match = line.match(/at\s+(.+?)\s+\(/);
            if (match) return match[1];
            
            const fileMatch = line.match(/\/([\w-]+\.tsx?)/);
            if (fileMatch) return fileMatch[1];
          }
        }
      }
    } catch (e) {
      // Ignore errors in source detection
    }
    return 'unknown';
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs filtered by level
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Get logs filtered by source
  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source?.includes(source));
  }

  // Get recent logs (last n entries)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Search logs by message content
  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.source?.toLowerCase().includes(lowerQuery)
    );
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
  }

  // Get logs as formatted text
  getLogsAsText(): string {
    return this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const source = log.source ? `[${log.source}]` : '';
      const data = log.data && log.data.length > 0 ? ` | Data: ${JSON.stringify(log.data)}` : '';
      
      return `${timestamp} ${level} ${source} ${log.message}${data}`;
    }).join('\n');
  }

  // Export logs as downloadable file
  downloadLogs(): void {
    const content = this.getLogsAsText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `browser-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const logService = new LogService();

export default logService;
export type { LogEntry };