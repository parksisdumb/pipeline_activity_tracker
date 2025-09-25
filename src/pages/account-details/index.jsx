import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';



import EditAccountModal from '../../components/ui/EditAccountModal';
import AccountHeader from './components/AccountHeader';
import TabNavigation from './components/TabNavigation';
import PropertiesTab from './components/PropertiesTab';
import ContactsTab from './components/ContactsTab';
import ActivitiesTab from './components/ActivitiesTab';
import { useAuth } from '../../contexts/AuthContext';
import { accountsService } from '../../services/accountsService';
import { propertiesService } from '../../services/propertiesService';
import { contactsService } from '../../services/contactsService';
import { activitiesService } from '../../services/activitiesService';
import { AssignRepsModal } from '../manager-dashboard/components/AssignRepsModal';
import LinkPropertyModal from '../../components/ui/LinkPropertyModal';
import AddContactModal from '../../components/ui/AddContactModal';



const AccountDetails = () => {
  const navigate = useNavigate();
  const { id: accountId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'properties');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [account, setAccount] = useState(null);
  const [properties, setProperties] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  // Add missing state variables
  const [showLinkPropertyModal, setShowLinkPropertyModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  // Mock contacts data - replace with actual service call
  const mockContacts = [
    {
      id: '1',
      first_name: "Sarah",
      last_name: "Johnson",
      title: "Property Manager",
      email: "sarah.johnson@metroprop.com",
      phone: "(404) 555-0123",
      stage: "Engaged",
      last_contact: "2 days ago"
    },
    {
      id: '2',
      first_name: "Mike",
      last_name: "Chen",
      title: "Facilities Director",
      email: "mike.chen@metroprop.com",
      phone: "(404) 555-0124",
      stage: "DM Confirmed",
      last_contact: "1 week ago"
    }
  ];

  useEffect(() => {
    if (!accountId) {
      navigate('/accounts');
      return;
    }
    
    loadAccount();
    loadProperties();
    loadContacts();
    loadActivities();
  }, [accountId, navigate]);

  useEffect(() => {
    // Handle tab from URL params
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['properties', 'contacts', 'activities']?.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadAccount = async () => {
    if (!accountId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await accountsService?.getAccount(accountId);
      
      if (result?.success) {
        setAccount(result?.data);
      } else {
        setError('Account not found');
        // Navigate back to accounts list after a delay
        setTimeout(() => {
          navigate('/accounts');
        }, 2000);
      }
    } catch (err) {
      console.error('Error loading account:', err);
      setError('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    if (!accountId || !user) return;

    setPropertiesLoading(true);

    try {
      const result = await propertiesService?.getPropertiesByAccount(accountId);
      
      if (result?.success) {
        // Map the database fields to match the component expectations
        const mappedProperties = result?.data?.map(property => ({
          id: property?.id,
          name: property?.name,
          address: property?.address,
          building_type: property?.building_type,
          buildingType: property?.building_type, // Keep both for compatibility
          roof_type: property?.roof_type,
          roofType: property?.roof_type, // Keep both for compatibility
          stage: property?.stage,
          square_footage: property?.square_footage,
          squareFootage: property?.square_footage, // Keep both for compatibility
          year_built: property?.year_built,
          city: property?.city,
          state: property?.state,
          zip_code: property?.zip_code,
          created_at: property?.created_at,
          updated_at: property?.updated_at,
          last_assessment: property?.last_assessment,
          notes: property?.notes
        }));
        
        setProperties(mappedProperties || []);
      } else {
        console.error('Failed to load properties:', result?.error);
        setProperties([]);
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!accountId || !user) return;

    setContactsLoading(true);

    try {
      const result = await contactsService?.getContactsByAccount(accountId);
      
      if (result?.success) {
        // Map the database fields to match the component expectations
        const mappedContacts = result?.data?.map(contact => ({
          id: contact?.id,
          name: `${contact?.first_name} ${contact?.last_name}`,
          first_name: contact?.first_name,
          last_name: contact?.last_name,
          title: contact?.title,
          role: contact?.title, // Map title to role for component compatibility
          email: contact?.email,
          phone: contact?.phone,
          mobile_phone: contact?.mobile_phone,
          stage: contact?.stage,
          is_primary_contact: contact?.is_primary_contact,
          property_id: contact?.property_id,
          created_at: contact?.created_at,
          updated_at: contact?.updated_at,
          notes: contact?.notes,
          // Add any computed fields if needed
          lastContact: contact?.updated_at ? getRelativeTime(contact?.updated_at) : null
        }));
        
        setContacts(mappedContacts || []);
        console.log('Loaded contacts for account:', accountId, 'count:', mappedContacts?.length);
      } else {
        console.error('Failed to load contacts:', result?.error);
        setContacts([]);
        // Show error message to user if it's not just empty results
        if (result?.error && !result?.error?.includes('not found')) {
          setError(`Failed to load contacts: ${result?.error}`);
        }
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
      setContacts([]);
      setError('Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const loadActivities = async () => {
    if (!accountId || !user) return;

    setActivitiesLoading(true);

    try {
      const result = await activitiesService?.getActivitiesByAccount(accountId);
      
      if (result?.success) {
        // Map database fields to match the component expectations
        const mappedActivities = result?.data?.map(activity => ({
          id: activity?.id,
          type: mapActivityTypeToUIType(activity?.activity_type),
          timestamp: activity?.activity_date,
          property: activity?.property?.name,
          contact: activity?.contact ? 
            `${activity?.contact?.first_name} ${activity?.contact?.last_name}` : null,
          outcome: activity?.outcome,
          notes: activity?.notes,
          nextAction: activity?.description,
          subject: activity?.subject,
          // Keep database fields for reference
          activity_type: activity?.activity_type,
          activity_date: activity?.activity_date,
          follow_up_date: activity?.follow_up_date,
          duration_minutes: activity?.duration_minutes,
          user: activity?.user,
          created_at: activity?.created_at
        }));
        
        setActivities(mappedActivities || []);
      } else {
        console.error('Failed to load activities:', result?.error);
        setActivities([]);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Map database activity types to UI types expected by component
  const mapActivityTypeToUIType = (dbActivityType) => {
    const activityTypeMap = {
      'Phone Call': 'call',
      'Email': 'email', 
      'Meeting': 'meeting',
      'Site Visit': 'pop_in',
      'Proposal Sent': 'proposal_sent',
      'Follow-up': 'dm_conversation',
      'Assessment': 'assessment_booked',
      'Contract Signed': 'win'
    };
    return activityTypeMap?.[dbActivityType] || dbActivityType?.toLowerCase()?.replace(/\s+/g, '_');
  };

  // Helper function to get relative time (e.g., "2 days ago")
  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Fix: Update URL with correct path
    const newParams = new URLSearchParams(searchParams);
    newParams?.set('tab', tabId);
    navigate(`/account-details/${accountId}?${newParams?.toString()}`, { replace: true });
  };

  const handleEditAccount = () => {
    setIsEditModalOpen(true);
  };

  const handleAccountUpdated = (updatedAccount) => {
    // Update the account state with the new data
    setAccount(updatedAccount);
    // Optionally refresh the account data from server
    loadAccount();
  };

  const handleLogActivity = () => {
    navigate(`/log-activity?accountId=${accountId}`);
  };

  const handleAddProperty = () => {
    navigate(`/add-property-modal?accountId=${accountId}`);
  };

  const handleAddContact = () => {
    navigate(`/add-contact-modal?accountId=${accountId}`);
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleAssignReps = () => {
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    loadAccount(); // Refresh account data to show updated assignments
  };

  // Add missing handler functions
  const handleLinkSuccess = () => {
    loadProperties(); // Refresh properties after linking
    setShowLinkPropertyModal(false);
  };

  const handleContactAdded = () => {
    loadContacts(); // Refresh contacts after adding
    setShowAddContactModal(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties':
        return (
          <PropertiesTab
            accountId={accountId}
            properties={properties}
            loading={propertiesLoading}
            onAddProperty={handleAddProperty}
            onRefreshProperties={loadProperties}
          />
        );
      case 'contacts':
        return (
          <ContactsTab
            accountId={accountId}
            contacts={contacts}
            loading={contactsLoading}
            onAddContact={handleAddContact}
            onRefreshContacts={loadContacts}
          />
        );
      case 'activities':
        return (
          <ActivitiesTab
            accountId={accountId}
            activities={activities}
            loading={activitiesLoading}
            onLogActivity={handleLogActivity}
            onRefreshActivities={loadActivities}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading account details...</span>
        </div>
      ) : account ? (
        <>
          <AccountHeader 
            account={account} 
            onEdit={() => setIsEditModalOpen(true)}
            onEditAccount={() => setIsEditModalOpen(true)}
            onAssignReps={handleAssignReps}
            onLogActivity={handleLogActivity}
            currentUser={user}
          />

          {/* Tab Navigation */}
          <TabNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            propertiesCount={properties?.length}
            contactsCount={contacts?.length}
            activitiesCount={activities?.length}
          />

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>

          {/* Existing Modals */}
          <EditAccountModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            account={account}
            onAccountUpdated={handleAccountUpdated}
          />

          <LinkPropertyModal
            isOpen={showLinkPropertyModal}
            onClose={() => setShowLinkPropertyModal(false)}
            account={account}
            contact={null}
            onSuccess={handleLinkSuccess}
          />

          <AddContactModal
            isOpen={showAddContactModal}
            onClose={() => setShowAddContactModal(false)}
            account={account}
            onContactAdded={handleContactAdded}
            onSuccess={handleContactAdded}
          />

          {/* New Assign Reps Modal */}
          <AssignRepsModal
            isOpen={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            account={account}
            onSuccess={handleAssignSuccess}
          />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Account not found</p>
        </div>
      )}
    </div>
  );
};

export default AccountDetails;