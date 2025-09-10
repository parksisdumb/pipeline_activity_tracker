import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ContactsTable = ({ contacts, onSort, sortConfig, onContactAction }) => {
  const navigate = useNavigate();
  const [selectedContacts, setSelectedContacts] = useState([]);

  const handleSort = (field) => {
    onSort(field);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContacts(contacts?.map(contact => contact?.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId, checked) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, contactId]);
    } else {
      setSelectedContacts(selectedContacts?.filter(id => id !== contactId));
    }
  };

  const handleContactClick = (contactId) => {
    navigate(`/contact-details/${contactId}`);
  };

  const handlePhoneCall = (phone, contactName) => {
    window.open(`tel:${phone}`, '_self');
    onContactAction('call', contactName);
  };

  const handleEmail = (email, contactName) => {
    window.open(`mailto:${email}`, '_self');
    onContactAction('email', contactName);
  };

  const getSortIcon = (field) => {
    if (sortConfig?.field !== field) return 'ArrowUpDown';
    return sortConfig?.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const getStageColor = (stage) => {
    const colors = {
      'Identified': 'bg-slate-100 text-slate-700',
      'Reached': 'bg-blue-100 text-blue-700',
      'DM Confirmed': 'bg-yellow-100 text-yellow-700',
      'Engaged': 'bg-green-100 text-green-700',
      'Dormant': 'bg-red-100 text-red-700'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (date) => {
    return new Date(date)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border elevation-1 overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedContacts?.length === contacts?.length && contacts?.length > 0}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                  className="rounded border-border"
                />
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  <span>Contact Name</span>
                  <Icon name={getSortIcon('name')} size={14} />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => handleSort('account')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  <span>Account/Property</span>
                  <Icon name={getSortIcon('account')} size={14} />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => handleSort('role')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  <span>Role/Title</span>
                  <Icon name={getSortIcon('role')} size={14} />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => handleSort('stage')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  <span>Stage</span>
                  <Icon name={getSortIcon('stage')} size={14} />
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => handleSort('lastInteraction')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  <span>Last Interaction</span>
                  <Icon name={getSortIcon('lastInteraction')} size={14} />
                </button>
              </th>
              <th className="text-right px-4 py-3">
                <span className="text-sm font-medium text-foreground">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts?.map((contact) => (
              <tr
                key={contact?.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleContactClick(contact?.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e?.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedContacts?.includes(contact?.id)}
                    onChange={(e) => handleSelectContact(contact?.id, e?.target?.checked)}
                    className="rounded border-border"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <Icon name="User" size={16} color="var(--color-secondary-foreground)" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{contact?.name}</p>
                      <p className="text-xs text-muted-foreground">{contact?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{contact?.account}</p>
                    {contact?.property && (
                      <p className="text-xs text-muted-foreground">{contact?.property}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">{contact?.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(contact?.stage)}`}>
                    {contact?.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(contact?.lastInteraction)}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e?.stopPropagation()}>
                  <div className="flex items-center justify-end space-x-2">
                    {contact?.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePhoneCall(contact?.phone, contact?.name)}
                        title="Call contact"
                      >
                        <Icon name="Phone" size={16} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEmail(contact?.email, contact?.name)}
                      title="Email contact"
                    >
                      <Icon name="Mail" size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleContactClick(contact?.id)}
                      title="View details"
                    >
                      <Icon name="ExternalLink" size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Card View */}
      <div className="lg:hidden">
        {contacts?.map((contact) => (
          <div
            key={contact?.id}
            className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
            onClick={() => handleContactClick(contact?.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={18} color="var(--color-secondary-foreground)" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-foreground truncate">{contact?.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{contact?.role}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStageColor(contact?.stage)}`}>
                {contact?.stage}
              </span>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex items-center text-xs text-muted-foreground">
                <Icon name="Building2" size={14} className="mr-2 flex-shrink-0" />
                <span className="truncate">{contact?.account}</span>
              </div>
              {contact?.property && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Icon name="MapPin" size={14} className="mr-2 flex-shrink-0" />
                  <span className="truncate">{contact?.property}</span>
                </div>
              )}
              <div className="flex items-center text-xs text-muted-foreground">
                <Icon name="Clock" size={14} className="mr-2 flex-shrink-0" />
                <span>Last interaction: {formatDate(contact?.lastInteraction)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between" onClick={(e) => e?.stopPropagation()}>
              <div className="flex items-center space-x-2">
                {contact?.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhoneCall(contact?.phone, contact?.name)}
                    iconName="Phone"
                    iconPosition="left"
                  >
                    Call
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEmail(contact?.email, contact?.name)}
                  iconName="Mail"
                  iconPosition="left"
                >
                  Email
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleContactClick(contact?.id)}
                iconName="ChevronRight"
                iconPosition="right"
              >
                View
              </Button>
            </div>
          </div>
        ))}
      </div>
      {contacts?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No contacts found</h3>
          <p className="text-muted-foreground mb-4">
            No contacts match your current filters. Try adjusting your search criteria.
          </p>
          <Button onClick={() => navigate('/log-activity')}>
            Add First Contact
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContactsTable;