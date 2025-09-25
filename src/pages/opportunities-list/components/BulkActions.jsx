import React, { useState } from 'react';
import { CheckSquare, Trash2, ArrowRight } from 'lucide-react';

const BulkActions = ({ 
  selectedCount = 0, 
  onStageUpdate, 
  onDelete, 
  opportunityStages = [] 
}) => {
  const [showStageSelector, setShowStageSelector] = useState(false);

  const handleStageUpdate = (newStage) => {
    onStageUpdate?.(newStage);
    setShowStageSelector(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCount} opportunities?`)) {
      onDelete?.();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckSquare className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} opportunity{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Stage Update */}
          <div className="relative">
            <button
              onClick={() => setShowStageSelector(!showStageSelector)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Update Stage
            </button>
            
            {showStageSelector && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  {opportunityStages?.map((stage) => (
                    <button
                      key={stage?.value}
                      onClick={() => handleStageUpdate(stage?.value)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      {stage?.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;