import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { propertiesService } from '../../../services/propertiesService';
import { contactsService } from '../../../services/contactsService';
import { opportunitiesService } from '../../../services/opportunitiesService';

const PropertyHeader = ({ property, onNavigateToAccount, onEdit, onBack }) => {
  const [linkedProperties, setLinkedProperties] = useState([]);
  const [accountContacts, setAccountContacts] = useState([]);
  const [accountOpportunities, setAccountOpportunities] = useState([]);
  const [propertySpecificOpportunities, setPropertySpecificOpportunities] = useState([]);
  const [showAllProperties, setShowAllProperties] = useState(false);
  const [loadingRelationships, setLoadingRelationships] = useState(false);

  const getStageColor = (stage) => {
    const colors = {
      'Unassessed': 'bg-slate-100 text-slate-700',
      'Assessment Scheduled': 'bg-blue-100 text-blue-700',
      'Assessed': 'bg-green-100 text-green-700',
      'Proposal Sent': 'bg-yellow-100 text-yellow-700',
      'In Negotiation': 'bg-orange-100 text-orange-700',
      'Won': 'bg-emerald-100 text-emerald-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never assessed';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (property?.account_id) {
      loadAccountRelationships();
    }
  }, [property?.account_id, property?.id]);

  const handleNavigateToContact = (contactId) => {
    if (!contactId) {
      console.error('No contact ID provided for navigation');
      alert('Contact ID is missing. Cannot navigate to contact details.');
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex?.test(contactId)) {
      console.error('Invalid contact ID format:', contactId);
      alert('Invalid contact ID format. Cannot navigate to contact details.');
      return;
    }

    try {
      // Use React Router navigate instead of window.open for better error handling
      const url = `/contact-details/${contactId}`;
      
      // Check if we should open in new tab (for better UX in this context) or same window
      // For property pages, opening in new tab is better to preserve context
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        // Fallback if popup was blocked
        window.location.href = url;
      }
      
      console.log('Navigating to contact details:', contactId);
    } catch (error) {
      console.error('Failed to navigate to contact:', error);
      alert('Failed to navigate to contact details. Please try again.');
    }
  };

  const loadAccountRelationships = async () => {
    if (!property?.account_id) return;
    
    setLoadingRelationships(true);
    try {
      // Load other properties in the same account
      const propertiesResult = await propertiesService?.getPropertiesByAccount(property?.account_id);
      if (propertiesResult?.success) {
        // Filter out current property
        const otherProperties = propertiesResult?.data?.filter(p => p?.id !== property?.id) || [];
        setLinkedProperties(otherProperties);
      }

      // Load account contacts with enhanced error handling
      try {
        const contactsResult = await contactsService?.getContacts({ accountId: property?.account_id });
        if (contactsResult?.success) {
          // Filter out contacts without valid IDs and log any issues
          const validContacts = contactsResult?.data?.filter(contact => {
            if (!contact?.id) {
              console.warn('Contact found without valid ID:', contact);
              return false;
            }
            
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex?.test(contact?.id)) {
              console.warn('Contact found with invalid ID format:', contact?.id);
              return false;
            }
            
            return true;
          }) || [];
          
          console.log('Valid contacts loaded:', validContacts?.length);
          setAccountContacts(validContacts?.slice(0, 3)); // Show first 3 valid contacts
        } else {
          console.error('Failed to load contacts:', contactsResult?.error);
          setAccountContacts([]);
        }
      } catch (contactError) {
        console.error('Error loading account contacts:', contactError);
        setAccountContacts([]);
      }

      // FIXED: Load property-specific opportunities using the dedicated method
      if (property?.id) {
        const propertyOpportunitiesResult = await opportunitiesService?.getOpportunitiesByProperty(property?.id);
        if (propertyOpportunitiesResult?.success) {
          setPropertySpecificOpportunities(propertyOpportunitiesResult?.data?.slice(0, 3) || []); // Show first 3 property opportunities
        }
      }

      // FIXED: Load account-level opportunities (opportunities that belong to account but NOT to any specific property)
      const allAccountOpportunitiesResult = await opportunitiesService?.getOpportunitiesByAccount(property?.account_id);
      if (allAccountOpportunitiesResult?.success) {
        // Filter out opportunities that are tied to specific properties - only show account-level opportunities
        const accountLevelOpportunities = allAccountOpportunitiesResult?.data?.filter(opp => !opp?.property_id) || [];
        setAccountOpportunities(accountLevelOpportunities?.slice(0, 2) || []); // Show first 2 account-level opportunities
      }
    } catch (error) {
      console.error('Failed to load account relationships:', error);
    } finally {
      setLoadingRelationships(false);
    }
  };

  const handleNavigateToProperty = (propertyId) => {
    // Navigate to another property in same account
    window.location.href = `/property-details/${propertyId}`;
  };

  const handleNavigateToOpportunity = (opportunityId) => {
    window.open(`/opportunity-details/${opportunityId}`, '_blank');
  };

  const getBuildingTypeIcon = (type) => {
    const typeIcons = {
      'Industrial': 'Factory',
      'Warehouse': 'Package',
      'Manufacturing': 'Cog',
      'Hospitality': 'Hotel',
      'Multifamily': 'Home',
      'Commercial Office': 'Building2',
      'Retail': 'Store',
      'Healthcare': 'Heart'
    };
    return typeIcons?.[type] || 'MapPin';
  };

  const getOpportunityStageColor = (stage) => {
    const colors = {
      'identified': 'bg-blue-100 text-blue-700',
      'qualified': 'bg-yellow-100 text-yellow-700',
      'proposal_sent': 'bg-orange-100 text-orange-700',
      'negotiation': 'bg-purple-100 text-purple-700',
      'won': 'bg-emerald-100 text-emerald-700',
      'lost': 'bg-red-100 text-red-700'
    };
    return colors?.[stage] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          iconName="ArrowLeft"
          iconPosition="left"
          className="text-muted-foreground hover:text-foreground"
        >
          Back to Properties
        </Button>
      </div>
      {/* Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Property Name and Address */}
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name="Building2" size={24} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground truncate">
                {property?.name}
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                {property?.address}
                {property?.city && `, ${property?.city}`}
                {property?.state && `, ${property?.state}`}
                {property?.zip_code && ` ${property?.zip_code}`}
              </p>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Building Type</p>
              <p className="font-medium text-foreground">{property?.building_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roof Type</p>
              <p className="font-medium text-foreground">{property?.roof_type || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Square Footage</p>
              <p className="font-medium text-foreground">
                {property?.square_footage ? property?.square_footage?.toLocaleString() + ' sq ft' : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year Built</p>
              <p className="font-medium text-foreground">{property?.year_built || 'Not specified'}</p>
            </div>
          </div>

          {/* Account Link */}
          {property?.account && (
            <div className="mb-4">
              <button
                onClick={onNavigateToAccount}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <Icon name="Building" size={16} />
                <span className="font-medium">{property?.account?.name}</span>
                <Icon name="ExternalLink" size={14} />
              </button>
            </div>
          )}

          {/* Linked Properties and Account Relationships */}
          {property?.account_id && (
            <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-muted">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Icon name="Network" size={16} />
                  Account Relationships
                </h4>
                {loadingRelationships && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Linked Properties */}
                {linkedProperties?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Other Properties ({linkedProperties?.length})
                      </span>
                      {linkedProperties?.length > 2 && (
                        <button
                          onClick={() => setShowAllProperties(!showAllProperties)}
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          {showAllProperties ? 'Show Less' : 'Show All'}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {(showAllProperties ? linkedProperties : linkedProperties?.slice(0, 2))?.map((linkedProperty) => (
                        <button
                          key={linkedProperty?.id}
                          onClick={() => handleNavigateToProperty(linkedProperty?.id)}
                          className="w-full text-left p-2 rounded-md bg-background border border-border hover:bg-accent/10 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <Icon 
                              name={getBuildingTypeIcon(linkedProperty?.building_type)} 
                              size={14} 
                              className="text-muted-foreground group-hover:text-primary flex-shrink-0" 
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground truncate">
                                {linkedProperty?.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {linkedProperty?.building_type}
                              </p>
                            </div>
                            <Icon name="ExternalLink" size={10} className="text-muted-foreground group-hover:text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Contacts - Enhanced with better error handling */}
                {accountContacts?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Key Contacts ({accountContacts?.length}+)
                    </span>
                    <div className="space-y-1">
                      {accountContacts?.map((contact) => {
                        // Additional validation at render time
                        if (!contact?.id) {
                          console.warn('Skipping contact without ID:', contact);
                          return null;
                        }

                        return (
                          <button
                            key={contact?.id}
                            onClick={() => handleNavigateToContact(contact?.id)}
                            className="w-full text-left p-2 rounded-md bg-background border border-border hover:bg-accent/10 transition-colors group"
                            title={`View ${contact?.first_name || ''} ${contact?.last_name || ''} details`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon name="User" size={14} className="text-muted-foreground group-hover:text-primary flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {contact?.first_name} {contact?.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {contact?.title || contact?.email || 'No title'}
                                </p>
                              </div>
                              <Icon name="ExternalLink" size={10} className="text-muted-foreground group-hover:text-primary" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Property-Specific Opportunities - FIXED: Only show opportunities for THIS property */}
                {propertySpecificOpportunities?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Property Opportunities ({propertySpecificOpportunities?.length})
                    </span>
                    <div className="space-y-1">
                      {propertySpecificOpportunities?.map((opportunity) => (
                        <button
                          key={opportunity?.id}
                          onClick={() => handleNavigateToOpportunity(opportunity?.id)}
                          className="w-full text-left p-2 rounded-md bg-background border border-border hover:bg-accent/10 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="Target" size={14} className="text-muted-foreground group-hover:text-primary flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground truncate">
                                {opportunity?.name}
                              </p>
                              <div className="flex items-center gap-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getOpportunityStageColor(opportunity?.stage)}`}>
                                  {opportunity?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
                                </span>
                                {opportunity?.bid_value && (
                                  <span className="text-xs text-muted-foreground">
                                    ${opportunity?.bid_value?.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Icon name="ExternalLink" size={10} className="text-muted-foreground group-hover:text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account-Level Opportunities (if any exist without specific property assignment) */}
                {accountOpportunities?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Account Opportunities ({accountOpportunities?.length})
                    </span>
                    <div className="space-y-1">
                      {accountOpportunities?.map((opportunity) => (
                        <button
                          key={opportunity?.id}
                          onClick={() => handleNavigateToOpportunity(opportunity?.id)}
                          className="w-full text-left p-2 rounded-md bg-background border border-border hover:bg-accent/10 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="Target" size={14} className="text-muted-foreground group-hover:text-primary flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground truncate">
                                {opportunity?.name}
                              </p>
                              <div className="flex items-center gap-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getOpportunityStageColor(opportunity?.stage)}`}>
                                  {opportunity?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
                                </span>
                                {opportunity?.bid_value && (
                                  <span className="text-xs text-muted-foreground">
                                    ${opportunity?.bid_value?.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Icon name="ExternalLink" size={10} className="text-muted-foreground group-hover:text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loadingRelationships && linkedProperties?.length === 0 && accountContacts?.length === 0 && 
                 propertySpecificOpportunities?.length === 0 && accountOpportunities?.length === 0 && (
                  <div className="col-span-full text-center py-4">
                    <Icon name="Network" size={24} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No additional relationships found for this account
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Action to View All Account Details */}
              <div className="mt-3 pt-3 border-t border-muted">
                <button
                  onClick={onNavigateToAccount}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  View Complete Account Details →
                </button>
              </div>
            </div>
          )}

          {/* Stage and Last Assessment */}
          <div className="flex flex-wrap items-center gap-4">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStageColor(property?.stage)}`}>
              {property?.stage}
            </span>
            <div className="text-sm text-muted-foreground">
              Last assessment: {formatDate(property?.last_assessment)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onEdit}
            iconName="Edit"
            iconPosition="left"
          >
            Edit Property
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyHeader;