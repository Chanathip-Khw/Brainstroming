import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Bell, Settings } from 'lucide-react';

interface SessionTimerProps {
  onTimerComplete?: (activity: string) => void;
  onStopSession?: () => void;
  currentTemplate?: any;
  currentActivityIndex?: number;
  templateSessionId?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface TimerActivity {
  id: string;
  name: string;
  duration: number; // in seconds
  description: string;
  color: string;
}

const PRESET_ACTIVITIES: TimerActivity[] = [
  {
    id: 'individual-ideation',
    name: 'Individual Ideation',
    duration: 300, // 5 minutes
    description: 'Silent brainstorming - generate ideas individually',
    color: 'bg-blue-500',
  },
  {
    id: 'rapid-fire',
    name: 'Rapid Fire Ideas',
    duration: 180, // 3 minutes
    description: 'Quick burst of ideas - say anything that comes to mind',
    color: 'bg-orange-500',
  },
  {
    id: 'build-on-ideas',
    name: 'Build on Ideas',
    duration: 420, // 7 minutes
    description: 'Expand and improve existing ideas',
    color: 'bg-green-500',
  },
  {
    id: 'affinity-mapping',
    name: 'Affinity Mapping',
    duration: 600, // 10 minutes
    description: 'Group related ideas together',
    color: 'bg-purple-500',
  },
  {
    id: 'dot-voting',
    name: 'Dot Voting',
    duration: 180, // 3 minutes
    description: 'Vote on your favorite ideas',
    color: 'bg-red-500',
  },
  {
    id: 'discussion',
    name: 'Discussion',
    duration: 900, // 15 minutes
    description: 'Discuss and refine selected ideas',
    color: 'bg-indigo-500',
  },
];

export const SessionTimer: React.FC<SessionTimerProps> = ({
  onTimerComplete,
  onStopSession,
  currentTemplate,
  currentActivityIndex = 0,
  templateSessionId,
  isOpen: externalIsOpen,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Use external open state if provided
  const modalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const setModalOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setIsOpen(open);
    }
  };
  const [selectedActivity, setSelectedActivity] =
    useState<TimerActivity | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [customTime, setCustomTime] = useState(5);
  const [showCustom, setShowCustom] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const createBeepSound = () => {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    audioRef.current = { play: createBeepSound } as any;
  }, []);

  // Auto-start template activities
  useEffect(() => {
    if (currentTemplate && currentTemplate.activities[currentActivityIndex]) {
      const templateActivity = currentTemplate.activities[currentActivityIndex];
      const activity: TimerActivity = {
        id: `template-${currentActivityIndex}`,
        name: templateActivity.name,
        duration: templateActivity.duration * 60, // Convert minutes to seconds
        description: templateActivity.description,
        color: 'bg-purple-500',
      };

      setSelectedActivity(activity);
      setTimeRemaining(activity.duration);
      setIsRunning(true);
      setIsPaused(false);
      setModalOpen(false);
    }
  }, [currentTemplate, currentActivityIndex, templateSessionId]);

  // Timer countdown effect
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Timer complete
            setIsRunning(false);
            setIsPaused(false);

            // Play notification sound
            try {
              audioRef.current?.play();
            } catch (error) {
              console.log('Could not play audio notification');
            }

            // Call completion callback only for template activities (triggers auto-progression)
            if (
              selectedActivity &&
              onTimerComplete &&
              selectedActivity.id.startsWith('template-')
            ) {
              onTimerComplete(selectedActivity.name);
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeRemaining, selectedActivity, onTimerComplete]);

  const startTimer = (activity: TimerActivity) => {
    setSelectedActivity(activity);
    setTimeRemaining(activity.duration);
    setIsRunning(true);
    setIsPaused(false);
    setModalOpen(false);
  };

  const startCustomTimer = () => {
    const customActivity: TimerActivity = {
      id: 'custom',
      name: 'Custom Timer',
      duration: customTime * 60,
      description: `Custom ${customTime} minute timer`,
      color: 'bg-gray-500',
    };
    startTimer(customActivity);
  };

  const pauseResumeTimer = () => {
    if (isRunning) {
      setIsPaused(!isPaused);
    }
  };

  const resetTimer = () => {
    // Reset the current activity timer back to its full duration
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(selectedActivity?.duration || 0);
    // Keep timer display visible but stopped
  };

  const stopTimer = () => {
    // If this is a template session, notify parent to clear session
    if (selectedActivity?.id.startsWith('template-') && onStopSession) {
      onStopSession();
    }
    
    setIsRunning(false);
    setIsPaused(false);
    setSelectedActivity(null);
    setTimeRemaining(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!selectedActivity) return 0;
    return (
      ((selectedActivity.duration - timeRemaining) /
        selectedActivity.duration) *
      100
    );
  };

  // Function to render timer button for sidebar
  const renderTimerButton = () => (
    <button
      onClick={() => setModalOpen(true)}
      className={`w-full p-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
        isRunning
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
      title='Session Timer'
    >
      <Clock className='w-5 h-5' />
      <span className='text-sm font-medium'>
        {isRunning ? formatTime(timeRemaining) : 'Timer'}
      </span>
    </button>
  );

  // Expose render functions for sidebar integration
  (SessionTimer as any).renderTimerButton = renderTimerButton;

  return (
    <>
      {/* Timer Section - will be integrated into sidebar */}

      {/* Active Timer Display - positioned in bottom-right corner */}
      {selectedActivity && (
        <div className='fixed bottom-20 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[280px] max-w-[320px]'>
          <div className='flex items-center justify-between mb-2'>
            <h3 className='font-semibold text-sm'>
              {selectedActivity.name}
              {currentTemplate &&
                selectedActivity.id.startsWith('template-') && (
                  <span className='text-xs text-purple-600 ml-2'>
                    ({currentActivityIndex + 1}/
                    {currentTemplate.activities.length})
                  </span>
                )}
            </h3>
            <div className='flex items-center gap-1'>
              {isRunning ? (
                <>
                  <button
                    onClick={pauseResumeTimer}
                    className='p-1 hover:bg-gray-100 rounded'
                    title={isPaused ? 'Resume' : 'Pause'}
                  >
                    {isPaused ? (
                      <Play className='w-4 h-4' />
                    ) : (
                      <Pause className='w-4 h-4' />
                    )}
                  </button>
                  <button
                    onClick={resetTimer}
                    className='p-1 hover:bg-gray-100 rounded'
                    title='Reset'
                  >
                    <RotateCcw className='w-4 h-4' />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    // Reset time if timer has completed (timeRemaining is 0)
                    if (timeRemaining === 0 && selectedActivity) {
                      setTimeRemaining(selectedActivity.duration);
                    }
                    setIsRunning(true);
                    setIsPaused(false);
                  }}
                  className='p-1 hover:bg-gray-100 rounded text-green-600'
                  title='Start'
                >
                  <Play className='w-4 h-4' />
                </button>
              )}
              <button
                onClick={stopTimer}
                className='p-1 hover:bg-gray-100 rounded text-red-600'
                title='Stop'
              >
                ×
              </button>
            </div>
          </div>

          <div className='text-xs text-gray-600 mb-2'>
            {selectedActivity.description}
            {currentTemplate &&
              selectedActivity.id.startsWith('template-') &&
              currentTemplate.activities[currentActivityIndex] && (
                <div className='mt-2 p-2 bg-purple-50 rounded text-xs'>
                  <div className='font-medium text-purple-800 mb-1'>Tips:</div>
                  <ul className='text-purple-700 space-y-1'>
                    {currentTemplate.activities[currentActivityIndex].tips.map(
                      (tip: string, index: number) => (
                        <li key={index} className='flex items-start gap-1'>
                          <span className='text-purple-500'>•</span>
                          <span>{tip}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>

          {/* Progress Bar */}
          <div className='w-full bg-gray-200 rounded-full h-2 mb-2'>
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${selectedActivity.color}`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          <div className='text-center'>
            <div className='text-2xl font-mono font-bold'>
              {formatTime(timeRemaining)}
            </div>
            {isPaused && (
              <div className='text-xs text-orange-600 font-medium'>PAUSED</div>
            )}
            {timeRemaining === 0 && (
              <div className='text-xs text-red-600 font-medium animate-pulse'>
                TIME'S UP! <Bell className='w-3 h-3 inline' />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timer Selection Modal */}
      {modalIsOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-semibold'>Session Timer</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className='text-gray-400 hover:text-gray-600'
                >
                  ×
                </button>
              </div>

              <div className='space-y-3 mb-6'>
                <h3 className='font-medium text-gray-700'>
                  Brainstorming Activities
                </h3>
                {PRESET_ACTIVITIES.map(activity => (
                  <button
                    key={activity.id}
                    onClick={() => startTimer(activity)}
                    className='w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-center justify-between mb-1'>
                      <span className='font-medium'>{activity.name}</span>
                      <span
                        className={`px-2 py-1 rounded text-white text-xs ${activity.color}`}
                      >
                        {Math.floor(activity.duration / 60)}m
                      </span>
                    </div>
                    <div className='text-sm text-gray-600'>
                      {activity.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Timer */}
              <div className='border-t pt-4'>
                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className='flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-3'
                >
                  <Settings className='w-4 h-4' />
                  Custom Timer
                </button>

                {showCustom && (
                  <div className='bg-gray-50 p-3 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <input
                        type='number'
                        min='1'
                        max='60'
                        value={customTime}
                        onChange={e =>
                          setCustomTime(parseInt(e.target.value) || 1)
                        }
                        className='w-16 px-2 py-1 border rounded text-center'
                      />
                      <span className='text-sm text-gray-600'>minutes</span>
                    </div>
                    <button
                      onClick={startCustomTimer}
                      className='w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors'
                    >
                      Start Custom Timer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
