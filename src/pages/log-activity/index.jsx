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

const LogActivity = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEntityCreator, setShowEntityCreator] = useState(false);
  const [creatorEntityType, setCreatorEntityType] = useState('account');
  const [selectedEntities, setSelectedEntities] = useState({
    account: null,
    property: null,
    contact: null
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm({
    defaultValues: {
      activityType: 'pop_in',
      account: '',
      property: '',
      contact: '',
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
      if (state?.activityType) {
        setValue('activityType', state?.activityType);
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const activityData = {
        ...data,
        timestamp: new Date()?.toISOString(),
        user_id: 'user_123',
        id: `activity_${Date.now()}`
      };

      console.log('Activity logged:', activityData);
      
      // Show success feedback
      alert('Activity logged successfully!');
      
      // Navigate back to previous page or Today screen
      navigate(-1);
      
    } catch (error) {
      console.error('Error logging activity:', error);
      alert('Failed to log activity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndNew = async (data) => {
    await onSubmit(data);
    
    // Reset form for new entry but keep entity selections for efficiency
    reset({
      activityType: 'pop_in',
      account: watchedValues?.account,
      property: watchedValues?.property,
      contact: watchedValues?.contact,
      outcome: '',
      notes: ''
    });
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
                  Quickly record your field activities and interactions
                </p>
              </div>
            </div>
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

              {/* Outcome and Notes */}
              <OutcomeNotesSection
                outcome={watchedValues?.outcome}
                onOutcomeChange={(value) => setValue('outcome', value)}
                notes={watchedValues?.notes}
                onNotesChange={(value) => setValue('notes', value)}
                outcomeError={errors?.outcome?.message}
                notesError={errors?.notes?.message}
                disabled={isLoading}
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