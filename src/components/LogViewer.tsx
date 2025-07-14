import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Download, Clear, Refresh } from '@mui/icons-material';
import { LogEntry } from '../services/logService';

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

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load logs from the browser log service
  const loadLogs = () => {
    if (window.__BROWSER_LOG_SERVICE__) {
      const allLogs = window.__BROWSER_LOG_SERVICE__.getLogs();
      setLogs(allLogs);
    }
  };

  // Filter logs based on search and level
  useEffect(() => {
    let filtered = logs;

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        (log.source && log.source.toLowerCase().includes(query))
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, levelFilter]);

  // Auto-refresh logs
  useEffect(() => {
    loadLogs();
    
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleClearLogs = () => {
    if (window.__BROWSER_LOG_SERVICE__) {
      window.__BROWSER_LOG_SERVICE__.clearLogs();
      setLogs([]);
    }
  };

  const handleDownloadLogs = () => {
    if (window.__BROWSER_LOG_SERVICE__) {
      const content = window.__BROWSER_LOG_SERVICE__.getLogsAsText();
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
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'secondary';
      default: return 'default';
    }
  };

  const logLevelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Browser Log Viewer
      </Typography>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Search logs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by message or source..."
              sx={{ minWidth: 300 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Level Filter</InputLabel>
              <Select
                value={levelFilter}
                label="Level Filter"
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="log">Log</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warn">Warn</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadLogs}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadLogs}
            >
              Download
            </Button>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClearLogs}
              color="warning"
            >
              Clear
            </Button>
            <Button
              variant={autoRefresh ? "contained" : "outlined"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="small"
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </Box>
        </Box>

        {/* Statistics */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`Total: ${logs.length}`} />
          <Chip label={`Filtered: ${filteredLogs.length}`} />
          {Object.entries(logLevelCounts).map(([level, count]) => (
            <Chip 
              key={level}
              label={`${level}: ${count}`}
              color={getLevelColor(level) as any}
              variant="outlined"
            />
          ))}
        </Box>
      </Paper>

      {/* Log List */}
      <Paper sx={{ maxHeight: '70vh', overflow: 'auto' }}>
        {filteredLogs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {logs.length === 0 ? 'No logs collected yet' : 'No logs match the current filters'}
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredLogs.slice(-100).reverse().map((log, index) => (
              <Accordion key={log.timestamp + index} sx={{ boxShadow: 'none' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="caption" sx={{ minWidth: '80px' }}>
                      {formatTimestamp(log.timestamp)}
                    </Typography>
                    <Chip 
                      label={log.level.toUpperCase()} 
                      color={getLevelColor(log.level) as any}
                      size="small"
                    />
                    {log.source && (
                      <Chip 
                        label={log.source} 
                        variant="outlined"
                        size="small"
                      />
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        flexGrow: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {log.message}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                      {log.message}
                    </Typography>
                    {log.data && log.data.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Additional Data:
                        </Typography>
                        <Box 
                          component="pre" 
                          sx={{ 
                            fontSize: '0.75rem',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            overflow: 'auto',
                            maxHeight: '200px'
                          }}
                        >
                          {JSON.stringify(log.data, null, 2)}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default LogViewer;