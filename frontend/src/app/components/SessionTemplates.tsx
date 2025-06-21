import React, { useState } from 'react';
import { Play, Clock, Users, Lightbulb, Target, TestTube } from 'lucide-react';

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

const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'classic-brainstorm',
    name: 'Classic Brainstorming',
    description:
      'Traditional ideation session for generating and organizing ideas',
    duration: 45,
    participants: '4-8 people',
    icon: Lightbulb,
    activities: [
      {
        name: 'Problem Framing',
        duration: 5,
        description: 'Define the challenge and set context',
        tips: [
          'Clearly state the problem',
          'Share background information',
          'Set ground rules',
        ],
      },
      {
        name: 'Individual Ideation',
        duration: 10,
        description: 'Silent brainstorming - generate ideas individually',
        tips: [
          'No talking during this phase',
          'Quantity over quality',
          'Build on others ideas',
        ],
      },
      {
        name: 'Idea Sharing',
        duration: 15,
        description: 'Share and build on ideas together',
        tips: [
          'One idea at a time',
          'No criticism or judgment',
          'Ask clarifying questions',
        ],
      },
      {
        name: 'Affinity Mapping',
        duration: 10,
        description: 'Group related ideas together',
        tips: [
          'Look for themes and patterns',
          'Create meaningful categories',
          'Some ideas may stand alone',
        ],
      },
      {
        name: 'Dot Voting',
        duration: 5,
        description: 'Vote on the most promising ideas',
        tips: [
          'Give everyone equal votes',
          'Consider feasibility and impact',
          'No need to explain votes',
        ],
      },
    ],
  },
  {
    id: 'rapid-ideation',
    name: 'Rapid Ideation Burst',
    description: 'Quick, high-energy idea generation session',
    duration: 25,
    participants: '3-10 people',
    icon: Clock,
    activities: [
      {
        name: 'Warm-up',
        duration: 3,
        description: 'Creative warm-up exercise',
        tips: ['Get energy up', 'Break the ice', 'Switch to creative mindset'],
      },
      {
        name: 'Rapid Fire Ideas',
        duration: 5,
        description: 'Shout out ideas as fast as possible',
        tips: ['No filters', 'Build on others', 'Keep energy high'],
      },
      {
        name: 'Silent Storm',
        duration: 7,
        description: 'Individual silent ideation',
        tips: [
          'Use different colored notes',
          'One idea per note',
          "Don't edit yourself",
        ],
      },
      {
        name: 'Idea Clustering',
        duration: 5,
        description: 'Quick grouping of similar ideas',
        tips: [
          'Move fast',
          "Don't overthink",
          'Some ideas can be in multiple groups',
        ],
      },
      {
        name: 'Quick Wins',
        duration: 5,
        description: 'Identify immediately actionable ideas',
        tips: [
          'Look for low-hanging fruit',
          'Consider resource requirements',
          'Mark for immediate action',
        ],
      },
    ],
  },
];

interface SessionTemplatesProps {
  onStartTemplate?: (template: SessionTemplate) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SessionTemplates: React.FC<SessionTemplatesProps> = ({
  onStartTemplate,
  isOpen: externalIsOpen,
  onOpenChange,
}) => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<SessionTemplate | null>(null);
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

  const handleStartTemplate = (template: SessionTemplate) => {
    if (onStartTemplate) {
      onStartTemplate(template);
    }
    setModalOpen(false);
  };

  // Function to render templates button for sidebar
  const renderTemplatesButton = () => (
    <button
      onClick={() => setModalOpen(true)}
      className='w-full p-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2'
      title='Session Templates'
    >
      <Users className='w-5 h-5' />
      <span className='text-sm font-medium'>Templates</span>
    </button>
  );

  // Expose render functions for sidebar integration
  (SessionTemplates as any).renderTemplatesButton = renderTemplatesButton;

  return (
    <>
      {/* Templates Section - will be integrated into sidebar */}

      {modalIsOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-2xl font-bold'>Session Templates</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className='text-gray-400 hover:text-gray-600'
                >
                  ×
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {SESSION_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    className='border rounded-lg p-4 hover:border-purple-300 transition-colors'
                  >
                    <div className='flex items-center gap-3 mb-3'>
                      <div className='p-2 bg-purple-100 rounded-lg'>
                        <template.icon className='w-6 h-6 text-purple-600' />
                      </div>
                      <div>
                        <h3 className='font-semibold'>{template.name}</h3>
                        <div className='flex items-center gap-4 text-xs text-gray-600'>
                          <span className='flex items-center gap-1'>
                            <Clock className='w-3 h-3' />
                            {template.duration}min
                          </span>
                          <span className='flex items-center gap-1'>
                            <Users className='w-3 h-3' />
                            {template.participants}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className='text-sm text-gray-600 mb-3'>
                      {template.description}
                    </p>

                    <div className='space-y-2'>
                      <h4 className='text-xs font-medium text-gray-700'>
                        Activities:
                      </h4>
                      <div className='space-y-1'>
                        {template.activities.map((activity, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between text-xs'
                          >
                            <span className='text-gray-600'>
                              {activity.name}
                            </span>
                            <span className='text-purple-600 font-medium'>
                              {activity.duration}min
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartTemplate(template)}
                      className='w-full mt-4 bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors flex items-center justify-center gap-2'
                    >
                      <Play className='w-4 h-4' />
                      Start Session
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
