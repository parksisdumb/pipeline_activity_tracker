import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Globe, Phone, Users, Square, Tag, ExternalLink, UserPlus, Route, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Button from '../../../components/ui/Button';

import { prospectsService } from '../../../services/prospectsService';


const ProspectDrawer = ({ prospect, isOpen, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionType, setConversionType] = useState('new'); // 'new' or 'link'
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);

  useEffect(() => {
    if (isOpen && prospect) {
      checkForDuplicates();
    }
  }, [isOpen, prospect]);

  const checkForDuplicates = async () => {
    if (!prospect) return;
    
    setDuplicateChecking(true);
    try {
      // Fixed method name from findAccountDuplicates to findDuplicateAccounts
      let result = await prospectsService?.findDuplicateAccounts(prospect);
      if (!result?.error) {
        setDuplicates(result?.data || []);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setDuplicateChecking(false);
    }
  };

  const handleAction = async (action, data = {}) => {
    setLoading(true);
    try {
      let result = null;

      switch (action) {
        case 'claim':
          result = await prospectsService?.claimProspect(prospect?.id);
          break;
        case 'updateStatus':
          result = await prospectsService?.updateStatus(prospect?.id, data?.status, data?.notes);
          break;
        case 'addToRoute':
          const dueDate = prompt('Enter due date for route visit (YYYY-MM-DD):');
          if (dueDate) {
            result = await prospectsService?.addToRoute(prospect?.id, dueDate);
          }
          break;
        case 'startSequence':
          result = await prospectsService?.startSequenceOrTask(prospect?.id);
          break;
        case 'convert':
          setShowConversionModal(true);
          return;
        case 'disqualify':
          const reason = prompt('Enter reason for disqualification:');
          if (reason) {
            result = await prospectsService?.updateStatus(prospect?.id, 'disqualified', reason);
          }
          break;
        default:
          console.warn('Unknown action:', action);
          return;
      }

      if (result?.error) {
        alert(`Failed to ${action}: ${result?.error}`);
      } else {
        alert(`Successfully completed ${action}!`);
        onUpdate?.();
        if (action !== 'claim') {
          onClose?.();
        }
      }
    } catch (error) {
      console.error(`Error with ${action}:`, error);
      alert(`Failed to ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConversion = async () => {
    setLoading(true);
    try {
      // Updated to match the corrected service method signature
      const linkAccountId = conversionType === 'link' ? selectedDuplicate?.account_id : null;
      let result = await prospectsService?.convertToAccount(prospect?.id, linkAccountId);
      
      if (result?.error) {
        alert('Failed to convert prospect: ' + result?.error);
      } else {
        alert('Prospect successfully converted!');
        setShowConversionModal(false);
        onUpdate?.();
        onClose?.();
      }
    } catch (error) {
      console.error('Error converting prospect:', error);
      alert('Failed to convert prospect');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      uncontacted: 'text-blue-600 bg-blue-50',
      researching: 'text-yellow-600 bg-yellow-50',
      attempted: 'text-orange-600 bg-orange-50',
      contacted: 'text-green-600 bg-green-50',
      disqualified: 'text-red-600 bg-red-50',
      converted: 'text-purple-600 bg-purple-50'
    };
    return colors?.[status] || 'text-gray-600 bg-gray-50';
  };

  const getICPReasons = (prospect) => {
    const reasons = [];
    if (prospect?.employee_count && prospect?.employee_count > 50) {
      reasons?.push(`${prospect?.employee_count} employees (good size)`);
    }
    if (prospect?.property_count_estimate && prospect?.property_count_estimate > 10) {
      reasons?.push(`~${prospect?.property_count_estimate} properties (high volume)`);
    }
    if (prospect?.sqft_estimate && prospect?.sqft_estimate > 100000) {
      reasons?.push(`~${prospect?.sqft_estimate?.toLocaleString()} sqft (large portfolio)`);
    }
    if (prospect?.building_types?.length > 0) {
      reasons?.push(`Building types: ${prospect?.building_types?.join(', ')}`);
    }
    if (prospect?.company_type) {
      reasons?.push(`Industry: ${prospect?.company_type}`);
    }
    return reasons;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Drawer Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Building2 className="w-6 h-6 text-gray-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{prospect?.name}</h2>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospect?.status)}`}>
                  {prospect?.status?.charAt(0)?.toUpperCase() + prospect?.status?.slice(1)}
                </span>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Company Overview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Overview</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    {prospect?.website ? (
                      <a href={prospect?.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {prospect?.domain || prospect?.website}
                      </a>
                    ) : (
                      <span className="text-gray-500">No website</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{prospect?.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    {prospect?.address ? `${prospect?.address}, ` : ''}
                    {prospect?.city && prospect?.state ? `${prospect?.city}, ${prospect?.state}` : 'No location'}
                    {prospect?.zip_code ? ` ${prospect?.zip_code}` : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{prospect?.company_type || 'Unknown type'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{prospect?.employee_count ? `${prospect?.employee_count} employees` : 'Unknown size'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Square className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{prospect?.sqft_estimate ? `~${prospect?.sqft_estimate?.toLocaleString()} sqft` : 'Unknown sqft'}</span>
                </div>
              </div>
              {prospect?.tags && prospect?.tags?.length > 0 && (
                <div className="flex items-center space-x-2 mt-3">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <div className="flex flex-wrap gap-1">
                    {prospect?.tags?.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ICP Fit Explanation */}
          {prospect?.icp_fit_score && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ICP Fit Analysis</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-blue-900">ICP Fit Score</span>
                  <span className="text-2xl font-bold text-blue-600">{prospect?.icp_fit_score}/100</span>
                </div>
                <div className="space-y-2">
                  {getICPReasons(prospect)?.map((reason, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Potential Properties */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Potential Properties</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                Estimated {prospect?.property_count_estimate || 'Unknown'} properties
              </p>
              {prospect?.building_types && prospect?.building_types?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {prospect?.building_types?.map((type, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {type}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Building types not specified</p>
              )}
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateChecking ? (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <p className="text-sm text-yellow-800">Checking for potential duplicates...</p>
              </div>
            </div>
          ) : duplicates?.length > 0 ? (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Potential duplicates found</p>
                  <p className="text-sm text-yellow-700 mb-3">
                    {duplicates?.length} similar account{duplicates?.length !== 1 ? 's' : ''} found. Consider linking instead of creating new.
                  </p>
                  <div className="space-y-2">
                    {duplicates?.slice(0, 3)?.map((duplicate, index) => (
                      <div key={index} className="text-xs bg-white rounded p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{duplicate?.account_name}</span>
                          <span className="text-yellow-600">
                            {Math.round(duplicate?.similarity_score * 100)}% match ({duplicate?.match_type})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Suggested Actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Next Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {!prospect?.assigned_to && (
                <Button
                  onClick={() => handleAction('claim')}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Claim Prospect
                </Button>
              )}
              {prospect?.status === 'uncontacted' && (
                <Button
                  onClick={() => handleAction('updateStatus', { status: 'attempted' })}
                  disabled={loading}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Mark Attempted
                </Button>
              )}
              <Button
                onClick={() => handleAction('addToRoute')}
                disabled={loading}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Route className="w-4 h-4 mr-2" />
                Add to Route
              </Button>
              <Button
                onClick={() => handleAction('startSequence')}
                disabled={loading}
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Sequence
              </Button>
              <Button
                onClick={() => handleAction('convert')}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white col-span-2"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Convert to Account
              </Button>
              <Button
                onClick={() => handleAction('disqualify')}
                disabled={loading}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 col-span-2"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Disqualify
              </Button>
            </div>
          </div>

          {/* Notes */}
          {prospect?.notes && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{prospect?.notes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>Source: {prospect?.source || 'Unknown'}</div>
            <div>Created: {prospect?.created_at ? new Date(prospect.created_at)?.toLocaleDateString() : 'Unknown'}</div>
            {prospect?.last_activity_at && (
              <div>Last Activity: {new Date(prospect.last_activity_at)?.toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </div>
      {/* Conversion Modal */}
      {showConversionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Convert to Account</h3>
            
            {duplicates?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">Potential duplicates found. Choose how to proceed:</p>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="new"
                      checked={conversionType === 'new'}
                      onChange={(e) => setConversionType(e?.target?.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Create new account anyway</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="link"
                      checked={conversionType === 'link'}
                      onChange={(e) => setConversionType(e?.target?.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Link to existing account</span>
                  </label>
                </div>

                {conversionType === 'link' && (
                  <div className="mt-3">
                    <select
                      value={selectedDuplicate?.account_id || ''}
                      onChange={(e) => {
                        const duplicate = duplicates?.find(d => d?.account_id === e?.target?.value);
                        setSelectedDuplicate(duplicate);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select account to link to...</option>
                      {duplicates?.map((duplicate) => (
                        <option key={duplicate?.account_id} value={duplicate?.account_id}>
                          {duplicate?.account_name} ({Math.round(duplicate?.similarity_score * 100)}% match)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowConversionModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConversion}
                disabled={loading || (conversionType === 'link' && !selectedDuplicate)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Converting...' : 'Convert'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProspectDrawer;