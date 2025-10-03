import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import ActivityTypeSelector from './components/ActivityTypeSelector';
import EntitySearchSelector from './components/EntitySearchSelector';
import OutcomeNotesSection from './components/OutcomeNotesSection';
import QuickEntityCreator from './components/QuickEntityCreator';
import SelectedEntityInfo from './components/SelectedEntityInfo';
import ActivityFormActions from './components/ActivityFormActions';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { activitiesService } from '../../services/activitiesService';


const LogActivity = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Add auth context
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEntityCreator, setShowEntityCreator] = useState(false);
  const [creatorEntityType, setCreatorEntityType] = useState('account');
  const [selectedEntities, setSelectedEntities] = useState({
    account: null,
    property: null,
    contact: null
  });
  const [followUpCreated, setFollowUpCreated] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm({
    defaultValues: {
      activityType: 'Phone Call', // Fixed: Use valid enum value instead of 'pop_in'
      account: '',
      property: '',
      contact: '',
      opportunity: '', // Add opportunity field
      outcome: '',
      notes: ''
    }
  });

  const watchedValues = watch();

  // Pre-populate form if coming from another page with context
  useEffect(() => {
    const state = location?.state;
    if (state?.preselected) {
      if (state?.account) {
        setValue('account', state?.account?.value);
        setSelectedEntities(prev => ({ ...prev, account: state?.account }));
      }
      if (state?.property) {
        setValue('property', state?.property?.value);
        setSelectedEntities(prev => ({ ...prev, property: state?.property }));
      }
      if (state?.contact) {
        setValue('contact', state?.contact?.value);
        setSelectedEntities(prev => ({ ...prev, contact: state?.contact }));
      }
      // Handle opportunity pre-filling
      if (state?.opportunity) {
        setValue('opportunity', state?.opportunity?.value);
        setSelectedEntities(prev => ({ ...prev, opportunity: state?.opportunity }));
      }
      if (state?.activityType) {
        setValue('activityType', state?.activityType);
      }
    }
    // Also handle legacy format for backward compatibility
    else if (state?.contactId && state?.accountId) {
      setValue('account', state?.accountId);
      setValue('contact', state?.contactId);
      setSelectedEntities(prev => ({ 
        ...prev, 
        account: {
          value: state?.accountId,
          label: state?.accountName || 'Account',
          description: 'Account'
        },
        contact: {
          value: state?.contactId,
          label: state?.contactName || 'Contact',
          description: 'Contact'
        }
      }));
    }
    // Handle opportunity-specific context
    else if (state?.opportunityId) {
      setValue('opportunity', state?.opportunityId);
      setSelectedEntities(prev => ({
        ...prev,
        opportunity: {
          value: state?.opportunityId,
          label: state?.opportunityName || 'Opportunity',
          description: 'Opportunity'
        }
      }));
      
      // Also pre-fill related account/property if available
      if (state?.accountId) {
        setValue('account', state?.accountId);
        setSelectedEntities(prev => ({
          ...prev,
          account: {
            value: state?.accountId,
            label: state?.accountName || 'Account',
            description: 'Account'
          }
        }));
      }
      
      if (state?.propertyId) {
        setValue('property', state?.propertyId);
        setSelectedEntities(prev => ({
          ...prev,
          property: {
            value: state?.propertyId,
            label: state?.propertyName || 'Property',
            description: 'Property'
          }
        }));
      }
    }
  }, [location?.state, setValue]);

  const handleEntitySelect = (entityType, value) => {
    setValue(entityType, value);
    
    // The EntitySearchSelector now handles real data, so we don't need mock data here
    // The SelectedEntityInfo component will get the proper data from the EntitySearchSelector
    setSelectedEntities(prev => ({ ...prev, [entityType]: { value } }));
  };

  const handleCreateEntity = (entityType) => {
    setCreatorEntityType(entityType);
    setShowEntityCreator(true);
  };

  const handleEntityCreated = (newEntity) => {
    // Add the new entity to the form and selection
    setValue(creatorEntityType, newEntity?.id);
    setSelectedEntities(prev => ({ 
      ...prev, 
      [creatorEntityType]: {
        value: newEntity?.id,
        label: newEntity?.name,
        description: newEntity?.type || 'New Entity'
      }
    }));
    setShowEntityCreator(false);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!data?.activityType) {
        alert('Please select an activity type');
        return;
      }

      if (!data?.account) {
        alert('Please select an account');
        return;
      }

      // Create activity data for database with opportunity linking
      const activityData = {
        activity_type: data?.activityType,
        account_id: data?.account,
        contact_id: data?.contact || null,
        property_id: data?.property || null,
        opportunity_id: data?.opportunity || null, // Include opportunity_id
        outcome: data?.outcome || null,
        notes: data?.notes || '',
        activity_date: new Date()?.toISOString(),
        subject: data?.opportunity 
          ? `${data?.activityType} - ${selectedEntities?.opportunity?.label || 'Opportunity Activity'}`
          : `${data?.activityType} - ${selectedEntities?.account?.label || 'Account Activity'}`,
        follow_up_date: null // Will be set separately if needed
      };

      // Save to database using the activities service
      const response = await activitiesService?.createActivity(activityData);

      if (response?.success) {
        // Show success feedback with follow-up info
        let successMessage = 'Activity logged successfully!';
        if (followUpCreated) {
          successMessage += ` Follow-up task created for ${followUpCreated?.date || followUpCreated?.action}.`;
        }
        alert(successMessage);
        
        // Navigate back to previous page or Today screen
        navigate('/today');
      } else {
        throw new Error(response?.error || 'Failed to save activity');
      }
      
    } catch (error) {
      console.error('Error logging activity:', error);
      alert(`Failed to log activity: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpCreated = (followUpInfo) => {
    setFollowUpCreated(followUpInfo);
    // Show immediate feedback
    console.log('Follow-up created:', followUpInfo);
  };

  const handleSaveAndNew = async (data) => {
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!data?.activityType) {
        alert('Please select an activity type');
        return;
      }

      if (!data?.account) {
        alert('Please select an account');
        return;
      }

      // Create activity data for database with opportunity linking
      const activityData = {
        activity_type: data?.activityType,
        account_id: data?.account,
        contact_id: data?.contact || null,
        property_id: data?.property || null,
        opportunity_id: data?.opportunity || null, // Include opportunity_id
        outcome: data?.outcome || null,
        notes: data?.notes || '',
        activity_date: new Date()?.toISOString(),
        subject: data?.opportunity
          ? `${data?.activityType} - ${selectedEntities?.opportunity?.label || 'Opportunity Activity'}`
          : `${data?.activityType} - ${selectedEntities?.account?.label || 'Account Activity'}`
      };

      // Save to database using the activities service
      const response = await activitiesService?.createActivity(activityData);

      if (response?.success) {
        // Show success feedback
        alert('Activity logged successfully!');
        
        // Reset form for new entry but keep entity selections for efficiency
        reset({
          activityType: 'Phone Call', // Fixed: Use valid enum value instead of 'pop_in'
          account: watchedValues?.account,
          property: watchedValues?.property,
          contact: watchedValues?.contact,
          opportunity: watchedValues?.opportunity, // Keep opportunity context
          outcome: '',
          notes: ''
        });
      } else {
        throw new Error(response?.error || 'Failed to save activity');
      }
      
    } catch (error) {
      console.error('Error logging activity:', error);
      alert(`Failed to log activity: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole="rep"
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMenuOpen={!sidebarCollapsed}
      />
      <SidebarNavigation
        userRole="rep"
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden lg:block"
      />
      <main className={`pt-16 transition-all duration-200 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <div className="max-w-2xl mx-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Plus" size={20} color="var(--color-primary-foreground)" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Log Activity</h1>
                <p className="text-sm text-muted-foreground">
                  Quickly record activities with instant follow-up creation
                </p>
              </div>
            </div>
            
            {/* Follow-up Success Banner */}
            {followUpCreated && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckCircle" size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Follow-up created: {followUpCreated?.action || `Due ${new Date(followUpCreated.date)?.toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Activity Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-4 lg:p-6 space-y-6">
              {/* Activity Type Selection */}
              <ActivityTypeSelector
                value={watchedValues?.activityType}
                onChange={(value) => setValue('activityType', value)}
                error={errors?.activityType?.message}
                disabled={isLoading}
              />

              {/* Entity Selection */}
              <div className="space-y-4">
                <EntitySearchSelector
                  entityType="account"
                  value={watchedValues?.account}
                  onChange={(value) => handleEntitySelect('account', value)}
                  error={errors?.account?.message}
                  disabled={isLoading}
                  onCreateNew={() => handleCreateEntity('account')}
                />

                {selectedEntities?.account && (
                  <SelectedEntityInfo
                    entityType="account"
                    entityData={selectedEntities?.account}
                  />
                )}

                {/* Opportunity Selection - NEW */}
                <EntitySearchSelector
                  entityType="opportunity"
                  value={watchedValues?.opportunity}
                  onChange={(value) => handleEntitySelect('opportunity', value)}
                  error={errors?.opportunity?.message}
                  disabled={isLoading}
                  onCreateNew={() => handleCreateEntity('opportunity')}
                />

                {selectedEntities?.opportunity && (
                  <SelectedEntityInfo
                    entityType="opportunity"
                    entityData={selectedEntities?.opportunity}
                  />
                )}

                <EntitySearchSelector
                  entityType="property"
                  value={watchedValues?.property}
                  onChange={(value) => handleEntitySelect('property', value)}
                  error={errors?.property?.message}
                  disabled={isLoading}
                  onCreateNew={() => handleCreateEntity('property')}
                />

                {selectedEntities?.property && (
                  <SelectedEntityInfo
                    entityType="property"
                    entityData={selectedEntities?.property}
                  />
                )}

                <EntitySearchSelector
                  entityType="contact"
                  value={watchedValues?.contact}
                  onChange={(value) => handleEntitySelect('contact', value)}
                  error={errors?.contact?.message}
                  disabled={isLoading}
                  onCreateNew={() => handleCreateEntity('contact')}
                />

                {selectedEntities?.contact && (
                  <SelectedEntityInfo
                    entityType="contact"
                    entityData={selectedEntities?.contact}
                  />
                )}
              </div>

              {/* Enhanced Outcome and Notes with Follow-up */}
              <OutcomeNotesSection
                outcome={watchedValues?.outcome}
                onOutcomeChange={(value) => setValue('outcome', value)}
                notes={watchedValues?.notes}
                onNotesChange={(value) => setValue('notes', value)}
                outcomeError={errors?.outcome?.message}
                notesError={errors?.notes?.message}
                disabled={isLoading}
                selectedEntityData={{
                  account: watchedValues?.account,
                  contact: watchedValues?.contact,
                  property: watchedValues?.property,
                  opportunity: watchedValues?.opportunity // Include opportunity context
                }}
                onFollowUpCreated={handleFollowUpCreated}
              />
            </div>

            {/* Form Actions */}
            <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
              <ActivityFormActions
                onSave={handleSubmit(onSubmit)}
                onSaveAndNew={handleSubmit(handleSaveAndNew)}
                onCancel={handleCancel}
                isLoading={isLoading}
                disabled={!isValid || !watchedValues?.activityType}
                showSaveAndNew={true}
              />
            </div>
          </form>
        </div>
      </main>
      {/* Quick Action Button for Mobile */}
      <QuickActionButton 
        variant="floating"
        className="lg:hidden"
        disabled={isLoading}
        onClick={() => {}}
      />
      {/* Entity Creator Modal */}
      <QuickEntityCreator
        entityType={creatorEntityType}
        isOpen={showEntityCreator}
        onClose={() => setShowEntityCreator(false)}
        onSave={handleEntityCreated}
        disabled={isLoading}
      />
    </div>
  );
};

export default LogActivity;