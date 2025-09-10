import React from 'react';
import Icon from '../../../components/AppIcon';

const TabNavigation = ({ activeTab, onTabChange, propertiesCount, contactsCount, activitiesCount }) => {
  const tabs = [
    {
      id: 'properties',
      label: 'Properties',
      icon: 'MapPin',
      count: propertiesCount
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: 'Users',
      count: contactsCount
    },
    {
      id: 'activities',
      label: 'Activities',
      icon: 'Activity',
      count: activitiesCount
    }
  ];

  return (
    <div className="border-b border-border bg-card">
      <nav className="flex space-x-8 px-6" aria-label="Account details tabs">
        {tabs?.map((tab) => (
          <button
            key={tab?.id}
            onClick={() => onTabChange(tab?.id)}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === tab?.id
                ? 'border-accent text-accent' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            <Icon name={tab?.icon} size={16} />
            <span>{tab?.label}</span>
            {tab?.count > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === tab?.id
                  ? 'bg-accent/10 text-accent' :'bg-muted text-muted-foreground'
              }`}>
                {tab?.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;