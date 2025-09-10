import React, { useState } from 'react';
import Button from '../../../components/ui/Button';

import Icon from '../../../components/AppIcon';

const StageManagement = ({ currentStage, lastAssessment, onStageUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const propertyStages = [
    'Unassessed',
    'Assessment Scheduled', 
    'Assessed',
    'Proposal Sent',
    'In Negotiation',
    'Won',
    'Lost'
  ];

  const getStageColor = (stage) => {
    const colors = {
      'Unassessed': 'bg-slate-100 text-slate-700 border-slate-200',
      'Assessment Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
      'Assessed': 'bg-green-100 text-green-700 border-green-200',
      'Proposal Sent': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'In Negotiation': 'bg-orange-100 text-orange-700 border-orange-200',
      'Won': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Lost': 'bg-red-100 text-red-700 border-red-200'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getNextStages = (current) => {
    const stageIndex = propertyStages?.indexOf(current);
    if (stageIndex === -1) return propertyStages;

    // Allow moving to any subsequent stage or changing outcome
    return propertyStages?.filter((stage, index) => 
      index > stageIndex || stage === 'Won' || stage === 'Lost'
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never assessed';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStageUpdate = async (newStage) => {
    if (newStage === currentStage || isUpdating) return;

    setIsUpdating(true);
    try {
      await onStageUpdate?.(newStage);
    } finally {
      setIsUpdating(false);
    }
  };

  const nextStages = getNextStages(currentStage);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Stage Management</h3>
        <Icon name="TrendingUp" size={20} className="text-muted-foreground" />
      </div>
      
      <div className="space-y-4">
        {/* Current Stage */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Stage</h4>
          <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border ${getStageColor(currentStage)}`}>
            <Icon name="CheckCircle" size={16} className="mr-2" />
            {currentStage}
          </div>
        </div>

        {/* Last Assessment */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Last Assessment</h4>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Icon name="Calendar" size={16} className="text-muted-foreground" />
            {formatDate(lastAssessment)}
          </div>
        </div>

        {/* Stage Update */}
        {nextStages?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Update Stage</h4>
            <div className="flex flex-wrap gap-2">
              {nextStages?.map((stage) => (
                <Button
                  key={stage}
                  variant={stage === currentStage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStageUpdate(stage)}
                  disabled={isUpdating || stage === currentStage}
                  className="text-xs"
                >
                  {isUpdating ? (
                    <Icon name="Loader2" size={12} className="animate-spin mr-1" />
                  ) : (
                    <Icon name="ArrowRight" size={12} className="mr-1" />
                  )}
                  {stage}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Property stages help track assessment and sales progress. 
            Update the stage as you move through the sales process.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageManagement;