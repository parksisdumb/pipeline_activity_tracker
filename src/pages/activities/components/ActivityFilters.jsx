import React from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ActivityFilters = ({
  searchTerm,
  onSearchChange,
  activityTypeFilter,
  onActivityTypeChange,
  outcomeFilter,
  onOutcomeChange,
  dateRangeFilter,
  onDateRangeChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
  onClearFilters,
  activitiesCount = 0,
  totalCount = 0
}) => {
  const activityTypeOptions = [
    { value: '', label: 'All Activity Types' },
    { value: 'Phone Call', label: 'Phone Call' },
    { value: 'Email', label: 'Email' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Site Visit', label: 'Site Visit' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'Follow-up', label: 'Follow-up' },
    { value: 'Assessment', label: 'Assessment' },
    { value: 'Contract Signed', label: 'Contract Signed' }
  ];

  const outcomeOptions = [
    { value: '', label: 'All Outcomes' },
    { value: 'Successful', label: 'Successful' },
    { value: 'No Answer', label: 'No Answer' },
    { value: 'Callback Requested', label: 'Callback Requested' },
    { value: 'Not Interested', label: 'Not Interested' },
    { value: 'Interested', label: 'Interested' },
    { value: 'Proposal Requested', label: 'Proposal Requested' },
    { value: 'Meeting Scheduled', label: 'Meeting Scheduled' },
    { value: 'Contract Signed', label: 'Contract Signed' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder="Search activities..."
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e?.target?.value)}
          iconName="Search"
          iconPosition="left"
        />
        
        <Select
          placeholder="Activity Type"
          options={activityTypeOptions}
          value={activityTypeFilter}
          onChange={onActivityTypeChange}
          clearable
        />
        
        <Select
          placeholder="Outcome"
          options={outcomeOptions}
          value={outcomeFilter}
          onChange={onOutcomeChange}
          clearable
        />

        <Select
          placeholder="Date Range"
          options={dateRangeOptions}
          value={dateRangeFilter}
          onChange={onDateRangeChange}
        />
      </div>

      {/* Custom Date Range */}
      {dateRangeFilter === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="From Date"
            type="date"
            value={customDateFrom}
            onChange={(e) => onCustomDateFromChange?.(e?.target?.value)}
          />
          <Input
            label="To Date"
            type="date"
            value={customDateTo}
            onChange={(e) => onCustomDateToChange?.(e?.target?.value)}
          />
        </div>
      )}

      {/* Filter Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {activitiesCount} of {totalCount} activities
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          iconName="X"
          iconPosition="left"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default ActivityFilters;