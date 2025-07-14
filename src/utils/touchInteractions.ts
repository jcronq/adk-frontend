import { useEffect, useRef, useCallback, useState } from 'react';

// Touch interaction constants based on accessibility guidelines
export const TOUCH_CONSTANTS = {
  // WCAG 2.1 AA minimum touch target size
  MIN_TOUCH_TARGET_SIZE: 44, // pixels
  
  // Optimal touch target sizes
  OPTIMAL_TOUCH_TARGET_SIZE: 48, // pixels
  LARGE_TOUCH_TARGET_SIZE: 56, // pixels
  
  // Touch gesture thresholds
  SWIPE_THRESHOLD: 50, // pixels
  SWIPE_VELOCITY_THRESHOLD: 0.3, // pixels per millisecond
  TAP_TIME_THRESHOLD: 200, // milliseconds
  DOUBLE_TAP_TIME_THRESHOLD: 300, // milliseconds
  LONG_PRESS_TIME_THRESHOLD: 500, // milliseconds
  
  // Touch feedback timing
  HAPTIC_FEEDBACK_DURATION: 10, // milliseconds
  VISUAL_FEEDBACK_DURATION: 150, // milliseconds
  
  // Safe areas for different devices
  SAFE_AREA_TOP: 44, // Status bar height
  SAFE_AREA_BOTTOM: 34, // Home indicator height
  SAFE_AREA_SIDES: 16, // Side margins
};

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

export interface TouchInteractionOptions {
  /** Enable swipe gestures */
  enableSwipe?: boolean;
  /** Enable long press */
  enableLongPress?: boolean;
  /** Enable double tap */
  enableDoubleTap?: boolean;
  /** Prevent default touch behaviors */
  preventDefault?: boolean;
  /** Minimum distance for swipe detection */
  swipeThreshold?: number;
  /** Haptic feedback on interactions */
  enableHaptics?: boolean;
}

/**
 * Hook for handling touch interactions with accessibility considerations
 */
export const useTouchInteractions = (
  elementRef: React.RefObject<HTMLElement>,
  options: TouchInteractionOptions = {}
) => {
  const {
    enableSwipe = false,
    enableLongPress = false,
    enableDoubleTap = false,
    preventDefault = false,
    swipeThreshold = TOUCH_CONSTANTS.SWIPE_THRESHOLD,
    enableHaptics = true,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPressed, setIsPressed] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeGesture['direction'] | null>(null);

  // Haptic feedback function
  const triggerHapticFeedback = useCallback(() => {
    if (enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(TOUCH_CONSTANTS.HAPTIC_FEEDBACK_DURATION);
    }
  }, [enableHaptics]);

  // Calculate swipe gesture
  const calculateSwipe = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture | null => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = end.timestamp - start.timestamp;
    const velocity = distance / duration;

    if (distance < swipeThreshold || velocity < TOUCH_CONSTANTS.SWIPE_VELOCITY_THRESHOLD) {
      return null;
    }

    let direction: SwipeGesture['direction'];
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    return { direction, distance, velocity, duration };
  }, [swipeThreshold]);

  // Touch start handler
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const touch = event.touches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    touchStartRef.current = touchPoint;
    setIsPressed(true);
    setSwipeDirection(null);

    // Start long press timer
    if (enableLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        triggerHapticFeedback();
        // Dispatch custom long press event
        elementRef.current?.dispatchEvent(new CustomEvent('longpress', {
          detail: touchPoint,
        }));
      }, TOUCH_CONSTANTS.LONG_PRESS_TIME_THRESHOLD);
    }

    // Handle double tap detection
    if (enableDoubleTap && lastTapRef.current) {
      const timeSinceLastTap = touchPoint.timestamp - lastTapRef.current.timestamp;
      if (timeSinceLastTap < TOUCH_CONSTANTS.DOUBLE_TAP_TIME_THRESHOLD) {
        // Clear single tap timer
        if (doubleTapTimerRef.current) {
          clearTimeout(doubleTapTimerRef.current);
          doubleTapTimerRef.current = null;
        }
        
        // Dispatch double tap event
        elementRef.current?.dispatchEvent(new CustomEvent('doubletap', {
          detail: { first: lastTapRef.current, second: touchPoint },
        }));
        
        lastTapRef.current = null;
        return;
      }
    }
  }, [preventDefault, enableLongPress, enableDoubleTap, triggerHapticFeedback, elementRef]);

  // Touch move handler
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = event.touches[0];
    const currentPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    // Calculate swipe direction for real-time feedback
    if (enableSwipe) {
      const deltaX = currentPoint.x - touchStartRef.current.x;
      const deltaY = currentPoint.y - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > swipeThreshold / 2) {
        let direction: SwipeGesture['direction'];
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }
        setSwipeDirection(direction);
      }
    }

    // Cancel long press if moved too far
    if (enableLongPress && longPressTimerRef.current) {
      const deltaX = currentPoint.x - touchStartRef.current.x;
      const deltaY = currentPoint.y - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 10) { // 10px tolerance for long press
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, [enableSwipe, enableLongPress, swipeThreshold]);

  // Touch end handler
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = event.changedTouches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    touchEndRef.current = touchPoint;
    setIsPressed(false);
    setSwipeDirection(null);

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle swipe gesture
    if (enableSwipe) {
      const swipe = calculateSwipe(touchStartRef.current, touchPoint);
      if (swipe) {
        triggerHapticFeedback();
        elementRef.current?.dispatchEvent(new CustomEvent('swipe', {
          detail: swipe,
        }));
      }
    }

    // Handle single tap
    const duration = touchPoint.timestamp - touchStartRef.current.timestamp;
    if (duration < TOUCH_CONSTANTS.TAP_TIME_THRESHOLD) {
      if (enableDoubleTap) {
        // Store tap for potential double tap
        lastTapRef.current = touchPoint;
        
        // Set timer for single tap
        doubleTapTimerRef.current = setTimeout(() => {
          elementRef.current?.dispatchEvent(new CustomEvent('singletap', {
            detail: touchPoint,
          }));
          lastTapRef.current = null;
        }, TOUCH_CONSTANTS.DOUBLE_TAP_TIME_THRESHOLD);
      } else {
        // Immediate single tap
        elementRef.current?.dispatchEvent(new CustomEvent('singletap', {
          detail: touchPoint,
        }));
      }
    }

    touchStartRef.current = null;
  }, [enableSwipe, enableDoubleTap, calculateSwipe, triggerHapticFeedback, elementRef]);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
      }
    };
  }, []);

  return {
    isPressed,
    swipeDirection,
  };
};

