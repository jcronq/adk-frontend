import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  BugReport as BugIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ConversationWithEvents, DebugViewFilters, SessionEvent } from '../types';
import EventFilters from './debug/EventFilters';
import EventTimeline from './debug/EventTimeline';

interface DebugViewProps {
  conversation: ConversationWithEvents;
  loading?: boolean;
  onRefresh?: () => void;
  autoScroll?: boolean;
  maxHeight?: number;
}

interface EventStatistics {
  totalEvents: number;
  eventTypeBreakdown: Record<string, number>;
  agentBreakdown: Record<string, number>;
  timespan: {
    start?: number;
    end?: number;
    duration?: number;
  };
  tokenUsage: {
    totalPromptTokens: number;
    totalCandidateTokens: number;
    totalTokens: number;
    eventsWithTokens: number;
  };
}

const DebugView: React.FC<DebugViewProps> = memo(({
  conversation,
  loading = false,
  onRefresh,
  autoScroll = true,
  maxHeight = 900,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [filters, setFilters] = useState<DebugViewFilters>({
    agentTypes: [],
    eventTypes: [],
    searchText: '',
  });
  const [statisticsExpanded, setStatisticsExpanded] = useState(!isMobile);

  // Calculate event statistics
  const statistics: EventStatistics = useMemo(() => {
    const events = conversation.sessionEvents || [];
    console.log(`[DebugView] Rendering with ${events.length} session events for conversation ${conversation.sessionId}`);
    console.log(`[DebugView] Conversation object:`, {
      sessionId: conversation.sessionId,
      hasSessionEvents: !!conversation.sessionEvents,
      sessionEventsLength: conversation.sessionEvents?.length,
      conversationKeys: Object.keys(conversation),
      messagesLength: conversation.messages?.length
    });
    
    if (!conversation.sessionEvents || conversation.sessionEvents.length === 0) {
      console.log(`[DebugView] ⚠️ No session events found - conversation might not have been loaded with events`);
    } else {
      console.log(`[DebugView] ✅ ${conversation.sessionEvents.length} session events available`);
    }
    
    const eventTypeBreakdown: Record<string, number> = {};
    const agentBreakdown: Record<string, number> = {};
    let totalPromptTokens = 0;
    let totalCandidateTokens = 0;
    let eventsWithTokens = 0;

    const timestamps = events.map(e => e.timestamp).filter(Boolean);
    const timespan: { start?: number; end?: number; duration?: number } = {
      start: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      end: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
    };
    
    if (timespan.start && timespan.end) {
      timespan.duration = timespan.end - timespan.start;
    }

    events.forEach(event => {
      // Count by event type
      eventTypeBreakdown[event.type] = (eventTypeBreakdown[event.type] || 0) + 1;
      
      // Count by agent
      agentBreakdown[event.author] = (agentBreakdown[event.author] || 0) + 1;
      
      // Sum token usage
      if (event.usageMetadata) {
        eventsWithTokens++;
        totalPromptTokens += event.usageMetadata.promptTokenCount || 0;
        totalCandidateTokens += event.usageMetadata.candidatesTokenCount || 0;
      }
    });

    return {
      totalEvents: events.length,
      eventTypeBreakdown,
      agentBreakdown,
      timespan,
      tokenUsage: {
        totalPromptTokens,
        totalCandidateTokens,
        totalTokens: totalPromptTokens + totalCandidateTokens,
        eventsWithTokens,
      },
    };
  }, [conversation.sessionEvents]);

  // Filter events based on current filters
  const filteredEvents: SessionEvent[] = useMemo(() => {
    let events = conversation.sessionEvents || [];

    // Filter by agent types
    if (filters.agentTypes.length > 0) {
      events = events.filter(event => filters.agentTypes.includes(event.author));
    }

    // Filter by event types
    if (filters.eventTypes.length > 0) {
      events = events.filter(event => filters.eventTypes.includes(event.type));
    }

    // Filter by search text
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      events = events.filter(event => {
        // Search in text content
        const textContent = event.content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join(' ')
          .toLowerCase();
        
        // Search in function names
        const functionNames = event.content.parts
          .filter(part => part.functionCall || part.functionResponse)
          .map(part => (part.functionCall?.name || part.functionResponse?.name || ''))
          .join(' ')
          .toLowerCase();

        // Search in author and event type
        const metadata = `${event.author} ${event.type}`.toLowerCase();

        return textContent.includes(searchLower) || 
               functionNames.includes(searchLower) || 
               metadata.includes(searchLower);
      });
    }

    // Filter by time range if specified
    if (filters.timeRange) {
      events = events.filter(event => 
        event.timestamp >= filters.timeRange!.start && 
        event.timestamp <= filters.timeRange!.end
      );
    }

    return events;
  }, [conversation.sessionEvents, filters]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: DebugViewFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle filter reset
  const handleFilterReset = useCallback(() => {
    setFilters({
      agentTypes: [],
      eventTypes: [],
      searchText: '',
    });
  }, []);

  // Format duration helper
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Render statistics cards
  const renderStatistics = () => (
    <Box sx={{ mb: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Stack 
          direction="row" 
          alignItems="center" 
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <AnalyticsIcon color="primary" />
            <Typography variant="h6">
              Session Statistics
            </Typography>
          </Stack>
          <IconButton
            size="small"
            onClick={() => setStatisticsExpanded(!statisticsExpanded)}
            aria-label="Toggle statistics"
          >
            {statisticsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>

        <Collapse in={statisticsExpanded}>
          <Stack spacing={2}>
            {/* Overview Cards Row */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2}
            >
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Total Events
                  </Typography>
                  <Typography variant="h4" component="div">
                    {statistics.totalEvents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {filteredEvents.length !== statistics.totalEvents && (
                      `${filteredEvents.length} filtered`
                    )}
                  </Typography>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Total Tokens
                  </Typography>
                  <Typography variant="h4" component="div">
                    {statistics.tokenUsage.totalTokens.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {statistics.tokenUsage.eventsWithTokens} events with usage
                  </Typography>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Session Duration
                  </Typography>
                  <Typography variant="h6" component="div">
                    {statistics.timespan.duration 
                      ? formatDuration(statistics.timespan.duration)
                      : 'N/A'
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {statistics.timespan.start && (
                      new Date(statistics.timespan.start).toLocaleTimeString()
                    )}
                  </Typography>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="text.secondary" gutterBottom>
                    Active Agents
                  </Typography>
                  <Typography variant="h4" component="div">
                    {Object.keys(statistics.agentBreakdown).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Different participants
                  </Typography>
                </CardContent>
              </Card>
            </Stack>

            {/* Breakdown Cards Row */}
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              spacing={2}
            >
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Event Types
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Object.entries(statistics.eventTypeBreakdown).map(([type, count]) => (
                      <Chip
                        key={type}
                        label={`${type.replace('_', ' ')}: ${count}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Agent Activity
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Object.entries(statistics.agentBreakdown).map(([agent, count]) => (
                      <Chip
                        key={agent}
                        label={`${agent}: ${count}`}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Stack>
        </Collapse>
      </Paper>
    </Box>
  );

  // Handle loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading debug view...
        </Typography>
      </Box>
    );
  }

  // Handle empty conversation
  if (!conversation.sessionEvents || conversation.sessionEvents.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <BugIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          No Session Events Available
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          This conversation doesn't contain session events for debugging.
          Session events are typically available for multi-agent conversations.
        </Typography>
        {onRefresh && (
          <IconButton onClick={onRefresh} aria-label="Refresh">
            <RefreshIcon />
          </IconButton>
        )}
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>


      {/* Statistics */}
      {renderStatistics()}

      {/* Event Filters */}
      <EventFilters
        events={conversation.sessionEvents}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleFilterReset}
      />

      {/* Filtered Results Info */}
      {filteredEvents.length !== statistics.totalEvents && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Showing {filteredEvents.length} of {statistics.totalEvents} events
            {filteredEvents.length === 0 && (
              <span> - try adjusting your filters to see more events</span>
            )}
          </Typography>
        </Alert>
      )}

      {/* Event Timeline */}
      <EventTimeline
        events={filteredEvents}
        loading={loading}
        autoScroll={autoScroll}
        onRefresh={onRefresh}
        maxHeight={maxHeight}
      />
    </Box>
  );
});

DebugView.displayName = 'DebugView';

export default DebugView;