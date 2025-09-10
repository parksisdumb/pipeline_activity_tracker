import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';

const OrganizationsTable = ({ organizations = [], users = [], onUpdate, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [editingOrg, setEditingOrg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stages = [
    'Prospect', 'Contacted', 'Qualified', 'Assessment Scheduled', 
    'Assessed', 'Proposal Sent', 'In Negotiation', 'Won', 'Lost'
  ];

  const companyTypes = [
    'Property Management', 'General Contractor', 'Developer', 
    'REIT/Institutional Investor', 'Asset Manager', 'Building Owner'
  ];

  const filteredOrganizations = organizations?.filter(org => {
    const matchesSearch = !searchTerm || 
      org?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      org?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    
    const matchesStage = filterStage === 'all' || org?.stage === filterStage;
    const matchesType = filterType === 'all' || org?.company_type === filterType;
    
    return matchesSearch && matchesStage && matchesType;
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

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Won': return 'bg-success text-success-foreground';
      case 'Lost': return 'bg-error text-error-foreground';
      case 'Proposal Sent': case 'In Negotiation': return 'bg-warning text-warning-foreground';
      case 'Qualified': case 'Assessment Scheduled': case 'Assessed': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Organizations Management</h2>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
            className="w-64"
            iconName="Search"
          />
          <Select
            value={filterStage}
            onChange={(value) => setFilterStage(value)}
            options={[
              { value: 'all', label: 'All Stages' },
              ...stages?.map(stage => ({ value: stage, label: stage }))
            ]}
            className="w-48"
          />
          <Select
            value={filterType}
            onChange={(value) => setFilterType(value)}
            options={[
              { value: 'all', label: 'All Types' },
              ...companyTypes?.map(type => ({ value: type, label: type }))
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
                <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Stage</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Assigned Rep</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Contact Info</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Created</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations?.map(org => {
                const assignedRep = users?.find(user => user?.id === org?.assigned_rep_id);
                return (
                  <tr key={org?.id} className="border-b border-border hover:bg-muted/20">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                          <Icon name="Building2" size={20} className="text-accent" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{org?.name}</div>
                          <div className="text-sm text-muted-foreground">{org?.city}, {org?.state}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{org?.company_type}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(org?.stage)}`}>
                        {org?.stage}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {assignedRep ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                              <Icon name="User" size={14} className="text-success" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{assignedRep?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{assignedRep?.role}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                        <Select
                          value={org?.assigned_rep_id || ''}
                          onChange={(userId) => handleAssignUser(org?.id, userId)}
                          options={[
                            { value: '', label: 'Unassigned' },
                            ...users?.map(user => ({
                              value: user?.id,
                              label: `${user?.full_name} (${user?.role})`
                            }))
                          ]}
                          className="w-32"
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {org?.email && (
                          <div className="text-foreground">{org?.email}</div>
                        )}
                        {org?.phone && (
                          <div className="text-muted-foreground">{org?.phone}</div>
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
                          onClick={() => window.open(`/account-details/${org?.id}`, '_blank')}
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
        title="Edit Organization"
      >
        {editingOrg && (
          <div className="space-y-4">
            <Input
              label="Organization Name"
              value={editingOrg?.name || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, name: e?.target?.value })}
              placeholder="Enter organization name"
            />
            
            <Select
              label="Company Type"
              value={editingOrg?.company_type || ''}
              onChange={(value) => setEditingOrg({ ...editingOrg, company_type: value })}
              options={companyTypes?.map(type => ({ value: type, label: type }))}
            />
            
            <Select
              label="Stage"
              value={editingOrg?.stage || ''}
              onChange={(value) => setEditingOrg({ ...editingOrg, stage: value })}
              options={stages?.map(stage => ({ value: stage, label: stage }))}
            />
            
            <Input
              label="Email"
              type="email"
              value={editingOrg?.email || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, email: e?.target?.value })}
              placeholder="Enter email address"
            />
            
            <Input
              label="Phone"
              value={editingOrg?.phone || ''}
              onChange={(e) => setEditingOrg({ ...editingOrg, phone: e?.target?.value })}
              placeholder="Enter phone number"
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
                  company_type: editingOrg?.company_type,
                  stage: editingOrg?.stage,
                  email: editingOrg?.email,
                  phone: editingOrg?.phone
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