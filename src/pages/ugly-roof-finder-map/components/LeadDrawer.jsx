import React, { useState, useEffect } from 'react';
import { X, MapPin, Camera, Building2, Clock, ArrowRight } from 'lucide-react';
import Button from '../../../components/ui/Button';


import LeadForm from './LeadForm';
import ImageUploader from './ImageUploader';
import roofLeadsService from '../../../services/roofLeadsService';
import Icon from '../../../components/AppIcon';


export default function LeadDrawer({ isOpen, lead, onClose, onUpdate, onDelete }) {
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  // Load images when lead changes
  useEffect(() => {
    if (lead?.id) {
      loadImages();
    } else {
      setImages([]);
    }
  }, [lead?.id]);

  const loadImages = async () => {
    if (!lead?.id) return;
    
    setImagesLoading(true);
    try {
      const result = await roofLeadsService?.listImages(lead?.id);
      if (result?.success) {
        setImages(result?.data || []);
      }
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleSave = async (formData) => {
    if (!lead?.id) return;

    setLoading(true);
    try {
      const result = await roofLeadsService?.updateLead(lead?.id, formData);
      if (result?.success) {
        onUpdate?.(result?.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lead?.id) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this roof lead? This action cannot be undone.');
    if (!confirmed) return;

    setLoading(true);
    try {
      await onDelete?.(lead?.id);
    } catch (error) {
      console.error('Error deleting lead:', error);
      setLoading(false);
    }
  };

  const handleConvertToProspect = async () => {
    if (!lead?.id) return;

    setLoading(true);
    try {
      const result = await roofLeadsService?.convertToProspect(lead?.id);
      if (result?.success) {
        // Reload lead to get updated status
        const updatedResult = await roofLeadsService?.getLead(lead?.id);
        if (updatedResult?.success) {
          onUpdate?.(updatedResult?.data);
        }
      }
    } catch (error) {
      console.error('Error converting to prospect:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = async () => {
    if (!lead?.id) return;

    setLoading(true);
    try {
      const result = await roofLeadsService?.createPropertyFromLead(lead?.id);
      if (result?.success) {
        // Reload lead to get updated status
        const updatedResult = await roofLeadsService?.getLead(lead?.id);
        if (updatedResult?.success) {
          onUpdate?.(updatedResult?.data);
        }
      }
    } catch (error) {
      console.error('Error creating property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFollowUpTask = async (days = 2) => {
    if (!lead?.id) return;

    setLoading(true);
    try {
      const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const result = await roofLeadsService?.createFollowUpTask(lead?.id, {
        dueDate,
        priority: lead?.condition_score >= 4 ? 'high' : 'medium',
        notes: `Follow up on ${lead?.condition_label} roof condition (score: ${lead?.condition_score})`
      });
      
      if (result?.success) {
        // Show success message or navigate to task
        console.log('Follow-up task created successfully');
      }
    } catch (error) {
      console.error('Error creating follow-up task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file, description) => {
    if (!lead?.id) return;

    try {
      const result = await roofLeadsService?.uploadImage(lead?.id, file, description);
      if (result?.success) {
        loadImages(); // Refresh images list
        return result;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Error uploading image: ${error?.message}`
      };
    }
  };

  const handleImageDelete = async (imageId) => {
    if (!lead?.id) return;

    try {
      const result = await roofLeadsService?.deleteImage(lead?.id, imageId);
      if (result?.success) {
        loadImages(); // Refresh images list
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Error deleting image: ${error?.message}`
      };
    }
  };

  const getConditionColor = (score) => {
    if (score >= 4) return 'text-red-600 bg-red-100';
    if (score >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'converted': return 'text-green-600 bg-green-100';
      case 'qualified': return 'text-blue-600 bg-blue-100';
      case 'contacted': return 'text-purple-600 bg-purple-100';
      case 'assessed': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 truncate">{lead?.name}</h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {[
            { id: 'details', label: 'Details', icon: Building2 },
            { id: 'images', label: 'Images', icon: Camera }
          ]?.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center px-4 py-2 text-sm font-medium ${
                activeTab === id
                  ? 'text-blue-600 border-b-2 border-blue-600' :'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <div className="p-4 space-y-6">
            {/* Status and Condition Badges */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead?.status)}`}>
                {lead?.status?.replace('_', ' ')?.toUpperCase()}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(lead?.condition_score)}`}>
                {lead?.condition_label} ({lead?.condition_score}/5)
              </span>
            </div>

            {/* Lead Form */}
            {isEditing ? (
              <LeadForm
                lead={lead}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
                loading={loading}
              />
            ) : (
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Basic Information</h3>
                  <div className="space-y-2">
                    {lead?.address && (
                      <p className="text-sm text-gray-600">
                        📍 {lead?.address}
                        {lead?.city && `, ${lead?.city}`}
                        {lead?.state && ` ${lead?.state}`}
                        {lead?.zip_code && ` ${lead?.zip_code}`}
                      </p>
                    )}
                    {lead?.estimated_sqft && (
                      <p className="text-sm text-gray-600">
                        📐 Estimated: {lead?.estimated_sqft?.toLocaleString()} sq ft
                      </p>
                    )}
                    {lead?.estimated_repair_cost && (
                      <p className="text-sm text-gray-600">
                        💰 Est. Cost: ${lead?.estimated_repair_cost?.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {lead?.tags?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {lead?.tags?.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {lead?.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead?.notes}</p>
                  </div>
                )}

                {/* Linked Entities */}
                {(lead?.linked_prospect || lead?.linked_account || lead?.linked_property) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Linked Records</h3>
                    <div className="space-y-1">
                      {lead?.linked_prospect && (
                        <p className="text-sm text-blue-600">
                          Prospect: {lead?.linked_prospect?.name}
                        </p>
                      )}
                      {lead?.linked_account && (
                        <p className="text-sm text-blue-600">
                          Account: {lead?.linked_account?.name}
                        </p>
                      )}
                      {lead?.linked_property && (
                        <p className="text-sm text-blue-600">
                          Property: {lead?.linked_property?.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                    variant="secondary"
                  >
                    Edit Lead
                  </Button>

                  {lead?.status !== 'converted' && !lead?.linked_prospect && (
                    <Button
                      onClick={handleConvertToProspect}
                      className="w-full"
                      loading={loading}
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Convert to Prospect
                    </Button>
                  )}

                  {!lead?.linked_property && (
                    <Button
                      onClick={handleCreateProperty}
                      className="w-full"
                      variant="secondary"
                      loading={loading}
                    >
                      Create Property
                    </Button>
                  )}

                  {/* Follow-up Task Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {[2, 5, 7, 14]?.map(days => (
                      <Button
                        key={days}
                        onClick={() => handleCreateFollowUpTask(days)}
                        size="sm"
                        variant="outline"
                        loading={loading}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        +{days}d
                      </Button>
                    ))}
                  </div>

                  <Button
                    onClick={handleDelete}
                    className="w-full"
                    variant="danger"
                    loading={loading}
                  >
                    Delete Lead
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="p-4">
            <ImageUploader
              leadId={lead?.id}
              images={images}
              loading={imagesLoading}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
            />
          </div>
        )}
      </div>
      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500">
          Created by {lead?.created_by?.full_name} on{' '}
          {new Date(lead.created_at)?.toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}