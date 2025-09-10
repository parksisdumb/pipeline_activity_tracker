import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const ViewOptions = ({
  viewMode,
  onViewModeChange,
  sortConfig,
  onSortChange,
  showInactive,
  onToggleInactive,
  onRefresh,
  isRefreshing = false
}) => {
  const viewModeOptions = [
    { value: 'table', label: 'Table View', icon: 'Table' },
    { value: 'grid', label: 'Grid View', icon: 'Grid3X3' },
    { value: 'list', label: 'List View', icon: 'List' }
  ];

  const sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'lastActivity-desc', label: 'Recent Activity' },
    { value: 'lastActivity-asc', label: 'Oldest Activity' },
    { value: 'stage-asc', label: 'Stage (A-Z)' },
    { value: 'companyType-asc', label: 'Company Type (A-Z)' }
  ];

  const getCurrentSortValue = () => {
    if (!sortConfig?.key) return '';
    return `${sortConfig?.key}-${sortConfig?.direction}`;
  };

  const handleSortChange = (value) => {
    if (!value) return;
    const [key, direction] = value?.split('-');
    onSortChange({ key, direction });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left side - View mode and sort */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* View mode toggle - Desktop only */}
          <div className="hidden md:flex items-center bg-muted rounded-lg p-1">
            {viewModeOptions?.map((option) => (
              <Button
                key={option?.value}
                variant={viewMode === option?.value ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange(option?.value)}
                className="px-3"
                title={option?.label}
              >
                <Icon name={option?.icon} size={16} />
              </Button>
            ))}
          </div>

          {/* Sort dropdown */}
          <Select
            placeholder="Sort by..."
            options={sortOptions}
            value={getCurrentSortValue()}
            onChange={handleSortChange}
            className="w-48"
          />
        </div>

        {/* Right side - Options and actions */}
        <div className="flex items-center space-x-3">
          {/* Show inactive toggle */}
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={onToggleInactive}
            iconName={showInactive ? "EyeOff" : "Eye"}
            iconPosition="left"
            className="hidden sm:flex"
          >
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </Button>

          {/* Mobile show inactive toggle */}
          <Button
            variant={showInactive ? "default" : "outline"}
            size="icon"
            onClick={onToggleInactive}
            className="sm:hidden w-8 h-8"
            title={showInactive ? 'Hide Inactive' : 'Show Inactive'}
          >
            <Icon name={showInactive ? "EyeOff" : "Eye"} size={14} />
          </Button>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            loading={isRefreshing}
            iconName="RefreshCw"
            iconPosition="left"
            className="hidden sm:flex"
          >
            Refresh
          </Button>

          {/* Mobile refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            loading={isRefreshing}
            className="sm:hidden w-8 h-8"
            title="Refresh"
          >
            <Icon name="RefreshCw" size={14} />
          </Button>

          {/* Column settings - Desktop only */}
          <Button
            variant="outline"
            size="sm"
            iconName="Settings"
            iconPosition="left"
            className="hidden lg:flex"
            onClick={() => console.log('Column settings')}
          >
            Columns
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewOptions;