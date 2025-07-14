import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  InputAdornment,
  Autocomplete,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DebugViewFilters, SessionEvent } from '../../types';

interface EventFiltersProps {
  events: SessionEvent[];
  filters: DebugViewFilters;
  onFiltersChange: (filters: DebugViewFilters) => void;
  onReset?: () => void;
}

// Predefined event types with descriptions
const EVENT_TYPES = [
  { value: 'user_message', label: 'User Messages', description: 'Messages from users' },
  { value: 'agent_response', label: 'Agent Responses', description: 'Responses from agents' },
  { value: 'tool_call', label: 'Tool Calls', description: 'Function/tool invocations' },
  { value: 'tool_response', label: 'Tool Responses', description: 'Tool execution results' },
  { value: 'mcp_question', label: 'MCP Questions', description: 'Questions from MCP system' },
  { value: 'mcp_answer', label: 'MCP Answers', description: 'Answers to MCP questions' },
  { value: 'system_event', label: 'System Events', description: 'System-level events' },
];

// Quick filter presets
const FILTER_PRESETS = [
  {
    name: 'All Events',
    description: 'Show all events',
    filters: {
      agentTypes: [],
      eventTypes: [],
      searchText: '',
    }
  },
  {
    name: 'User Interactions',
    description: 'User messages and agent responses only',
    filters: {
      agentTypes: [],
      eventTypes: ['user_message', 'agent_response'],
      searchText: '',
    }
  },
  {
    name: 'Tool Usage',
    description: 'Tool calls and responses only',
    filters: {
      agentTypes: [],
      eventTypes: ['tool_call', 'tool_response'],
      searchText: '',
    }
  },
  {
    name: 'MCP Events',
    description: 'MCP questions and answers only',
    filters: {
      agentTypes: [],
      eventTypes: ['mcp_question', 'mcp_answer'],
      searchText: '',
    }
  },
  {
    name: 'System Only',
    description: 'System events only',
    filters: {
      agentTypes: [],
      eventTypes: ['system_event'],
      searchText: '',
    }
  },
];

