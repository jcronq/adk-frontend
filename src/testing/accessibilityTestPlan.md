# Accessibility and UX Testing Plan for ADK Frontend ChatGPT Migration

## Overview

This document outlines comprehensive testing procedures for ensuring WCAG 2.1 AA compliance and optimal user experience in the ChatGPT-style interface migration. The testing plan covers automated testing, manual accessibility audits, user testing with assistive technologies, and mobile touch interaction validation.

## Testing Scope

### Primary Focus Areas
1. **Keyboard Navigation** - Complete interface navigable without mouse
2. **Screen Reader Support** - Full compatibility with major screen readers
3. **Color Contrast** - WCAG 2.1 AA contrast ratio compliance
4. **Touch Accessibility** - Mobile touch target and gesture optimization
5. **Animation Accessibility** - Respect for reduced motion preferences
6. **Focus Management** - Proper focus indicators and trap behavior
7. **ARIA Implementation** - Comprehensive semantic markup

### Target Assistive Technologies
- **Screen Readers**: NVDA, JAWS, VoiceOver, TalkBack
- **Voice Control**: Dragon NaturallySpeaking, Voice Control (macOS/iOS)
- **Keyboard Only Navigation**: Physical keyboards, switch devices
- **Mobile Accessibility**: iOS VoiceOver, Android TalkBack

## Automated Testing

### Tools and Implementation

#### 1. Jest + Testing Library Accessibility Tests
```typescript
// Example test structure
describe('Accessibility Tests', () => {
  beforeEach(() => {
    render(<App />);
  });

  test('should have proper heading hierarchy', () => {
    const headings = screen.getAllByRole('heading');
    // Verify h1 -> h2 -> h3 structure
  });

  test('should have accessible form labels', () => {
    const messageInput = screen.getByRole('textbox', { name: /message/i });
    expect(messageInput).toHaveAccessibleName();
  });

  test('should support keyboard navigation', () => {
    const sidebarToggle = screen.getByRole('button', { name: /toggle sidebar/i });
    fireEvent.keyDown(sidebarToggle, { key: 'Enter' });
    // Verify sidebar state change
  });
});
```

#### 2. axe-core Integration
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<ChatInterface />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

#### 3. Pa11y CLI Integration
```bash
# Add to package.json scripts
"test:a11y": "pa11y --sitemap http://localhost:3000/sitemap.xml --standard WCAG2AA"
```

#### 4. Lighthouse CI for Performance and Accessibility
```yaml
# lighthouse-ci.yml
ci:
  collect:
    settings:
      onlyCategories: ['accessibility', 'performance']
  assert:
    assertions:
      'categories:accessibility': ['error', { minScore: 0.95 }]
```

## Manual Testing Procedures

### 1. Keyboard Navigation Testing

#### Test Scenarios
```typescript
interface KeyboardTestScenario {
  name: string;
  steps: string[];
  expectedResult: string;
  wcagCriteria: string;
}

const keyboardTests: KeyboardTestScenario[] = [
  {
    name: 'Tab Navigation Through Sidebar',
    steps: [
      'Press Tab from address bar',
      'Continue tabbing through sidebar items',
      'Verify focus indicators are visible',
      'Test Shift+Tab for reverse navigation'
    ],
    expectedResult: 'All interactive elements receive focus with visible indicators',
    wcagCriteria: '2.1.1 Keyboard, 2.4.7 Focus Visible'
  },
  {
    name: 'Sidebar Toggle with Keyboard',
    steps: [
      'Navigate to sidebar toggle button',
      'Press Enter or Space',
      'Verify sidebar collapse/expand',
      'Test with Ctrl+B shortcut'
    ],
    expectedResult: 'Sidebar toggles correctly, focus management preserved',
    wcagCriteria: '2.1.1 Keyboard, 2.1.2 No Keyboard Trap'
  },
  {
    name: 'Message Input and Send',
    steps: [
      'Tab to message input field',
      'Type message content',
      'Tab to send button',
      'Press Enter to send'
    ],
    expectedResult: 'Message sent successfully, focus returned appropriately',
    wcagCriteria: '2.1.1 Keyboard, 3.2.2 On Input'
  },
  {
    name: 'Conversation Selection',
    steps: [
      'Navigate to conversation list',
      'Use arrow keys to select conversation',
      'Press Enter to open conversation',
      'Verify focus moves to main chat area'
    ],
    expectedResult: 'Conversation loads, proper focus management',
    wcagCriteria: '2.1.1 Keyboard, 2.4.3 Focus Order'
  }
];
```

### 2. Screen Reader Testing

