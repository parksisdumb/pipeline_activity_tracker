import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { usersService } from '../../../services/usersService';

const FilterToolbar = ({
  searchTerm,
  onSearchChange,
  companyTypeFilter,
  onCompanyTypeChange,
  stageFilter,
  onStageChange,
  assignedRepFilter,
  onAssignedRepChange,
  onClearFilters,
  resultsCount,
  totalCount
}) => {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Load users for assigned rep filter
  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      const result = await usersService?.getActiveUsers();
      
      if (result?.success) {
        setUsers(result?.data || []);
      } else {
        console.error('Failed to load users:', result?.error);
        setUsers([]);
      }
      setUsersLoading(false);
    };

    loadUsers();
  }, []);

  const companyTypeOptions = [
    { value: '', label: 'All Company Types' },
    { value: 'Property Management', label: 'Property Management' },
    { value: 'General Contractor', label: 'General Contractor' },
    { value: 'Developer', label: 'Developer' },
    { value: 'REIT/Institutional Investor', label: 'REIT/Institutional Investor' },
    { value: 'Asset Manager', label: 'Asset Manager' },
    { value: 'Building Owner', label: 'Building Owner' },
    { value: 'Facility Manager', label: 'Facility Manager' },
    { value: 'Roofing Contractor', label: 'Roofing Contractor' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Architecture/Engineering', label: 'Architecture/Engineering' },
    { value: 'Other', label: 'Other' }
  ];

  const stageOptions = [
    { value: '', label: 'All Stages' },
    { value: 'Prospect', label: 'Prospect' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Vendor Packet Request', label: 'Vendor Packet Request' },
    { value: 'Vendor Packet Submitted', label: 'Vendor Packet Submitted' },
    { value: 'Approved for Work', label: 'Approved for Work' },
    { value: 'Actively Engaged', label: 'Actively Engaged' }
  ];

  // Build assigned rep options from real user data
  const assignedRepOptions = [
    { value: '', label: 'All Representatives' },
    ...users?.map(user => ({
      value: user?.id,
      label: user?.full_name
    }))
  ];

  // Find the selected user's name for display
  const selectedUserName = users?.find(user => user?.id === assignedRepFilter)?.full_name || assignedRepFilter;

  const hasActiveFilters = companyTypeFilter || stageFilter || assignedRepFilter || searchTerm;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* Search and Results Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e?.target?.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Showing {resultsCount?.toLocaleString()} of {totalCount?.toLocaleString()} accounts
          </span>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              iconName="X"
              iconPosition="left"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Select
          ref={null}
          placeholder="Filter by company type"
          options={companyTypeOptions}
          value={companyTypeFilter}
          onChange={onCompanyTypeChange}
          searchable
          onSearchChange={() => {}}
          error=""
          id="company-type-filter"
          onOpenChange={() => {}}
          label=""
          name="companyType"
          description=""
        />
        
        <Select
          ref={null}
          placeholder="Filter by stage"
          options={stageOptions}
          value={stageFilter}
          onChange={onStageChange}
          onSearchChange={() => {}}
          error=""
          id="stage-filter"
          onOpenChange={() => {}}
          label=""
          name="stage"
          description=""
        />
        
        <Select
          ref={null}
          placeholder={usersLoading ? "Loading representatives..." : "Filter by representative"}
          options={assignedRepOptions}
          value={assignedRepFilter}
          onChange={onAssignedRepChange}
          searchable
          disabled={usersLoading}
          onSearchChange={() => {}}
          error=""
          id="assigned-rep-filter"
          onOpenChange={() => {}}
          label=""
          name="assignedRep"
          description=""
        />
      </div>
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchTerm && (
            <div className="inline-flex items-center bg-accent/10 text-accent px-2 py-1 rounded-md text-sm">
              <Icon name="Search" size={12} className="mr-1" />
              Search: "{searchTerm}"
              <button
                onClick={() => onSearchChange('')}
                className="ml-2 hover:text-accent-foreground"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          )}
          {companyTypeFilter && (
            <div className="inline-flex items-center bg-accent/10 text-accent px-2 py-1 rounded-md text-sm">
              <Icon name="Building2" size={12} className="mr-1" />
              {companyTypeFilter}
              <button
                onClick={() => onCompanyTypeChange('')}
                className="ml-2 hover:text-accent-foreground"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          )}
          {stageFilter && (
            <div className="inline-flex items-center bg-accent/10 text-accent px-2 py-1 rounded-md text-sm">
              <Icon name="Target" size={12} className="mr-1" />
              {stageFilter}
              <button
                onClick={() => onStageChange('')}
                className="ml-2 hover:text-accent-foreground"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          )}
          {assignedRepFilter && (
            <div className="inline-flex items-center bg-accent/10 text-accent px-2 py-1 rounded-md text-sm">
              <Icon name="User" size={12} className="mr-1" />
              {selectedUserName}
              <button
                onClick={() => onAssignedRepChange('')}
                className="ml-2 hover:text-accent-foreground"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterToolbar;