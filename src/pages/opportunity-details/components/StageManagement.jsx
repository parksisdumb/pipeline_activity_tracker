import React, { useState } from 'react';
import { ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { opportunitiesService } from '../../../services/opportunitiesService';

const StageManagement = ({ opportunity, onStageUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [stageNotes, setStageNotes] = useState('');
  const [selectedStage, setSelectedStage] = useState(null);

  const stages = opportunitiesService?.getOpportunityStages();

  const handleStageClick = (stage) => {
    if (stage?.value === opportunity?.stage) return;
    
    setSelectedStage(stage?.value);
    setShowNotes(true);
    setStageNotes('');
  };

  const handleStageUpdate = async () => {
    if (!selectedStage) return;

    setIsUpdating(true);
    try {
      await onStageUpdate?.(selectedStage, stageNotes);
      setShowNotes(false);
      setSelectedStage(null);
      setStageNotes('');
    } catch (error) {
      console.error('Error updating stage:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setShowNotes(false);
    setSelectedStage(null);
    setStageNotes('');
  };

  const getStageIndex = (stageValue) => {
    return stages?.findIndex(stage => stage?.value === stageValue);
  };

  const getCurrentStageIndex = () => {
    return getStageIndex(opportunity?.stage);
  };

  const getStageColor = (stage, index) => {
    const currentIndex = getCurrentStageIndex();
    
    if (stage?.value === 'won') {
      return 'bg-green-500 text-white';
    } else if (stage?.value === 'lost') {
      return 'bg-red-500 text-white';
    } else if (index <= currentIndex) {
      return 'bg-blue-500 text-white';
    } else {
      return 'bg-gray-200 text-gray-600 hover:bg-gray-300';
    }
  };

  const isStageClickable = (stage, index) => {
    // Can't click current stage
    if (stage?.value === opportunity?.stage) return false;
    
    // Won and Lost are always clickable (can go back to them)
    if (stage?.value === 'won' || stage?.value === 'lost') return true;
    
    // Can click any previous or next stage
    return true;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Stage Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Track the progress of your opportunity through the sales pipeline
        </p>
      </div>
      <div className="p-6">
        {/* Stage Progress Visualization */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4">
            {stages?.map((stage, index) => {
              const isClickable = isStageClickable(stage, index);
              const isCurrent = stage?.value === opportunity?.stage;
              
              return (
                <React.Fragment key={stage?.value}>
                  <button
                    onClick={() => isClickable ? handleStageClick(stage) : null}
                    disabled={!isClickable}
                    className={`
                      relative px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${getStageColor(stage, index)}
                      ${isClickable ? 'cursor-pointer transform hover:scale-105' : 'cursor-default'}
                      ${isCurrent ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      {stage?.value === 'won' && <CheckCircle className="h-4 w-4" />}
                      {stage?.value === 'lost' && <XCircle className="h-4 w-4" />}
                      <span className="text-xs md:text-sm">{stage?.label}</span>
                    </div>
                    {isCurrent && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          Current
                        </div>
                      </div>
                    )}
                  </button>
                  {index < stages?.length - 1 && stage?.value !== 'lost' && (
                    <ChevronRight className="h-5 w-5 text-gray-400 hidden md:block" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Current Stage Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">
                Current Stage: {opportunity?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Progress: {opportunitiesService?.getStageProgress(opportunity?.stage)}% complete
              </p>
            </div>
            <div className="text-right">
              {opportunity?.probability && (
                <div className="text-sm text-blue-700">
                  Win Probability: {opportunity?.probability}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stage Update Modal */}
        {showNotes && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Update Stage to "{stages?.find(s => s?.value === selectedStage)?.label}"
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add notes about this stage change (optional)
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stage Update Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e?.target?.value)}
                  placeholder="Enter notes about this stage change..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStageUpdate}
                  disabled={isUpdating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Update Stage'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StageManagement;