#### NVDA Testing Protocol
```typescript
interface ScreenReaderTest {
  component: string;
  action: string;
  expectedAnnouncement: string;
  nvdaCommands: string[];
}

const screenReaderTests: ScreenReaderTest[] = [
  {
    component: 'Notification Badge',
    action: 'Focus on notification button',
    expectedAnnouncement: '3 notifications, 1 urgent, button',
    nvdaCommands: ['Tab to element', 'NVDA+Space for info']
  },
  {
    component: 'Message List',
    action: 'Browse messages',
    expectedAnnouncement: 'Conversation with Agent 1, 5 messages, list',
    nvdaCommands: ['NVDA+Down arrow to read', 'NVDA+Ctrl+Down for structure']
  },
  {
    component: 'Sidebar Collapse',
    action: 'Toggle sidebar',
    expectedAnnouncement: 'Sidebar collapsed, button',
    nvdaCommands: ['Enter to activate', 'NVDA+Tab for live region']
  }
];
```

#### VoiceOver Testing Protocol
```typescript
const voiceOverTests = [
  {
    gesture: 'Rotor navigation',
    element: 'Headings',
    expected: 'Navigate between h1, h2, h3 in proper hierarchy'
  },
  {
    gesture: 'VO+Command+H',
    element: 'Headings list',
    expected: 'All headings listed with proper levels'
  },
  {
    gesture: 'VO+U',
    element: 'Web spots',
    expected: 'All interactive elements accessible via rotor'
  }
];
```

### 3. Color Contrast Testing

#### Automated Contrast Checking
```typescript
const contrastTests = [
  {
    element: 'Primary buttons',
    foreground: '#FFFFFF',
    background: '#1565C0',
    ratio: 4.51, // Must be >= 4.5:1
    status: 'PASS'
  },
  {
    element: 'Message text',
    foreground: 'rgba(0, 0, 0, 0.87)',
    background: '#FFFFFF',
    ratio: 15.3, // Must be >= 4.5:1
    status: 'PASS'
  },
  {
    element: 'Sidebar inactive items',
    foreground: 'rgba(0, 0, 0, 0.6)',
    background: '#FAFAFA',
    ratio: 6.8, // Must be >= 4.5:1
    status: 'PASS'
  }
];
```

### 4. Mobile Touch Testing

#### Touch Target Testing
```typescript
interface TouchTargetTest {
  element: string;
  minSize: number; // pixels
  actualSize: { width: number; height: number };
  spacing: number; // minimum spacing to adjacent targets
  result: 'PASS' | 'FAIL';
}

const touchTargetTests: TouchTargetTest[] = [
  {
    element: 'Sidebar toggle button',
    minSize: 44,
    actualSize: { width: 48, height: 48 },
    spacing: 8,
    result: 'PASS'
  },
  {
    element: 'Send message button',
    minSize: 44,
    actualSize: { width: 44, height: 44 },
    spacing: 8,
    result: 'PASS'
  },
  {
    element: 'Conversation list items',
    minSize: 44,
    actualSize: { width: 280, height: 48 },
    spacing: 2,
    result: 'PASS'
  }
];
```

#### Gesture Testing
```typescript
const gestureTests = [
  {
    gesture: 'Swipe right',
    context: 'Main chat area',
    expected: 'Open sidebar',
    testDevices: ['iPhone', 'Android']
  },
  {
    gesture: 'Swipe left',
    context: 'Sidebar open',
    expected: 'Close sidebar',
    testDevices: ['iPhone', 'Android']
  },
  {
    gesture: 'Long press',
    context: 'Message bubble',
    expected: 'Show context menu',
    testDevices: ['iPhone', 'Android']
  }
];
```

## User Testing with Disabilities

### Participant Recruitment
- **Target Groups**:
  - Screen reader users (NVDA, JAWS, VoiceOver)
  - Keyboard-only users
  - Users with motor impairments
  - Users with cognitive disabilities
  - Users with low vision

### Testing Protocol

#### Session Structure (60 minutes)
1. **Introduction (5 minutes)**
   - Explain purpose and consent
   - Set up assistive technology
   - Baseline technology comfort assessment

2. **Task-Based Testing (40 minutes)**
   ```typescript
   const userTasks = [
     {
       task: 'Start a new conversation with an agent',
       timeLimit: '3 minutes',
       successCriteria: 'User successfully initiates conversation',
       assistanceLevel: 'Minimal prompting allowed'
     },
     {
       task: 'Navigate between existing conversations',
       timeLimit: '2 minutes',
       successCriteria: 'User switches conversations successfully',
       assistanceLevel: 'No assistance'
     },
     {
       task: 'Reply to an MCP question',
       timeLimit: '4 minutes',
       successCriteria: 'User identifies and responds to MCP question',
       assistanceLevel: 'Minimal prompting allowed'
     },
     {
       task: 'Use notification system to find unanswered questions',
       timeLimit: '3 minutes',
       successCriteria: 'User navigates to questions via notifications',
       assistanceLevel: 'No assistance'
     }
   ];
   ```

