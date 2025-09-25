import React from 'react';
 import Button from'../../../components/ui/Button';

const OpportunityFormActions = ({ isSubmitting, onCancel, onSubmit }) => {
  return (
    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="min-w-[120px]"
      >
        {isSubmitting ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Creating...</span>
          </div>
        ) : (
          'Create Opportunity'
        )}
      </Button>
    </div>
  )
}

export default OpportunityFormActions