import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AgentProvider } from '../contexts/AgentContext';
import { MCPProvider } from '../contexts/MCPContext';
import { NotificationProvider } from '../contexts/NotificationContext';

// Create a test theme
const testTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f7f7f8',
      paper: '#ffffff',
    },
  },
});

interface AllTheProvidersProps {
  children: React.ReactNode;
}

interface RenderWithProvidersOptions {
  withAgentProvider?: boolean;
  withMCPProvider?: boolean;
  withNotificationProvider?: boolean;
  withTheme?: boolean;
}

const AllTheProviders: React.FC<AllTheProvidersProps & RenderWithProvidersOptions> = ({ 
  children, 
  withAgentProvider = true,
  withMCPProvider = true,
  withNotificationProvider = true,
  withTheme = true
}) => {
  let content = children;

  // Wrap with providers in reverse order
  if (withMCPProvider) {
    content = (
      <MCPProvider
        currentAgent={null}
        conversations={{}}
        sendMessage={async () => {}}
        getCurrentSessionContext={() => null}
      >
        {content}
      </MCPProvider>
    );
  }

  if (withAgentProvider) {
    content = <AgentProvider>{content}</AgentProvider>;
  }

  if (withNotificationProvider) {
    content = <NotificationProvider>{content}</NotificationProvider>;
  }

  if (withTheme) {
    content = (
      <ThemeProvider theme={testTheme}>
        <CssBaseline />
        {content}
      </ThemeProvider>
    );
  }

  return <>{content}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & RenderWithProvidersOptions
) => {
  const { withAgentProvider, withMCPProvider, withNotificationProvider, withTheme, ...renderOptions } = options || {};
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllTheProviders
      withAgentProvider={withAgentProvider}
      withMCPProvider={withMCPProvider}
      withNotificationProvider={withNotificationProvider}
      withTheme={withTheme}
    >
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export * from '@testing-library/react';
export { customRender as renderWithProviders };