import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, X, Clock, FileText } from 'lucide-react';
import { opportunitiesService } from '../../services/opportunitiesService';
import { activitiesService } from '../../services/activitiesService';


// Child Components
import OpportunityHeader from './components/OpportunityHeader';
import OpportunityInformation from './components/OpportunityInformation';
import StageManagement from './components/StageManagement';
import ActivitiesTab from './components/ActivitiesTab';
import OpportunityEditor from './components/OpportunityEditor';
import QuickActions from './components/QuickActions';

const OpportunityDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State management
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true');
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('details');

  // Load opportunity data
  const loadOpportunity = useCallback(async () => {
    if (!id) {
      setError('No opportunity ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await opportunitiesService?.getOpportunityById(id);
      
      if (response?.success) {
        setOpportunity(response?.data);
      } else {
        setError(response?.error || 'Failed to load opportunity');
      }
    } catch (error) {
      console.error('Error loading opportunity:', error);
      setError('An unexpected error occurred while loading opportunity');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load related activities
  const loadActivities = useCallback(async () => {
    if (!id) return;

    try {
      setLoadingActivities(true);
      
      const response = await activitiesService?.getActivities({
        // We'll need to add opportunity_id filter to activities service
        search: id, // Temporary workaround - search for opportunity ID in notes
        limit: 50
      });
      
      if (response?.success) {
        // Filter activities that might be related to this opportunity
        const relatedActivities = response?.data?.filter(activity => 
          activity?.notes?.includes(id) ||
          activity?.account_id === opportunity?.account?.id ||
          activity?.property_id === opportunity?.property?.id
        ) || [];
        setActivities(relatedActivities);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  }, [id, opportunity?.account?.id, opportunity?.property?.id]);

  // Initial data loading
  useEffect(() => {
    loadOpportunity();
  }, [loadOpportunity]);

  // Load activities when opportunity is loaded
  useEffect(() => {
    if (opportunity && activeTab === 'activities') {
      loadActivities();
    }
  }, [opportunity, activeTab, loadActivities]);

  // Handle opportunity update
  const handleUpdateOpportunity = useCallback(async (updates) => {
    try {
      const response = await opportunitiesService?.updateOpportunity(id, updates);
      
      if (response?.success) {
        setOpportunity(response?.data);
        setIsEditing(false);
        // Update URL to remove edit parameter
        navigate(`/opportunities/${id}`, { replace: true });
      } else {
        setError(response?.error || 'Failed to update opportunity');
      }
    } catch (error) {
      console.error('Error updating opportunity:', error);
      setError('An unexpected error occurred while updating opportunity');
    }
  }, [id, navigate]);

  // Handle stage update
  const handleStageUpdate = useCallback(async (newStage, notes = '') => {
    try {
      const response = await opportunitiesService?.updateOpportunityStage(id, newStage, notes);
      
      if (response?.success) {
        // Reload opportunity to get updated data
        await loadOpportunity();
      } else {
        setError(response?.error || 'Failed to update opportunity stage');
      }
    } catch (error) {
      console.error('Error updating opportunity stage:', error);
      setError('An unexpected error occurred while updating opportunity stage');
    }
  }, [id, loadOpportunity]);

  // Handle delete opportunity
  const handleDeleteOpportunity = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await opportunitiesService?.deleteOpportunity(id);
      
      if (response?.success) {
        navigate('/opportunities');
      } else {
        setError(response?.error || 'Failed to delete opportunity');
      }
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      setError('An unexpected error occurred while deleting opportunity');
    }
  }, [id, navigate]);

  // Handle activity logging
  const handleLogActivity = useCallback(async (activityData) => {
    try {
      // Add opportunity context to activity
      const activityWithContext = {
        ...activityData,
        account_id: opportunity?.account?.id,
        property_id: opportunity?.property?.id,
        notes: `${activityData?.notes || ''} [Related to Opportunity: ${opportunity?.name}]`
      };

      const response = await activitiesService?.createActivity(activityWithContext);
      
      if (response?.success) {
        // Reload activities
        await loadActivities();
      } else {
        setError(response?.error || 'Failed to log activity');
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      setError('An unexpected error occurred while logging activity');
    }
  }, [opportunity, loadActivities]);

  const handleGoBack = () => {
    navigate('/opportunities');
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    navigate(`/opportunities/${id}?edit=true`, { replace: true });
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    navigate(`/opportunities/${id}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-64 bg-gray-200 rounded"></div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Error Loading Opportunity</h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleGoBack}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Opportunities
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleGoBack}
                  className="inline-flex items-center text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Opportunities
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                {!isEditing ? (
                  <>
                    <button
                      onClick={handleStartEditing}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteOpportunity}
                      className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCancelEditing}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isEditing ? (
          /* Edit Mode */
          (<OpportunityEditor
            opportunity={opportunity}
            onUpdate={handleUpdateOpportunity}
            onCancel={handleCancelEditing}
          />)
        ) : (
          /* View Mode */
          (<>
            {/* Opportunity Header */}
            <OpportunityHeader opportunity={opportunity} />
            {/* Stage Management */}
            <div className="mb-6">
              <StageManagement
                opportunity={opportunity}
                onStageUpdate={handleStageUpdate}
              />
            </div>
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'details' ?'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Details
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'activities' ?'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Activities
                      {activities?.length > 0 && (
                        <span className="ml-2 bg-gray-100 text-gray-600 rounded-full text-xs px-2 py-1">
                          {activities?.length}
                        </span>
                      )}
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'details' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <OpportunityInformation opportunity={opportunity} />
                    </div>
                    <div>
                      <QuickActions
                        opportunity={opportunity}
                        onLogActivity={handleLogActivity}
                        onStageUpdate={handleStageUpdate}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'activities' && (
                  <ActivitiesTab
                    activities={activities}
                    loading={loadingActivities}
                    onLogActivity={handleLogActivity}
                  />
                )}
              </div>
            </div>
          </>)
        )}
      </div>
    </div>
  );
};

export default OpportunityDetails;