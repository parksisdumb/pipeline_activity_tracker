import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Edit2, Trash2, ArrowRight, Clock } from 'lucide-react';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import LeadForm from '../ugly-roof-finder-map/components/LeadForm';
import ImageUploader from '../ugly-roof-finder-map/components/ImageUploader';
import roofLeadsService from '../../services/roofLeadsService';

export default function RoofLeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  useEffect(() => {
    if (lead?.id) {
      loadImages();
    }
  }, [lead?.id]);

  const loadLead = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await roofLeadsService?.getLead(id);
      if (result?.success) {
        setLead(result?.data);
      } else {
        setError(result?.error || 'Failed to load roof lead');
      }
    } catch (err) {
      setError('Error loading roof lead');
      console.error('Error loading lead:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
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
    try {
      const result = await roofLeadsService?.updateLead(lead?.id, formData);
      if (result?.success) {
        setLead(result?.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Are you sure you want to delete this roof lead? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const result = await roofLeadsService?.deleteLead(lead?.id);
      if (result?.success) {
        navigate('/ugly-roof-finder-map');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleConvertToProspect = async () => {
    try {
      const result = await roofLeadsService?.convertToProspect(lead?.id);
      if (result?.success) {
        loadLead(); // Reload to get updated status
      }
    } catch (error) {
      console.error('Error converting to prospect:', error);
    }
  };

  const handleCreateProperty = async () => {
    try {
      const result = await roofLeadsService?.createPropertyFromLead(lead?.id);
      if (result?.success) {
        loadLead(); // Reload to get updated status
      }
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  const handleCreateFollowUpTask = async (days = 2) => {
    try {
      const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const result = await roofLeadsService?.createFollowUpTask(lead?.id, {
        dueDate,
        priority: lead?.condition_score >= 4 ? 'high' : 'medium',
        title: `Follow-up: ${lead?.name}`,
        notes: `From roof lead ${lead?.name} at ${lead?.address || ''}`
      });
      
      if (result?.success) {
        // Navigate to task management or show success
        navigate('/task-management');
      }
    } catch (error) {
      console.error('Error creating follow-up task:', error);
    }
  };

  const handleImageUpload = async (file, description) => {
    try {
      const result = await roofLeadsService?.uploadImage(lead?.id, file, description);
      if (result?.success) {
        loadImages(); // Refresh images list
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to view roof lead details.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <SidebarNavigation onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading roof lead details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex h-screen bg-gray-100">
        <SidebarNavigation onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Roof Lead Not Found</h2>
              <p className="text-gray-600 mb-6">{error || 'The requested roof lead could not be found.'}</p>
              <Button onClick={() => navigate('/ugly-roof-finder-map')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Map
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarNavigation onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/ugly-roof-finder-map')}
                    className="flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Map
                  </Button>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-6 h-6 text-blue-600" />
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{lead?.name}</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead?.status)}`}>
                          {lead?.status?.replace('_', ' ')?.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(lead?.condition_score)}`}>
                          {lead?.condition_label} ({lead?.condition_score}/5)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isEditing && (
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Lead Information */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Lead Information
                    </h3>

                    {isEditing ? (
                      <LeadForm
                        lead={lead}
                        onSave={handleSave}
                        onCancel={() => setIsEditing(false)}
                      />
                    ) : (
                      <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {lead?.address || 'Not specified'}
                              {lead?.city && `, ${lead?.city}`}
                              {lead?.state && ` ${lead?.state}`}
                              {lead?.zip_code && ` ${lead?.zip_code}`}
                            </dd>
                          </div>
                          
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Estimated Size</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {lead?.estimated_sqft ? `${lead?.estimated_sqft?.toLocaleString()} sq ft` : 'Not specified'}
                            </dd>
                          </div>
                          
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Estimated Cost</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {lead?.estimated_repair_cost ? `$${lead?.estimated_repair_cost?.toLocaleString()}` : 'Not specified'}
                            </dd>
                          </div>
                          
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Created</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {new Date(lead.created_at)?.toLocaleDateString()}
                            </dd>
                          </div>
                        </div>

                        {/* Tags */}
                        {lead?.tags?.length > 0 && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Tags</dt>
                            <dd className="mt-1">
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
                            </dd>
                          </div>
                        )}

                        {/* Notes */}
                        {lead?.notes && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Notes</dt>
                            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                              {lead?.notes}
                            </dd>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Images Section */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Roof Images ({images?.length})
                    </h3>
                    
                    <ImageUploader
                      leadId={lead?.id}
                      images={images}
                      loading={imagesLoading}
                      onUpload={handleImageUpload}
                      onDelete={handleImageDelete}
                    />
                  </div>
                </div>

                {/* Mini Static Map Preview (Optional Enhancement) */}
                {lead?.coordinates && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Location Preview
                      </h3>
                      <div className="w-full h-48 bg-gray-100 rounded-md flex items-center justify-center">
                        <p className="text-sm text-gray-500">
                          Interactive map preview coming soon
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Quick Actions
                    </h3>
                    
                    <div className="space-y-3">
                      {lead?.status !== 'converted' && !lead?.linked_prospect && (
                        <Button
                          onClick={handleConvertToProspect}
                          className="w-full"
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Convert to Prospect
                        </Button>
                      )}

                      {!lead?.linked_property && (
                        <Button
                          onClick={handleCreateProperty}
                          variant="secondary"
                          className="w-full"
                        >
                          Create Property Record
                        </Button>
                      )}

                      {/* Follow-up Tasks */}
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Create Follow-up Task
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[2, 5, 7, 14]?.map(days => (
                            <Button
                              key={days}
                              onClick={() => handleCreateFollowUpTask(days)}
                              size="sm"
                              variant="outline"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              +{days}d
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked Records */}
                {(lead?.linked_prospect || lead?.linked_account || lead?.linked_property) && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Linked Records
                      </h3>
                      
                      <div className="space-y-3">
                        {lead?.linked_prospect && (
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                            <div>
                              <p className="text-sm font-medium text-blue-900">Prospect</p>
                              <p className="text-sm text-blue-700">{lead?.linked_prospect?.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/prospect-details/${lead?.linked_prospect?.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        )}

                        {lead?.linked_account && (
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                            <div>
                              <p className="text-sm font-medium text-green-900">Account</p>
                              <p className="text-sm text-green-700">{lead?.linked_account?.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/account-details/${lead?.linked_account?.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        )}

                        {lead?.linked_property && (
                          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-md">
                            <div>
                              <p className="text-sm font-medium text-purple-900">Property</p>
                              <p className="text-sm text-purple-700">{lead?.linked_property?.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/property-details/${lead?.linked_property?.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lead Metadata */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Lead Details
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created by</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {lead?.created_by?.full_name || 'Unknown User'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created on</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(lead.created_at)?.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last updated</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(lead.updated_at)?.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}