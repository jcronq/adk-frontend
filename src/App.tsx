import React, { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme
} from '@mui/material';
import { MCPProvider } from './contexts/MCPContext';
import { AgentProvider, useAgent } from './contexts/AgentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AgentConversation from './components/AgentConversation';
import LogViewer from './components/LogViewer';

// Connector component to bridge AgentContext and MCPProvider
interface MCPConnectorProps {
  children: ReactNode;
}

const MCPConnector: React.FC<MCPConnectorProps> = ({ children }) => {
  // Get agent context values using the useAgent hook
  const { currentAgent, conversations, sendMessage, getCurrentSessionContext } = useAgent();
  
  // Pass these values to the MCPProvider
  return (
    <MCPProvider
      currentAgent={currentAgent}
      conversations={conversations}
      sendMessage={sendMessage}
      getCurrentSessionContext={getCurrentSessionContext}
    >
      {children}
    </MCPProvider>
  );
};

// Create a theme with ChatGPT-style colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f7f7f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#343541',
      secondary: '#676767',
    },
    divider: '#e5e5e7',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AgentProvider>
          <MCPConnector>
            <Router>
              <Routes>
                <Route path="/" element={<AgentConversation />} />
                <Route path="/logs" element={<LogViewer />} />
              </Routes>
            </Router>
          </MCPConnector>
        </AgentProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
