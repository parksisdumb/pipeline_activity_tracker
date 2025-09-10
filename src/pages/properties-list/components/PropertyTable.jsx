import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const PropertyTable = ({
  properties,
  selectedProperties,
  onSelectProperty,
  onSelectAll,
  sortConfig,
  onSort
}) => {
  const navigate = useNavigate();

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) {
      return <Icon name="ArrowUpDown" size={14} className="opacity-50" />;
    }
    return sortConfig?.direction === 'asc' 
      ? <Icon name="ArrowUp" size={14} />
      : <Icon name="ArrowDown" size={14} />;
  };

  const getStageColor = (stage) => {
    const colors = {
      'Unassessed': 'bg-slate-100 text-slate-700',
      'Assessed': 'bg-blue-100 text-blue-700',
      'Proposal Sent': 'bg-yellow-100 text-yellow-700',
      'In Negotiation': 'bg-orange-100 text-orange-700',
      'Won': 'bg-green-100 text-green-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleRowClick = (propertyId) => {
    navigate(`/property-details/${propertyId}`);
  };

  const handleLogAssessment = (e, propertyId) => {
    e?.stopPropagation();
    navigate(`/log-activity?type=assessment&propertyId=${propertyId}`);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={selectedProperties?.length === properties?.length && properties?.length > 0}
                  indeterminate={selectedProperties?.length > 0 && selectedProperties?.length < properties?.length}
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground">
                <button
                  onClick={() => onSort('name')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Property Name</span>
                  {getSortIcon('name')}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground">
                <button
                  onClick={() => onSort('account')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Account</span>
                  {getSortIcon('account')}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground">
                <button
                  onClick={() => onSort('buildingType')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Building Type</span>
                  {getSortIcon('buildingType')}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground">
                <button
                  onClick={() => onSort('roofType')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Roof Type</span>
                  {getSortIcon('roofType')}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground">
                <button
                  onClick={() => onSort('stage')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Stage</span>
                  {getSortIcon('stage')}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-foreground">
                <button
                  onClick={() => onSort('lastAssessment')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Last Assessment</span>
                  {getSortIcon('lastAssessment')}
                </button>
              </th>
              <th className="w-24 px-4 py-3 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {properties?.map((property) => (
              <tr
                key={property?.id}
                onClick={() => handleRowClick(property?.id)}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedProperties?.includes(property?.id)}
                    onChange={(e) => {
                      e?.stopPropagation();
                      onSelectProperty(property?.id, e?.target?.checked);
                    }}
                  />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-foreground">{property?.name}</div>
                    <div className="text-sm text-muted-foreground">{property?.address}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-foreground">{property?.account?.name || 'No Account'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-foreground">{property?.building_type}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-foreground">{property?.roofType}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(property?.stage)}`}>
                    {property?.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-foreground">{formatDate(property?.lastAssessment)}</div>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleLogAssessment(e, property?.id)}
                    iconName="Calendar"
                    className="text-accent hover:text-accent-foreground"
                  >
                    Log
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-border">
        {properties?.map((property) => (
          <div
            key={property?.id}
            onClick={() => handleRowClick(property?.id)}
            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <Checkbox
                  checked={selectedProperties?.includes(property?.id)}
                  onChange={(e) => {
                    e?.stopPropagation();
                    onSelectProperty(property?.id, e?.target?.checked);
                  }}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{property?.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{property?.address}</p>
                  <p className="text-sm text-muted-foreground mt-1">{property?.account?.name || 'No Account'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleLogAssessment(e, property?.id)}
                iconName="Calendar"
                className="shrink-0 ml-2"
              >
                Log
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Building:</span>
                <span className="ml-1 text-foreground">{property?.buildingType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Roof:</span>
                <span className="ml-1 text-foreground">{property?.roofType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stage:</span>
                <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStageColor(property?.stage)}`}>
                  {property?.stage}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Assessment:</span>
                <span className="ml-1 text-foreground">{formatDate(property?.lastAssessment)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {properties?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Building2" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No properties found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default PropertyTable;