const EventFilters: React.FC<EventFiltersProps> = memo(({
  events,
  filters,
  onFiltersChange,
  onReset,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.searchText);

  // Extract unique agent types from events
  const agentTypes = useMemo(() => {
    const agents = new Set<string>();
    events.forEach(event => {
      if (event.author) {
        agents.add(event.author);
      }
    });
    return Array.from(agents).sort();
  }, [events]);

  // Count events by type for display
  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Count events by agent for display
  const agentTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(event => {
      counts[event.author] = (counts[event.author] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.agentTypes.length > 0) count++;
    if (filters.eventTypes.length > 0) count++;
    if (filters.searchText.trim()) count++;
    if (filters.timeRange) count++;
    return count;
  }, [filters]);

  // Handle agent type filter changes
  const handleAgentTypeChange = useCallback((agentType: string, checked: boolean) => {
    const newAgentTypes = checked
      ? [...filters.agentTypes, agentType]
      : filters.agentTypes.filter(type => type !== agentType);
    
    onFiltersChange({
      ...filters,
      agentTypes: newAgentTypes,
    });
  }, [filters, onFiltersChange]);

  // Handle event type filter changes
  const handleEventTypeChange = useCallback((eventType: string, checked: boolean) => {
    const newEventTypes = checked
      ? [...filters.eventTypes, eventType]
      : filters.eventTypes.filter(type => type !== eventType);
    
    onFiltersChange({
      ...filters,
      eventTypes: newEventTypes,
    });
  }, [filters, onFiltersChange]);

  // Handle search text changes (debounced)
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    
    // Debounce search updates
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        ...filters,
        searchText: value,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, onFiltersChange]);

  // Apply filter preset
  const applyPreset = useCallback((preset: typeof FILTER_PRESETS[0]) => {
    onFiltersChange({
      ...filters,
      ...preset.filters,
    });
    setSearchValue(preset.filters.searchText);
  }, [filters, onFiltersChange]);

  // Reset all filters
  const handleReset = useCallback(() => {
    const resetFilters: DebugViewFilters = {
      agentTypes: [],
      eventTypes: [],
      searchText: '',
    };
    onFiltersChange(resetFilters);
    setSearchValue('');
    if (onReset) {
      onReset();
    }
  }, [onFiltersChange, onReset]);

  return (
    <Paper 
      sx={{ 
        mb: 2,
        border: '1px solid',
        borderColor: 'grey.200',
      }}
    >
      {/* Filter Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'grey.200',
          bgcolor: 'grey.50',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Badge badgeContent={activeFilterCount} color="primary">
              <FilterIcon color="primary" />
            </Badge>
            <Typography variant="h6" color="primary">
              Event Filters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ({events.length} total events)
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            {activeFilterCount > 0 && (
              <Tooltip title="Clear all filters">
                <IconButton 
                  size="small" 
                  onClick={handleReset}
                  aria-label="Clear filters"
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={expanded ? "Collapse filters" : "Expand filters"}>
              <IconButton 
                size="small" 
                onClick={() => setExpanded(!expanded)}
                aria-label="Toggle filter panel"
              >
                <ExpandMoreIcon 
                  sx={{ 
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease-in-out'
                  }} 
                />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Filter Content */}
      {expanded && (
        <Box sx={{ p: 2 }}>
          {/* Quick Presets */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Filters
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {FILTER_PRESETS.map((preset) => (
                <Tooltip key={preset.name} title={preset.description}>
                  <Chip
                    label={preset.name}
                    onClick={() => applyPreset(preset)}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                </Tooltip>
              ))}
            </Stack>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Search Filter */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Search Events"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search in event content, function names, etc..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchValue && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => handleSearchChange('')}
                      aria-label="Clear search"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>

          {/* Agent Type Filters */}
          {agentTypes.length > 0 && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PersonIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2">
                    Agent Types
                  </Typography>
                  {filters.agentTypes.length > 0 && (
                    <Chip 
                      label={filters.agentTypes.length} 
                      size="small" 
                      color="primary"
                    />
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    {agentTypes.map((agentType) => (
                      <FormControlLabel
                        key={agentType}
                        control={
                          <Checkbox
                            checked={filters.agentTypes.includes(agentType)}
                            onChange={(e) => handleAgentTypeChange(agentType, e.target.checked)}
                            size="small"
                          />
                        }
                        label={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2">
                              {agentType}
                            </Typography>
                            <Chip 
                              label={agentTypeCounts[agentType] || 0} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Stack>
                        }
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Event Type Filters */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CategoryIcon color="action" fontSize="small" />
                <Typography variant="subtitle2">
                  Event Types
                </Typography>
                {filters.eventTypes.length > 0 && (
                  <Chip 
                    label={filters.eventTypes.length} 
                    size="small" 
                    color="primary"
                  />
                )}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl component="fieldset" fullWidth>
                <FormGroup>
                  {EVENT_TYPES.map((eventType) => (
                    <Tooltip key={eventType.value} title={eventType.description} placement="right">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={filters.eventTypes.includes(eventType.value)}
                            onChange={(e) => handleEventTypeChange(eventType.value, e.target.checked)}
                            size="small"
                          />
                        }
                        label={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2">
                              {eventType.label}
                            </Typography>
                            <Chip 
                              label={eventTypeCounts[eventType.value] || 0} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Stack>
                        }
                      />
                    </Tooltip>
                  ))}
                </FormGroup>
              </FormControl>
            </AccordionDetails>
          </Accordion>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Active Filters ({activeFilterCount})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {filters.agentTypes.map((agent) => (
                  <Chip
                    key={`agent-${agent}`}
                    label={`Agent: ${agent}`}
                    onDelete={() => handleAgentTypeChange(agent, false)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {filters.eventTypes.map((type) => (
                  <Chip
                    key={`type-${type}`}
                    label={`Type: ${type.replace('_', ' ')}`}
                    onDelete={() => handleEventTypeChange(type, false)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {filters.searchText && (
                  <Chip
                    label={`Search: "${filters.searchText}"`}
                    onDelete={() => handleSearchChange('')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
});

EventFilters.displayName = 'EventFilters';

export default EventFilters;