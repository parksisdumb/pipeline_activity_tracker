import React, { useState, useEffect } from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

export default function FiltersBar({ filters = {}, onFiltersChange, leadCount = 0, loading = false }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onFiltersChange?.(localFilters);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [localFilters?.search]); // Only debounce search

  // Immediate updates for other filters
  useEffect(() => {
    if (searchTimeout) return; // Don't update immediately if search is pending
    onFiltersChange?.(localFilters);
  }, [localFilters?.status, localFilters?.condition, localFilters?.tags, localFilters?.scoreRange]);

  const handleFilterChange = (key, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    const resetValues = {
      search: '',
      status: '',
      condition: '',
      tags: [],
      scoreRange: [1, 5]
    };
    setLocalFilters(resetValues);
    onFiltersChange?.(resetValues);
  };

  const hasActiveFilters = () => {
    return (localFilters?.search ||
    localFilters?.status ||
    localFilters?.condition ||
    localFilters?.tags?.length > 0 || (localFilters?.scoreRange?.[0] !== 1 || localFilters?.scoreRange?.[1] !== 5));
  };

  const conditionOptions = [
    { value: '', label: 'All Conditions' },
    { value: 'dirty', label: 'Dirty' },
    { value: 'aged', label: 'Aged' },
    { value: 'patched', label: 'Patched' },
    { value: 'ponding', label: 'Ponding' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'assessed', label: 'Assessed' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'converted', label: 'Converted' },
    { value: 'rejected', label: 'Rejected' }
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        {/* Left side - Search and basic filters */}
        <div className="flex items-center space-x-4 flex-1">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search leads..."
              value={localFilters?.search || ''}
              onChange={(e) => handleFilterChange('search', e?.target?.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={localFilters?.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-40"
          >
            {statusOptions?.map(option => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </Select>

          {/* Condition Filter */}
          <Select
            value={localFilters?.condition || ''}
            onChange={(e) => handleFilterChange('condition', e.target.value)}
            className="w-40"
          >
            {conditionOptions?.map(option => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </Select>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={showAdvanced ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Advanced
          </Button>
        </div>

        {/* Right side - Results and reset */}
        <div className="flex items-center space-x-4">
          {/* Results count */}
          <div className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                Loading...
              </span>
            ) : (
              <span>{leadCount} leads found</span>
            )}
          </div>

          {/* Reset filters */}
          {hasActiveFilters() && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>
      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition Score Range
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={localFilters?.scoreRange?.[0] || 1}
                  onChange={(e) => handleFilterChange('scoreRange', [
                    parseInt(e?.target?.value),
                    localFilters?.scoreRange?.[1] || 5
                  ])}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 min-w-[3rem]">
                  {localFilters?.scoreRange?.[0] || 1} - {localFilters?.scoreRange?.[1] || 5}
                </span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={localFilters?.scoreRange?.[1] || 5}
                  onChange={(e) => handleFilterChange('scoreRange', [
                    localFilters?.scoreRange?.[0] || 1,
                    parseInt(e?.target?.value)
                  ])}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Tags
              </label>
              <Input
                type="text"
                placeholder="commercial, urgent, high-value"
                value={(localFilters?.tags || [])?.join(', ')}
                onChange={(e) => {
                  const tags = e?.target?.value?.split(',')?.map(tag => tag?.trim())?.filter(tag => tag?.length > 0);
                  handleFilterChange('tags', tags);
                }}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated tags to filter by
              </p>
            </div>

            {/* Date Range (placeholder for future enhancement) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created Date
              </label>
              <select disabled className="w-full">
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Coming soon
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="mt-3 flex flex-wrap gap-2">
          {localFilters?.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{localFilters?.search}"
              <button
                onClick={() => handleFilterChange('search', '')}
                className="ml-1 p-0.5 rounded-full hover:bg-blue-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {localFilters?.status && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Status: {statusOptions?.find(opt => opt?.value === localFilters?.status)?.label}
              <button
                onClick={() => handleFilterChange('status', '')}
                className="ml-1 p-0.5 rounded-full hover:bg-green-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {localFilters?.condition && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Condition: {conditionOptions?.find(opt => opt?.value === localFilters?.condition)?.label}
              <button
                onClick={() => handleFilterChange('condition', '')}
                className="ml-1 p-0.5 rounded-full hover:bg-orange-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(localFilters?.scoreRange?.[0] !== 1 || localFilters?.scoreRange?.[1] !== 5) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Score: {localFilters?.scoreRange?.[0]} - {localFilters?.scoreRange?.[1]}
              <button
                onClick={() => handleFilterChange('scoreRange', [1, 5])}
                className="ml-1 p-0.5 rounded-full hover:bg-purple-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {localFilters?.tags?.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Tags: {localFilters?.tags?.join(', ')}
              <button
                onClick={() => handleFilterChange('tags', [])}
                className="ml-1 p-0.5 rounded-full hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}