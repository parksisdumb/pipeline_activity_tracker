import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ContactInformation = ({ contact, onPhoneCall, onEmail }) => {
  const contactMethods = [
    {
      label: 'Primary Email',
      value: contact?.email,
      icon: 'Mail',
      action: () => onEmail(contact?.email),
      copyable: true
    },
    {
      label: 'Phone',
      value: contact?.phone,
      icon: 'Phone',
      action: () => onPhoneCall(contact?.phone),
      copyable: true
    },
    {
      label: 'Mobile',
      value: contact?.mobilePhone,
      icon: 'Smartphone',
      action: () => onPhoneCall(contact?.mobilePhone),
      copyable: true
    }
  ];

  const additionalInfo = [
    {
      label: 'Address',
      value: contact?.address,
      icon: 'MapPin'
    },
    {
      label: 'LinkedIn',
      value: contact?.linkedInUrl,
      icon: 'Linkedin',
      isLink: true
    },
    {
      label: 'Company Website',
      value: contact?.companyWebsite,
      icon: 'Globe',
      isLink: true
    },
    {
      label: 'Time Zone',
      value: contact?.timeZone,
      icon: 'Clock'
    }
  ];

  const copyToClipboard = async (text) => {
    try {
      await navigator?.clipboard?.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border elevation-1">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
        
        {/* Communication Methods */}
        <div className="space-y-4 mb-6">
          {contactMethods?.filter(method => method?.value)?.map((method, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Icon name={method?.icon} size={18} className="text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-medium">{method?.label}</p>
                  <p className="text-sm text-foreground truncate">{method?.value}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {method?.copyable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(method?.value)}
                    title="Copy to clipboard"
                    className="w-8 h-8"
                  >
                    <Icon name="Copy" size={14} />
                  </Button>
                )}
                
                {method?.action && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={method?.action}
                    title={`${method?.icon === 'Mail' ? 'Send email' : 'Make call'}`}
                    className="w-8 h-8"
                  >
                    <Icon name="ExternalLink" size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground mb-3">Additional Information</h4>
          
          {additionalInfo?.filter(info => info?.value)?.map((info, index) => (
            <div key={index} className="flex items-start space-x-3 py-2">
              <Icon name={info?.icon} size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">{info?.label}</p>
                {info?.isLink ? (
                  <a
                    href={info?.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 transition-colors break-words"
                  >
                    {info?.value}
                  </a>
                ) : (
                  <p className="text-sm text-foreground break-words">{info?.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Notes Section */}
        {contact?.notes && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">Notes</h4>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed">{contact?.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInformation;