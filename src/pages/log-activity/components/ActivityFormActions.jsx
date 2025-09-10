import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const ActivityFormActions = ({ 
  onSave, 
  onSaveAndNew, 
  onCancel, 
  isLoading = false, 
  disabled = false,
  showSaveAndNew = true 
}) => {
  return (
    <div className="space-y-3">
      {/* Primary Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onSave}
          disabled={disabled}
          loading={isLoading}
          iconName="Check"
          iconPosition="left"
          className="flex-1 sm:flex-none sm:min-w-[120px]"
        >
          Save Activity
        </Button>
        
        {showSaveAndNew && (
          <Button
            variant="outline"
            onClick={onSaveAndNew}
            disabled={disabled || isLoading}
            iconName="Plus"
            iconPosition="left"
            className="flex-1 sm:flex-none sm:min-w-[140px]"
          >
            Save & Log Another
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          iconName="X"
          iconPosition="left"
          className="text-muted-foreground"
        >
          Cancel
        </Button>
      </div>

      {/* Quick Tips */}
      <div className="bg-muted rounded-lg p-3 mt-4">
        <div className="flex items-start space-x-2">
          <Icon name="Lightbulb" size={16} className="text-warning mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Quick Tips:</p>
            <ul className="space-y-1">
              <li>• Use "Save & Log Another" for rapid successive entries</li>
              <li>• Create new entities on-the-fly if they don't exist</li>
              <li>• Notes and outcomes are optional but helpful for tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityFormActions;