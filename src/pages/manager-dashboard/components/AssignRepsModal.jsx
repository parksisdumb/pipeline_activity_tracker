import { useState, useEffect } from 'react';
import { User, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Checkbox } from '../../../components/ui/Checkbox';
import { managerService } from '../../../services/managerService';
import { useAuth } from '../../../contexts/AuthContext';

export function AssignRepsModal({ isOpen, onClose, account, onSuccess }) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentAssignments, setCurrentAssignments] = useState([]);
  const [selectedReps, setSelectedReps] = useState(new Set());
  const [primaryRepId, setPrimaryRepId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load team members and current assignments when modal opens
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // ENHANCED: Load ALL tenant users, not just direct team members
        const allTenantUsers = await managerService?.getAllTenantUsers(user?.id);
        
        // Filter to show only reps for assignment (managers can assign any rep in tenant)
        const availableReps = allTenantUsers?.filter(member => 
          member?.role === 'rep' && member?.is_active
        ) || [];
        
        setTeamMembers(availableReps);
        console.log('Enhanced rep assignment: loaded', availableReps?.length, 'reps across entire tenant');
      } catch (error) {
        console.error('Error loading tenant users for assignment:', error);
        setError('Failed to load available representatives');
        
        // Fallback to legacy team members if new method fails
        try {
          const legacyTeamMembers = await managerService?.getTeamMembers(user?.id);
          const availableReps = legacyTeamMembers?.filter(member => 
            member?.role === 'rep' && member?.is_active
          ) || [];
          setTeamMembers(availableReps);
          console.log('Fallback: using legacy team member loading');
        } catch (fallbackError) {
          console.error('Both loading methods failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && user?.id) {
      loadTeamMembers();
    }
  }, [isOpen, user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load current rep assignments for this account
      const assignments = await managerService?.getAccountReps(account?.id);
      setCurrentAssignments(assignments);

      // Set selected reps and primary rep based on current assignments
      const assignedRepIds = new Set(assignments.map(assignment => assignment.rep_id));
      setSelectedReps(assignedRepIds);
      
      const primaryAssignment = assignments?.find(assignment => assignment?.is_primary);
      setPrimaryRepId(primaryAssignment?.rep_id || '');

    } catch (error) {
      console.error('Error loading assignment data:', error);
      setError('Failed to load team members and assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleRepToggle = (repId) => {
    const newSelected = new Set(selectedReps);
    
    if (newSelected?.has(repId)) {
      newSelected?.delete(repId);
      // If removing the primary rep, clear primary selection
      if (primaryRepId === repId) {
        setPrimaryRepId('');
      }
    } else {
      newSelected?.add(repId);
      // If this is the first rep selected, make them primary
      if (newSelected?.size === 1) {
        setPrimaryRepId(repId);
      }
    }
    
    setSelectedReps(newSelected);
  };

  const handlePrimaryRepChange = (repId) => {
    // Only allow setting primary if rep is selected
    if (selectedReps?.has(repId)) {
      setPrimaryRepId(repId);
    }
  };

  const handleAssign = async () => {
    if (!account?.id || selectedReps?.size === 0) {
      setError('Please select at least one representative');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Convert Set to Array before passing to the service
      const repIdsArray = Array.from(selectedReps);
      
      console.log('Assigning reps to account:', {
        accountId: account?.id,
        managerId: user?.id,
        selectedReps: repIdsArray,
        primaryRepId: primaryRepId
      });

      // ENHANCED: Use new tenant-wide assignment authority
      await managerService?.assignRepsToAccount(
        user?.id, // manager ID with tenant authority
        account?.id,
        repIdsArray, // Now properly converted from Set to Array
        primaryRepId || null
      );

      onSuccess?.();
      onClose();
      setSelectedReps(new Set()); // Reset to empty Set
      setPrimaryRepId('');
    } catch (error) {
      console.error('Error assigning reps:', error);
      setError(error?.message || 'Failed to assign representatives. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Representatives"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Account Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900">{account?.name}</h3>
          <p className="text-sm text-gray-600">{account?.company_type}</p>
          <p className="text-sm text-gray-600">{account?.city}, {account?.state}</p>
        </div>

        {/* Current Assignments Display */}
        {currentAssignments?.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Current Assignments</h4>
            <div className="space-y-1">
              {currentAssignments?.map((assignment) => (
                <div key={assignment?.rep_id} className="flex items-center gap-2 text-sm">
                  {assignment?.is_primary ? (
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-blue-800">
                    {assignment?.rep_name} {assignment?.is_primary && '(Primary)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading team members...</span>
          </div>
        ) : (
          <>
            {/* Team Members Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Select Representatives</h4>
              
              {teamMembers?.length === 0 ? (
                <p className="text-gray-500 py-4">No active representatives found in your team.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {teamMembers?.map((rep) => (
                    <div
                      key={rep?.id}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                        selectedReps?.has(rep?.id)
                          ? 'border-blue-300 bg-blue-50' :'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedReps?.has(rep?.id)}
                          onChange={() => handleRepToggle(rep?.id)}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{rep?.full_name}</div>
                          <div className="text-sm text-gray-600">{rep?.email}</div>
                        </div>
                      </div>
                      
                      {/* Primary Rep Radio Button */}
                      {selectedReps?.has(rep?.id) && selectedReps?.size > 1 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={`primary-${rep?.id}`}
                            name="primaryRep"
                            checked={primaryRepId === rep?.id}
                            onChange={() => handlePrimaryRepChange(rep?.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`primary-${rep?.id}`}
                            className="text-sm text-gray-700"
                          >
                            Primary
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selection Summary */}
            {selectedReps?.size > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {selectedReps?.size} representative{selectedReps?.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                {selectedReps?.size > 1 && primaryRepId && (
                  <p className="text-sm text-green-700 mt-1">
                    Primary: {teamMembers?.find(rep => rep?.id === primaryRepId)?.full_name}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={saving || loading || selectedReps?.size === 0}
            className="min-w-[100px]"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </div>
            ) : (
              'Save Assignments'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}