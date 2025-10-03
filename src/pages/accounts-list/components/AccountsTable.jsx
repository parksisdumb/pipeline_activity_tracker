import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';


export function AccountsTable({ 
  accounts, 
  onView, 
  onEdit, 
  onAssignReps, 
  selectedAccounts, 
  onSelectAccount, 
  onSelectAll, 
  currentUser,
  sortConfig,
  onSort,
  currentPage,
  itemsPerPage
}) {
  const navigate = useNavigate();
  const [hoveredRow, setHoveredRow] = useState(null);

  const sortedAccounts = useMemo(() => {
    if (!sortConfig?.key) return accounts;
    
    return [...accounts]?.sort((a, b) => {
      const aValue = a?.[sortConfig?.key];
      const bValue = b?.[sortConfig?.key];
      
      if (aValue < bValue) return sortConfig?.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig?.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [accounts, sortConfig]);

  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAccounts?.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAccounts, currentPage, itemsPerPage]);

  const handleSort = (key) => {
    onSort(key);
  };

  const handleRowClick = (accountId) => {
    navigate(`/account-details/${accountId}`);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig?.key !== columnKey) {
      return <Icon name="ArrowUpDown" size={14} className="opacity-40" />;
    }
    return sortConfig?.direction === 'asc' 
      ? <Icon name="ArrowUp" size={14} className="text-accent" />
      : <Icon name="ArrowDown" size={14} className="text-accent" />;
  };

  const getStageColor = (stage) => {
    const stageColors = {
      'Prospect': 'bg-slate-100 text-slate-700',
      'Contacted': 'bg-blue-100 text-blue-700',
      'Vendor Packet Request': 'bg-yellow-100 text-yellow-700',
      'Vendor Packet Submitted': 'bg-orange-100 text-orange-700',
      'Approved for Work': 'bg-purple-100 text-purple-700',
      'Actively Engaged': 'bg-green-100 text-green-700'
    };
    return stageColors?.[stage] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date?.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isAllSelected = selectedAccounts?.length === accounts?.length && accounts?.length > 0;
  const isIndeterminate = selectedAccounts?.length > 0 && selectedAccounts?.length < accounts?.length;
  const isManager = currentUser?.role === 'manager';
  const canManageAssignments = isManager || currentUser?.role === 'admin';

  const handleLogActivity = (account, e) => {
    e?.stopPropagation(); // Prevent row click
    navigate('/log-activity', {
      state: {
        preselected: true,
        account: {
          value: account?.id,
          label: account?.name,
          description: account?.company_type || 'Account'
        }
      }
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={onSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-2 hover:text-foreground transition-colors"
                >
                  <span>Account Name</span>
                  {getSortIcon('name')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('companyType')}
                  className="flex items-center space-x-2 hover:text-foreground transition-colors"
                >
                  <span>Company Type</span>
                  {getSortIcon('companyType')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('stage')}
                  className="flex items-center space-x-2 hover:text-foreground transition-colors"
                >
                  <span>Stage</span>
                  {getSortIcon('stage')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('assignedRep')}
                  className="flex items-center space-x-2 hover:text-foreground transition-colors"
                >
                  <span>Assigned Rep</span>
                  {getSortIcon('assignedRep')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('lastActivity')}
                  className="flex items-center space-x-2 hover:text-foreground transition-colors"
                >
                  <span>Last Activity</span>
                  {getSortIcon('lastActivity')}
                </button>
              </th>
              <th className="w-32 px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedAccounts?.map((account) => (
              <tr
                key={account?.id}
                className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                  hoveredRow === account?.id ? 'bg-muted/30' : ''
                }`}
                onMouseEnter={() => setHoveredRow(account?.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => handleRowClick(account?.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e?.stopPropagation()}>
                  <Checkbox
                    checked={selectedAccounts?.includes(account?.id)}
                    onChange={() => onSelectAccount(account?.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Icon name="Building2" size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{account?.name}</p>
                      <p className="text-xs text-muted-foreground">{account?.propertiesCount} properties</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">{account?.companyType}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(account?.stage)}`}>
                    {account?.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                      <Icon name="User" size={12} color="var(--color-secondary-foreground)" />
                    </div>
                    <span className="text-sm text-foreground">{account?.assignedRep}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">{formatDate(account?.lastActivity)}</span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e?.stopPropagation()}>
                  <div className="flex items-center justify-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRowClick(account?.id)}
                      className="w-8 h-8"
                      title="View Details"
                    >
                      <Icon name="ExternalLink" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleLogActivity(account, e)}
                      className="w-8 h-8"
                      title="Log Activity"
                    >
                      <Icon name="Plus" size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-4">
        {paginatedAccounts?.map((account) => (
          <div
            key={account?.id}
            className="bg-background border border-border rounded-lg p-4 space-y-3"
            onClick={() => handleRowClick(account?.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div onClick={(e) => e?.stopPropagation()}>
                  <Checkbox
                    checked={selectedAccounts?.includes(account?.id)}
                    onChange={() => onSelectAccount(account?.id)}
                  />
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Building2" size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-foreground truncate">{account?.name}</h3>
                  <p className="text-xs text-muted-foreground">{account?.companyType}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1" onClick={(e) => e?.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRowClick(account?.id)}
                  className="w-8 h-8 flex-shrink-0"
                  title="View Details"
                >
                  <Icon name="ExternalLink" size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleLogActivity(account, e)}
                  className="w-8 h-8 flex-shrink-0"
                  title="Log Activity"
                >
                  <Icon name="Plus" size={14} />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(account?.stage)}`}>
                {account?.stage}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
                  <Icon name="User" size={10} color="var(--color-secondary-foreground)" />
                </div>
                <span className="text-xs text-muted-foreground">{account?.assignedRep}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{account?.propertiesCount} properties</span>
              <span>Last activity: {formatDate(account?.lastActivity)}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Empty State */}
      {paginatedAccounts?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Building2" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No accounts found</h3>
          <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
          <Button onClick={() => navigate('/log-activity')}>
            Add New Account
          </Button>
        </div>
      )}
    </div>
  );
}