3. **Post-Task Interview (15 minutes)**
   - Overall experience rating
   - Specific pain points
   - Suggestions for improvement
   - Comparison to other interfaces

### Success Metrics
```typescript
interface AccessibilityMetrics {
  taskCompletion: {
    overall: number; // Target: >90%
    screenReader: number; // Target: >85%
    keyboardOnly: number; // Target: >95%
    mobile: number; // Target: >80%
  };
  
  timeToComplete: {
    average: number; // Target: <120% of baseline
    screenReader: number; // Target: <150% of baseline
  };
  
  errorRate: {
    navigation: number; // Target: <5%
    interaction: number; // Target: <3%
  };
  
  satisfactionRating: number; // Target: >4.0/5.0
}
```

## Regression Testing

### Automated Accessibility Regression
```typescript
// CI/CD pipeline integration
describe('Accessibility Regression Tests', () => {
  test('maintains keyboard navigation paths', () => {
    // Test all critical keyboard navigation flows
  });
  
  test('preserves ARIA labels and structure', () => {
    // Verify all ARIA attributes remain correct
  });
  
  test('maintains color contrast ratios', () => {
    // Check all color combinations
  });
  
  test('preserves touch target sizes', () => {
    // Verify minimum touch target compliance
  });
});
```

### Manual Regression Checklist
```typescript
const regressionChecklist = [
  {
    category: 'Keyboard Navigation',
    items: [
      'All interactive elements reachable via Tab',
      'Focus indicators visible and properly styled',
      'No keyboard traps in modal dialogs',
      'Skip links function correctly'
    ]
  },
  {
    category: 'Screen Reader Support',
    items: [
      'Live regions announce dynamic content',
      'Form fields have proper labels',
      'Button purposes are clear',
      'Navigation landmarks are present'
    ]
  },
  {
    category: 'Mobile Accessibility',
    items: [
      'Touch targets meet minimum size requirements',
      'Swipe gestures work consistently',
      'Voice control compatibility maintained',
      'Text can be zoomed to 200% without horizontal scrolling'
    ]
  }
];
```

## Tools and Environment Setup

### Required Testing Tools
```json
{
  "devDependencies": {
    "@axe-core/react": "^4.7.3",
    "jest-axe": "^7.0.1",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.4.3",
    "pa11y": "^6.2.3",
    "lighthouse-ci": "^0.12.0"
  }
}
```

### Testing Environment Configuration
```typescript
// jest.config.js accessibility setup
module.exports = {
  setupFilesAfterEnv: [
    '<rootDir>/src/testing/accessibility-setup.ts'
  ],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};

// accessibility-setup.ts
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
```

### Browser Testing Matrix
```typescript
const testingMatrix = {
  desktop: {
    browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    screenReaders: ['NVDA + Firefox', 'JAWS + Chrome', 'VoiceOver + Safari'],
    resolutions: ['1920x1080', '1366x768', '1280x720']
  },
  mobile: {
    devices: ['iPhone 13', 'Samsung Galaxy S21', 'iPad Air'],
    screenReaders: ['VoiceOver', 'TalkBack'],
    orientations: ['portrait', 'landscape']
  }
};
```

## Reporting and Documentation

### Test Report Structure
```typescript
interface AccessibilityTestReport {
  summary: {
    testDate: string;
    totalTests: number;
    passed: number;
    failed: number;
    wcagLevel: 'AA';
    overallScore: number;
  };
  
  categories: {
    keyboardNavigation: TestCategoryResult;
    screenReaderSupport: TestCategoryResult;
    colorContrast: TestCategoryResult;
    touchAccessibility: TestCategoryResult;
    ariaImplementation: TestCategoryResult;
  };
  
  criticalIssues: AccessibilityIssue[];
  recommendations: string[];
  nextSteps: string[];
}

interface TestCategoryResult {
  score: number;
  testsRun: number;
  issues: AccessibilityIssue[];
  improvements: string[];
}

interface AccessibilityIssue {
  severity: 'critical' | 'major' | 'minor';
  wcagCriterion: string;
  description: string;
  location: string;
  recommendedFix: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}
```

This comprehensive testing plan ensures that the ADK Frontend ChatGPT-style interface meets and exceeds accessibility standards while providing an optimal user experience for all users, including those using assistive technologies.