/**
 * Hook for ensuring minimum touch target sizes
 */
export const useTouchTargetSize = (
  elementRef: React.RefObject<HTMLElement>,
  minSize: number = TOUCH_CONSTANTS.MIN_TOUCH_TARGET_SIZE
) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    
    // Add padding if element is smaller than minimum touch target
    if (rect.width < minSize || rect.height < minSize) {
      const paddingHorizontal = Math.max(0, (minSize - rect.width) / 2);
      const paddingVertical = Math.max(0, (minSize - rect.height) / 2);
      
      element.style.padding = `${paddingVertical}px ${paddingHorizontal}px`;
      element.style.margin = `${-paddingVertical}px ${-paddingHorizontal}px`;
    }
  }, [minSize]);
};

/**
 * Utility function to check if device has touch capabilities
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Utility function to get safe area insets
 */
export const getSafeAreaInsets = () => {
  const getEnvValue = (name: string, fallback: number): number => {
    if (typeof window === 'undefined') return fallback;
    
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`env(${name})`)
      .replace('px', '');
    
    return value ? parseInt(value, 10) : fallback;
  };

  return {
    top: getEnvValue('safe-area-inset-top', TOUCH_CONSTANTS.SAFE_AREA_TOP),
    right: getEnvValue('safe-area-inset-right', TOUCH_CONSTANTS.SAFE_AREA_SIDES),
    bottom: getEnvValue('safe-area-inset-bottom', TOUCH_CONSTANTS.SAFE_AREA_BOTTOM),
    left: getEnvValue('safe-area-inset-left', TOUCH_CONSTANTS.SAFE_AREA_SIDES),
  };
};

/**
 * CSS-in-JS helper for touch-friendly styles
 */
export const touchFriendlyStyles = {
  minTouchTarget: {
    minWidth: `${TOUCH_CONSTANTS.MIN_TOUCH_TARGET_SIZE}px`,
    minHeight: `${TOUCH_CONSTANTS.MIN_TOUCH_TARGET_SIZE}px`,
  },
  optimalTouchTarget: {
    minWidth: `${TOUCH_CONSTANTS.OPTIMAL_TOUCH_TARGET_SIZE}px`,
    minHeight: `${TOUCH_CONSTANTS.OPTIMAL_TOUCH_TARGET_SIZE}px`,
  },
  largeTouchTarget: {
    minWidth: `${TOUCH_CONSTANTS.LARGE_TOUCH_TARGET_SIZE}px`,
    minHeight: `${TOUCH_CONSTANTS.LARGE_TOUCH_TARGET_SIZE}px`,
  },
  touchSafeSpacing: {
    padding: `${TOUCH_CONSTANTS.SAFE_AREA_SIDES / 2}px`,
    margin: `${TOUCH_CONSTANTS.SAFE_AREA_SIDES / 4}px`,
  },
};