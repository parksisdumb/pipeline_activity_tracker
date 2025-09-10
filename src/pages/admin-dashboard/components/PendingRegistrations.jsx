import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const PendingRegistrations = ({ pendingUsers = [], onApproval, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [processingUsers, setProcessingUsers] = useState(new Set());

  const filteredPendingUsers = pendingUsers?.filter(user => {
    const matchesSearch = !searchTerm || 
      user?.full_name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      user?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    
    return matchesSearch;
  });

  const handleApprovalAction = async (userId, approved) => {
    setProcessingUsers(prev => new Set([...prev, userId]));
    
    try {
      const result = await onApproval?.(userId, approved);
      if (result?.success) {
        await onRefresh?.();
      }
    } catch (error) {
      console.error('Error processing user approval:', error);
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet?.delete(userId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Pending User Registrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve new user registrations to grant system access.
          </p>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="Search pending users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
            className="w-64"
            iconName="Search"
          />
        </div>
      </div>

      {/* Pending Users Cards */}
      {filteredPendingUsers?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPendingUsers?.map(user => {
            const isProcessing = processingUsers?.has(user?.id);
            return (
              <div key={user?.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                      <Icon name="UserPlus" size={20} className="text-warning" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{user?.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 text-xs bg-warning/10 text-warning rounded-full">
                    Pending
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium text-foreground capitalize">{user?.role || 'rep'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registered:</span>
                    <span className="text-foreground">{new Date(user?.created_at)?.toLocaleDateString()}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="text-foreground">{user?.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    iconName="Check"
                    onClick={() => handleApprovalAction(user?.id, true)}
                    disabled={isProcessing}
                    loading={isProcessing}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    iconName="X"
                    onClick={() => handleApprovalAction(user?.id, false)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg">
          <div className="text-center py-12">
            <Icon name="UserCheck" size={48} className="text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {pendingUsers?.length === 0 ? 'No pending registrations' : 'No matching users found'}
            </h3>
            <p className="text-muted-foreground">
              {pendingUsers?.length === 0 
                ? 'All user registrations have been processed.' :'Try adjusting your search term.'}
            </p>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {filteredPendingUsers?.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Icon name="Users" size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {filteredPendingUsers?.length} pending registration{filteredPendingUsers?.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="success"
                size="sm"
                iconName="CheckCircle"
                onClick={async () => {
                  // Bulk approve all visible pending users
                  for (const user of filteredPendingUsers) {
                    await handleApprovalAction(user?.id, true);
                  }
                }}
                disabled={processingUsers?.size > 0}
              >
                Approve All
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="RefreshCw"
                onClick={onRefresh}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRegistrations;