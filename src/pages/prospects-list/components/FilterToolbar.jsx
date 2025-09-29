import React, { useState } from 'react';
import { Search, Filter, MapPin, Building2, User, ExternalLink } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const FilterToolbar = ({ filters, onFilterChange, users }) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const statusOptions = [
    { value: 'uncontacted', label: 'Uncontacted' },
    { value: 'researching', label: 'Researching' },
    { value: 'attempted', label: 'Attempted' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'disqualified', label: 'Disqualified' }
  ];

  const companyTypeOptions = [
    { value: 'Property Management', label: 'Property Management' },
    { value: 'General Contractor', label: 'General Contractor' },
    { value: 'Developer', label: 'Developer' },
    { value: 'REIT/Institutional Investor', label: 'REIT/Institutional' },
    { value: 'Asset Manager', label: 'Asset Manager' },
    { value: 'Building Owner', label: 'Building Owner' },
    { value: 'Facility Manager', label: 'Facility Manager' }
  ];

  const sourceOptions = [
    { value: 'Web Research', label: 'Web Research' },
    { value: 'Trade Show', label: 'Trade Show' },
    { value: 'Referral', label: 'Referral' },
    { value: 'Cold Outreach', label: 'Cold Outreach' },
    { value: 'Event', label: 'Event' },
    { value: 'List Import', label: 'List Import' }
  ];

  const handleStatusChange = (status, isChecked) => {
    const currentStatus = filters?.status || [];
    let newStatus;
    
    if (isChecked) {
      newStatus = [...currentStatus, status];
    } else {
      newStatus = currentStatus?.filter(s => s !== status);
    }
    
    onFilterChange?.('status', newStatus);
  };

  const clearFilters = () => {
    onFilterChange?.('status', ['uncontacted']);
    onFilterChange?.('min_icp_score', 70);
    onFilterChange?.('search', '');
    onFilterChange?.('state', '');
    onFilterChange?.('city', '');
    onFilterChange?.('company_type', '');
    onFilterChange?.('assigned_to', '');
    onFilterChange?.('source', '');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Main Filter Row */}
      <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search prospects by name or domain..."
              value={filters?.search || ''}
              onChange={(e) => onFilterChange?.('search', e?.target?.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Multi-Select */}
        <div className="min-w-[200px]">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</div>
          <div className="flex flex-wrap gap-2">
            {statusOptions?.map((option) => (
              <label key={option?.value} className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={filters?.status?.includes(option?.value)}
                  onChange={(e) => handleStatusChange(option?.value, e?.target?.checked)}
                  className="rounded border-gray-300 mr-1"
                />
                <span className="text-gray-700">{option?.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ICP Score Filter */}
        <div className="min-w-[120px]">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Min ICP Score</div>
          <Input
            type="number"
            placeholder="70"
            value={filters?.min_icp_score || ''}
            onChange={(e) => onFilterChange?.('min_icp_score', e?.target?.value ? parseInt(e?.target?.value) : null)}
            min="0"
            max="100"
          />
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="border-gray-300"
        >
          <Filter className="w-4 h-4 mr-2" />
          {showAdvancedFilters ? 'Hide' : 'More'} Filters
        </Button>

        {/* Clear Filters */}
        <Button
          variant="ghost"
          onClick={clearFilters}
          className="text-gray-600 hover:text-gray-800"
        >
          Clear
        </Button>
      </div>
      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* State Filter */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                State
              </div>
              <Input
                placeholder="e.g., CA, TX, NY"
                value={filters?.state || ''}
                onChange={(e) => onFilterChange?.('state', e?.target?.value)}
              />
            </div>

            {/* City Filter */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                City
              </div>
              <Input
                placeholder="e.g., Los Angeles"
                value={filters?.city || ''}
                onChange={(e) => onFilterChange?.('city', e?.target?.value)}
              />
            </div>

            {/* Company Type Filter */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                <Building2 className="w-3 h-3 mr-1" />
                Company Type
              </div>
              <Select
                value={filters?.company_type || ''}
                onChange={(e) => onFilterChange?.('company_type', e?.target?.value)}
                onSearchChange={() => {}}
                error=""
                id="company_type"
                onOpenChange={() => {}}
                name="company_type"
                description=""
                label=""
              >
                <option value="">All Types</option>
                {companyTypeOptions?.map((option) => (
                  <option key={option?.value} value={option?.value}>
                    {option?.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Assigned To Filter */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                <User className="w-3 h-3 mr-1" />
                Assigned To
              </div>
              <Select
                value={filters?.assigned_to || ''}
                onChange={(e) => onFilterChange?.('assigned_to', e?.target?.value)}
                onSearchChange={() => {}}
                error=""
                id="assigned_to"
                onOpenChange={() => {}}
                name="assigned_to"
                description=""
                label=""
              >
                <option value="">All Assignments</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to Me</option>
                {users?.filter(user => user?.role === 'rep' || user?.role === 'manager')?.map((user) => (
                  <option key={user?.id} value={user?.id}>
                    {user?.full_name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Source Filter */}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center">
                <ExternalLink className="w-3 h-3 mr-1" />
                Source
              </div>
              <Select
                value={filters?.source || ''}
                onChange={(e) => onFilterChange?.('source', e?.target?.value)}
                onSearchChange={() => {}}
                error=""
                id="source"
                onOpenChange={() => {}}
                name="source"
                description=""
                label=""
              >
                <option value="">All Sources</option>
                {sourceOptions?.map((option) => (
                  <option key={option?.value} value={option?.value}>
                    {option?.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterToolbar;