import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Globe, Phone, Users, Square, Tag, Calendar, ExternalLink, UserPlus, Route, Play, CheckCircle, XCircle, AlertTriangle, Edit2, Clock, Target } from 'lucide-react';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { prospectsService } from '../../services/prospectsService';


const ProspectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionType, setConversionType] = useState('new');
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);

  useEffect(() => {
    loadProspect();
  }, [id]);

  useEffect(() => {
    if (prospect) {
      checkForDuplicates();
    }
  }, [prospect]);

  const loadProspect = async () => {
    try {
      let result = await prospectsService?.getProspect(id);
      if (result?.error) {
        console.error('Failed to load prospect:', result?.error);
        navigate('/prospects-list');
      } else {
        setProspect(result?.data);
        setFormData(result?.data || {});
      }
    } catch (error) {
      console.error('Error loading prospect:', error);
      navigate('/prospects-list');
    } finally {
      setLoading(false);
    }
  };

  const checkForDuplicates = async () => {
    if (!prospect) return;
    
    try {
      let result = await prospectsService?.findAccountDuplicates(prospect);
      if (!result?.error) {
        setDuplicates(result?.data || []);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      let result = await prospectsService?.updateProspect(id, formData);
      if (result?.error) {
        alert('Failed to update prospect: ' + result?.error);
      } else {
        setProspect(result?.data);
        setEditing(false);
        alert('Prospect updated successfully!');
      }
    } catch (error) {
      console.error('Error updating prospect:', error);
      alert('Failed to update prospect');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action, data = {}) => {
    setActionLoading(true);
    try {
      let result = null;

      switch (action) {
        case 'claim':
          result = await prospectsService?.claimProspect(id);
          break;
        case 'updateStatus':
          result = await prospectsService?.updateStatus(id, data?.status, data?.notes);
          break;
        case 'addToRoute':
          const dueDate = prompt('Enter due date for route visit (YYYY-MM-DD):');
          if (dueDate) {
            result = await prospectsService?.addToRoute(id, dueDate);
          }
          break;
        case 'startSequence':
          result = await prospectsService?.startSequenceOrTask(id);
          break;
        case 'convert':
          setShowConversionModal(true);
          return;
        case 'disqualify':
          const reason = prompt('Enter reason for disqualification:');
          if (reason) {
            result = await prospectsService?.updateStatus(id, 'disqualified', reason);
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
        loadProspect();
      }
    } catch (error) {
      console.error(`Error with ${action}:`, error);
      alert(`Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConversion = async () => {
    setActionLoading(true);
    try {
      const linkAccountId = conversionType === 'link' ? selectedDuplicate?.account_id : null;
      let result = await prospectsService?.convertToAccount(id, linkAccountId);
      
      if (result?.error) {
        alert('Failed to convert prospect: ' + result?.error);
      } else {
        alert('Prospect successfully converted!');
        setShowConversionModal(false);
        navigate('/accounts');
      }
    } catch (error) {
      console.error('Error converting prospect:', error);
      alert('Failed to convert prospect');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      uncontacted: 'text-blue-600 bg-blue-50 border-blue-200',
      researching: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      attempted: 'text-orange-600 bg-orange-50 border-orange-200',
      contacted: 'text-green-600 bg-green-50 border-green-200',
      disqualified: 'text-red-600 bg-red-50 border-red-200',
      converted: 'text-purple-600 bg-purple-50 border-purple-200'
    };
    return colors?.[status] || 'text-gray-600 bg-gray-50 border-gray-200';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onMenuToggle={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading prospect...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onMenuToggle={() => {}} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Prospect not found</h3>
            <Link to="/prospects-list" className="text-indigo-600 hover:text-indigo-500">
              Return to prospects list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={() => {}} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            to="/prospects-list"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Prospects
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{prospect?.name}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(prospect?.status)}`}>
                    {prospect?.status?.charAt(0)?.toUpperCase() + prospect?.status?.slice(1)}
                  </span>
                  {prospect?.icp_fit_score && (
                    <div className="flex items-center space-x-1">
                      <Target className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">ICP Score: {prospect?.icp_fit_score}/100</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setEditing(!editing)}
                disabled={actionLoading}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {editing ? 'Cancel' : 'Edit'}
              </Button>
              {editing && (
                <Button
                  onClick={handleSave}
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicates?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Potential Duplicates Found</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  {duplicates?.length} similar account{duplicates?.length !== 1 ? 's' : ''} found in your CRM. Consider linking instead of creating new.
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
              
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <Input
                      value={formData?.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e?.target?.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                      <Input
                        value={formData?.domain || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, domain: e?.target?.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <Input
                        value={formData?.phone || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e?.target?.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <Input
                      value={formData?.website || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e?.target?.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <Input
                      value={formData?.address || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e?.target?.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <Input
                        value={formData?.city || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e?.target?.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <Input
                        value={formData?.state || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e?.target?.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <Input
                        value={formData?.zip_code || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e?.target?.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData?.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e?.target?.value }))}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
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
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{prospect?.company_type || 'Unknown type'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {prospect?.address ? `${prospect?.address}, ` : ''}
                          {prospect?.city && prospect?.state ? `${prospect?.city}, ${prospect?.state}` : 'No location'}
                          {prospect?.zip_code ? ` ${prospect?.zip_code}` : ''}
                        </span>
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
                  </div>
                  
                  {prospect?.tags && prospect?.tags?.length > 0 && (
                    <div className="flex items-start space-x-2 pt-4 border-t border-gray-200">
                      <Tag className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {prospect?.tags?.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {prospect?.notes && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600">{prospect?.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ICP Analysis */}
            {prospect?.icp_fit_score && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">ICP Fit Analysis</h2>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-blue-900">ICP Fit Score</span>
                    <span className="text-3xl font-bold text-blue-600">{prospect?.icp_fit_score}/100</span>
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

            {/* Activities Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Research Activities</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Prospect created</p>
                    <p className="text-sm text-gray-600">
                      {prospect?.created_at ? new Date(prospect.created_at)?.toLocaleDateString() : 'Unknown'}
                      {prospect?.source && ` • Source: ${prospect?.source}`}
                    </p>
                  </div>
                </div>
                {prospect?.last_activity_at && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last activity</p>
                      <p className="text-sm text-gray-600">
                        {new Date(prospect.last_activity_at)?.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {!prospect?.assigned_to && (
                  <Button
                    onClick={() => handleAction('claim')}
                    disabled={actionLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Claim Prospect
                  </Button>
                )}
                {prospect?.status === 'uncontacted' && (
                  <Button
                    onClick={() => handleAction('updateStatus', { status: 'attempted' })}
                    disabled={actionLoading}
                    variant="outline"
                    className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Mark Attempted
                  </Button>
                )}
                <Button
                  onClick={() => handleAction('addToRoute')}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Route className="w-4 h-4 mr-2" />
                  Add to Route
                </Button>
                <Button
                  onClick={() => handleAction('startSequence')}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Sequence
                </Button>
                <Button
                  onClick={() => handleAction('convert')}
                  disabled={actionLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Convert to Account
                </Button>
                <Button
                  onClick={() => handleAction('disqualify')}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Disqualify
                </Button>
              </div>
            </div>

            {/* Prospect Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                  <p className="text-sm text-gray-900 mt-1">{prospect?.status?.charAt(0)?.toUpperCase() + prospect?.status?.slice(1)}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</span>
                  <p className="text-sm text-gray-900 mt-1">{prospect?.source || 'Unknown'}</p>
                </div>
                {prospect?.assigned_to_profile && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</span>
                    <p className="text-sm text-gray-900 mt-1">{prospect?.assigned_to_profile?.full_name}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {prospect?.created_at ? new Date(prospect.created_at)?.toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                {prospect?.property_count_estimate && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Est. Properties</span>
                    <p className="text-sm text-gray-900 mt-1">{prospect?.property_count_estimate}</p>
                  </div>
                )}
                {prospect?.building_types && prospect?.building_types?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Building Types</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prospect?.building_types?.map((type, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Conversion Modal */}
      {showConversionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
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
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConversion}
                disabled={actionLoading || (conversionType === 'link' && !selectedDuplicate)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {actionLoading ? 'Converting...' : 'Convert'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectDetails;