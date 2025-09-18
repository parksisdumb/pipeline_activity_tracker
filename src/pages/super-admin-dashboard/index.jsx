import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import { adminService } from '../../services/adminService';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import CreateTenantModal from '../../components/ui/CreateTenantModal';
import CreateUserModal from '../../components/ui/CreateUserModal';
import EditTenantModal from '../../components/ui/EditTenantModal';
import EditUserModal from '../../pages/admin-dashboard/components/EditUserModal';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);
  
  // Add modal states
  const [isCreateTenantModalOpen, setIsCreateTenantModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const { user, userProfile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect non-super-admin users
  useEffect(() => {
    if (!isSuperAdmin && userProfile?.role !== 'super_admin') {
      console.log('Access denied: User is not super admin');
      navigate('/today');
      return;
    }
  }, [isSuperAdmin, userProfile, navigate]);

  const tabs = [
    { id: 'overview', label: 'System Overview', icon: 'Crown' },
    { id: 'tenants', label: 'Tenant Management', icon: 'Building' },
    { id: 'all-users', label: 'Cross-Tenant Users', icon: 'Users' },
    { id: 'analytics', label: 'System Analytics', icon: 'BarChart3' },
    { id: 'settings', label: 'Super Admin Tools', icon: 'Settings' }
  ];

  useEffect(() => {
    if (isSuperAdmin || userProfile?.role === 'super_admin') {
      loadSuperAdminData();
    }
  }, [isSuperAdmin, userProfile]);

  const loadSuperAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsResult, tenantsResult, usersResult] = await Promise.all([
        adminService?.getSystemMetrics(),
        adminService?.getAllOrganizations(), // This gets tenants
        adminService?.getAllUsers()
      ]);

      if (metricsResult?.success) {
        setMetrics(metricsResult?.data);
      } else {
        console.warn('Failed to load metrics:', metricsResult?.error);
        setError('Failed to load system metrics');
      }

      if (tenantsResult?.success) {
        setTenants(tenantsResult?.data || []);
      } else {
        console.warn('Failed to load tenants:', tenantsResult?.error);
      }

      if (usersResult?.success) {
        setAllUsers(usersResult?.data || []);
        console.log('Loaded all users for super admin:', usersResult?.data?.length);
      } else {
        console.error('Failed to load users:', usersResult?.error);
        setError('Failed to load user data');
      }
    } catch (error) {
      console.error('Error loading super admin data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    setIsCreateTenantModalOpen(true);
  };

  const handleTenantCreated = (newTenant) => {
    console.log('New tenant created:', newTenant);
    // Add the new tenant to the list
    setTenants(prev => [newTenant, ...prev]);
    // Refresh system metrics
    loadSuperAdminData();
    setIsCreateTenantModalOpen(false);
  };

  const handleCreateUser = async () => {
    setIsCreateUserModalOpen(true);
  };

  const handleUserCreated = (newUser) => {
    console.log('New user created:', newUser);
    // Refresh user list and system metrics
    loadSuperAdminData();
    setIsCreateUserModalOpen(false);
  };

  // Add edit handlers
  const handleEditTenant = (tenant) => {
    setSelectedTenant(tenant);
    setIsEditTenantModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleManageUser = (user) => {
    // For now, use the same edit functionality for manage
    // This could be expanded to have different management options
    handleEditUser(user);
  };

  const handleViewTenant = (tenant) => {
    // Navigate to tenant details or show tenant info
    console.log('Viewing tenant:', tenant);
    // This could navigate to a tenant detail page or show a view-only modal
    // For now, we'll use the edit modal in read-only mode
    setSelectedTenant(tenant);
    setIsEditTenantModalOpen(true);
  };

  const handleSaveTenant = async (updatedTenant) => {
    try {
      setError(null);
      const result = await adminService?.updateOrganization(updatedTenant?.id, updatedTenant);
      
      if (result?.success) {
        // Update the local tenants list
        setTenants(prev => prev?.map(t => 
          t?.id === updatedTenant?.id ? { ...t, ...updatedTenant } : t
        ));
        
        // Refresh data to get updated metrics
        loadSuperAdminData();
        return { success: true };
      } else {
        return { success: false, error: result?.error };
      }
    } catch (error) {
      console.error('Error saving tenant:', error);
      return { success: false, error: 'Failed to save tenant changes' };
    }
  };

  const handleSaveUser = async (updatedUser) => {
    try {
      setError(null);
      const result = await adminService?.updateUserProfile(updatedUser?.id, updatedUser);
      
      if (result?.success) {
        // Update the local users list
        setAllUsers(prev => prev?.map(u => 
          u?.id === updatedUser?.id ? { ...u, ...updatedUser } : u
        ));
        
        // Refresh data to get updated metrics
        loadSuperAdminData();
        return { success: true };
      } else {
        return { success: false, error: result?.error };
      }
    } catch (error) {
      console.error('Error saving user:', error);
      return { success: false, error: 'Failed to save user changes' };
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Show access denied for non-super-admin users
  if (!isSuperAdmin && userProfile?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Shield" size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">This area is restricted to Super Administrators only.</p>
          <Button onClick={() => navigate('/today')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-muted-foreground">Loading super admin dashboard...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Icon name="AlertTriangle" size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadSuperAdminData} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
            Retry
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Super Admin Welcome */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
              <div className="flex items-center space-x-3">
                <Icon name="Crown" size={32} className="text-white" />
                <div>
                  <h2 className="text-2xl font-bold">Super Administrator Portal</h2>
                  <p className="text-red-100">Complete system control and cross-tenant management</p>
                </div>
              </div>
            </div>

            {/* System Metrics */}
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tenants</p>
                      <p className="text-2xl font-bold text-foreground">{metrics?.totalOrganizations || 0}</p>
                    </div>
                    <Icon name="Building" size={24} className="text-red-500" />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold text-foreground">{metrics?.totalUsers || 0}</p>
                    </div>
                    <Icon name="Users" size={24} className="text-blue-500" />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Contacts</p>
                      <p className="text-2xl font-bold text-foreground">{metrics?.totalContacts || 0}</p>
                    </div>
                    <Icon name="UserCheck" size={24} className="text-green-500" />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">System Activity</p>
                      <p className="text-2xl font-bold text-foreground">{metrics?.recentActivity || 0}</p>
                    </div>
                    <Icon name="Activity" size={24} className="text-orange-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Icon name="Zap" size={20} className="mr-2 text-red-500" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button 
                    onClick={handleCreateTenant}
                    className="w-full justify-start bg-red-500 hover:bg-red-600 text-white"
                    iconName="Plus"
                    iconPosition="left"
                  >
                    Create New Tenant
                  </Button>
                  <Button 
                    onClick={handleCreateUser}
                    variant="outline"
                    className="w-full justify-start border-red-300 text-red-700 hover:bg-red-50"
                    iconName="UserPlus"
                    iconPosition="left"
                  >
                    Create Cross-Tenant User
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('analytics')}
                    variant="outline"
                    className="w-full justify-start"
                    iconName="BarChart3"
                    iconPosition="left"
                  >
                    View System Analytics
                  </Button>
                </div>
              </div>

              {/* Role Distribution */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">User Role Distribution</h3>
                {metrics?.userRoleBreakdown ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{metrics?.userRoleBreakdown?.super_admin || 0}</div>
                      <div className="text-xs text-red-600">Super Admins</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{metrics?.userRoleBreakdown?.admin || 0}</div>
                      <div className="text-xs text-purple-600">Admins</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{metrics?.userRoleBreakdown?.manager || 0}</div>
                      <div className="text-xs text-green-600">Managers</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{metrics?.userRoleBreakdown?.rep || 0}</div>
                      <div className="text-xs text-blue-600">Reps</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No role data available</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'tenants':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Tenant Management</h2>
                <p className="text-muted-foreground">Manage all tenant organizations across the system</p>
              </div>
              <Button onClick={handleCreateTenant} iconName="Plus" className="bg-red-500 hover:bg-red-600">
                Create Tenant
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">All Tenants</h3>
              </div>
              <div className="p-6">
                {tenants?.length > 0 ? (
                  <div className="space-y-4">
                    {tenants?.map(tenant => (
                      <div key={tenant?.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <Icon name="Building" size={24} className="text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{tenant?.name}</h4>
                            <p className="text-sm text-muted-foreground">{tenant?.slug}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                tenant?.status === 'active' ? 'bg-green-100 text-green-800' :
                                tenant?.status === 'trial'? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {tenant?.status}
                              </span>
                              <span className="text-xs text-muted-foreground">{tenant?.subscription_plan} plan</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditTenant(tenant)}
                            iconName="Edit"
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewTenant(tenant)}
                            iconName="Eye"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Icon name="Building" size={48} className="text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Tenants Found</h3>
                    <p className="text-muted-foreground mb-4">Create your first tenant to get started</p>
                    <Button onClick={handleCreateTenant} iconName="Plus">Create First Tenant</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'all-users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Cross-Tenant User Management</h2>
                <p className="text-muted-foreground">Manage users across all tenant organizations</p>
              </div>
              <Button onClick={handleCreateUser} iconName="UserPlus" className="bg-red-500 hover:bg-red-600">
                Create User
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">All System Users</h3>
              </div>
              <div className="p-6">
                {allUsers?.length > 0 ? (
                  <div className="space-y-4">
                    {allUsers?.map(user => (
                      <div key={user?.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user?.role === 'super_admin' ? 'bg-red-100' :
                            user?.role === 'admin' ? 'bg-purple-100' :
                            user?.role === 'manager' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            <Icon 
                              name={user?.role === 'super_admin' ? 'Crown' : 
                                   user?.role === 'admin' ? 'Shield' : 
                                   user?.role === 'manager' ? 'Users' : 'User'} 
                              size={18} 
                              className={
                                user?.role === 'super_admin' ? 'text-red-600' :
                                user?.role === 'admin' ? 'text-purple-600' :
                                user?.role === 'manager' ? 'text-green-600' : 'text-blue-600'
                              } 
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{user?.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                user?.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                                user?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                user?.role === 'manager' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user?.role}
                              </span>
                              {user?.tenant_name && (
                                <span className="text-xs text-muted-foreground">{user?.tenant_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            iconName="Edit"
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleManageUser(user)}
                            iconName="Settings"
                          >
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Icon name="Users" size={48} className="text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Users Found</h3>
                    <p className="text-muted-foreground mb-4">No users found in the system</p>
                    <Button onClick={handleCreateUser} iconName="UserPlus">Create First User</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">System Analytics</h2>
              <p className="text-muted-foreground">Cross-tenant system performance and usage analytics</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center py-8">
                <Icon name="BarChart3" size={48} className="text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">Comprehensive system analytics and reporting will be available here</p>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Super Admin Tools</h2>
              <p className="text-muted-foreground">Advanced system administration and configuration tools</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center py-8">
                <Icon name="Settings" size={48} className="text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Admin Tools Coming Soon</h3>
                <p className="text-muted-foreground">Advanced system tools and settings will be available here</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Super Admin Dashboard - Pipeline Activity Tracker</title>
        <meta name="description" content="Super Administrator dashboard for complete system control and cross-tenant management." />
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <Header 
            userRole="super_admin"
            onMenuToggle={toggleMobileMenu}
            isMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarNavigation
            userRole="super_admin"
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={toggleMobileMenu} />
            <SidebarNavigation
              userRole="super_admin"
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
              <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center">
                <Icon name="Crown" size={32} className="text-red-500 mr-3" />
                Super Administrator Portal
              </h1>
              <p className="text-muted-foreground">
                Complete system control with cross-tenant management capabilities
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
                        ? 'text-red-600 border-b-2 border-red-500 bg-red-50' :'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                    }`}
                  >
                    <Icon name={tab?.icon} size={16} />
                    <span>{tab?.label}</span>
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

        {/* Create User Modal */}
        <CreateUserModal
          isOpen={isCreateUserModalOpen}
          onClose={() => setIsCreateUserModalOpen(false)}
          onUserCreated={handleUserCreated}
        />

        {/* Create Tenant Modal */}
        <CreateTenantModal
          isOpen={isCreateTenantModalOpen}
          onClose={() => setIsCreateTenantModalOpen(false)}
          onTenantCreated={handleTenantCreated}
        />

        {/* Edit Tenant Modal */}
        <EditTenantModal
          tenant={selectedTenant}
          isOpen={isEditTenantModalOpen}
          onClose={() => {
            setIsEditTenantModalOpen(false);
            setSelectedTenant(null);
          }}
          onSave={handleSaveTenant}
        />

        {/* Edit User Modal */}
        <EditUserModal
          user={selectedUser}
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleSaveUser}
        />
      </div>
    </>
  );
};

export default SuperAdminDashboard;