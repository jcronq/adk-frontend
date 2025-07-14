# DebugView Component System

A comprehensive React component system for displaying session events in a chronological timeline with advanced filtering capabilities. Designed specifically for debugging multi-agent conversations and system interactions.

## Overview

The DebugView component system consists of four main components that work together to provide a professional debugging interface:

1. **DebugView** - Main container component with statistics and layout
2. **EventFilters** - Advanced filtering controls for events
3. **EventTimeline** - Virtualized timeline display with performance optimization
4. **TimelineEvent** - Individual event renderer with detailed visualization

## Features

- 📊 **Session Statistics** - Comprehensive overview of events, tokens, duration, and agents
- 🔍 **Advanced Filtering** - Filter by agent types, event types, search text, and time ranges
- ⚡ **Virtual Scrolling** - Performance-optimized for large event lists
- 🎨 **Material-UI Design** - Professional interface following Material Design principles
- 📱 **Responsive Layout** - Works seamlessly on desktop, tablet, and mobile
- ♿ **Accessibility** - Full ARIA support and keyboard navigation
- 🔄 **Real-time Updates** - Auto-scroll and refresh capabilities
- 🛠️ **TypeScript Support** - Fully typed with comprehensive interfaces

## Installation

The components are already included in this project. To use them:

```tsx
import DebugView from './components/DebugView';
// or
import { DebugView, EventFilters, EventTimeline, TimelineEvent } from './components/debug';
```

## Basic Usage

```tsx
import React from 'react';
import DebugView from './components/DebugView';
import { ConversationWithEvents } from './types';

const MyComponent: React.FC = () => {
  const conversation: ConversationWithEvents = {
    messages: [],
    sessionId: 'session-123',
    sessionEvents: [
      {
        id: 'event-1',
        timestamp: Date.now(),
        invocationId: 'inv-1',
        type: 'user_message',
        author: 'user',
        content: {
          parts: [{ text: 'Hello world' }],
        },
      },
      // ... more events
    ],
  };

  return (
    <DebugView 
      conversation={conversation}
      autoScroll={true}
      maxHeight={600}
    />
  );
};
```

## Props

### DebugView Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `conversation` | `ConversationWithEvents` | - | **Required.** Conversation object with session events |
| `loading` | `boolean` | `false` | Show loading spinner |
| `onRefresh` | `() => void` | - | Callback for refresh button |
| `autoScroll` | `boolean` | `true` | Auto-scroll to new events |
| `maxHeight` | `number` | `600` | Maximum height in pixels |

### EventFilters Props

| Prop | Type | Description |
|------|------|-------------|
| `events` | `SessionEvent[]` | Array of events to filter |
| `filters` | `DebugViewFilters` | Current filter state |
| `onFiltersChange` | `(filters: DebugViewFilters) => void` | Filter change callback |
| `onReset` | `() => void` | Reset filters callback |

### EventTimeline Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `events` | `SessionEvent[]` | - | **Required.** Filtered events array |
| `loading` | `boolean` | `false` | Show loading state |
| `autoScroll` | `boolean` | `true` | Auto-scroll to bottom |
| `onRefresh` | `() => void` | - | Refresh callback |
| `maxHeight` | `number` | `600` | Container height |

### TimelineEvent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `event` | `SessionEvent` | - | **Required.** Event object to display |
| `isLast` | `boolean` | `false` | Whether this is the last event |

## Event Types

The system supports the following event types:

- **user_message** - Messages from users
- **agent_response** - Responses from agents  
- **tool_call** - Function/tool invocations
- **tool_response** - Tool execution results
- **mcp_question** - Questions from MCP system
- **mcp_answer** - Answers to MCP questions
- **system_event** - System-level events

## Data Structure

### SessionEvent Interface

```typescript
interface SessionEvent {
  id: string;
  timestamp: number;
  invocationId: string;
  type: 'user_message' | 'agent_response' | 'tool_call' | 'tool_response' | 'system_event' | 'mcp_question' | 'mcp_answer';
  author: string; // Dynamic agent names
  content: {
    parts: SessionEventContentPart[];
    role?: 'user' | 'model';
  };
  usageMetadata?: {
    candidatesTokenCount?: number;
    promptTokenCount?: number;
    totalTokenCount?: number;
  };
  actions?: {
    stateDelta?: any;
    artifactDelta?: any;
    requestedAuthConfigs?: any;
  };
  longRunningToolIds?: string[];
  rawEvent?: any;
}
```

### Filter Interface

```typescript
interface DebugViewFilters {
  agentTypes: string[];
  eventTypes: string[];
  searchText: string;
  timeRange?: {
    start: number;
    end: number;
  };
}
```

## Advanced Features

### Custom Filtering

```tsx
const [filters, setFilters] = useState<DebugViewFilters>({
  agentTypes: ['planning_agent', 'coding_agent'],
  eventTypes: ['tool_call', 'tool_response'],
  searchText: 'error',
});

// Filter events manually
const filteredEvents = events.filter(event => {
  return filters.agentTypes.includes(event.author) &&
         filters.eventTypes.includes(event.type) &&
         event.content.parts.some(part => 
           part.text?.toLowerCase().includes(filters.searchText.toLowerCase())
         );
});
```

### Real-time Updates

```tsx
const [events, setEvents] = useState<SessionEvent[]>([]);

// Add new events as they arrive
const addEvent = (newEvent: SessionEvent) => {
  setEvents(prev => [...prev, newEvent]);
};

// Auto-refresh from API
useEffect(() => {
  const interval = setInterval(async () => {
    const latestEvents = await fetchLatestEvents();
    setEvents(latestEvents);
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

### Performance Optimization

The EventTimeline component uses virtual scrolling to handle large datasets efficiently:

- Only renders visible events plus a buffer
- Estimated height per event: 200px
- Buffer size: 5 events above/below viewport
- Automatic height calculation based on content

### Error Handling

The system includes comprehensive error boundaries:

```tsx
// TimelineEvent renders individual events safely
// EventTimeline has error boundary for timeline rendering
// DebugView handles missing data gracefully

// Empty states
if (!events.length) {
  return <EmptyStateComponent />;
}

// Loading states
if (loading) {
  return <LoadingSpinner />;
}
```

## Styling and Theming

All components use Material-UI's theming system:

```tsx
// Custom theme
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

// Wrap with ThemeProvider
<ThemeProvider theme={theme}>
  <DebugView conversation={conversation} />
</ThemeProvider>
```

## Accessibility Features

- Full keyboard navigation support
- ARIA labels and roles
- Screen reader compatibility
- Focus management
- High contrast support
- Semantic HTML structure

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DebugView from './DebugView';

const theme = createTheme();

test('renders debug view with events', () => {
  const conversation = {
    sessionId: 'test',
    messages: [],
    sessionEvents: [/* mock events */],
  };

  render(
    <ThemeProvider theme={theme}>
      <DebugView conversation={conversation} />
    </ThemeProvider>
  );

  expect(screen.getByText('Debug View')).toBeInTheDocument();
});
```

## Performance Considerations

- **Virtual Scrolling**: Only renders visible events
- **React.memo**: Prevents unnecessary re-renders
- **Event Filtering**: Client-side filtering with debounced search
- **Token Usage**: Aggregated statistics for performance metrics
- **Error Boundaries**: Graceful degradation on failures

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

To extend the DebugView system:

1. Follow Material-UI design patterns
2. Maintain TypeScript type safety
3. Add proper accessibility attributes
4. Include comprehensive tests
5. Update documentation

## Example Integration

See `DebugViewExample.tsx` for a complete working example with:
- Mock data generation
- Real-time event addition
- Refresh functionality
- Error handling

## License

This component system is part of the ADK Frontend project and follows the same licensing terms.