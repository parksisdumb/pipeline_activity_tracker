import React, { useState, useRef } from 'react';
import { Upload, X, Eye, Camera, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function ImageUploader({ leadId, images = [], loading = false, onUpload, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef();

  const uploadFile = async (file) => {
    if (!file || !leadId) return;

    // Validate file type
    if (!file?.type?.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file?.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const result = await onUpload?.(file, '');
      if (!result?.success) {
        alert(result?.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event?.target?.files || []);
    files?.forEach(uploadFile);
  };

  const handleDrop = (event) => {
    event?.preventDefault();
    const files = Array.from(event?.dataTransfer?.files);
    files?.forEach(uploadFile);
  };

  const handleDragOver = (event) => {
    event?.preventDefault();
  };

  const handleDelete = async (imageId) => {
    const confirmed = window.confirm('Are you sure you want to delete this image?');
    if (!confirmed) return;

    try {
      const result = await onDelete?.(imageId);
      if (!result?.success) {
        alert(result?.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image');
    }
  };

  const openImageViewer = (image) => {
    setSelectedImage(image);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024) * 10) / 10 + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef?.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading || loading}
        />
        
        <div className="space-y-2">
          <div className="flex justify-center">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {uploading ? 'Uploading...' : 'Drop images here or click to browse'}
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WebP up to 10MB
            </p>
          </div>
        </div>
      </div>
      {/* Images Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading images...</p>
        </div>
      ) : images?.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">
            Uploaded Images ({images?.length})
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {images?.map((image) => (
              <div
                key={image?.id}
                className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Image Preview */}
                <div className="aspect-square bg-gray-100">
                  {image?.signed_url ? (
                    <img
                      src={image?.signed_url}
                      alt={image?.description || image?.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e?.stopPropagation();
                        openImageViewer(image);
                      }}
                      className="bg-white text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={(e) => {
                        e?.stopPropagation();
                        handleDelete(image?.id);
                      }}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Image Info */}
                <div className="p-2 bg-white border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {image?.file_name}
                  </p>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatFileSize(image?.file_size || 0)}</span>
                    <span>{new Date(image.created_at)?.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No images uploaded yet</p>
          <p className="text-xs text-gray-500">
            Upload photos of the roof condition to document findings
          </p>
        </div>
      )}
      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              onClick={closeImageViewer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
              variant="ghost"
            >
              <X className="w-6 h-6" />
            </Button>
            
            <img
              src={selectedImage?.signed_url}
              alt={selectedImage?.description || selectedImage?.file_name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
              <p className="font-medium">{selectedImage?.file_name}</p>
              <p className="text-sm opacity-75">
                {formatFileSize(selectedImage?.file_size || 0)} • {' '}
                Uploaded {new Date(selectedImage.created_at)?.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}