import React from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';


const PropertyFilters = ({
  buildingTypeFilter,
  setBuildingTypeFilter,
  roofTypeFilter,
  setRoofTypeFilter,
  stageFilter,
  setStageFilter,
  searchQuery,
  setSearchQuery,
  onClearFilters,
  resultCount
}) => {
  const buildingTypeOptions = [
    { value: '', label: 'All Building Types' },
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Hospitality', label: 'Hospitality' },
    { value: 'Multifamily', label: 'Multifamily' },
    { value: 'Commercial Office', label: 'Commercial Office' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Education', label: 'Education' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Mixed-Use', label: 'Mixed-Use' },
    { value: 'Other', label: 'Other' }
  ];

  const roofTypeOptions = [
    { value: '', label: 'All Roof Types' },
    { value: 'Shingle', label: 'Shingle' },
    { value: 'TPO', label: 'TPO' },
    { value: 'EPDM', label: 'EPDM' },
    { value: 'PVC', label: 'PVC' },
    { value: 'Modified Bitumen', label: 'Modified Bitumen' },
    { value: 'Metal', label: 'Metal' },
    { value: 'BUR', label: 'BUR' },
    { value: 'Coating', label: 'Coating' },
    { value: 'Green Roof', label: 'Green Roof' },
    { value: 'Other', label: 'Other' }
  ];

  const stageOptions = [
    { value: '', label: 'All Stages' },
    { value: 'Unassessed', label: 'Unassessed' },
    { value: 'Assessed', label: 'Assessed' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'In Negotiation', label: 'In Negotiation' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' }
  ];

  const hasActiveFilters = buildingTypeFilter || roofTypeFilter || stageFilter || searchQuery;

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 lg:max-w-sm">
          <Input
            type="search"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target?.value)}
            className="w-full"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 lg:flex-1">
          <div className="flex-1 min-w-0">
            <Select
              placeholder="Building Type"
              options={buildingTypeOptions}
              value={buildingTypeFilter}
              onChange={setBuildingTypeFilter}
              searchable
            />
          </div>

          <div className="flex-1 min-w-0">
            <Select
              placeholder="Roof Type"
              options={roofTypeOptions}
              value={roofTypeFilter}
              onChange={setRoofTypeFilter}
              searchable
            />
          </div>

          <div className="flex-1 min-w-0">
            <Select
              placeholder="Stage"
              options={stageOptions}
              value={stageFilter}
              onChange={setStageFilter}
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            iconName="X"
            iconPosition="left"
            className="shrink-0"
          >
            Clear
          </Button>
        )}
      </div>
      {/* Results Count */}
      {resultCount !== undefined && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {resultCount} {resultCount === 1 ? 'property' : 'properties'} found
            {hasActiveFilters && ' with current filters'}
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyFilters;