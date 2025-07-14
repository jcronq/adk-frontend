import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  Box,
  Typography,
  Fab,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
  Paper,
} from '@mui/material';
import {
  KeyboardArrowDown as ScrollDownIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { SessionEvent } from '../../types';
import TimelineEvent from './TimelineEvent';

interface EventTimelineProps {
  events: SessionEvent[];
  loading?: boolean;
  autoScroll?: boolean;
  onRefresh?: () => void;
  maxHeight?: number;
}

// Virtual scrolling configuration
const ITEM_HEIGHT = 200; // Estimated height per event
const BUFFER_SIZE = 5; // Number of items to render outside viewport

interface VirtualizedListProps {
  events: SessionEvent[];
  containerHeight: number;
  autoScroll: boolean;
}

const VirtualizedEventList: React.FC<VirtualizedListProps> = memo(({ 
  events, 
  containerHeight, 
  autoScroll 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());

  // Calculate which items should be visible
  const getVisibleRange = useCallback(() => {
    const visibleStart = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleEnd = Math.min(
      events.length - 1,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT)
    );

    const startIndex = Math.max(0, visibleStart - BUFFER_SIZE);
    const endIndex = Math.min(events.length - 1, visibleEnd + BUFFER_SIZE);

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, events.length]);

  const { startIndex, endIndex } = getVisibleRange();

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const newScrollTop = element.scrollTop;
    setScrollTop(newScrollTop);

    // Check if user is at bottom
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setIsAtBottom(atBottom);
  }, []);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && isAtBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [events.length, autoScroll, isAtBottom]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  }, []);

  // Calculate total height and offset for virtualization
  const totalHeight = events.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  return (
    <Box sx={{ position: 'relative', height: containerHeight }}>
      {/* Scroll container */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'grey.100',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.400',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'grey.500',
            },
          },
        }}
      >
        {/* Virtual container with total height */}
        <Box sx={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items container */}
          <Box
            sx={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
            }}
          >
            {events.slice(startIndex, endIndex + 1).map((event, index) => {
              const actualIndex = startIndex + index;
              const isLast = actualIndex === events.length - 1;
              
              return (
                <TimelineEvent
                  key={`${event.id}-${event.timestamp}`}
                  event={event}
                  isLast={isLast}
                />
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <Fab
          size="small"
          color="primary"
          onClick={scrollToBottom}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 10,
          }}
          aria-label="Scroll to bottom"
        >
          <ScrollDownIcon />
        </Fab>
      )}
    </Box>
  );
});

VirtualizedEventList.displayName = 'VirtualizedEventList';

const EventTimeline: React.FC<EventTimelineProps> = memo(({
  events,
  loading = false,
  autoScroll = true,
  onRefresh,
  maxHeight = 800,
}) => {
  const [containerHeight, setContainerHeight] = useState(maxHeight);
  const [showAutoScrollMessage, setShowAutoScrollMessage] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100; // Leave some margin
        setContainerHeight(Math.min(maxHeight, Math.max(500, availableHeight)));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [maxHeight]);

  // Handle auto-scroll message display
  useEffect(() => {
    if (autoScroll && events.length > 0) {
      // Show the message when auto-scroll is enabled
      setShowAutoScrollMessage(true);
      
      // Clear any existing timeout
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
      
      // Hide the message after 5 seconds
      autoScrollTimeoutRef.current = setTimeout(() => {
        setShowAutoScrollMessage(false);
      }, 5000);
    } else {
      // Hide immediately if auto-scroll is disabled
      setShowAutoScrollMessage(false);
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = null;
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = null;
      }
    };
  }, [autoScroll, events.length]);

  // Sort events by timestamp
  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => a.timestamp - b.timestamp);
  }, [events]);

  // Empty state
  if (!loading && events.length === 0) {
    return (
      <Paper 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          bgcolor: 'grey.50',
          border: '2px dashed',
          borderColor: 'grey.300',
        }}
      >
        <TimelineIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Events Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Session events will appear here as they occur during the conversation.
        </Typography>
        {onRefresh && (
          <IconButton 
            onClick={onRefresh} 
            sx={{ mt: 2 }}
            aria-label="Refresh events"
          >
            <RefreshIcon />
          </IconButton>
        )}
      </Paper>
    );
  }

  return (
    <Box ref={containerRef}>
      {/* Header */}
      <Stack 
        direction="row" 
        alignItems="center" 
        justifyContent="space-between" 
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <TimelineIcon color="primary" />
          <Typography variant="h6">
            Event Timeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({events.length} events)
          </Typography>
        </Stack>

        {onRefresh && (
          <Tooltip title="Refresh events">
            <IconButton 
              onClick={onRefresh}
              disabled={loading}
              size="small"
              aria-label="Refresh events"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error boundary fallback */}
      {!loading && events.length > 0 && (
        <ErrorBoundary>
          <VirtualizedEventList
            events={sortedEvents}
            containerHeight={containerHeight}
            autoScroll={autoScroll}
          />
        </ErrorBoundary>
      )}

      {/* Auto-scroll indicator */}
      {showAutoScrollMessage && (
        <Alert 
          severity="info" 
          sx={{ mt: 1 }} 
          icon={false}
        >
          <Typography variant="caption">
            Auto-scroll enabled - Timeline will automatically scroll to new events
          </Typography>
        </Alert>
      )}
    </Box>
  );
});

EventTimeline.displayName = 'EventTimeline';

// Error boundary component for graceful error handling
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('EventTimeline Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          <Typography variant="h6" gutterBottom>
            Timeline Rendering Error
          </Typography>
          <Typography variant="body2">
            An error occurred while rendering the event timeline. 
            Please try refreshing or check the console for more details.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" component="pre" sx={{ 
              display: 'block',
              bgcolor: 'grey.100',
              p: 1,
              borderRadius: 1,
              mt: 1,
              whiteSpace: 'pre-wrap',
            }}>
              {this.state.error?.message}
            </Typography>
          </Box>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default EventTimeline;