import React, { useState, memo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Functions as FunctionsIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  AccountBalance as TokenIcon,
} from '@mui/icons-material';
import { SessionEvent } from '../../types';

interface TimelineEventProps {
  event: SessionEvent;
  isLast?: boolean;
}

// Helper function to format timestamp
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3 
  });
};

// Helper function to format JSON with syntax highlighting
const JsonDisplay: React.FC<{ data: any; title?: string }> = memo(({ data, title }) => (
  <Box>
    {title && (
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        {title}
      </Typography>
    )}
    <Paper
      sx={{
        p: 2,
        bgcolor: 'grey.50',
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 1,
        overflow: 'auto',
        maxHeight: 400,
      }}
    >
      <Typography
        component="pre"
        sx={{
          fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
          fontSize: '0.8rem',
          lineHeight: 1.4,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {JSON.stringify(data, null, 2)}
      </Typography>
    </Paper>
  </Box>
));

// Component for displaying function calls
const FunctionCallDisplay: React.FC<{ functionCall: any }> = memo(({ functionCall }) => (
  <Box sx={{ mb: 2 }}>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <FunctionsIcon color="primary" fontSize="small" />
      <Typography variant="subtitle2" color="primary">
        Function Call: {functionCall.name}
      </Typography>
      <Chip 
        label={`ID: ${functionCall.id}`} 
        size="small" 
        variant="outlined"
        sx={{ fontSize: '0.7rem' }}
      />
    </Stack>
    <JsonDisplay data={functionCall.args} title="Arguments" />
  </Box>
));

// Component for displaying function responses
const FunctionResponseDisplay: React.FC<{ functionResponse: any }> = memo(({ functionResponse }) => {
  const isError = functionResponse.response?.result?.isError;
  
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {isError ? (
          <ErrorIcon color="error" fontSize="small" />
        ) : (
          <CheckCircleIcon color="success" fontSize="small" />
        )}
        <Typography 
          variant="subtitle2" 
          color={isError ? "error" : "success"}
        >
          Function Response: {functionResponse.name}
        </Typography>
        <Chip 
          label={`ID: ${functionResponse.id}`} 
          size="small" 
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Stack>
      
      {isError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          Function execution failed
        </Alert>
      )}
      
      <JsonDisplay data={functionResponse.response} title="Response" />
    </Box>
  );
});

// Component for displaying token usage
const TokenUsageDisplay: React.FC<{ usageMetadata: any }> = memo(({ usageMetadata }) => (
  <Box sx={{ mt: 2 }}>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <TokenIcon color="info" fontSize="small" />
      <Typography variant="subtitle2" color="info.main">
        Token Usage
      </Typography>
    </Stack>
    <Stack direction="row" spacing={2} flexWrap="wrap">
      {usageMetadata.promptTokenCount && (
        <Chip 
          label={`Prompt: ${usageMetadata.promptTokenCount}`}
          size="small"
          color="info"
          variant="outlined"
        />
      )}
      {usageMetadata.candidatesTokenCount && (
        <Chip 
          label={`Response: ${usageMetadata.candidatesTokenCount}`}
          size="small"
          color="info"
          variant="outlined"
        />
      )}
      {usageMetadata.totalTokenCount && (
        <Chip 
          label={`Total: ${usageMetadata.totalTokenCount}`}
          size="small"
          color="info"
        />
      )}
    </Stack>
  </Box>
));

// Get event type icon and color
const getEventTypeConfig = (type: string) => {
  switch (type) {
    case 'user_message':
      return { icon: <MessageIcon />, color: 'primary' as const };
    case 'agent_response':
      return { icon: <PersonIcon />, color: 'secondary' as const };
    case 'tool_call':
      return { icon: <FunctionsIcon />, color: 'info' as const };
    case 'tool_response':
      return { icon: <CheckCircleIcon />, color: 'success' as const };
    case 'mcp_question':
      return { icon: <MessageIcon />, color: 'warning' as const };
    case 'mcp_answer':
      return { icon: <CheckCircleIcon />, color: 'warning' as const };
    case 'system_event':
      return { icon: <SettingsIcon />, color: 'default' as const };
    default:
      return { icon: <CodeIcon />, color: 'default' as const };
  }
};

