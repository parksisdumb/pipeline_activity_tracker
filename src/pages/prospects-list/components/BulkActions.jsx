import React, { useState } from 'react';
import { UserCheck, Download, Route, X, ChevronDown } from 'lucide-react';
import Button from '../../../components/ui/Button';


const BulkActions = ({ selectedCount, users, onBulkAction, onClearSelection }) => {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  const handleAssign = (assigneeId) => {
    if (!assigneeId) return;
    
    onBulkAction?.('assign', { assigneeId });
    setShowAssignDropdown(false);
  };

  const handleExport = () => {
    onBulkAction?.('export', {});
  };

  const handleAddToRoute = () => {
    const dueDate = prompt('Enter due date for route visits (YYYY-MM-DD):');
    if (!dueDate) return;
    
    onBulkAction?.('addToRoute', { dueDate });
  };

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} prospect{selectedCount !== 1 ? 's' : ''} selected
          </span>
          
          <div className="flex items-center space-x-2">
            {/* Assign Dropdown */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Assign
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              
              {showAssignDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Assign to Rep
                    </div>
                    {users?.filter(user => user?.role === 'rep' || user?.role === 'manager')?.map((user) => (
                      <button
                        key={user?.id}
                        onClick={() => handleAssign(user?.id)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        {user?.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

            {/* Add to Route */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddToRoute}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Route className="w-4 h-4 mr-2" />
              Add to Route
            </Button>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="text-blue-700 hover:bg-blue-100"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
};

export default BulkActions;