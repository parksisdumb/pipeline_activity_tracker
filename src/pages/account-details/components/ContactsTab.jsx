import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ContactsTab = ({ accountId, contacts, onAddContact }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');

  const stageOptions = [
    { value: '', label: 'All Stages' },
    { value: 'Identified', label: 'Identified' },
    { value: 'Reached', label: 'Reached' },
    { value: 'DM Confirmed', label: 'DM Confirmed' },
    { value: 'Engaged', label: 'Engaged' },
    { value: 'Dormant', label: 'Dormant' }
  ];

  const getStageColor = (stage) => {
    const stageColors = {
      'Identified': 'bg-slate-100 text-slate-700',
      'Reached': 'bg-blue-100 text-blue-700',
      'DM Confirmed': 'bg-green-100 text-green-700',
      'Engaged': 'bg-emerald-100 text-emerald-700',
      'Dormant': 'bg-red-100 text-red-700'
    };
    return stageColors?.[stage] || 'bg-slate-100 text-slate-700';
  };

  const getInitials = (name) => {
    return name?.split(' ')?.map(word => word?.charAt(0))?.join('')?.toUpperCase()?.slice(0, 2);
  };

  const filteredContacts = contacts?.filter(contact => {
    const matchesSearch = contact?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         contact?.role?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         (contact?.email && contact?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase()));
    const matchesStage = !filterStage || contact?.stage === filterStage;
    
    return matchesSearch && matchesStage;
  });

  const handleContactClick = (contactId) => {
    navigate(`/contact-details?id=${contactId}`);
  };

  const handleCall = (e, phone) => {
    e?.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (e, email) => {
    e?.stopPropagation();
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-semibold text-foreground">
          Contacts ({contacts?.length})
        </h3>
        <Button 
          onClick={onAddContact}
          iconName="Plus"
          iconPosition="left"
          size="sm"
        >
          Add Contact
        </Button>
      </div>
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="search"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e?.target?.value)}
          className="w-full"
        />
        <Select
          placeholder="Filter by stage"
          options={stageOptions}
          value={filterStage}
          onChange={setFilterStage}
        />
      </div>
      {/* Contacts List */}
      {filteredContacts?.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Users" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">No Contacts Found</h4>
          <p className="text-muted-foreground mb-4">
            {contacts?.length === 0 
              ? "This account doesn't have any contacts yet."
              : "No contacts match your current filters."
            }
          </p>
          {contacts?.length === 0 && (
            <Button onClick={onAddContact} iconName="Plus" iconPosition="left">
              Add First Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContacts?.map((contact) => (
            <div
              key={contact?.id}
              onClick={() => handleContactClick(contact?.id)}
              className="bg-card border border-border rounded-lg p-4 hover:elevation-1 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-secondary-foreground">
                    {getInitials(contact?.name)}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {contact?.name}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact?.role}
                      </p>
                      {contact?.property && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact?.property}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStageColor(contact?.stage)}`}>
                        {contact?.stage}
                      </span>
                    </div>
                  </div>

                  {/* Contact Methods */}
                  <div className="flex items-center gap-4 mt-3">
                    {contact?.phone && (
                      <button
                        onClick={(e) => handleCall(e, contact?.phone)}
                        className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 transition-colors"
                      >
                        <Icon name="Phone" size={14} />
                        <span className="hidden sm:inline">{contact?.phone}</span>
                      </button>
                    )}
                    {contact?.email && (
                      <button
                        onClick={(e) => handleEmail(e, contact?.email)}
                        className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 transition-colors"
                      >
                        <Icon name="Mail" size={14} />
                        <span className="hidden sm:inline truncate max-w-48">{contact?.email}</span>
                      </button>
                    )}
                    {contact?.lastContact && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Icon name="Clock" size={12} />
                        <span>Last contact: {contact?.lastContact}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactsTab;