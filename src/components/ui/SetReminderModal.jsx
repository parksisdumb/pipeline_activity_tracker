import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Icon from '../AppIcon';
import { contactsService } from '../../services/contactsService';

const SetReminderModal = ({ isOpen, onClose, contact, onSuccess }) => {
  const [reminderData, setReminderData] = useState({
    date: '',
    time: '09:00',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set default date to tomorrow
  React.useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow?.setDate(tomorrow?.getDate() + 1);
      const defaultDate = tomorrow?.toISOString()?.split('T')?.[0];
      setReminderData(prev => ({ ...prev, date: defaultDate }));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!reminderData?.date) {
      setError('Please select a date for the reminder');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Combine date and time
      const reminderDateTime = new Date(`${reminderData?.date}T${reminderData?.time}:00`);
      
      const result = await contactsService?.setReminder(contact?.id, {
        date: reminderDateTime?.toISOString(),
        notes: reminderData?.notes || `Follow up with ${contact?.name}`
      });

      if (result?.success) {
        onSuccess?.();
        onClose();
        // Reset form
        setReminderData({
          date: '',
          time: '09:00',
          notes: ''
        });
      } else {
        setError(result?.error || 'Failed to set reminder');
      }
    } catch (err) {
      setError('Failed to set reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
    setReminderData({
      date: '',
      time: '09:00',
      notes: ''
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Set Reminder">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Info */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Icon name="User" size={16} className="text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{contact?.name}</p>
              <p className="text-sm text-muted-foreground">{contact?.email}</p>
            </div>
          </div>
        </div>

        {/* Reminder Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={reminderData?.date}
                onChange={(e) => setReminderData(prev => ({ ...prev, date: e?.target?.value }))}
                required
                min={new Date()?.toISOString()?.split('T')?.[0]} // Minimum today
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Time
              </label>
              <Input
                type="time"
                value={reminderData?.time}
                onChange={(e) => setReminderData(prev => ({ ...prev, time: e?.target?.value }))}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={reminderData?.notes}
              onChange={(e) => setReminderData(prev => ({ ...prev, notes: e?.target?.value }))}
              placeholder={`Follow up with ${contact?.name}`}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Add specific notes for this follow-up
            </p>
          </div>
        </div>

        {/* Preview */}
        {reminderData?.date && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <Icon name="Bell" size={16} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Reminder Preview</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(`${reminderData?.date}T${reminderData?.time}:00`)?.toLocaleString()} 
                </p>
                {reminderData?.notes && (
                  <p className="text-xs text-muted-foreground mt-1">"{reminderData?.notes}"</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={16} className="text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!reminderData?.date || loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Setting...
              </>
            ) : (
              <>
                <Icon name="Bell" size={16} className="mr-2" />
                Set Reminder
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SetReminderModal;