import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const QuickActions = ({ property, onActivityLog, onScheduleAssessment }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <Icon name="Zap" size={20} className="text-muted-foreground" />
      </div>
      
      <div className="space-y-3">
        {/* Schedule Assessment */}
        <Button
          onClick={onScheduleAssessment}
          iconName="Calendar"
          iconPosition="left"
          className="w-full justify-start"
        >
          Schedule Assessment
        </Button>

        {/* Log Activity */}
        <Button
          variant="outline"
          onClick={onActivityLog}
          iconName="Plus"
          iconPosition="left" 
          className="w-full justify-start"
        >
          Log Activity
        </Button>

        {/* Property Address Link */}
        {property?.address && (
          <Button
            variant="ghost"
            onClick={() => {
              const query = encodeURIComponent(`${property?.address}${property?.city ? `, ${property?.city}` : ''}${property?.state ? `, ${property?.state}` : ''}`);
              window.open(`https://www.google.com/maps/search/${query}`, '_blank');
            }}
            iconName="MapPin"
            iconPosition="left"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            View on Map
          </Button>
        )}

        {/* Property Info */}
        <div className="pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Use these actions to quickly manage property activities and assessments.</div>
            {property?.stage === 'Unassessed' && (
              <div className="text-amber-600 bg-amber-50 p-2 rounded-md mt-2">
                💡 This property hasn't been assessed yet. Consider scheduling an assessment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;