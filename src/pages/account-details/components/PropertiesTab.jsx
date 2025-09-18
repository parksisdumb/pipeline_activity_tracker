import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const PropertiesTab = ({ accountId, properties, loading, onAddProperty, onRefreshProperties }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterBuildingType, setFilterBuildingType] = useState('');

  const stageOptions = [
    { value: '', label: 'All Stages' },
    { value: 'Unassessed', label: 'Unassessed' },
    { value: 'Assessment Scheduled', label: 'Assessment Scheduled' },
    { value: 'Assessed', label: 'Assessed' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'In Negotiation', label: 'In Negotiation' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' }
  ];

  const buildingTypeOptions = [
    { value: '', label: 'All Building Types' },
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Hospitality', label: 'Hospitality' },
    { value: 'Multifamily', label: 'Multifamily' },
    { value: 'Commercial Office', label: 'Commercial Office' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Healthcare', label: 'Healthcare' }
  ];

  const getStageColor = (stage) => {
    const stageColors = {
      'Unassessed': 'bg-slate-100 text-slate-700',
      'Assessment Scheduled': 'bg-blue-100 text-blue-700',
      'Assessed': 'bg-blue-100 text-blue-700',
      'Proposal Sent': 'bg-yellow-100 text-yellow-700',
      'In Negotiation': 'bg-orange-100 text-orange-700',
      'Won': 'bg-emerald-100 text-emerald-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return stageColors?.[stage] || 'bg-slate-100 text-slate-700';
  };

  const getBuildingTypeIcon = (type) => {
    const typeIcons = {
      'Industrial': 'Factory',
      'Warehouse': 'Package',
      'Manufacturing': 'Cog',
      'Hospitality': 'Hotel',
      'Multifamily': 'Home',
      'Commercial Office': 'Building2',
      'Retail': 'Store',
      'Healthcare': 'Heart'
    };
    return typeIcons?.[type] || 'MapPin';
  };

  const filteredProperties = properties?.filter(property => {
    const matchesSearch = property?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         property?.address?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    const matchesStage = !filterStage || property?.stage === filterStage;
    const matchesBuildingType = !filterBuildingType || property?.building_type === filterBuildingType;
    
    return matchesSearch && matchesStage && matchesBuildingType;
  });

  const handlePropertyClick = (propertyId) => {
    navigate(`/property-details/${propertyId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-6 bg-muted animate-pulse rounded w-32"></div>
          <div className="h-9 bg-muted animate-pulse rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-9 bg-muted animate-pulse rounded"></div>
          <div className="h-9 bg-muted animate-pulse rounded"></div>
          <div className="h-9 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4]?.map(i => (
            <div key={i} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-muted animate-pulse rounded-lg"></div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-3 bg-muted animate-pulse rounded w-full"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted animate-pulse rounded w-20"></div>
                    <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            Properties ({properties?.length || 0})
          </h3>
          {onRefreshProperties && (
            <Button
              onClick={onRefreshProperties}
              variant="outline"
              size="sm"
              iconName="RefreshCw"
              iconPosition="left"
            >
              Refresh
            </Button>
          )}
        </div>
        <Button 
          onClick={onAddProperty}
          iconName="Plus"
          iconPosition="left"
          size="sm"
        >
          Add Property
        </Button>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          type="search"
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e?.target?.value)}
          className="w-full"
        />
        <Select
          placeholder="Filter by stage"
          options={stageOptions}
          value={filterStage}
          onChange={setFilterStage}
          onSearchChange={() => {}}
          error=""
          id="stage-filter"
          onOpenChange={() => {}}
          label=""
          name="stage-filter"
          description=""
        />
        <Select
          placeholder="Filter by building type"
          options={buildingTypeOptions}
          value={filterBuildingType}
          onChange={setFilterBuildingType}
          onSearchChange={() => {}}
          error=""
          id="building-type-filter"
          onOpenChange={() => {}}
          label=""
          name="building-type-filter"
          description=""
        />
      </div>
      
      {/* Properties List */}
      {filteredProperties?.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="MapPin" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">No Properties Found</h4>
          <p className="text-muted-foreground mb-4">
            {properties?.length === 0 
              ? "This account doesn't have any properties yet."
              : "No properties match your current filters."
            }
          </p>
          {properties?.length === 0 && (
            <Button onClick={onAddProperty} iconName="Plus" iconPosition="left">
              Add First Property
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProperties?.map((property) => (
            <div
              key={property?.id}
              onClick={() => handlePropertyClick(property?.id)}
              className="bg-card border border-border rounded-lg p-4 hover:elevation-1 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon 
                    name={getBuildingTypeIcon(property?.building_type)} 
                    size={20} 
                    className="text-accent" 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground mb-1 truncate">
                    {property?.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2 truncate">
                    {property?.address}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStageColor(property?.stage)}`}>
                      {property?.stage}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {property?.building_type}
                    </span>
                    {property?.roof_type && (
                      <span className="text-xs text-muted-foreground">
                        • {property?.roof_type}
                      </span>
                    )}
                  </div>
                  {property?.square_footage && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon name="Square" size={12} />
                      <span>{property?.square_footage?.toLocaleString()} sq ft</span>
                    </div>
                  )}
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertiesTab;