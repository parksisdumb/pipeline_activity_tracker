import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ContactsFilters = ({ 
  filters, 
  onFiltersChange, 
  totalCount, 
  filteredCount,
  onExport,
  onBulkAction 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'Property Manager', label: 'Property Manager' },
    { value: 'Facility Manager', label: 'Facility Manager' },
    { value: 'Building Owner', label: 'Building Owner' },
    { value: 'Asset Manager', label: 'Asset Manager' },
    { value: 'General Contractor', label: 'General Contractor' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Maintenance Director', label: 'Maintenance Director' },
    { value: 'Operations Manager', label: 'Operations Manager' },
    { value: 'Regional Manager', label: 'Regional Manager' },
    { value: 'VP of Operations', label: 'VP of Operations' },
    { value: 'CEO/President', label: 'CEO/President' },
    { value: 'CFO', label: 'CFO' },
    { value: 'Other', label: 'Other' }
  ];

  const stageOptions = [
    { value: '', label: 'All Stages' },
    { value: 'Identified', label: 'Identified' },
    { value: 'Reached', label: 'Reached' },
    { value: 'DM Confirmed', label: 'DM Confirmed' },
    { value: 'Engaged', label: 'Engaged' },
    { value: 'Dormant', label: 'Dormant' }
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      role: '',
      stage: '',
      account: '',
      property: ''
    });
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      {/* Search and Quick Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search contacts by name, email, or phone..."
            value={filters?.search}
            onChange={(e) => handleFilterChange('search', e?.target?.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            options={stageOptions}
            value={filters?.stage}
            onChange={(value) => handleFilterChange('stage', value)}
            placeholder="Filter by stage"
            className="w-40"
          />
          
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            iconPosition="right"
          >
            More Filters
          </Button>
        </div>
      </div>
      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
          <Select
            label="Role/Title"
            options={roleOptions}
            value={filters?.role}
            onChange={(value) => handleFilterChange('role', value)}
            searchable
          />
          
          <Input
            label="Account"
            type="text"
            placeholder="Filter by account name"
            value={filters?.account}
            onChange={(e) => handleFilterChange('account', e?.target?.value)}
          />
          
          <Input
            label="Property"
            type="text"
            placeholder="Filter by property name"
            value={filters?.property}
            onChange={(e) => handleFilterChange('property', e?.target?.value)}
          />
        </div>
      )}
      {/* Results Summary and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Showing {filteredCount?.toLocaleString()} of {totalCount?.toLocaleString()} contacts
          </span>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              iconName="X"
              iconPosition="left"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            iconName="Download"
            iconPosition="left"
          >
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('email')}
            iconName="Mail"
            iconPosition="left"
          >
            Bulk Email
          </Button>
        </div>
      </div>
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filters?.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md text-xs">
              Search: "{filters?.search}"
              <button
                onClick={() => handleFilterChange('search', '')}
                className="hover:bg-accent/20 rounded-full p-0.5"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          )}
          {filters?.stage && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md text-xs">
              Stage: {filters?.stage}
              <button
                onClick={() => handleFilterChange('stage', '')}
                className="hover:bg-accent/20 rounded-full p-0.5"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          )}
          {filters?.role && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md text-xs">
              Role: {filters?.role}
              <button
                onClick={() => handleFilterChange('role', '')}
                className="hover:bg-accent/20 rounded-full p-0.5"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          )}
          {filters?.account && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md text-xs">
              Account: {filters?.account}
              <button
                onClick={() => handleFilterChange('account', '')}
                className="hover:bg-accent/20 rounded-full p-0.5"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          )}
          {filters?.property && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md text-xs">
              Property: {filters?.property}
              <button
                onClick={() => handleFilterChange('property', '')}
                className="hover:bg-accent/20 rounded-full p-0.5"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactsFilters;