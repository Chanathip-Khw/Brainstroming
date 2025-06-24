import React, { useState, useCallback } from 'react';

interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  duration: number;
  activities: {
    name: string;
    duration: number;
    description: string;
    tips: string[];
  }[];
  icon: React.ElementType;
  participants: string;
}

interface UseSessionManagementProps {
  onTimerComplete?: (activityName: string) => void;
}

interface UseSessionManagementReturn {
  // State
  currentTemplate: SessionTemplate | null;
  currentActivityIndex: number;
  templateSessionId: string | null;
  timerNotification: string | null;
  showTimerModal: boolean;
  showTemplatesModal: boolean;

  // Actions
  handleTimerComplete: (activityName: string) => void;
  handleStartTemplate: (template: SessionTemplate) => void;
  clearCurrentSession: () => void;
  setShowTimerModal: (show: boolean) => void;
  setShowTemplatesModal: (show: boolean) => void;
  clearTimerNotification: () => void;
}

export const useSessionManagement = ({
  onTimerComplete,
}: UseSessionManagementProps = {}): UseSessionManagementReturn => {
  // Session state
  const [currentTemplate, setCurrentTemplate] =
    useState<SessionTemplate | null>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [templateSessionId, setTemplateSessionId] = useState<string | null>(
    null
  );
  const [timerNotification, setTimerNotification] = useState<string | null>(
    null
  );
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Handle timer completion
  const handleTimerComplete = useCallback(
    (activityName: string) => {
      setTimerNotification(activityName);

      // Call external handler if provided
      if (onTimerComplete) {
        onTimerComplete(activityName);
      }

      // If running a template, advance to next activity
      if (
        currentTemplate &&
        currentActivityIndex < currentTemplate.activities.length - 1
      ) {
        setTimeout(() => {
          setCurrentActivityIndex(prev => prev + 1);
          setTimerNotification(null);
        }, 3000);
      } else {
        // Template completed or single timer
        setTimeout(() => {
          setTimerNotification(null);
          setCurrentTemplate(null);
          setCurrentActivityIndex(0);
          setTemplateSessionId(null);
        }, 5000);
      }
    },
    [currentTemplate, currentActivityIndex, onTimerComplete]
  );

  // Handle starting a session template
  const handleStartTemplate = useCallback((template: SessionTemplate) => {
    // Generate unique session ID to force restart even for same template
    const sessionId = `${template.id}-${Date.now()}`;
    setTemplateSessionId(sessionId);
    setCurrentTemplate(template);
    setCurrentActivityIndex(0);
    // The SessionTimer will automatically start the first activity
  }, []);

  // Clear timer notification manually
  const clearTimerNotification = useCallback(() => {
    setTimerNotification(null);
  }, []);

  // Clear current session manually
  const clearCurrentSession = useCallback(() => {
    setCurrentTemplate(null);
    setCurrentActivityIndex(0);
    setTemplateSessionId(null);
    setTimerNotification(null);
  }, []);

  return {
    // State
    currentTemplate,
    currentActivityIndex,
    templateSessionId,
    timerNotification,
    showTimerModal,
    showTemplatesModal,

    // Actions
    handleTimerComplete,
    handleStartTemplate,
    clearCurrentSession,
    setShowTimerModal,
    setShowTemplatesModal,
    clearTimerNotification,
  };
};
