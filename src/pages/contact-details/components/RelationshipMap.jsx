import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RelationshipMap = ({ contacts, currentContact }) => {
  const navigate = useNavigate();

  const getRelationshipIcon = (relationship) => {
    const icons = {
      'Reports To': 'ArrowUp',
      'Manages': 'ArrowDown', 
      'Works With': 'Users',
      'Collaborates With': 'Handshake',
      'Peer': 'User'
    };
    return icons?.[relationship] || 'User';
  };

  const getInfluenceColor = (influence) => {
    const colors = {
      'High': 'text-green-600 bg-green-100 border-green-200',
      'Medium': 'text-yellow-600 bg-yellow-100 border-yellow-200',
      'Low': 'text-slate-600 bg-slate-100 border-slate-200'
    };
    return colors?.[influence] || 'text-slate-600 bg-slate-100 border-slate-200';
  };

  const formatLastInteraction = (date) => {
    const now = new Date();
    const lastInt = new Date(date);
    const diffInDays = Math.floor((now - lastInt) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return `${Math.floor(diffInDays / 7)} weeks ago`;
  };

  const handleContactClick = (contactId) => {
    navigate(`/contact-details/${contactId}`);
  };

  return (
    <div className="space-y-4">
      {/* Relationship Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Organizational Relationships</h3>
          <p className="text-sm text-muted-foreground">
            Understanding the network around {currentContact?.firstName || currentContact?.name}
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => console.log('Add relationship')}
        >
          <Icon name="UserPlus" size={16} className="mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Relationships Grid */}
      {contacts?.length > 0 ? (
        <div className="space-y-4">
          {contacts?.map((contact) => (
            <div
              key={contact?.id}
              className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleContactClick(contact?.id)}
            >
              <div className="flex items-center justify-between">
                {/* Contact Information */}
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={20} color="var(--color-secondary-foreground)" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{contact?.name}</h4>
                      <Icon name={getRelationshipIcon(contact?.relationship)} size={14} className="text-muted-foreground" />
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">{contact?.role}</p>
                    
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <span>Relationship: {contact?.relationship}</span>
                      <span>•</span>
                      <span>Last contact: {formatLastInteraction(contact?.lastInteraction)}</span>
                    </div>
                  </div>
                </div>

                {/* Influence Level & Actions */}
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Influence</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getInfluenceColor(contact?.influence)}`}>
                      {contact?.influence}
                    </span>
                  </div>
                  
                  <Icon name="ExternalLink" size={16} className="text-muted-foreground" />
                </div>
              </div>

              {/* Relationship Details */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Decision making influence: <span className="font-medium text-foreground">{contact?.influence}</span>
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e?.stopPropagation();
                        console.log('View activities for', contact?.name);
                      }}
                      className="text-xs h-6 px-2"
                    >
                      View Activities
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-2">No relationships mapped</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start building the organizational chart by connecting related contacts.
          </p>
          <Button
            onClick={() => console.log('Add first relationship')}
            variant="outline"
            size="sm"
          >
            <Icon name="UserPlus" size={16} className="mr-2" />
            Add Related Contact
          </Button>
        </div>
      )}

      {/* Relationship Insights */}
      {contacts?.length > 0 && (
        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Icon name="Lightbulb" size={16} className="text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground mb-2">Relationship Insights</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• {contacts?.filter(c => c?.influence === 'High')?.length} high-influence contacts in network</p>
                <p>• Most recent interaction: {formatLastInteraction(Math.min(...contacts?.map(c => new Date(c?.lastInteraction))))}</p>
                <p>• Consider leveraging relationships with decision makers for better engagement</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipMap;