import React from 'react';
import { cn } from '../../../utils/cn';

const ProgressIndicator = ({ currentStep, steps }) => {
  const stepOrder = [
    { key: 'lead_validation', label: 'Validate Lead', icon: '📋' },
    { key: 'conversion_path', label: 'Choose Path', icon: '🔄' },
    { key: 'account_creation', label: 'Account Setup', icon: '🏢' },
    { key: 'contact_creation', label: 'Add Contacts', icon: '👥' },
    { key: 'task_template', label: 'Follow-up Tasks', icon: '✅' },
    { key: 'success', label: 'Complete', icon: '🎉' }
  ];

  const getCurrentStepIndex = () => {
    return stepOrder?.findIndex(step => step?.key === currentStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full">
      {/* Mobile Progress Bar */}
      <div className="md:hidden mb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentIndex + 1} of {stepOrder?.length}</span>
          <span>{Math.round(((currentIndex + 1) / stepOrder?.length) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / stepOrder?.length) * 100}%` }}
          ></div>
        </div>
        <div className="mt-2 text-center">
          <span className="text-sm font-medium text-foreground">
            {stepOrder?.[currentIndex]?.icon} {stepOrder?.[currentIndex]?.label}
          </span>
        </div>
      </div>
      {/* Desktop Progress Steps */}
      <div className="hidden md:flex items-center justify-between">
        {stepOrder?.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step?.key}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                    {
                      'bg-primary border-primary text-primary-foreground': isCompleted,
                      'bg-background border-primary text-primary ring-2 ring-primary/20': isCurrent,
                      'bg-background border-muted text-muted-foreground': isUpcoming
                    }
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm">{step?.icon}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      'text-xs font-medium',
                      {
                        'text-primary': isCompleted || isCurrent,
                        'text-muted-foreground': isUpcoming
                      }
                    )}
                  >
                    {step?.label}
                  </div>
                </div>
              </div>
              {index < stepOrder?.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-all duration-200',
                    {
                      'bg-primary': index < currentIndex,
                      'bg-muted': index >= currentIndex
                    }
                  )}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;