import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TeamPerformanceTable = ({ teamData, className = '' }) => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...teamData]?.sort((a, b) => {
    let aValue = a?.[sortField];
    let bValue = b?.[sortField];

    if (typeof aValue === 'string') {
      aValue = aValue?.toLowerCase();
      bValue = bValue?.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getPerformanceColor = (current, target) => {
    const percentage = target > 0 ? (current / target) * 100 : 0;
    if (percentage >= 100) return 'text-success';
    if (percentage >= 80) return 'text-accent';
    return 'text-warning';
  };

  const SortableHeader = ({ field, children }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <Icon 
          name={sortField === field ? (sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} 
          size={12} 
        />
      </div>
    </th>
  );

  return (
    <div className={`bg-card border border-border rounded-lg elevation-1 ${className}`}>
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Team Performance</h3>
          <Button
            variant="outline"
            size="sm"
            iconName="Download"
            iconPosition="left"
            onClick={() => console.log('Export data')}
          >
            Export
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <SortableHeader field="name">Rep Name</SortableHeader>
              <SortableHeader field="popIns">Pop-ins</SortableHeader>
              <SortableHeader field="dmConversations">DM Convos</SortableHeader>
              <SortableHeader field="assessments">Assessments</SortableHeader>
              <SortableHeader field="proposals">Proposals</SortableHeader>
              <SortableHeader field="wins">Wins</SortableHeader>
              <SortableHeader field="showRate">Show Rate</SortableHeader>
              <SortableHeader field="winRate">Win Rate</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData?.map((rep) => (
              <tr key={rep?.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <Icon name="User" size={16} color="var(--color-secondary-foreground)" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{rep?.name}</div>
                      <div className="text-xs text-muted-foreground">{rep?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <span className={`font-medium ${getPerformanceColor(rep?.popIns?.current, rep?.popIns?.target)}`}>
                      {rep?.popIns?.current}
                    </span>
                    <span className="text-muted-foreground"> / {rep?.popIns?.target}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <span className={`font-medium ${getPerformanceColor(rep?.dmConversations?.current, rep?.dmConversations?.target)}`}>
                      {rep?.dmConversations?.current}
                    </span>
                    <span className="text-muted-foreground"> / {rep?.dmConversations?.target}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <span className={`font-medium ${getPerformanceColor(rep?.assessments?.current, rep?.assessments?.target)}`}>
                      {rep?.assessments?.current}
                    </span>
                    <span className="text-muted-foreground"> / {rep?.assessments?.target}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <span className={`font-medium ${getPerformanceColor(rep?.proposals?.current, rep?.proposals?.target)}`}>
                      {rep?.proposals?.current}
                    </span>
                    <span className="text-muted-foreground"> / {rep?.proposals?.target}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <span className={`font-medium ${getPerformanceColor(rep?.wins?.current, rep?.wins?.target)}`}>
                      {rep?.wins?.current}
                    </span>
                    <span className="text-muted-foreground"> / {rep?.wins?.target}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className={`text-sm font-medium ${rep?.showRate >= 80 ? 'text-success' : rep?.showRate >= 60 ? 'text-accent' : 'text-warning'}`}>
                    {rep?.showRate}%
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className={`text-sm font-medium ${rep?.winRate >= 25 ? 'text-success' : rep?.winRate >= 15 ? 'text-accent' : 'text-warning'}`}>
                    {rep?.winRate}%
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="Eye"
                      onClick={() => console.log('View details for', rep?.name)}
                      title="View Details"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="Target"
                      onClick={() => navigate('/weekly-goals')}
                      title="Set Goals"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamPerformanceTable;