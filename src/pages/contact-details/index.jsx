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
import { contactsService } from '../../services/contactsService';
import { activitiesService } from '../../services/activitiesService';

const ContactDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [relatedContacts, setRelatedContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('activities');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data for contact details - in a real app this would come from the database
  const mockContactData = {
    id: parseInt(id),
    name: "Sarah Johnson",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@westfieldproperties.com",
    phone: "(555) 123-4567",
    mobilePhone: "(555) 987-6543",
    role: "Property Manager",
    title: "Senior Property Manager",
    account: "Westfield Properties",
    accountId: 1,
    property: "Westfield Industrial Complex",
    propertyId: 1,
    stage: "Engaged",
    lastInteraction: new Date(2025, 8, 3),
    createdAt: new Date(2025, 7, 15),
    updatedAt: new Date(2025, 8, 3),
    isPrimaryContact: true,
    notes: "Key decision maker for property management decisions. Very responsive to emails and prefers morning calls.",
    linkedInUrl: "https://linkedin.com/in/sarahjohnson",
    companyWebsite: "https://westfieldproperties.com",
    address: "123 Business Park Drive, Suite 200, Atlanta, GA 30309",
    department: "Operations",
    reportsTo: "Michael Thompson - VP of Operations",
    decisionMakingAuthority: "High",
    preferredCommunication: "Email",
    timeZone: "EST"
  };

  const mockActivities = [
    {
      id: 1,
      type: "Email",
      subject: "Follow-up on HVAC maintenance proposal",
      description: "Sent detailed proposal for HVAC maintenance contract renewal. Included pricing options and timeline.",
      outcome: "Positive",
      date: new Date(2025, 8, 3, 14, 30),
      duration: 30,
      nextAction: "Call to discuss proposal",
      nextActionDate: new Date(2025, 8, 5)
    },
    {
      id: 2,
      type: "Phone Call",
      subject: "Quarterly check-in call",
      description: "Discussed current facility needs and upcoming projects. Sarah mentioned interest in energy efficiency upgrades.",
      outcome: "Engaged",
      date: new Date(2025, 7, 28, 10, 0),
      duration: 45,
      nextAction: "Send energy audit proposal",
      nextActionDate: new Date(2025, 8, 2)
    },
    {
      id: 3,
      type: "Meeting",
      subject: "Site visit and facility walkthrough",
      description: "Conducted comprehensive facility assessment. Identified 3 immediate maintenance opportunities.",
      outcome: "Very Positive",
      date: new Date(2025, 7, 20, 9, 0),
      duration: 120,
      nextAction: "Prepare maintenance proposal",
      nextActionDate: new Date(2025, 7, 25)
    },
    {
      id: 4,
      type: "Email",
      subject: "Introduction and company overview",
      description: "Initial outreach email introducing our services and requesting a brief call to discuss their facility needs.",
      outcome: "Neutral",
      date: new Date(2025, 7, 15, 16, 0),
      duration: 15,
      nextAction: "Follow-up call",
      nextActionDate: new Date(2025, 7, 18)
    }
  ];

  const mockRelatedContacts = [
    {
      id: 2,
      name: "Michael Thompson",
      role: "VP of Operations",
      relationship: "Reports To",
      influence: "High",
      lastInteraction: new Date(2025, 7, 25)
    },
    {
      id: 3,
      name: "Jennifer Davis",
      role: "Facility Coordinator", 
      relationship: "Works With",
      influence: "Medium",
      lastInteraction: new Date(2025, 7, 30)
    },
    {
      id: 4,
      name: "Robert Kim",
      role: "Maintenance Supervisor",
      relationship: "Collaborates With",
      influence: "Medium",
      lastInteraction: new Date(2025, 8, 1)
    }
  ];

  useEffect(() => {
    loadContactData();
  }, [id]);

  const loadContactData = async () => {
    if (!id) {
      setError('Contact ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real app, this would fetch from the database
      // const contactResult = await contactsService.getContact(id);
      // const activitiesResult = await activitiesService.getActivities({ contactId: id });
      
      // Using mock data for now
      setContact(mockContactData);
      setActivities(mockActivities);
      setRelatedContacts(mockRelatedContacts);
    } catch (err) {
      setError(err?.message || 'Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (newStage) => {
    try {
      // In a real app, this would update the database
      // await contactsService.updateContact(id, { stage: newStage });
      setContact(prev => ({ ...prev, stage: newStage, updatedAt: new Date() }));
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleProfileUpdate = async (updates) => {
    try {
      // In a real app, this would update the database
      // await contactsService.updateContact(id, updates);
      setContact(prev => ({ ...prev, ...updates, updatedAt: new Date() }));
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleActivityLog = (activityData) => {
    navigate('/log-activity', { 
      state: { 
        contactId: contact?.id,
        contactName: contact?.name,
        accountId: contact?.accountId,
        accountName: contact?.account
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

  const handleNavigateToProperty = () => {
    if (contact?.propertyId) {
      navigate(`/properties-list?highlight=${contact?.propertyId}`);
    }
  };

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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={() => {}} />
        <div className="pt-16 px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <button
                onClick={() => navigate('/contacts-list')}
                className="text-primary hover:underline"
              >
                Back to Contacts List
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={() => {}} />
        <div className="pt-16 px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Contact not found</p>
              <button
                onClick={() => navigate('/contacts-list')}
                className="text-primary hover:underline"
              >
                Back to Contacts List
              </button>
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
    </div>
  );
};

export default ContactDetails;