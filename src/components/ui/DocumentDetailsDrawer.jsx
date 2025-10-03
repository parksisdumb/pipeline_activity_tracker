import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import documentsService from '../../services/documentsService';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import ExpirationStatusBadge from './ExpirationStatusBadge';
import Icon from '../AppIcon';

const DocumentDetailsDrawer = ({ 
  isOpen, 
  onClose, 
  document, 
  onDocumentUpdate, 
  onDocumentDelete 
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // Editable form data
  const [formData, setFormData] = useState({
    name: '',
    valid_from: '',
    valid_to: '',
    tags: '',
    notes: '',
    status: ''
  });

  const canManageDocuments = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  const typeOptions = [
    { value: 'coi', label: 'Certificate of Insurance' },
    { value: 'w9', label: 'W-9 Form' },
    { value: 'business_license', label: 'Business License' },
    { value: 'other', label: 'Other Document' }
  ];

  const statusOptions = [
    { value: 'valid', label: 'Valid' },
    { value: 'expiring', label: 'Expiring Soon' },
    { value: 'expired', label: 'Expired' },
    { value: 'missing', label: 'Missing' }
  ];

  useEffect(() => {
    if (document && isOpen) {
      // Initialize form data
      setFormData({
        name: document?.name || '',
        valid_from: document?.valid_from || '',
        valid_to: document?.valid_to || '',
        tags: document?.tags?.join(', ') || '',
        notes: document?.notes || '',
        status: document?.status || 'valid'
      });
      
      setEditing(false);
      setError('');
      loadEvents();
    }
  }, [document, isOpen]);

  const loadEvents = async () => {
    if (!document?.id) return;

    setEventsLoading(true);
    try {
      const response = await documentsService?.listDocumentEvents(document?.id);
      if (response?.success) {
        setEvents(response?.data || []);
      }
    } catch (err) {
      console.error('Failed to load document events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!document?.id) return;

    setLoading(true);
    setError('');

    try {
      const updates = {
        name: formData?.name?.trim(),
        valid_from: formData?.valid_from || null,
        valid_to: formData?.valid_to || null,
        tags: formData?.tags ? formData?.tags?.split(',')?.map(t => t?.trim())?.filter(t => t) : [],
        notes: formData?.notes,
        status: formData?.status
      };

      const response = await documentsService?.updateDocumentMetadata(document?.id, updates);
      
      if (response?.success) {
        onDocumentUpdate?.(response?.data);
        setEditing(false);
        loadEvents(); // Refresh events to show the update
      } else {
        setError(response?.error || 'Failed to update document');
      }
    } catch (err) {
      setError('Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await documentsService?.getSignedUrl(document?.id, 3600);
      if (response?.success) {
        window.open(response?.data?.signedUrl, '_blank');
      } else {
        setError(response?.error || 'Failed to download document');
      }
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString)?.toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes?.[i];
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'upload': return 'Upload';
      case 'download': return 'Download';
      case 'view': return 'Eye';
      case 'replace': return 'RefreshCw';
      case 'delete': return 'Trash2';
      case 'metadata_update': return 'Edit';
      default: return 'Activity';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'upload': return 'text-green-600';
      case 'download': return 'text-blue-600';
      case 'view': return 'text-gray-600';
      case 'replace': return 'text-orange-600';
      case 'delete': return 'text-red-600';
      case 'metadata_update': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen || !document) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l shadow-lg z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Document Details</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {typeOptions?.find(t => t?.value === document?.type)?.label || document?.type}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManageDocuments && !editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Icon name="Edit" size={16} className="mr-2" />
                  Edit
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <Icon name="X" size={16} />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Icon name="Download" size={16} className="mr-2" />
              Download
            </Button>
            
            {canManageDocuments && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // This would open a replace document modal
                    // For now, just show an info message
                    alert('Replace functionality would be implemented here');
                  }}
                >
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Replace
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this document?')) {
                      onDocumentDelete?.(document?.id);
                    }
                  }}
                >
                  <Icon name="Trash2" size={16} className="mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Document Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Document Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                {editing ? (
                  <Input
                    value={formData?.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e?.target?.value }))}
                    placeholder="Document name"
                  />
                ) : (
                  <p className="text-sm bg-muted p-2 rounded">{document?.name}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                {editing ? (
                  <Select
                    value={formData?.status}
                    onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    options={statusOptions}
                  />
                ) : (
                  <ExpirationStatusBadge 
                    status={document?.status} 
                    expiryDate={document?.valid_to} 
                  />
                )}
              </div>

              {/* Valid From/To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Valid From</label>
                  {editing ? (
                    <Input
                      type="date"
                      value={formData?.valid_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e?.target?.value }))}
                    />
                  ) : (
                    <p className="text-sm bg-muted p-2 rounded">
                      {document?.valid_from ? new Date(document.valid_from)?.toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Valid To</label>
                  {editing ? (
                    <Input
                      type="date"
                      value={formData?.valid_to}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_to: e?.target?.value }))}
                      min={formData?.valid_from || undefined}
                    />
                  ) : (
                    <p className="text-sm bg-muted p-2 rounded">
                      {document?.valid_to ? new Date(document.valid_to)?.toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                {editing ? (
                  <Input
                    value={formData?.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e?.target?.value }))}
                    placeholder="tag1, tag2, tag3"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {document?.tags?.length > 0 ? (
                      document?.tags?.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-muted text-sm rounded"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                {editing ? (
                  <textarea
                    className="w-full p-2 border border-input rounded-md resize-none"
                    rows={3}
                    value={formData?.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e?.target?.value }))}
                    placeholder="Add notes about this document"
                  />
                ) : (
                  <p className="text-sm bg-muted p-2 rounded min-h-[2rem]">
                    {document?.notes || 'No notes'}
                  </p>
                )}
              </div>
            </div>

            {/* Save/Cancel buttons for editing */}
            {editing && (
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setError('');
                    // Reset form data
                    setFormData({
                      name: document?.name || '',
                      valid_from: document?.valid_from || '',
                      valid_to: document?.valid_to || '',
                      tags: document?.tags?.join(', ') || '',
                      notes: document?.notes || '',
                      status: document?.status || 'valid'
                    });
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* File Information */}
          <div className="space-y-4">
            <h3 className="font-medium">File Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">File Size</p>
                <p>{formatFileSize(document?.size_bytes)}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">MIME Type</p>
                <p>{document?.mime_type || 'Unknown'}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Version</p>
                <p>v{document?.version || 1}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Uploaded</p>
                <p>{formatDate(document?.uploaded_at)}</p>
              </div>
              <div className="col-span-2">
                <p className="font-medium text-muted-foreground">Uploaded By</p>
                <p>{document?.uploader?.full_name || 'System'}</p>
              </div>
            </div>
          </div>

          {/* Document Events (Audit Trail) */}
          <div className="space-y-4">
            <h3 className="font-medium">Activity Log</h3>
            {eventsLoading ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              </div>
            ) : events?.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {events?.map((event) => (
                  <div key={event?.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Icon 
                      name={getEventIcon(event?.event_type)} 
                      size={16} 
                      className={`mt-1 ${getEventColor(event?.event_type)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm capitalize">
                          {event?.event_type?.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event?.event_at)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event?.user?.full_name || 'System'}
                      </p>
                      {event?.meta && Object.keys(event?.meta)?.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {JSON.stringify(event?.meta, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No activity recorded</p>
            )}
          </div>

          {/* Entity Links */}
          {(document?.account_id || document?.property_id || document?.contact_id || document?.opportunity_id) && (
            <div className="space-y-4">
              <h3 className="font-medium">Linked Entities</h3>
              <div className="space-y-2">
                {document?.account && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Icon name="Building2" size={16} />
                    <span className="text-sm">Account: {document?.account?.name}</span>
                  </div>
                )}
                {document?.property && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Icon name="MapPin" size={16} />
                    <span className="text-sm">Property: {document?.property?.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DocumentDetailsDrawer;