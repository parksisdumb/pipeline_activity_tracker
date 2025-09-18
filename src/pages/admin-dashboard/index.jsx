import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import MetricsCard from './components/MetricsCard';
import OrganizationsTable from './components/OrganizationsTable';
import UsersTable from './components/UsersTable';
import PendingRegistrations from './components/PendingRegistrations';
import AdminActions from './components/AdminActions';
import { adminService } from '../../services/adminService';
import Icon from '../../components/AppIcon';
import AddContactModal from '../../components/ui/AddContactModal';
import Button from '../../components/ui/Button';



const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'BarChart3' },
    { id: 'organizations', label: 'Organizations', icon: 'Building2' },
    { id: 'users', label: 'Users', icon: 'Users' },
    { id: 'contacts', label: 'Contacts', icon: 'UserCheck' },
    { id: 'pending', label: 'Pending Registrations', icon: 'UserPlus' },
    { id: 'settings', label: 'System Settings', icon: 'Settings' }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsResult, organizationsResult, usersResult, pendingResult, contactStatsResult] = await Promise.all([
        adminService?.getSystemMetrics(),
        adminService?.getAllOrganizations(),
        adminService?.getAllUsers(),
        adminService?.getPendingRegistrations(),
        adminService?.getContactStatistics()
      ]);

      if (metricsResult?.success) {
        setMetrics(prev => ({
          ...metricsResult?.data,
          // Merge contact statistics into metrics
          ...contactStatsResult?.data
        }));
      } else {
        console.warn('Failed to load metrics:', metricsResult?.error);
      }

      if (organizationsResult?.success) {
        setOrganizations(organizationsResult?.data || []);
      } else {
        console.warn('Failed to load organizations:', organizationsResult?.error);
      }

      if (usersResult?.success) {
        setUsers(usersResult?.data || []);
        console.log('Loaded users:', usersResult?.data?.length, 'users'); // Debug log
      } else {
        console.error('Failed to load users:', usersResult?.error);
        // Show user-friendly error message
        if (usersResult?.error?.includes('Authentication')) {
          // Could show a toast notification or error banner here
          console.error('Authentication required - user should log in again');
        }
      }

      if (pendingResult?.success) {
        setPendingUsers(pendingResult?.data || []);
      } else {
        console.warn('Failed to load pending registrations:', pendingResult?.error);
      }

      // Handle contact statistics
      if (contactStatsResult?.success) {
        console.log('Contact statistics loaded:', contactStatsResult?.data);
      } else {
        console.warn('Failed to load contact statistics:', contactStatsResult?.error);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    const result = await adminService?.updateUserRole(userId, newRole);
    if (result?.success) {
      await loadDashboardData(); // Refresh data
    }
    return result;
  };

  const handleUserStatusChange = async (userId, isActive) => {
    const result = await adminService?.updateUserStatus(userId, isActive);
    if (result?.success) {
      await loadDashboardData(); // Refresh data
    }
    return result;
  };

  const handleUserApproval = async (userId, approved) => {
    const result = approved 
      ? await adminService?.approveUserRegistration(userId)
      : await adminService?.rejectUserRegistration(userId);
    
    if (result?.success) {
      await loadDashboardData(); // Refresh data
      console.log('User approval completed, refreshing data');
    }
    return result;
  };

  const handleOrganizationUpdate = async (orgId, updates) => {
    const result = await adminService?.updateOrganization(orgId, updates);
    if (result?.success) {
      await loadDashboardData(); // Refresh data
    }
    return result;
  };

  const handleContactCreated = async (newContact) => {
    console.log('New contact created:', newContact);
    // Refresh dashboard data to update metrics
    await loadDashboardData();
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-muted-foreground">Loading dashboard data...</span>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* System Metrics */}
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricsCard
                  title="Total Organizations"
                  value={metrics?.totalOrganizations || 0}
                  icon="Building2"
                  color="accent"
                  trend={null}
                />
                <MetricsCard
                  title="Active Users"
                  value={metrics?.totalUsers || 0}
                  icon="Users"
                  color="success"
                  trend={null}
                />
                <MetricsCard
                  title="Total Contacts"
                  value={metrics?.totalContacts || 0}
                  icon="UserCheck"
                  color="info"
                  trend={null}
                />
                <MetricsCard
                  title="Recent Activity"
                  value={metrics?.recentActivity || 0}
                  icon="Activity"
                  color="warning"
                  trend={null}
                  subtitle="Last 7 days"
                />
              </div>
            )}
            {/* User Role Breakdown */}
            {metrics?.userRoleBreakdown && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">User Role Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-accent/10 rounded-lg">
                    <div className="text-2xl font-bold text-accent">{metrics?.userRoleBreakdown?.admin || 0}</div>
                    <div className="text-sm text-muted-foreground">Administrators</div>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <div className="text-2xl font-bold text-success">{metrics?.userRoleBreakdown?.manager || 0}</div>
                    <div className="text-sm text-muted-foreground">Managers</div>
                  </div>
                  <div className="text-center p-4 bg-info/10 rounded-lg">
                    <div className="text-2xl font-bold text-info">{metrics?.userRoleBreakdown?.rep || 0}</div>
                    <div className="text-sm text-muted-foreground">Representatives</div>
                  </div>
                  <div className="text-center p-4 bg-warning/10 rounded-lg">
                    <div className="text-2xl font-bold text-warning">{metrics?.userRoleBreakdown?.super_admin || 0}</div>
                    <div className="text-sm text-muted-foreground">Super Admins</div>
                  </div>
                </div>
              </div>
            )}
            {/* Quick Overview Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Tenant Organizations</h3>
                <div className="space-y-3">
                  {organizations?.slice(0, 5)?.map(org => (
                    <div key={org?.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">{org?.name}</div>
                        <div className="text-sm text-muted-foreground">{org?.subscription_plan} plan</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          org?.status === 'active' ? 'bg-success/20 text-success' :
                          org?.status === 'trial' ? 'bg-info/20 text-info' : 
                          org?.status === 'expired' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
                        }`}>
                          {org?.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {users?.slice(0, 5)?.map(user => (
                    <div key={user?.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">{user?.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user?.email}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          user?.role === 'admin' ? 'bg-accent/20 text-accent' :
                          user?.role === 'manager'? 'bg-success/20 text-success' : 
                          user?.role === 'super_admin' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'
                        }`}>
                          {user?.role}
                        </div>
                        <div className={`text-xs mt-1 ${
                          user?.is_active ? 'text-success' : 'text-error'
                        }`}>
                          {user?.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'organizations':
        return (
          <OrganizationsTable 
            organizations={organizations}
            users={users}
            onUpdate={handleOrganizationUpdate}
            onRefresh={loadDashboardData}
          />
        );

      case 'users':
        return (
          <UsersTable 
            users={users}
            onRoleChange={handleUserRoleChange}
            onStatusChange={handleUserStatusChange}
            onRefresh={loadDashboardData}
          />
        );

      case 'contacts':
        return (
          <div className="space-y-6">
            {/* Contact Management Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Contact Management</h2>
                <p className="text-muted-foreground mt-1">
                  Manage contacts across all organizations and user accounts from this centralized interface.
                </p>
              </div>
              <Button
                onClick={() => setShowAddContactModal(true)}
                iconName="Plus"
                iconPosition="left"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Add Contact
              </Button>
            </div>

            {/* Contact Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Contacts</p>
                    <p className="text-2xl font-bold text-foreground">{metrics?.totalContacts || 0}</p>
                  </div>
                  <Icon name="Users" size={24} className="text-accent" />
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Primary Contacts</p>
                    <p className="text-2xl font-bold text-foreground">{metrics?.primaryContacts || 0}</p>
                  </div>
                  <Icon name="UserCheck" size={24} className="text-success" />
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Accounts with Contacts</p>
                    <p className="text-2xl font-bold text-foreground">{metrics?.accountsWithContacts || 0}</p>
                  </div>
                  <Icon name="Building2" size={24} className="text-info" />
                </div>
              </div>
            </div>

            {/* Admin Contact Instructions */}
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={16} className="text-info mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-info mb-1">Admin Contact Management</p>
                  <p className="text-info/80">
                    As an administrator, you can create contacts for any account across all organizations. 
                    Use the "Add Contact" button above to create new contacts and assign them to specific accounts.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Contacts Table */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Recent Contacts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Latest contacts created across all organizations
                </p>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <Icon name="Users" size={48} className="text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Contact List View</h3>
                  <p className="text-muted-foreground mb-4">
                    Contact listing functionality will be implemented here. This will show contacts from all organizations with filtering and management options.
                  </p>
                  <Button
                    onClick={() => setShowAddContactModal(true)}
                    iconName="Plus"
                    variant="outline"
                  >
                    Create First Contact
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pending':
        return (
          <PendingRegistrations 
            pendingUsers={pendingUsers}
            onApproval={handleUserApproval}
            onRefresh={loadDashboardData}
          />
        );

      case 'settings':
        return (
          <AdminActions 
            onRefresh={loadDashboardData}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Pipeline Activity Tracker</title>
        <meta name="description" content="Comprehensive administrative dashboard for managing organizations, users, and system settings." />
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <Header 
            userRole="admin"
            onMenuToggle={toggleMobileMenu}
            isMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarNavigation
            userRole="admin"
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={toggleMobileMenu} />
            <SidebarNavigation
              userRole="admin"
              isCollapsed={false}
              onToggleCollapse={() => {}}
              className="relative z-10"
            />
          </div>
        )}

        {/* Main Content */}
        <main className={`transition-all duration-200 ease-out ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        } pt-16 lg:pt-0`}>
          <div className="p-6">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage organizations, users, contacts, and system settings from this centralized administrative interface.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-card border border-border rounded-lg mb-6">
              <div className="flex flex-wrap border-b border-border">
                {tabs?.map(tab => (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab?.id
                        ? 'text-accent border-b-2 border-accent bg-accent/10' :'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                    }`}
                  >
                    <Icon name={tab?.icon} size={16} />
                    <span>{tab?.label}</span>
                    {tab?.id === 'pending' && pendingUsers?.length > 0 && (
                      <span className="bg-error text-error-foreground text-xs px-2 py-1 rounded-full">
                        {pendingUsers?.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Quick Action Button */}
        <QuickActionButton variant="floating" onClick={() => {}} />

        {/* Add Contact Modal */}
        <AddContactModal
          isOpen={showAddContactModal}
          onClose={() => setShowAddContactModal(false)}
          onContactAdded={handleContactCreated}
          preselectedAccountId={null}
        />
      </div>
    </>
  );
};

export default AdminDashboard;