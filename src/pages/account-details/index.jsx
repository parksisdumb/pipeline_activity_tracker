import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
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
      navigate('/accounts-list');
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
          navigate('/accounts-list');
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
    // Update URL without full navigation
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading account details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate('/accounts-list')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  // No account found
  if (!account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Account Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested account could not be found.</p>
          <button 
            onClick={() => navigate('/accounts-list')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header
          userRole={user?.user_metadata?.role || 'rep'}
          onMenuToggle={handleMobileMenuToggle}
          isMenuOpen={isMobileMenuOpen}
        />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarNavigation
          userRole={user?.user_metadata?.role || 'rep'}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
        />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={handleMobileMenuToggle} />
          <SidebarNavigation
            userRole={user?.user_metadata?.role || 'rep'}
            isCollapsed={false}
            onToggleCollapse={handleMobileMenuToggle}
            className="relative z-50"
          />
        </div>
      )}
      
      {/* Main Content */}
      <div className={`transition-all duration-200 ease-out ${
        isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
      } pt-16 lg:pt-0`}>
        {/* Account Header */}
        <AccountHeader
          account={account}
          onEditAccount={handleEditAccount}
          onLogActivity={handleLogActivity}
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
      </div>
      
      {/* Mobile Quick Action Button */}
      <QuickActionButton onClick={handleLogActivity} />

      {/* Edit Account Modal */}
      <EditAccountModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAccountUpdated={handleAccountUpdated}
        account={account}
      />
    </div>
  );
};

export default AccountDetails;