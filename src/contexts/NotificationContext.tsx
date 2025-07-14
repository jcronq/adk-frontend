import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { MCPNotification, NotificationContextType, MCPQuestion } from '../types';

// Create the context with a default value
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Custom hook for using the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Props for the NotificationProvider component
interface NotificationProviderProps {
  children: ReactNode;
}

// Notification Provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<MCPNotification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('mcpNotifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mcpNotifications', JSON.stringify(notifications));
  }, [notifications]);

  // Calculate unread count (pending + displayed, but not answered)
  const unreadCount = notifications.filter(notification => 
    notification.status === 'pending' || notification.status === 'displayed'
  ).length;

  // Add a new notification for an MCP question
  const addNotification = useCallback((
    question: MCPQuestion, 
    agentName?: string, 
    conversationId?: string
  ) => {
    // Check if notification already exists for this question
    const existingNotification = notifications.find(n => n.questionId === question.id);
    if (existingNotification) {
      console.log(`Notification for question ${question.id} already exists`);
      return;
    }

    const newNotification: MCPNotification = {
      id: `notification-${question.id}-${Date.now()}`,
      questionId: question.id,
      question: question.question,
      status: 'pending',
      timestamp: Date.now(),
      agentName,
      conversationId,
    };

    setNotifications(prev => [newNotification, ...prev]);
    console.log(`Added notification for MCP question ${question.id}`);
  }, [notifications]);

  // Mark a notification as displayed (user has seen it)
  const markAsDisplayed = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, status: 'displayed' as const }
          : notification
      )
    );
  }, []);

  // Mark a notification as answered (question has been answered)
  const markAsAnswered = useCallback((questionId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.questionId === questionId 
          ? { ...notification, status: 'answered' as const }
          : notification
      )
    );
    console.log(`Marked question ${questionId} as answered`);
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('mcpNotifications');
  }, []);

  // Get notification by question ID
  const getNotificationByQuestionId = useCallback((questionId: string) => {
    return notifications.find(notification => notification.questionId === questionId);
  }, [notifications]);

  // Provide the context value
  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsDisplayed,
    markAsAnswered,
    removeNotification,
    clearAllNotifications,
    getNotificationByQuestionId,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};