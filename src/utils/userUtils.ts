import { v4 as uuidv4 } from 'uuid';

const USER_ID_STORAGE_KEY = 'adk_user_id';

/**
 * Get user ID from localStorage or generate a new one if it doesn't exist
 * @returns Current or newly generated user ID
 */
export const getUserId = (): string => {
  const savedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (savedUserId) {
    return savedUserId;
  }
  
  // Use cronqj as the default user ID for development
  // This matches the user ID that has existing sessions
  const defaultUserId = 'cronqj';
  localStorage.setItem(USER_ID_STORAGE_KEY, defaultUserId);
  return defaultUserId;
};

/**
 * Save user ID to localStorage
 * @param userId User ID to save
 */
export const saveUserId = (userId: string): void => {
  localStorage.setItem(USER_ID_STORAGE_KEY, userId);
};

/**
 * Generate a new session ID
 * @returns New session ID
 */
export const generateSessionId = (): string => {
  return `session_${uuidv4().substring(0, 8)}`;
};
