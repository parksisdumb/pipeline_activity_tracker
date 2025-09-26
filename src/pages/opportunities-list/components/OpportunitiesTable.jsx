import React from 'react';
import { ChevronUp, ChevronDown, Eye, Edit, Trash2, Calendar, DollarSign, Building2, User } from 'lucide-react';
import { opportunitiesService } from '../../../services/opportunitiesService';

const OpportunitiesTable = ({
  opportunities = [],
  loading = false,
  selectedOpportunities = [],
  onOpportunitySelect,
  onSelectAll,
  onSort,
  onView,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  pagination,
  onPageChange,
  error = null
}) => {
  const handleSelectAll = (e) => {
    onSelectAll?.(e?.target?.checked);
  };

  const handleSelectOpportunity = (opportunityId, checked) => {
    onOpportunitySelect?.(opportunityId, checked);
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const getStageColor = (stage) => {
    const colors = {
      'identified': 'bg-gray-100 text-gray-800',
      'qualified': 'bg-blue-100 text-blue-800',
      'proposal_sent': 'bg-yellow-100 text-yellow-800',
      'negotiation': 'bg-purple-100 text-purple-800',
      'won': 'bg-green-100 text-green-800',
      'lost': 'bg-red-100 text-red-800'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'new_construction':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[...Array(8)]?.map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)]?.map((_, i) => (
                <tr key={i}>
                  {[...Array(8)]?.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedOpportunities?.length === opportunities?.length && opportunities?.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap min-w-[200px]"
                  onClick={() => onSort?.('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Opportunity</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[180px]">
                  Account / Property
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => onSort?.('opportunity_type')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Type</span>
                    {getSortIcon('opportunity_type')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => onSort?.('stage')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Stage</span>
                    {getSortIcon('stage')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap min-w-[120px]"
                  onClick={() => onSort?.('bid_value')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Bid Value</span>
                    {getSortIcon('bid_value')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap min-w-[140px]"
                  onClick={() => onSort?.('expected_close_date')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Expected Close</span>
                    {getSortIcon('expected_close_date')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-2">No opportunities found</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {error ? 'Unable to load opportunities data.' : 'Get started by creating your first sales opportunity.'}
                      </p>
                      {error && (
                        <div className="mt-4 text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200 max-w-md">
                          <p className="font-semibold mb-2">Error Details:</p>
                          <p className="mb-2">{error}</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => window.location?.reload()}
                              className="text-sm text-red-700 underline hover:text-red-900"
                            >
                              Refresh Page
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                opportunities?.map((opportunity) => (
                  <tr key={opportunity?.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedOpportunities?.includes(opportunity?.id)}
                        onChange={(e) => handleSelectOpportunity(opportunity?.id, e?.target?.checked)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 max-w-[180px] truncate">
                          {opportunity?.name || 'Unnamed Opportunity'}
                        </div>
                        {opportunity?.assigned_to && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <User className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{opportunity?.assigned_to?.full_name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="text-sm text-gray-900 max-w-[160px] truncate">
                          {opportunity?.account?.name || 'No Account'}
                        </div>
                        <div className="text-xs text-gray-500 max-w-[160px] truncate">
                          {opportunity?.property?.name || 'No Property'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(opportunity?.opportunity_type)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {opportunity?.opportunity_type?.replace(/_/g, ' ') || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(opportunity?.stage)}`}>
                        {opportunity?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase()) || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {opportunitiesService?.formatBidValue(opportunity?.bid_value, opportunity?.currency)}
                        </div>
                        {opportunity?.probability > 0 && (
                          <div className="text-xs text-gray-500">
                            {opportunity?.probability}% probability
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                        <span>{formatDate(opportunity?.expected_close_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onView?.(opportunity?.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit?.(opportunity)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete?.(opportunity?.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="space-y-4 p-4">
          {opportunities?.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">No opportunities found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {error ? 'Unable to load opportunities data.' : 'Get started by creating your first sales opportunity.'}
              </p>
              {error && (
                <div className="mt-4 text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  <p className="font-semibold mb-2">Error Details:</p>
                  <p className="mb-2">{error}</p>
                  <button
                    onClick={() => window.location?.reload()}
                    className="text-sm text-red-700 underline hover:text-red-900"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>
          ) : (
            opportunities?.map((opportunity) => (
              <div key={opportunity?.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                      checked={selectedOpportunities?.includes(opportunity?.id)}
                      onChange={(e) => handleSelectOpportunity(opportunity?.id, e?.target?.checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {opportunity?.name || 'Unnamed Opportunity'}
                      </h3>
                      <div className="mt-1 flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(opportunity?.stage)} w-fit`}>
                          {opportunity?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase()) || '-'}
                        </span>
                        <div className="text-xs text-gray-500">
                          {opportunity?.opportunity_type?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase()) || '-'}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {opportunitiesService?.formatBidValue(opportunity?.bid_value, opportunity?.currency)}
                        </div>
                        {opportunity?.expected_close_date && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(opportunity?.expected_close_date)}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {opportunity?.account?.name || 'No Account'}
                          {opportunity?.property?.name && ` • ${opportunity?.property?.name}`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onView?.(opportunity?.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit?.(opportunity)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete?.(opportunity?.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination && opportunities?.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange?.(Math.max(0, pagination?.offset - pagination?.limit))}
              disabled={pagination?.offset === 0}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange?.(pagination?.offset + pagination?.limit)}
              disabled={pagination?.offset + pagination?.limit >= pagination?.total}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{pagination?.offset + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(pagination?.offset + pagination?.limit, pagination?.total)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{pagination?.total}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange?.(Math.max(0, pagination?.offset - pagination?.limit))}
                  disabled={pagination?.offset === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange?.(pagination?.offset + pagination?.limit)}
                  disabled={pagination?.offset + pagination?.limit >= pagination?.total}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesTable;