import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import AccountHeader from './components/AccountHeader';
import TabNavigation from './components/TabNavigation';
import PropertiesTab from './components/PropertiesTab';
import ContactsTab from './components/ContactsTab';
import ActivitiesTab from './components/ActivitiesTab';
import { useAuth } from '../../contexts/AuthContext';
import { accountsService } from '../../services/accountsService';
import { propertiesService } from '../../services/propertiesService';

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
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Mock activities data - replace with actual service call
  const mockActivities = [
    {
      id: '1',
      type: 'proposal_sent',
      timestamp: '2024-09-03T14:30:00Z',
      property: 'Northside Warehouse',
      contact: 'Mike Chen',
      outcome: 'Positive Response',
      notes: 'Sent comprehensive proposal for roof replacement. Mike mentioned they have budget approval and are looking to start work in Q4.',
      next_action: 'Follow up in 3 days to discuss timeline and answer any questions'
    },
    {
      id: '2',
      type: 'assessment_booked',
      timestamp: '2024-09-01T10:15:00Z',
      property: 'Downtown Office Tower',
      contact: 'Lisa Rodriguez',
      outcome: 'Scheduled',
      notes: 'Booked assessment for September 10th at 9 AM. Lisa will meet us on-site to provide building access.',
      next_action: 'Confirm assessment 24 hours before scheduled time'
    }
  ];

  useEffect(() => {
    if (!accountId) {
      navigate('/accounts-list');
      return;
    }
    
    loadAccount();
    loadProperties();
  }, [accountId, navigate]);

  useEffect(() => {
    // Handle tab from URL params
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['properties', 'contacts', 'activities']?.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Listen for focus events to refresh data when user returns from adding property
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if user is on properties tab and account is loaded
      if (activeTab === 'properties' && account && !propertiesLoading) {
        loadProperties();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeTab, account, propertiesLoading]);

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
        setProperties(result?.data || []);
      } else {
        console.error('Error loading properties:', result?.error);
        // Don't show error for properties, just use empty array
        setProperties([]);
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Update URL without full navigation
    const newParams = new URLSearchParams(searchParams);
    newParams?.set('tab', tabId);
    navigate(`/account-details/${accountId}?${newParams?.toString()}`, { replace: true });
  };

  const handleEditAccount = () => {
    console.log('Edit account:', accountId);
    // Navigate to edit account form
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

  // Handle property refresh after adding/editing
  const handlePropertiesRefresh = () => {
    loadProperties();
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
            onRefresh={handlePropertiesRefresh}
          />
        );
      case 'contacts':
        return (
          <ContactsTab
            accountId={accountId}
            contacts={mockContacts}
            onAddContact={handleAddContact}
          />
        );
      case 'activities':
        return (
          <ActivitiesTab
            accountId={accountId}
            activities={mockActivities}
            onLogActivity={handleLogActivity}
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
          contactsCount={mockContacts?.length}
          activitiesCount={mockActivities?.length}
        />

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
      
      {/* Mobile Quick Action Button */}
      <QuickActionButton onClick={handleLogActivity} />
    </div>
  );
};

export default AccountDetails;