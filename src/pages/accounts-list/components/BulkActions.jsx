import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const BulkActions = ({ 
  selectedAccounts, 
  onBulkAction, 
  onClearSelection 
}) => {
  const [bulkActionType, setBulkActionType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const bulkActionOptions = [
    { value: '', label: 'Choose action...' },
    { value: 'update-stage', label: 'Update Stage' },
    { value: 'assign-rep', label: 'Assign Representative' },
    { value: 'export', label: 'Export Selected' },
    { value: 'delete', label: 'Delete Selected' }
  ];

  const stageOptions = [
    { value: 'Prospect', label: 'Prospect' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Assessment Scheduled', label: 'Assessment Scheduled' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' }
  ];

  const repOptions = [
    { value: 'John Smith', label: 'John Smith' },
    { value: 'Sarah Johnson', label: 'Sarah Johnson' },
    { value: 'Mike Davis', label: 'Mike Davis' },
    { value: 'Lisa Chen', label: 'Lisa Chen' },
    { value: 'David Wilson', label: 'David Wilson' }
  ];

  const handleBulkAction = async (actionValue) => {
    if (!actionValue || selectedAccounts?.length === 0) return;

    setIsProcessing(true);
    try {
      await onBulkAction(bulkActionType, actionValue, selectedAccounts);
      setBulkActionType('');
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    // Mock export functionality
    const csvContent = "data:text/csv;charset=utf-8," + "Account Name,Company Type,Stage,Assigned Rep,Last Activity\n" +
      selectedAccounts?.map(id => `Account ${id},Property Management,Qualified,John Smith,2025-01-15`)?.join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link?.setAttribute("href", encodedUri);
    link?.setAttribute("download", `accounts_export_${new Date()?.toISOString()?.split('T')?.[0]}.csv`);
    document.body?.appendChild(link);
    link?.click();
    document.body?.removeChild(link);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedAccounts?.length} selected accounts? This action cannot be undone.`)) {
      onBulkAction('delete', null, selectedAccounts);
    }
  };

  if (selectedAccounts?.length === 0) return null;

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <Icon name="Check" size={16} color="var(--color-accent-foreground)" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {selectedAccounts?.length} account{selectedAccounts?.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-muted-foreground">
              Choose an action to apply to selected accounts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            iconName="X"
            iconPosition="left"
          >
            Clear Selection
          </Button>

          <div className="flex items-center space-x-2">
            <Select
              placeholder="Bulk actions"
              options={bulkActionOptions}
              value={bulkActionType}
              onChange={setBulkActionType}
              className="w-40"
            />

            {bulkActionType === 'update-stage' && (
              <Select
                placeholder="Select stage"
                options={stageOptions}
                value=""
                onChange={(value) => handleBulkAction(value)}
                className="w-40"
              />
            )}

            {bulkActionType === 'assign-rep' && (
              <Select
                placeholder="Select rep"
                options={repOptions}
                value=""
                onChange={(value) => handleBulkAction(value)}
                className="w-40"
                searchable
              />
            )}

            {bulkActionType === 'export' && (
              <Button
                size="sm"
                onClick={handleExport}
                loading={isProcessing}
                iconName="Download"
                iconPosition="left"
              >
                Export CSV
              </Button>
            )}

            {bulkActionType === 'delete' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                loading={isProcessing}
                iconName="Trash2"
                iconPosition="left"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;