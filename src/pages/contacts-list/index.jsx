import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import ContactsHeader from './components/ContactsHeader';
import ContactsStats from './components/ContactsStats';
import ContactsFilters from './components/ContactsFilters';
import ContactsTable from './components/ContactsTable';
import QuickActionButton from '../../components/ui/QuickActionButton';
import AddContactModal from '../../components/ui/AddContactModal';
import { contactsService } from '../../services/contactsService';

const ContactsList = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole] = useState('rep'); // This would come from auth context
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    stage: '',
    account: '',
    property: ''
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'name',
    direction: 'asc'
  });
  const [selectedContacts, setSelectedContacts] = useState([]);

  // Load contacts from database on component mount
  useEffect(() => {
    loadContacts();
    // Set page title
    document.title = 'Contacts - Pipeline Activity Tracker';
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const result = await contactsService?.getContacts();
      
      if (result?.success) {
        // Transform database data to match the expected format
        const transformedContacts = result?.data?.map(contact => ({
          id: contact?.id,
          name: `${contact?.first_name || ''} ${contact?.last_name || ''}`?.trim(),
          email: contact?.email || '',
          phone: contact?.phone || contact?.mobile_phone || '',
          role: contact?.title || 'Contact',
          account: contact?.account?.name || 'Unknown Account',
          property: null, // Properties are not directly linked to contacts in the current schema
          stage: contact?.stage || 'Identified',
          lastInteraction: contact?.updated_at ? new Date(contact?.updated_at) : new Date(contact?.created_at),
          createdAt: new Date(contact?.created_at)
        })) || [];
        
        setContacts(transformedContacts);
      } else {
        console.error('Failed to load contacts:', result?.error);
        // If loading fails, fallback to empty array instead of mock data
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      // If loading fails, fallback to empty array instead of mock data
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let filtered = contacts?.filter(contact => {
      const matchesSearch = !filters?.search || 
        contact?.name?.toLowerCase()?.includes(filters?.search?.toLowerCase()) ||
        contact?.email?.toLowerCase()?.includes(filters?.search?.toLowerCase()) ||
        (contact?.phone && contact?.phone?.includes(filters?.search));
      
      const matchesRole = !filters?.role || contact?.role === filters?.role;
      const matchesStage = !filters?.stage || contact?.stage === filters?.stage;
      const matchesAccount = !filters?.account || 
        contact?.account?.toLowerCase()?.includes(filters?.account?.toLowerCase());
      const matchesProperty = !filters?.property || 
        (contact?.property && contact?.property?.toLowerCase()?.includes(filters?.property?.toLowerCase()));

      return matchesSearch && matchesRole && matchesStage && matchesAccount && matchesProperty;
    });

    // Sort contacts
    filtered?.sort((a, b) => {
      let aValue = a?.[sortConfig?.field];
      let bValue = b?.[sortConfig?.field];

      if (sortConfig?.field === 'lastInteraction') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortConfig?.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig?.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contacts, filters, sortConfig]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = contacts?.length;
    const engaged = contacts?.filter(c => c?.stage === 'Engaged')?.length;
    const dmConfirmed = contacts?.filter(c => c?.stage === 'DM Confirmed')?.length;
    const dormant = contacts?.filter(c => c?.stage === 'Dormant')?.length;

    return { total, engaged, dmConfirmed, dormant };
  }, [contacts]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev?.field === field && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleContactAction = (action, contactName) => {
    console.log(`${action} action for ${contactName}`);
    // In a real app, this would log the activity
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk ${action} for selected contacts`);
    // In a real app, this would handle bulk actions
  };

  const handleExport = () => {
    console.log('Exporting contacts...');
    // In a real app, this would export the filtered contacts
  };

  const handleContactAdded = async (newContact) => {
    try {
      // Reload contacts from database to show the newly added contact
      await loadContacts();
      setIsAddContactModalOpen(false);
    } catch (error) {
      console.error('Error refreshing contacts:', error);
    }
  };

  const handleAddContact = () => {
    setIsAddContactModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header - Show on all screen sizes for consistent profile access */}
        <Header 
          userRole={userRole}
          onMenuToggle={handleToggleMobileMenu}
          isMenuOpen={mobileMenuOpen}
        />

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarNavigation
            userRole={userRole}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={handleToggleMobileMenu} />
            <SidebarNavigation
              userRole={userRole}
              isCollapsed={false}
              onToggleCollapse={handleToggleMobileMenu}
              className="relative z-10"
            />
          </div>
        )}

        {/* Main Content */}
        <main 
          className={`transition-all duration-200 ease-out pt-16 ${
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
          }`}
        >
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading contacts...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Show on all screen sizes for consistent profile access */}
      <Header 
        userRole={userRole}
        onMenuToggle={handleToggleMobileMenu}
        isMenuOpen={mobileMenuOpen}
      />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarNavigation
          userRole={userRole}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={handleToggleMobileMenu} />
          <SidebarNavigation
            userRole={userRole}
            isCollapsed={false}
            onToggleCollapse={handleToggleMobileMenu}
            className="relative z-10"
          />
        </div>
      )}

      {/* Main Content */}
      <main 
        className={`transition-all duration-200 ease-out pt-16 ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}
      >
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <ContactsHeader 
            totalCount={contacts?.length}
            selectedCount={selectedContacts?.length}
            onBulkAction={handleBulkAction}
            onAddContact={handleAddContact}
          />
          
          <ContactsStats stats={stats} />
          
          <ContactsFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            totalCount={contacts?.length}
            filteredCount={filteredContacts?.length}
            onExport={handleExport}
            onBulkAction={handleBulkAction}
          />
          
          <ContactsTable
            contacts={filteredContacts}
            onSort={handleSort}
            sortConfig={sortConfig}
            onContactAction={handleContactAction}
          />
          
          {contacts?.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No contacts found</p>
              <button
                onClick={handleAddContact}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add your first contact
              </button>
            </div>
          )}
        </div>
      </main>
      
      <QuickActionButton onClick={handleAddContact} />
      
      <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        onContactAdded={handleContactAdded}
      />
    </div>
  );
};

export default ContactsList;