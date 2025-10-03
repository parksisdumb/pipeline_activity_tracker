import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import documentsService from '../../services/documentsService';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Icon from '../AppIcon';

const DocumentUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const { userProfile } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    valid_from: '',
    valid_to: '',
    tags: '',
    notes: '',
    account_id: null,
    property_id: null,
    contact_id: null,
    opportunity_id: null
  });

  const typeOptions = [
    { value: 'coi', label: 'Certificate of Insurance' },
    { value: 'w9', label: 'W-9 Form' },
    { value: 'business_license', label: 'Business License' },
    { value: 'other', label: 'Other Document' }
  ];

  const allowedMimeTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ];

  const maxFileSize = 25 * 1024 * 1024; // 25MB

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        name: '',
        type: 'other',
        valid_from: '',
        valid_to: '',
        tags: '',
        notes: '',
        account_id: null,
        property_id: null,
        contact_id: null,
        opportunity_id: null
      });
      setSelectedFile(null);
      setError('');
    }
  }, [isOpen]);

  const handleDrag = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (e?.type === 'dragenter' || e?.type === 'dragover') {
      setDragActive(true);
    } else if (e?.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragActive(false);

    const files = Array.from(e?.dataTransfer?.files || []);
    if (files?.length > 0) {
      handleFileSelect(files?.[0]);
    }
  };

  const handleFileSelect = (file) => {
    setError('');

    // Validate file type
    if (!allowedMimeTypes?.includes(file?.type)) {
      setError('Invalid file type. Please upload PDF, PNG, JPG, or WebP files only.');
      return;
    }

    // Validate file size
    if (file?.size > maxFileSize) {
      setError('File size too large. Maximum size is 25MB.');
      return;
    }

    setSelectedFile(file);
    
    // Auto-populate name if not set
    if (!formData?.name) {
      const nameWithoutExtension = file?.name?.replace(/\.[^/.]+$/, '');
      setFormData(prev => ({ ...prev, name: nameWithoutExtension }));
    }
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!formData?.name?.trim()) {
      setError('Please enter a document name');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const metadata = {
        ...formData,
        tags: formData?.tags ? formData?.tags?.split(',')?.map(t => t?.trim())?.filter(t => t) : []
      };

      const response = await documentsService?.uploadDocument(selectedFile, metadata);
      
      if (response?.success) {
        onUploadSuccess?.();
      } else {
        setError(response?.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes?.[i];
  };

  const isCoiType = formData?.type === 'coi';

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Document"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Document File *
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/10' :'border-muted-foreground/30 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <Icon name="FileText" size={48} className="mx-auto text-green-500" />
                <p className="font-medium">{selectedFile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile?.size)} • {selectedFile?.type}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Icon name="Upload" size={48} className="mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">Drop files here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  PDF, PNG, JPG, WebP files up to 25MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef?.current?.click()}
                >
                  Browse Files
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={allowedMimeTypes?.join(',')}
              onChange={(e) => {
                const file = e?.target?.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        </div>

        {/* Document Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Document Name *
            </label>
            <Input
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              placeholder="Enter document name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Document Type *
            </label>
            <Select
              value={formData?.type}
              onChange={(value) => handleInputChange('type', value)}
              onSearchChange={() => {}}
              error=""
              id="document-type"
              onOpenChange={() => {}}
              label=""
              name="document-type"
              description=""
              options={typeOptions}
              placeholder="Select document type"
              required
            />
          </div>
        </div>

        {/* Validity Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Valid From {isCoiType && <span className="text-primary">*</span>}
            </label>
            <Input
              type="date"
              value={formData?.valid_from}
              onChange={(e) => handleInputChange('valid_from', e?.target?.value)}
              required={isCoiType}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Valid To {isCoiType && <span className="text-primary">*</span>}
            </label>
            <Input
              type="date"
              value={formData?.valid_to}
              onChange={(e) => handleInputChange('valid_to', e?.target?.value)}
              required={isCoiType}
              min={formData?.valid_from || undefined}
            />
            {isCoiType && (
              <p className="text-xs text-muted-foreground mt-1">
                COI expiry date is required for compliance tracking
              </p>
            )}
          </div>
        </div>

        {/* Additional Metadata */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tags (comma-separated)
            </label>
            <Input
              value={formData?.tags}
              onChange={(e) => handleInputChange('tags', e?.target?.value)}
              placeholder="insurance, compliance, 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Notes
            </label>
            <textarea
              className="w-full p-3 border border-input rounded-md resize-none"
              rows={3}
              value={formData?.notes}
              onChange={(e) => handleInputChange('notes', e?.target?.value)}
              placeholder="Add any additional notes about this document"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!selectedFile || uploading || !formData?.name?.trim()}
          >
            {uploading ? (
              <>
                <Icon name="Upload" size={16} className="mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Icon name="Upload" size={16} className="mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DocumentUploadModal;