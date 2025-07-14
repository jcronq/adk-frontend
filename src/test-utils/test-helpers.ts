import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';

/**
 * Set up user event for testing
 */
export const setupUserEvent = () => {
  return userEvent;
};

/**
 * Simulate conversation switch action
 */
export const simulateConversationSwitch = async (
  conversationElement: HTMLElement
) => {
  await userEvent.click(conversationElement);
};

/**
 * Wait for conversation to load
 */
export const waitForConversationLoad = async (timeout: number = 3000) => {
  await waitFor(() => {
    // Add specific assertion logic here
  }, { timeout });
};

/**
 * Simulate sending a message
 */
export const simulateMessageSend = async (
  inputElement: HTMLElement,
  message: string,
  sendButton: HTMLElement
) => {
  await userEvent.type(inputElement, message);
  await userEvent.click(sendButton);
};

/**
 * Check if element is in viewport
 */
export const isElementInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Wait for element to be visible
 */
export const waitForElementToBeVisible = async (
  element: HTMLElement,
  timeout: number = 3000
) => {
  await waitFor(() => {
    expect(isElementInViewport(element)).toBe(true);
  }, { timeout });
};

/**
 * Simulate keyboard navigation
 */
export const simulateKeyboardNavigation = async (
  user: typeof userEvent,
  key: string,
  options?: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean }
) => {
  const keyboardEvent = new KeyboardEvent('keydown', {
    key,
    ctrlKey: options?.ctrlKey,
    altKey: options?.altKey,
    shiftKey: options?.shiftKey,
  });
  document.dispatchEvent(keyboardEvent);
};

/**
 * Mock agent response delay
 */
export const mockAgentResponseDelay = (ms: number = 1000) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Simulate media query change for responsive testing
 */
export const simulateMediaQuery = (query: string, matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(q => ({
      matches: q === query ? matches : false,
      media: q,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

/**
 * Check accessibility compliance
 */
export const checkAccessibility = async (container: HTMLElement) => {
  // In a real implementation, this would use axe-core
  // For now, we'll do basic checks
  const interactiveElements = container.querySelectorAll('button, [role="button"], input, select, textarea, a[href]');
  
  interactiveElements.forEach(element => {
    // Check for accessible names
    const hasAccessibleName = 
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title');
    
    if (!hasAccessibleName) {
      console.warn('Interactive element missing accessible name:', element);
    }
  });
};

/**
 * Check focus management
 */
export const checkFocusManagement = (element: HTMLElement) => {
  expect(element).toBeVisible();
  expect(element.tabIndex).toBeGreaterThanOrEqual(0);
};

/**
 * Simulate high frequency updates for performance testing
 */
export const simulateHighFrequencyUpdates = async (
  updateFn: () => void,
  updateCount: number = 10,
  intervalMs: number = 16
) => {
  return new Promise<void>((resolve) => {
    let count = 0;
    const interval = setInterval(() => {
      updateFn();
      count++;
      if (count >= updateCount) {
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
  });
};

/**
 * Detect memory leaks (basic implementation)
 */
export const detectMemoryLeaks = () => {
  const getMemoryUsage = () => {
    // Type assertion for Chrome's performance.memory API
    const performanceAny = performance as any;
    return performanceAny.memory ? performanceAny.memory.usedJSHeapSize : 0;
  };
  
  const initialMemory = getMemoryUsage();
  
  return {
    check: () => {
      const currentMemory = getMemoryUsage();
      return {
        increase: currentMemory - initialMemory,
        current: currentMemory,
        initial: initialMemory,
      };
    }
  };
};

/**
 * Mock window methods for testing
 */
export const mockWindowMethods = () => {
  const originalScrollTo = window.scrollTo;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  
  window.scrollTo = jest.fn();
  window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
  
  return {
    restore: () => {
      window.scrollTo = originalScrollTo;
      window.requestAnimationFrame = originalRequestAnimationFrame;
    }
  };
};

/**
 * Wait for animations to complete
 */
export const waitForAnimations = async (duration: number = 300) => {
  await new Promise(resolve => setTimeout(resolve, duration));
};