const TimelineEvent: React.FC<TimelineEventProps> = memo(({ event, isLast = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  const eventConfig = getEventTypeConfig(event.type);
  
  // Extract text content from parts
  const textContent = event.content.parts
    .filter(part => part.text)
    .map(part => part.text)
    .join('\n');

  // Extract function calls and responses
  const functionCalls = event.content.parts.filter(part => part.functionCall);
  const functionResponses = event.content.parts.filter(part => part.functionResponse);

  return (
    <Box
      sx={{
        position: 'relative',
        '&::before': !isLast ? {
          content: '""',
          position: 'absolute',
          left: 20,
          top: 60,
          bottom: -10,
          width: 2,
          bgcolor: 'grey.300',
          zIndex: 0,
        } : undefined,
      }}
    >
      <Card 
        sx={{ 
          mb: 2, 
          position: 'relative',
          zIndex: 1,
          border: '1px solid',
          borderColor: 'grey.200',
          '&:hover': {
            borderColor: 'grey.400',
            boxShadow: 2,
          },
        }}
      >
        <CardContent sx={{ pb: '16px !important' }}>
          {/* Event Header */}
          <Stack 
            direction="row" 
            alignItems="center" 
            spacing={2} 
            sx={{ mb: 2 }}
          >
            {/* Timeline dot */}
            <Box
              sx={{
                position: 'absolute',
                left: 12,
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: `${eventConfig.color}.main`,
                border: '3px solid',
                borderColor: 'background.paper',
                zIndex: 2,
              }}
            />

            {/* Event type chip */}
            <Box sx={{ ml: 4 }}>
              <Chip
                icon={eventConfig.icon}
                label={event.type.replace('_', ' ').toUpperCase()}
                color={eventConfig.color}
                size="small"
                variant="outlined"
              />
            </Box>

            {/* Timestamp */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {formatTimestamp(event.timestamp)}
              </Typography>
            </Stack>

            {/* Author */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {event.author}
              </Typography>
            </Stack>

            {/* Invocation ID */}
            <Tooltip title="Invocation ID">
              <Chip
                label={event.invocationId.substring(0, 8)}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>

            {/* Expand button */}
            <Box sx={{ ml: 'auto' }}>
              <IconButton
                onClick={() => setExpanded(!expanded)}
                size="small"
                aria-label="Expand event details"
              >
                <ExpandMoreIcon 
                  sx={{ 
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease-in-out'
                  }} 
                />
              </IconButton>
            </Box>
          </Stack>

          {/* Text Content Preview */}
          {textContent && (
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1,
                maxHeight: expanded ? 'none' : 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: expanded ? 'none' : 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {textContent}
            </Typography>
          )}

          {/* Token Usage */}
          {event.usageMetadata && (
            <TokenUsageDisplay usageMetadata={event.usageMetadata} />
          )}

          {/* Expanded Content */}
          {expanded && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />

              {/* Function Calls */}
              {functionCalls.map((part, index) => (
                <FunctionCallDisplay 
                  key={`call-${index}`} 
                  functionCall={part.functionCall} 
                />
              ))}

              {/* Function Responses */}
              {functionResponses.map((part, index) => (
                <FunctionResponseDisplay 
                  key={`response-${index}`} 
                  functionResponse={part.functionResponse} 
                />
              ))}

              {/* Actions */}
              {event.actions && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Actions
                  </Typography>
                  <JsonDisplay data={event.actions} />
                </Box>
              )}

              {/* Long Running Tool IDs */}
              {event.longRunningToolIds && event.longRunningToolIds.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Long Running Tools
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {event.longRunningToolIds.map((id, index) => (
                      <Chip 
                        key={index} 
                        label={id} 
                        size="small" 
                        variant="outlined" 
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Metadata Accordion */}
              <Accordion 
                expanded={metadataExpanded} 
                onChange={() => setMetadataExpanded(!metadataExpanded)}
                sx={{ mt: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    Raw Event Data & Metadata
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <JsonDisplay data={event.rawEvent || event} title="Complete Event Object" />
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
});

TimelineEvent.displayName = 'TimelineEvent';

export default TimelineEvent;