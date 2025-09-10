import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const BulkActions = ({
  selectedCount,
  onBulkStageUpdate,
  onBulkExport,
  onBulkDelete,
  onClearSelection
}) => {
  const [bulkStage, setBulkStage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const stageOptions = [
    { value: 'Unassessed', label: 'Unassessed' },
    { value: 'Assessed', label: 'Assessed' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'In Negotiation', label: 'In Negotiation' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' }
  ];

  const handleStageUpdate = async () => {
    if (!bulkStage) return;
    
    setIsUpdating(true);
    try {
      await onBulkStageUpdate(bulkStage);
      setBulkStage('');
    } finally {
      setIsUpdating(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Icon name="CheckSquare" size={20} className="text-accent" />
          <span className="font-medium text-foreground">
            {selectedCount} {selectedCount === 1 ? 'property' : 'properties'} selected
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
          {/* Stage Update */}
          <div className="flex items-center space-x-2">
            <Select
              placeholder="Update stage..."
              options={stageOptions}
              value={bulkStage}
              onChange={setBulkStage}
              className="min-w-40"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleStageUpdate}
              disabled={!bulkStage || isUpdating}
              loading={isUpdating}
              iconName="RefreshCw"
              iconPosition="left"
            >
              Update
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkExport}
              iconName="Download"
              iconPosition="left"
            >
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onBulkDelete}
              iconName="Trash2"
              iconPosition="left"
              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
            >
              Delete
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              iconName="X"
              iconPosition="left"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;