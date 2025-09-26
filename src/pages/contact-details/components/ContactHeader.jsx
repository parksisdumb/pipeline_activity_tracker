import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ContactHeader = ({ contact, onNavigateToAccount, onNavigateToProperty, onEdit }) => {
  const navigate = useNavigate();

  const getStageColor = (stage) => {
    const colors = {
      'Identified': 'bg-slate-100 text-slate-700 border-slate-200',
      'Reached': 'bg-blue-100 text-blue-700 border-blue-200',
      'DM Confirmed': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Engaged': 'bg-green-100 text-green-700 border-green-200',
      'Dormant': 'bg-red-100 text-red-700 border-red-200'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const formatDate = (date) => {
    return new Date(date)?.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border elevation-1">
      <div className="p-6">
        {/* Back Navigation */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/contacts')}
            className="mr-4"
          >
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Back to Contacts
          </Button>
        </div>

        {/* Main Header Content */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Contact Info */}
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="User" size={24} color="var(--color-secondary-foreground)" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{contact?.name}</h1>
                {contact?.isPrimaryContact && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                    Primary Contact
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="font-medium">{contact?.role}</span>
                {contact?.title && (
                  <>
                    <span>•</span>
                    <span>{contact?.title}</span>
                  </>
                )}
                {contact?.department && (
                  <>
                    <span>•</span>
                    <span>{contact?.department}</span>
                  </>
                )}
              </div>

              {/* Account and Property Links */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <button
                  onClick={onNavigateToAccount}
                  className="flex items-center text-primary hover:text-primary/80 transition-colors"
                >
                  <Icon name="Building2" size={16} className="mr-2" />
                  {contact?.account}
                </button>
                
                {contact?.property && (
                  <button
                    onClick={onNavigateToProperty}
                    className="flex items-center text-primary hover:text-primary/80 transition-colors"
                  >
                    <Icon name="MapPin" size={16} className="mr-2" />
                    {contact?.property}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stage and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Current Stage */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Current Stage</p>
              <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border ${getStageColor(contact?.stage)}`}>
                {contact?.stage}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                <Icon name="Edit" size={16} className="mr-2" />
                Edit Profile
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${contact?.phone}`, '_self')}
                disabled={!contact?.phone}
              >
                <Icon name="Phone" size={16} className="mr-2" />
                Call
              </Button>
              
              <Button
                size="sm"
                onClick={() => window.open(`mailto:${contact?.email}`, '_self')}
              >
                <Icon name="Mail" size={16} className="mr-2" />
                Email
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-border text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-6">
            <span>
              Last interaction: {formatDate(contact?.lastInteraction)}
            </span>
            <span>
              Added: {formatDate(contact?.createdAt)}
            </span>
            {contact?.reportsTo && (
              <span>
                Reports to: {contact?.reportsTo}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {contact?.decisionMakingAuthority && (
              <span className="flex items-center">
                <Icon name="Shield" size={14} className="mr-1" />
                {contact?.decisionMakingAuthority} Authority
              </span>
            )}
            
            {contact?.preferredCommunication && (
              <span className="flex items-center">
                <Icon name="MessageSquare" size={14} className="mr-1" />
                Prefers {contact?.preferredCommunication}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactHeader;