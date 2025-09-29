import React from 'react';
import { ChevronUp, ChevronDown, ExternalLink, UserPlus, Phone, Eye, Building2, MapPin, Globe, Star, User } from 'lucide-react';
import Button from '../../../components/ui/Button';

const ProspectsTable = ({
  prospects,
  loading,
  selectedProspects,
  onSelectProspect,
  onSelectAll,
  onSort,
  sort,
  onViewDetails,
  onClaimProspect,
  onUpdateStatus,
  onAddToRoute,
  onStartSequence,
  onConvertToAccount,
  onDisqualify
}) => {
  const getSortIcon = (column) => {
    if (sort?.column !== column) return null;
    return sort?.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      uncontacted: 'bg-blue-100 text-blue-800 border-blue-200',
      researching: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      attempted: 'bg-orange-100 text-orange-800 border-orange-200',
      contacted: 'bg-green-100 text-green-800 border-green-200',
      disqualified: 'bg-red-100 text-red-800 border-red-200',
      converted: 'bg-purple-100 text-purple-800 border-purple-200'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyles?.[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status?.charAt(0)?.toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const getICPScoreBadge = (score) => {
    if (!score) return null;
    
    let colorClass = 'bg-gray-100 text-gray-800';
    if (score >= 85) colorClass = 'bg-green-100 text-green-800';
    else if (score >= 70) colorClass = 'bg-yellow-100 text-yellow-800';
    else if (score >= 50) colorClass = 'bg-orange-100 text-orange-800';
    else colorClass = 'bg-red-100 text-red-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <Star className="w-3 h-3 mr-1" />
        {score}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading prospects...</p>
      </div>
    );
  }

  if (!prospects?.length) {
    return (
      <div className="p-8 text-center">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No prospects found</h3>
        <p className="text-gray-600 mb-4">Try adjusting your filters or import new prospects to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Table - Enhanced Responsiveness */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedProspects?.size === prospects?.length && prospects?.length > 0}
                    onChange={(e) => onSelectAll?.(e?.target?.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  onClick={() => onSort?.('name')}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[200px]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Company</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  onClick={() => onSort?.('icp_fit_score')}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-24"
                >
                  <div className="flex items-center space-x-1">
                    <span>ICP Fit</span>
                    {getSortIcon('icp_fit_score')}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Location
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Source
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Assigned To
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Status
                </th>
                <th
                  onClick={() => onSort?.('last_activity_at')}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-32"
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Activity</span>
                    {getSortIcon('last_activity_at')}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prospects?.map((prospect) => (
                <tr key={prospect?.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProspects?.has(prospect?.id)}
                      onChange={(e) => onSelectProspect?.(prospect?.id, e?.target?.checked)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <div className="max-w-[180px]">
                      <div className="text-sm font-medium text-gray-900 truncate">{prospect?.name}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        {prospect?.has_phone && <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />}
                        {prospect?.has_website && <Globe className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                        {prospect?.domain && (
                          <span className="text-xs text-gray-500 truncate">{prospect?.domain}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    {getICPScoreBadge(prospect?.icp_fit_score)}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center text-sm text-gray-900 max-w-[120px]">
                      <MapPin className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {prospect?.city && prospect?.state ? `${prospect?.city}, ${prospect?.state}` : 'Not specified'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className="text-sm text-gray-900 truncate">{prospect?.source || 'Unknown'}</span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center max-w-[100px]">
                      {prospect?.assigned_to_name ? (
                        <>
                          <User className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                          <span className="text-sm text-gray-900 truncate">{prospect?.assigned_to_name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    {getStatusBadge(prospect?.status)}
                  </td>
                  <td className="px-3 py-4">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {prospect?.last_activity_at 
                        ? new Date(prospect.last_activity_at)?.toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewDetails?.(prospect)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!prospect?.assigned_to && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onClaimProspect?.(prospect?.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onConvertToAccount?.(prospect?.id)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 p-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {prospects?.map((prospect) => (
          <div key={prospect?.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={selectedProspects?.has(prospect?.id)}
                  onChange={(e) => onSelectProspect?.(prospect?.id, e?.target?.checked)}
                  className="rounded border-gray-300 mt-1 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{prospect?.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {prospect?.has_phone && <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />}
                    {prospect?.has_website && <Globe className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                {getICPScoreBadge(prospect?.icp_fit_score)}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex-shrink-0">Location:</span>
                <span className="text-gray-900 truncate ml-2">
                  {prospect?.city && prospect?.state ? `${prospect?.city}, ${prospect?.state}` : 'Not specified'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex-shrink-0">Status:</span>
                <div className="ml-2">
                  {getStatusBadge(prospect?.status)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex-shrink-0">Source:</span>
                <span className="text-gray-900 truncate ml-2">{prospect?.source || 'Unknown'}</span>
              </div>
              {prospect?.assigned_to_name && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex-shrink-0">Assigned to:</span>
                  <span className="text-gray-900 truncate ml-2">{prospect?.assigned_to_name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Last activity: {prospect?.last_activity_at 
                  ? new Date(prospect.last_activity_at)?.toLocaleDateString()
                  : 'Never'
                }
              </span>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails?.(prospect)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                {!prospect?.assigned_to && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onClaimProspect?.(prospect?.id)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Claim
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProspectsTable;