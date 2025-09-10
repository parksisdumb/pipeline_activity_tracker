import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const StageManagement = ({ currentStage, lastInteraction, onStageUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const stages = [
    {
      name: 'Identified',
      description: 'Contact identified and added to pipeline',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: 'Eye'
    },
    {
      name: 'Reached',
      description: 'Initial contact made',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: 'MessageSquare'
    },
    {
      name: 'DM Confirmed',
      description: 'Decision maker confirmed and engaged',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: 'UserCheck'
    },
    {
      name: 'Engaged',
      description: 'Actively discussing opportunities',
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: 'Handshake'
    },
    {
      name: 'Dormant',
      description: 'No recent activity or response',
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: 'Clock'
    }
  ];

  const currentStageIndex = stages?.findIndex(stage => stage?.name === currentStage);
  const currentStageData = stages?.[currentStageIndex];

  const handleStageUpdate = async (newStage) => {
    setIsUpdating(true);
    try {
      await onStageUpdate(newStage);
    } catch (error) {
      console.error('Failed to update stage:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTimeSinceLastInteraction = (date) => {
    const now = new Date();
    const lastInt = new Date(date);
    const diffInDays = Math.floor((now - lastInt) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <div className="bg-card rounded-lg border border-border elevation-1">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Stage Management</h3>
          <Button
            variant="ghost"
            size="icon"
            title="Stage progression analytics"
          >
            <Icon name="TrendingUp" size={16} />
          </Button>
        </div>

        {/* Current Stage Display */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${currentStageData?.color}`}>
              <Icon name={currentStageData?.icon} size={16} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{currentStage}</h4>
              <p className="text-xs text-muted-foreground">{currentStageData?.description}</p>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Last interaction: {formatTimeSinceLastInteraction(lastInteraction)}
          </div>
        </div>

        {/* Stage Progress Visualization */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {stages?.slice(0, 4)?.map((stage, index) => {
              const isActive = stage?.name === currentStage;
              const isPassed = index < currentStageIndex && currentStageIndex < 4;
              
              return (
                <div key={stage?.name} className="flex flex-col items-center flex-1">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isActive ? currentStageData?.color :
                    isPassed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'
                  }`}>
                    <Icon name={stage?.icon} size={12} />
                  </div>
                  <span className={`text-xs mt-1 ${
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {stage?.name}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Progress Line */}
          <div className="relative h-1 bg-gray-200 rounded-full mx-3">
            <div 
              className="absolute top-0 left-0 h-full bg-green-400 rounded-full transition-all duration-500"
              style={{ width: currentStageIndex < 4 ? `${(currentStageIndex / 3) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Stage Update Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground mb-3">Update Stage</h4>
          
          <div className="grid grid-cols-1 gap-2">
            {stages?.map((stage) => {
              const isCurrentStage = stage?.name === currentStage;
              
              return (
                <button
                  key={stage?.name}
                  onClick={() => !isCurrentStage && handleStageUpdate(stage?.name)}
                  disabled={isCurrentStage || isUpdating}
                  className={`flex items-center space-x-3 p-3 rounded-lg border text-left transition-all ${
                    isCurrentStage 
                      ? `${stage?.color} cursor-default` 
                      : 'border-border hover:bg-muted/50 cursor-pointer'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon name={stage?.icon} size={16} className={isCurrentStage ? '' : 'text-muted-foreground'} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCurrentStage ? '' : 'text-foreground'}`}>
                      {stage?.name}
                      {isCurrentStage && ' (Current)'}
                    </p>
                    <p className={`text-xs ${isCurrentStage ? '' : 'text-muted-foreground'}`}>
                      {stage?.description}
                    </p>
                  </div>
                  {!isCurrentStage && (
                    <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Analytics Hint */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <Icon name="Info" size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Stage Tracking</p>
              <p>All stage changes are automatically logged with timestamps for progress analytics and reporting.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageManagement;