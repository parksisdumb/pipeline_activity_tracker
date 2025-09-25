import React from 'react';
import { Search, Filter } from 'lucide-react';

const TaskFilters = ({ filters, onFilterChange, onClearFilters }) => {
  return (
    <div className="bg-white rounded-lg shadow mb-6 p-6">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tasks by title, description, assignee, or entity..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters?.search || ''}
              onChange={(e) => onFilterChange('search', e?.target?.value)}
            />
          </div>
        </div>

        {/* Status Filter */}
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters?.status || ''}
          onChange={(e) => onFilterChange('status', e?.target?.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>

        {/* Priority Filter */}
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters?.priority || ''}
          onChange={(e) => onFilterChange('priority', e?.target?.value)}
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Category Filter */}
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters?.category || ''}
          onChange={(e) => onFilterChange('category', e?.target?.value)}
        >
          <option value="">All Categories</option>
          <option value="follow_up_call">Follow-up Call</option>
          <option value="site_visit">Site Visit</option>
          <option value="proposal_review">Proposal Review</option>
          <option value="contract_negotiation">Contract Negotiation</option>
          <option value="assessment_scheduling">Assessment Scheduling</option>
          <option value="document_review">Document Review</option>
          <option value="meeting_setup">Meeting Setup</option>
          <option value="property_inspection">Property Inspection</option>
          <option value="client_check_in">Client Check-in</option>
          <option value="other">Other</option>
        </select>

        {/* Clear Filters Button */}
        {(filters?.search || filters?.status || filters?.priority || filters?.category) && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskFilters;