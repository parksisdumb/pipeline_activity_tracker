import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import ContactHeader from './components/ContactHeader';
import ContactInformation from './components/ContactInformation';
import StageManagement from './components/StageManagement';
import ActivitiesTab from './components/ActivitiesTab';
import ProfileEditor from './components/ProfileEditor';
import QuickActions from './components/QuickActions';
import RelationshipMap from './components/RelationshipMap';

import PropertiesModal from '../../components/ui/PropertiesModal';
import { contactsService } from '../../services/contactsService';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const ContactDetails = () => {
  const { id: contactId } = useParams(); // Fixed: Extract 'id' and rename to 'contactId'
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activities, setActivities] = useState([]);
  const [relatedContacts, setRelatedContacts] = useState([]);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);

  // Enhanced parameter validation with better error handling
  useEffect(() => {
    if (!contactId) {
      console.error('No contact ID provided in URL');
      setError('Contact ID is required');
      setLoading(false);
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex?.test(contactId)) {
      console.error('Invalid contact ID format in URL:', contactId);
      setError('Invalid contact ID format');
      setLoading(false);
      return;
    }

    // Load contact details
    loadContactDetails();
  }, [contactId]);

  // Enhanced loadContactDetails with better error handling
  const loadContactDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call the actual contacts service to get real data from database
      const result = await contactsService?.getContact(contactId);
      
      if (result?.success && result?.data) {
        // Transform database data to match the expected format
        const contactData = {
          id: result?.data?.id,
          name: `${result?.data?.first_name || ''} ${result?.data?.last_name || ''}`?.trim(),
          firstName: result?.data?.first_name || '',
          lastName: result?.data?.last_name || '',
          email: result?.data?.email || '',
          phone: result?.data?.phone || '',
          mobilePhone: result?.data?.mobile_phone || '',
          role: result?.data?.title || 'Contact',
          title: result?.data?.title || '',
          account: result?.data?.account?.name || 'Unknown Account',
          accountId: result?.data?.account_id,
          property: null, // Properties are not directly linked in current schema
          propertyId: result?.data?.property_id,
          stage: result?.data?.stage || 'Identified',
          lastInteraction: result?.data?.updated_at ? new Date(result?.data?.updated_at) : new Date(result?.data?.created_at),
          createdAt: new Date(result?.data?.created_at),
          updatedAt: new Date(result?.data?.updated_at || result?.data?.created_at),
          isPrimaryContact: result?.data?.is_primary_contact || false,
          notes: result?.data?.notes || '',
          // Additional fields that might not be in database - provide fallbacks
          linkedInUrl: '',
          companyWebsite: result?.data?.account?.website || '',
          address: result?.data?.account?.address || '',
          department: '',
          reportsTo: '',
          decisionMakingAuthority: 'Unknown',
          preferredCommunication: 'Email',
          timeZone: 'EST'
        };

        setContact(contactData);
        console.log('Contact loaded successfully:', contactData);
        
        // Load related activities if available
        if (result?.data?.activities) {
          const transformedActivities = result?.data?.activities?.map(activity => ({
            id: activity?.id,
            type: activity?.type || 'General',
            subject: activity?.description?.split('.')?.[0] || 'Contact Activity',
            description: activity?.description || '',
            outcome: activity?.outcome || 'Pending',
            date: new Date(activity?.created_at),
            duration: 30, // Default duration
            nextAction: '',
            nextActionDate: null
          })) || [];
          
          setActivities(transformedActivities);
        } else {
          setActivities([]);
        }
        
        // Set empty related contacts for now (could be enhanced later)
        setRelatedContacts([]);
      } else {
        throw new Error(result?.error || 'Contact not found');
      }
    } catch (err) {
      console.error('Error loading contact:', err);
      setError(err?.message || 'Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (newStage) => {
    try {
      // Update the database with the new stage
      const result = await contactsService?.updateContact(contactId, { stage: newStage });
      
      if (result?.success) {
        setContact(prev => ({ ...prev, stage: newStage, updatedAt: new Date() }));
      } else {
        throw new Error(result?.error || 'Failed to update stage');
      }
    } catch (err) {
      console.error('Failed to update stage:', err);
      // Show error to user - in a real app, you'd want a toast notification
      alert('Failed to update contact stage. Please try again.');
    }
  };

  const handleProfileUpdate = async (updates) => {
    try {
      // Convert UI format back to database format
      const dbUpdates = {
        first_name: updates?.firstName,
        last_name: updates?.lastName,
        email: updates?.email,
        phone: updates?.phone,
        mobile_phone: updates?.mobilePhone,
        title: updates?.title,
        notes: updates?.notes,
        stage: updates?.stage
      };

      // Remove undefined values
      Object.keys(dbUpdates)?.forEach(key => {
        if (dbUpdates?.[key] === undefined) {
          delete dbUpdates?.[key];
        }
      });

      const result = await contactsService?.updateContact(contactId, dbUpdates);
      
      if (result?.success) {
        setContact(prev => ({ ...prev, ...updates, updatedAt: new Date() }));
        setIsEditingProfile(false);
      } else {
        throw new Error(result?.error || 'Failed to update contact');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Show error to user - in a real app, you'd want a toast notification
      alert('Failed to update contact profile. Please try again.');
    }
  };

  const handleContactUpdate = () => {
    // Reload contact data when updates occur
    loadContactDetails();
  };

  const handleActivityLog = (activityData) => {
    navigate('/log-activity', { 
      state: { 
        preselected: true,
        contactId: contact?.id,
        contactName: contact?.name,
        accountId: contact?.accountId,
        accountName: contact?.account,
        contact: {
          value: contact?.id,
          label: contact?.name,
          description: `${contact?.title || 'Contact'} at ${contact?.account}`
        },
        account: {
          value: contact?.accountId,
          label: contact?.account,
          description: 'Account'
        }
      }
    });
  };

  const handlePhoneCall = (phoneNumber) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleEmail = (emailAddress) => {
    window.open(`mailto:${emailAddress}`, '_self');
  };

  const handleNavigateToAccount = () => {
    if (contact?.accountId) {
      navigate(`/account-details?id=${contact?.accountId}`);
    }
  };

  const handleNavigateToProperty = (propertyId) => {
    if (propertyId) {
      navigate(`/property-details/${propertyId}`);
    }
  };

  // Enhanced loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={() => {}} />
        <div className="pt-16 px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading contact details...</p>
                <p className="text-sm text-muted-foreground mt-2">ID: {contactId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={() => {}} />
        <div className="pt-16 px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="AlertTriangle" size={24} className="text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Contact</h2>
                <p className="text-destructive mb-4">{error}</p>
                <p className="text-sm text-muted-foreground mb-6">Contact ID: {contactId}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => loadContactDetails()}
                >
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/contacts-list')}
                >
                  <Icon name="ArrowLeft" size={16} className="mr-2" />
                  Back to Contacts
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced not found state
  if (!contact) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={() => {}} />
        <div className="pt-16 px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="UserX" size={24} className="text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Contact Not Found</h2>
                <p className="text-muted-foreground mb-4">The requested contact could not be found.</p>
                <p className="text-sm text-muted-foreground mb-6">ID: {contactId}</p>
              </div>
              <Button
                onClick={() => navigate('/contacts-list')}
              >
                <Icon name="ArrowLeft" size={16} className="mr-2" />
                Back to Contacts List
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={() => {}} />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Contact Header */}
          <ContactHeader 
            contact={contact}
            onNavigateToAccount={handleNavigateToAccount}
            onNavigateToProperty={handleNavigateToProperty}
            onEdit={() => setIsEditingProfile(true)}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Contact Information & Stage Management */}
            <div className="lg:col-span-1 space-y-6">
              <ContactInformation 
                contact={contact}
                onPhoneCall={handlePhoneCall}
                onEmail={handleEmail}
              />
              
              <StageManagement 
                currentStage={contact?.stage}
                lastInteraction={contact?.lastInteraction}
                onStageUpdate={handleStageUpdate}
              />

              <QuickActions 
                contact={contact}
                onActivityLog={handleActivityLog}
                onPhoneCall={() => handlePhoneCall(contact?.phone)}
                onEmail={() => handleEmail(contact?.email)}
                onContactUpdate={handleContactUpdate}
              />
            </div>

            {/* Right Column - Activities & Relationships */}
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
                    <button
                      onClick={() => setActiveTab('relationships')}
                      className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                        activeTab === 'relationships' ?'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Relationships ({relatedContacts?.length || 0})
                    </button>
                    <button
                      onClick={() => setShowPropertiesModal(true)}
                      className="text-sm font-medium pb-2 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon name="Building2" size={16} className="mr-1 inline" />
                      Properties
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'activities' && (
                    <ActivitiesTab 
                      activities={activities}
                      contactId={contact?.id}
                      onActivityLog={handleActivityLog}
                    />
                  )}
                  
                  {activeTab === 'relationships' && (
                    <RelationshipMap 
                      contacts={relatedContacts}
                      currentContact={contact}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Editor Modal */}
      {isEditingProfile && (
        <ProfileEditor 
          contact={contact}
          onSave={handleProfileUpdate}
          onCancel={() => setIsEditingProfile(false)}
        />
      )}

      {/* Properties Modal */}
      <PropertiesModal
        isOpen={showPropertiesModal}
        onClose={() => setShowPropertiesModal(false)}
        contact={contact}
        onNavigateToProperty={handleNavigateToProperty}
      />
    </div>
  );
};

export default ContactDetails;