import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';

const OrganizationsTable = ({ organizations = [], users = [], onUpdate, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [editingOrg, setEditingOrg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statuses = ['active', 'inactive', 'suspended', 'trial', 'expired'];
  const plans = ['free', 'basic', 'pro', 'enterprise', 'custom'];

  const filteredOrganizations = organizations?.filter(org => {
    const matchesSearch = !searchTerm || 
      org?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      org?.contact_email?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || org?.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || org?.subscription_plan === filterPlan;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleAssignUser = async (orgId, userId) => {
    try {
      const result = await onUpdate?.(orgId, { assigned_rep_id: userId });
      if (result?.success) {
        // Success handled by parent component refresh
      }
    } catch (error) {
      console.error('Error assigning user:', error);
    }
  };

  const handleUpdateOrg = async (updates) => {
    if (!editingOrg?.id) return;
    
    try {
      const result = await onUpdate?.(editingOrg?.id, updates);
      if (result?.success) {
        setEditingOrg(null);
        setIsModalOpen(false);
        await onRefresh?.();
      }
    } catch (error) {
      console.error('Error updating organization:', error);
    }
  };

  const openEditModal = (org) => {
    setEditingOrg(org);
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'trial': return 'bg-info text-info-foreground';
      case 'expired': case 'suspended': return 'bg-error text-error-foreground';
      case 'inactive': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'enterprise': case 'custom': return 'bg-accent text-accent-foreground';
      case 'pro': return 'bg-success text-success-foreground';
      case 'basic': return 'bg-info text-info-foreground';
      case 'free': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Tenant Organizations</h2>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
            className="w-64"
            iconName="Search"
          />
          <Select
            value={filterStatus}
            onChange={(value) => setFilterStatus(value)}
            options={[
              { value: 'all', label: 'All Status' },
              ...statuses?.map(status => ({ value: status, label: status?.charAt(0)?.toUpperCase() + status?.slice(1) }))
            ]}
            className="w-48"
          />
          <Select
            value={filterPlan}
            onChange={(value) => setFilterPlan(value)}
            options={[
              { value: 'all', label: 'All Plans' },
              ...plans?.map(plan => ({ value: plan, label: plan?.charAt(0)?.toUpperCase() + plan?.slice(1) }))
            ]}
            className="w-48"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">Organization</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Plan</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Users</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Contact Info</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Created</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations?.map(org => {
                const owner = users?.find(user => user?.id === org?.owner_id);
                return (
                  <tr key={org?.id} className="border-b border-border hover:bg-muted/20">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                          <Icon name="Building2" size={20} className="text-accent" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{org?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {org?.city ? `${org?.city}, ${org?.state}` : org?.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPlanColor(org?.subscription_plan)}`}>
                        {org?.subscription_plan?.charAt(0)?.toUpperCase() + org?.subscription_plan?.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(org?.status)}`}>
                        {org?.status?.charAt(0)?.toUpperCase() + org?.status?.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="text-foreground">
                          {org?.max_users} max users
                        </div>
                        {owner && (
                          <div className="text-muted-foreground text-xs">
                            Owner: {owner?.full_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {org?.contact_email && (
                          <div className="text-foreground">{org?.contact_email}</div>
                        )}
                        {org?.contact_phone && (
                          <div className="text-muted-foreground">{org?.contact_phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(org?.created_at)?.toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Edit"
                          onClick={() => openEditModal(org)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="ExternalLink"
                          onClick={() => window.open(`/tenant/${org?.slug}`, '_blank')}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrganizations?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Building2" size={48} className="text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No organizations found</h3>
            <p className="text-muted-foreground">Try adjusting your search filters.</p>
          </div>
        )}
      </div>

      {/* Edit Organization Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrg(null);
        }}
        title="Edit Tenant Organization"
      >
        {editingOrg && (
          <div className="space-y-4">
            <Input
              label="Organization Name"
              value={editingOrg?.name || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, name: e?.target?.value })}
              placeholder="Enter organization name"
            />
            
            <Input
              label="Slug"
              value={editingOrg?.slug || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, slug: e?.target?.value })}
              placeholder="Enter organization slug"
            />
            
            <Select
              label="Subscription Plan"
              value={editingOrg?.subscription_plan || ''}
              onChange={(value) => setEditingOrg({ ...editingOrg, subscription_plan: value })}
              options={plans?.map(plan => ({ 
                value: plan, 
                label: plan?.charAt(0)?.toUpperCase() + plan?.slice(1) 
              }))}
            />
            
            <Select
              label="Status"
              value={editingOrg?.status || ''}
              onChange={(value) => setEditingOrg({ ...editingOrg, status: value })}
              options={statuses?.map(status => ({ 
                value: status, 
                label: status?.charAt(0)?.toUpperCase() + status?.slice(1) 
              }))}
            />
            
            <Input
              label="Contact Email"
              type="email"
              value={editingOrg?.contact_email || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, contact_email: e?.target?.value })}
              placeholder="Enter contact email"
            />
            
            <Input
              label="Contact Phone"
              value={editingOrg?.contact_phone || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, contact_phone: e?.target?.value })}
              placeholder="Enter contact phone"
            />

            <Input
              label="Max Users"
              type="number"
              value={editingOrg?.max_users || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, max_users: parseInt(e?.target?.value) })}
              placeholder="Maximum users allowed"
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingOrg(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdateOrg({
                  name: editingOrg?.name,
                  slug: editingOrg?.slug,
                  subscription_plan: editingOrg?.subscription_plan,
                  status: editingOrg?.status,
                  contact_email: editingOrg?.contact_email,
                  contact_phone: editingOrg?.contact_phone,
                  max_users: editingOrg?.max_users
                })}
              >
                Update Organization
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrganizationsTable;