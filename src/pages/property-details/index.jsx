import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import PropertyHeader from './components/PropertyHeader';
import PropertyInformation from './components/PropertyInformation';
import StageManagement from './components/StageManagement';
import ActivitiesTab from './components/ActivitiesTab';
import PropertyEditor from './components/PropertyEditor';
import QuickActions from './components/QuickActions';
import { propertiesService } from '../../services/propertiesService';
import { activitiesService } from '../../services/activitiesService';
import { useAuth } from '../../contexts/AuthContext';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [property, setProperty] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('activities');
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      loadPropertyData();
    }
  }, [id]);

  const loadPropertyData = async () => {
    if (!id) {
      setError('Property ID is required');
      setLoading(false);
      return;
    }

    // Add validation for route parameter issues
    if (id === ':id' || id?.includes(':id')) {
      setError('Invalid property ID. Please navigate from the properties list.');
      setLoading(false);
      return;
    }

    // Add UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex?.test(id)) {
      setError('Invalid property ID format. Please check the URL and try again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load property details
      const propertyResult = await propertiesService?.getProperty(id);
      if (!propertyResult?.success) {
        setError(propertyResult?.error || 'Failed to load property');
        setLoading(false);
        return;
      }

      setProperty(propertyResult?.data);

      // Load property activities
      const activitiesResult = await activitiesService?.getActivities({ propertyId: id });
      if (activitiesResult?.success) {
        setActivities(activitiesResult?.data || []);
      }

    } catch (err) {
      setError(err?.message || 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (newStage) => {
    if (!property?.id) return;

    try {
      const result = await propertiesService?.updateProperty(property?.id, { stage: newStage });
      if (result?.success) {
        setProperty(prev => ({ 
          ...prev, 
          stage: newStage, 
          updated_at: new Date()?.toISOString() 
        }));
      } else {
        setError(result?.error || 'Failed to update property stage');
      }
    } catch (err) {
      console.error('Failed to update stage:', err);
      setError('Failed to update property stage');
    }
  };

  const handlePropertyUpdate = async (updates) => {
    if (!property?.id) return;

    try {
      const result = await propertiesService?.updateProperty(property?.id, updates);
      if (result?.success) {
        setProperty(prev => ({ 
          ...prev, 
          ...updates, 
          updated_at: new Date()?.toISOString() 
        }));
        setIsEditingProperty(false);
      } else {
        setError(result?.error || 'Failed to update property');
      }
    } catch (err) {
      console.error('Failed to update property:', err);
      setError('Failed to update property');
    }
  };

  const handleActivityLog = () => {
    navigate('/log-activity', { 
      state: { 
        propertyId: property?.id,
        propertyName: property?.name,
        accountId: property?.account_id,
        accountName: property?.account?.name
      }
    });
  };

  const handleNavigateToAccount = () => {
    if (property?.account_id) {
      navigate(`/account-details/${property?.account_id}`);
    }
  };

  const handleScheduleAssessment = () => {
    navigate('/log-activity', { 
      state: { 
        propertyId: property?.id,
        propertyName: property?.name,
        activityType: 'Assessment'
      }
    });
  };

  const handleBack = () => {
    navigate('/properties-list');
  };

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          userRole={user?.user_metadata?.role || 'rep'}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMenuOpen={isMobileMenuOpen}
        />
        <SidebarNavigation
          userRole={user?.user_metadata?.role || 'rep'}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:block"
        />
        <main className={`pt-16 transition-all duration-200 ${
          isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}>
          <div className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading property details...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          userRole={user?.user_metadata?.role || 'rep'}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMenuOpen={isMobileMenuOpen}
        />
        <SidebarNavigation
          userRole={user?.user_metadata?.role || 'rep'}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:block"
        />
        <main className={`pt-16 transition-all duration-200 ${
          isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}>
          <div className="p-6">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <button
                onClick={handleBack}
                className="text-primary hover:underline"
              >
                Back to Properties List
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show not found state
  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          userRole={user?.user_metadata?.role || 'rep'}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMenuOpen={isMobileMenuOpen}
        />
        <SidebarNavigation
          userRole={user?.user_metadata?.role || 'rep'}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:block"
        />
        <main className={`pt-16 transition-all duration-200 ${
          isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}>
          <div className="p-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Property not found</p>
              <button
                onClick={handleBack}
                className="text-primary hover:underline"
              >
                Back to Properties List
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        userRole={user?.user_metadata?.role || 'rep'}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
      />

      {/* Sidebar Navigation */}
      <SidebarNavigation
        userRole={user?.user_metadata?.role || 'rep'}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="hidden lg:block"
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarNavigation
            userRole={user?.user_metadata?.role || 'rep'}
            isCollapsed={false}
            onToggleCollapse={() => setIsMobileMenuOpen(false)}
            className="relative z-10"
          />
        </div>
      )}

      {/* Main Content */}
      <main className={`pt-16 transition-all duration-200 ${
        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Property Header */}
          <PropertyHeader 
            property={property}
            onNavigateToAccount={handleNavigateToAccount}
            onEdit={() => setIsEditingProperty(true)}
            onBack={handleBack}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Property Information & Stage Management */}
            <div className="lg:col-span-1 space-y-6">
              <PropertyInformation 
                property={property}
              />
              
              <StageManagement 
                currentStage={property?.stage}
                lastAssessment={property?.last_assessment}
                onStageUpdate={handleStageUpdate}
              />

              <QuickActions 
                property={property}
                onActivityLog={handleActivityLog}
                onScheduleAssessment={handleScheduleAssessment}
              />
            </div>

            {/* Right Column - Activities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Navigation */}
              <div className="bg-card rounded-lg border border-border">
                <div className="border-b border-border px-6 py-4">
                  <div className="flex space-x-8">
                    <button
                      onClick={() => setActiveTab('activities')}
                      className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                        activeTab === 'activities' ?'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Activities ({activities?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'activities' && (
                    <ActivitiesTab 
                      activities={activities}
                      propertyId={property?.id}
                      onActivityLog={handleActivityLog}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Property Editor Modal */}
        {isEditingProperty && (
          <PropertyEditor 
            property={property}
            onSave={handlePropertyUpdate}
            onCancel={() => setIsEditingProperty(false)}
          />
        )}
      </main>
    </div>
  );
};

export default PropertyDetails;