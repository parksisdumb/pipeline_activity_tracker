import React from 'react';
import { Filter, X } from 'lucide-react';

const FilterToolbar = ({ 
  filters, 
  onFilterChange, 
  accounts = [], 
  properties = [], 
  teamMembers = [],
  opportunityTypes = [],
  opportunityStages = []
}) => {
  const handleFilterChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      stage: '',
      opportunity_type: '',
      account_id: '',
      property_id: '',
      assigned_to: '',
      min_bid_value: '',
      max_bid_value: ''
    });
  };

  const hasActiveFilters = filters?.stage || filters?.opportunity_type || 
    filters?.account_id || filters?.property_id || filters?.assigned_to ||
    filters?.min_bid_value || filters?.max_bid_value;

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Filter className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </button>
        )}
      </div>
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Opportunity Type Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
            value={filters?.opportunity_type || ''}
            onChange={(e) => handleFilterChange('opportunity_type', e?.target?.value)}
          >
            <option value="">All Types</option>
            {opportunityTypes?.map(type => (
              <option key={type?.value} value={type?.value}>
                {type?.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stage Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
          <select
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
            value={filters?.stage || ''}
            onChange={(e) => handleFilterChange('stage', e?.target?.value)}
          >
            <option value="">All Stages</option>
            {opportunityStages?.map(stage => (
              <option key={stage?.value} value={stage?.value}>
                {stage?.label}
              </option>
            ))}
          </select>
        </div>

        {/* Account Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
          <select
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
            value={filters?.account_id || ''}
            onChange={(e) => handleFilterChange('account_id', e?.target?.value)}
          >
            <option value="">All Accounts</option>
            {accounts?.map(account => (
              <option key={account?.id} value={account?.id}>
                {account?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Property Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Property</label>
          <select
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
            value={filters?.property_id || ''}
            onChange={(e) => handleFilterChange('property_id', e?.target?.value)}
          >
            <option value="">All Properties</option>
            {properties?.map(property => (
              <option key={property?.id} value={property?.id}>
                {property?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned To Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
          <select
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
            value={filters?.assigned_to || ''}
            onChange={(e) => handleFilterChange('assigned_to', e?.target?.value)}
          >
            <option value="">All Team Members</option>
            {teamMembers?.map(member => (
              <option key={member?.id} value={member?.id}>
                {member?.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Bid Value Range */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Bid Value Range</label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters?.min_bid_value || ''}
              onChange={(e) => handleFilterChange('min_bid_value', e?.target?.value)}
            />
            <input
              type="number"
              placeholder="Max"
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters?.max_bid_value || ''}
              onChange={(e) => handleFilterChange('max_bid_value', e?.target?.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterToolbar;