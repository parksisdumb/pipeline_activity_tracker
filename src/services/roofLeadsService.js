import { supabase } from '../lib/supabase';

// Service for managing roof leads with PostGIS integration
const roofLeadsService = {
  // List roof leads with spatial and filtering options
  async listLeads(options = {}) {
    try {
      const {
        bbox = null, // [minLng, minLat, maxLng, maxLat] for bounding box
        search = '',
        status = null,
        tags = [],
        minScore = null,
        maxScore = null,
        limit = 50,
        offset = 0
      } = options;

      let query = supabase?.from('roof_leads')?.select(`
          *,
          created_by:user_profiles!roof_leads_created_by_fkey(id, full_name, email),
          linked_prospect:prospects(id, name, status),
          linked_account:accounts(id, name, company_type),
          linked_property:properties(id, name, address)
        `);

      // Apply bounding box filter for map viewport
      if (bbox && Array.isArray(bbox) && bbox?.length === 4) {
        const [minLng, minLat, maxLng, maxLat] = bbox;
        // Use PostGIS ST_Intersects with bounding box
        query = query?.rpc('filter_leads_by_bbox', {
          min_lng: minLng,
          min_lat: minLat,
          max_lng: maxLng,
          max_lat: maxLat
        });
      }

      // Text search in name, notes, or address
      if (search?.trim()) {
        query = query?.or(`name.ilike.%${search}%,notes.ilike.%${search}%,address.ilike.%${search}%`);
      }

      // Status filter
      if (status) {
        query = query?.eq('status', status);
      }

      // Condition score range
      if (minScore !== null) {
        query = query?.gte('condition_score', minScore);
      }
      if (maxScore !== null) {
        query = query?.lte('condition_score', maxScore);
      }

      // Tags filter (contains any of specified tags)
      if (tags?.length > 0) {
        query = query?.overlaps('tags', tags);
      }

      // Pagination and ordering
      query = query?.order('created_at', { ascending: false })?.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Failed to fetch roof leads: ${error?.message}`
        };
      }

      // Transform geometry data for frontend use
      const transformedData = data?.map(lead => ({
        ...lead,
        coordinates: lead?.geometry ? this.parseGeometry(lead?.geometry) : null
      })) || [];

      return {
        success: true,
        data: transformedData
      };

    } catch (error) {
      return {
        success: false,
        error: `Error fetching roof leads: ${error?.message}`
      };
    }
  },

  // Get single roof lead with full details
  async getLead(leadId) {
    try {
      const { data, error } = await supabase?.from('roof_leads')?.select(`
          *,
          created_by:user_profiles!roof_leads_created_by_fkey(id, full_name, email, role),
          linked_prospect:prospects(id, name, status, phone, email),
          linked_account:accounts(id, name, company_type, phone, email),
          linked_property:properties(id, name, address, building_type, square_footage),
          roof_lead_images(id, file_name, file_path, description, created_at)
        `)?.eq('id', leadId)?.single();

      if (error) {
        return {
          success: false,
          error: `Failed to fetch roof lead: ${error?.message}`
        };
      }

      // Transform geometry data
      const transformedLead = {
        ...data,
        coordinates: data?.geometry ? this.parseGeometry(data?.geometry) : null
      };

      return {
        success: true,
        data: transformedLead
      };

    } catch (error) {
      return {
        success: false,
        error: `Error fetching roof lead: ${error?.message}`
      };
    }
  },

  // Create new roof lead with GeoJSON geometry
  async createLead(leadData) {
    try {
      const {
        name,
        geojson,
        condition_label = 'other',
        condition_score = 1,
        tags = [],
        notes = '',
        address = '',
        city = '',
        state = '',
        zip_code = '',
        estimated_sqft = null,
        estimated_repair_cost = null
      } = leadData;

      if (!name?.trim()) {
        return {
          success: false,
          error: 'Lead name is required'
        };
      }

      if (!geojson) {
        return {
          success: false,
          error: 'Geometry data is required'
        };
      }

      // Use the PostGIS function to create the lead
      const { data, error } = await supabase?.rpc('create_roof_lead_with_geojson', {
          p_name: name?.trim(),
          p_geojson: geojson,
          p_condition_label: condition_label,
          p_condition_score: condition_score,
          p_tags: tags,
          p_notes: notes,
          p_address: address,
          p_city: city,
          p_state: state,
          p_zip_code: zip_code,
          p_estimated_sqft: estimated_sqft,
          p_estimated_repair_cost: estimated_repair_cost
        });

      if (error) {
        return {
          success: false,
          error: `Failed to create roof lead: ${error?.message}`
        };
      }

      const result = data?.[0];
      if (!result?.success) {
        return {
          success: false,
          error: result?.message || 'Failed to create roof lead'
        };
      }

      return {
        success: true,
        data: { id: result?.lead_id }
      };

    } catch (error) {
      return {
        success: false,
        error: `Error creating roof lead: ${error?.message}`
      };
    }
  },

  // Update roof lead
  async updateLead(leadId, updates) {
    try {
      // Filter out readonly fields
      const allowedUpdates = {
        name: updates?.name,
        condition_label: updates?.condition_label,
        condition_score: updates?.condition_score,
        status: updates?.status,
        tags: updates?.tags,
        notes: updates?.notes,
        address: updates?.address,
        city: updates?.city,
        state: updates?.state,
        zip_code: updates?.zip_code,
        estimated_sqft: updates?.estimated_sqft,
        estimated_repair_cost: updates?.estimated_repair_cost,
        linked_prospect_id: updates?.linked_prospect_id,
        linked_account_id: updates?.linked_account_id,
        linked_property_id: updates?.linked_property_id
      };

      // Remove undefined values
      Object.keys(allowedUpdates)?.forEach(key => {
        if (allowedUpdates?.[key] === undefined) {
          delete allowedUpdates?.[key];
        }
      });

      const { data, error } = await supabase?.from('roof_leads')?.update(allowedUpdates)?.eq('id', leadId)?.select()?.single();

      if (error) {
        return {
          success: false,
          error: `Failed to update roof lead: ${error?.message}`
        };
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: `Error updating roof lead: ${error?.message}`
      };
    }
  },

  // Delete roof lead
  async deleteLead(leadId) {
    try {
      // First delete associated images from storage
      const imagesResult = await this.listImages(leadId);
      if (imagesResult?.success && imagesResult?.data?.length > 0) {
        for (const image of imagesResult?.data) {
          await this.deleteImage(leadId, image?.id);
        }
      }

      const { error } = await supabase?.from('roof_leads')?.delete()?.eq('id', leadId);

      if (error) {
        return {
          success: false,
          error: `Failed to delete roof lead: ${error?.message}`
        };
      }

      return {
        success: true,
        data: { id: leadId }
      };

    } catch (error) {
      return {
        success: false,
        error: `Error deleting roof lead: ${error?.message}`
      };
    }
  },

  // Upload image to private storage
  async uploadImage(leadId, file, description = '') {
    try {
      if (!file) {
        return {
          success: false,
          error: 'No file provided'
        };
      }

      // Get current user and tenant info
      const { data: { session } } = await supabase?.auth?.getSession();
      if (!session?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data: userProfile } = await supabase?.from('user_profiles')?.select('tenant_id')?.eq('id', session?.user?.id)?.single();

      if (!userProfile?.tenant_id) {
        return {
          success: false,
          error: 'User tenant not found'
        };
      }

      // Create unique file name
      const fileExt = file?.name?.split('.')?.pop();
      const fileName = `${Date.now()}-${Math.random()?.toString(36)?.substring(2)}.${fileExt}`;
      const filePath = `${userProfile?.tenant_id}/${leadId}/${fileName}`;

      // Upload to private bucket
      const { data: uploadData, error: uploadError } = await supabase?.storage?.from('roof-lead-images')?.upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        return {
          success: false,
          error: `Failed to upload image: ${uploadError?.message}`
        };
      }

      // Save image record to database
      const { data, error } = await supabase?.from('roof_lead_images')?.insert({
          roof_lead_id: leadId,
          file_name: file?.name,
          file_path: filePath,
          file_size: file?.size,
          mime_type: file?.type,
          description: description,
          uploaded_by: session?.user?.id,
          tenant_id: userProfile?.tenant_id
        })?.select()?.single();

      if (error) {
        // Clean up uploaded file if database insert fails
        await supabase?.storage?.from('roof-lead-images')?.remove([filePath]);

        return {
          success: false,
          error: `Failed to save image record: ${error?.message}`
        };
      }

      // Generate signed URL for immediate viewing
      const { data: signedUrlData } = await supabase?.storage?.from('roof-lead-images')?.createSignedUrl(filePath, 3600); // 1 hour expiry

      return {
        success: true,
        data: {
          ...data,
          signed_url: signedUrlData?.signedUrl
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Error uploading image: ${error?.message}`
      };
    }
  },

  // List images for a roof lead
  async listImages(leadId) {
    try {
      const { data, error } = await supabase?.from('roof_lead_images')?.select('*')?.eq('roof_lead_id', leadId)?.order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Failed to fetch images: ${error?.message}`
        };
      }

      // Generate signed URLs for all images
      const imagesWithUrls = await Promise.all(
        (data || [])?.map(async (image) => {
          const { data: signedUrlData } = await supabase?.storage?.from('roof-lead-images')?.createSignedUrl(image?.file_path, 3600);

          return {
            ...image,
            signed_url: signedUrlData?.signedUrl
          };
        })
      );

      return {
        success: true,
        data: imagesWithUrls
      };

    } catch (error) {
      return {
        success: false,
        error: `Error fetching images: ${error?.message}`
      };
    }
  },

  // Delete image
  async deleteImage(leadId, imageId) {
    try {
      // Get image details first
      const { data: image, error: fetchError } = await supabase?.from('roof_lead_images')?.select('file_path')?.eq('id', imageId)?.eq('roof_lead_id', leadId)?.single();

      if (fetchError) {
        return {
          success: false,
          error: `Failed to find image: ${fetchError?.message}`
        };
      }

      // Delete from storage
      const { error: storageError } = await supabase?.storage?.from('roof-lead-images')?.remove([image?.file_path]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError?.message);
      }

      // Delete from database
      const { error: dbError } = await supabase?.from('roof_lead_images')?.delete()?.eq('id', imageId)?.eq('roof_lead_id', leadId);

      if (dbError) {
        return {
          success: false,
          error: `Failed to delete image record: ${dbError?.message}`
        };
      }

      return {
        success: true,
        data: { id: imageId }
      };

    } catch (error) {
      return {
        success: false,
        error: `Error deleting image: ${error?.message}`
      };
    }
  },

  // Convert roof lead to prospect
  async convertToProspect(leadId) {
    try {
      // Get roof lead details
      const leadResult = await this.getLead(leadId);
      if (!leadResult?.success) {
        return leadResult;
      }

      const lead = leadResult?.data;

      // Check if already linked to prospect
      if (lead?.linked_prospect_id) {
        return {
          success: false,
          error: 'Lead is already linked to a prospect'
        };
      }

      // Create prospect using existing prospectsService
      const prospectData = {
        name: lead?.name,
        address: lead?.address,
        city: lead?.city,
        state: lead?.state,
        zip_code: lead?.zip_code,
        notes: `Converted from roof lead. Original condition: ${lead?.condition_label} (score: ${lead?.condition_score}). ${lead?.notes || ''}`?.trim(),
        tags: [...(lead?.tags || []), 'roof-lead-conversion'],
        source: 'Roof Finder',
        status: 'uncontacted'
      };

      // Import prospectsService dynamically to avoid circular dependencies
      const { default: prospectsService } = await import('./prospectsService');
      const prospectResult = await prospectsService?.createProspect(prospectData);

      if (!prospectResult?.success) {
        return prospectResult;
      }

      // Link the roof lead to the created prospect
      const updateResult = await this.updateLead(leadId, {
        linked_prospect_id: prospectResult?.data?.id,
        status: 'converted'
      });

      if (!updateResult?.success) {
        return updateResult;
      }

      return {
        success: true,
        data: {
          roof_lead_id: leadId,
          prospect_id: prospectResult?.data?.id
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Error converting to prospect: ${error?.message}`
      };
    }
  },

  // Create property from roof lead
  async createPropertyFromLead(leadId, accountId = null) {
    try {
      const leadResult = await this.getLead(leadId);
      if (!leadResult?.success) {
        return leadResult;
      }

      const lead = leadResult?.data;

      // Create property data
      const propertyData = {
        name: lead?.name,
        address: lead?.address || 'Address from roof lead',
        city: lead?.city,
        state: lead?.state,
        zip_code: lead?.zip_code,
        building_type: 'Commercial Office', // Default, can be updated
        square_footage: lead?.estimated_sqft,
        notes: `Created from roof lead. Condition: ${lead?.condition_label} (score: ${lead?.condition_score}). ${lead?.notes || ''}`?.trim(),
        account_id: accountId || lead?.linked_account_id
      };

      // Import propertiesService dynamically
      const { default: propertiesService } = await import('./propertiesService');
      const propertyResult = await propertiesService?.createProperty(propertyData);

      if (!propertyResult?.success) {
        return propertyResult;
      }

      // Link the roof lead to the created property
      const updateResult = await this.updateLead(leadId, {
        linked_property_id: propertyResult?.data?.id,
        status: 'converted'
      });

      if (!updateResult?.success) {
        return updateResult;
      }

      return {
        success: true,
        data: {
          roof_lead_id: leadId,
          property_id: propertyResult?.data?.id
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Error creating property from lead: ${error?.message}`
      };
    }
  },

  // Create follow-up task
  async createFollowUpTask(leadId, taskData) {
    try {
      const {
        dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Default +2 days
        priority = 'medium',
        notes = ''
      } = taskData;

      const leadResult = await this.getLead(leadId);
      if (!leadResult?.success) {
        return leadResult;
      }

      const lead = leadResult?.data;

      // Create task data
      const newTaskData = {
        title: `Follow up on roof lead: ${lead?.name}`,
        description: `Follow up on roof lead with ${lead?.condition_label} condition (score: ${lead?.condition_score}). ${notes}`?.trim(),
        due_date: dueDate,
        priority: priority,
        category: 'follow_up_call',
        status: 'pending',
        // Link to related entities
        account_id: lead?.linked_account_id,
        property_id: lead?.linked_property_id,
        prospect_id: lead?.linked_prospect_id
      };

      // Import tasksService dynamically
      const { default: tasksService } = await import('./tasksService');
      const taskResult = await tasksService?.createTask(newTaskData);

      return taskResult;

    } catch (error) {
      return {
        success: false,
        error: `Error creating follow-up task: ${error?.message}`
      };
    }
  },

  // Utility function to parse PostGIS geometry to GeoJSON
  parseGeometry(geometry) {
    try {
      if (typeof geometry === 'string') {
        // If geometry is WKT string, convert to coordinates
        if (geometry?.startsWith('POINT')) {
          const coords = geometry?.match(/POINT\(([^)]+)\)/)?.[1]?.split(' ');
          if (coords && coords?.length === 2) {
            return {
              type: 'Point',
              coordinates: [parseFloat(coords?.[0]), parseFloat(coords?.[1])]
            };
          }
        } else if (geometry?.startsWith('POLYGON')) {
          // Parse polygon WKT - simplified for basic rectangles
          const coordsMatch = geometry?.match(/POLYGON\(\(([^)]+)\)\)/)?.[1];
          if (coordsMatch) {
            const coords = coordsMatch?.split(',')?.map(coordPair => {
              const [lng, lat] = coordPair?.trim()?.split(' ');
              return [parseFloat(lng), parseFloat(lat)];
            });
            return {
              type: 'Polygon',
              coordinates: [coords]
            };
          }
        }
      } else if (geometry && typeof geometry === 'object') {
        // If already parsed as GeoJSON
        return geometry;
      }
      
      return null;
    } catch (error) {
      console.warn('Error parsing geometry:', error);
      return null;
    }
  }
};

export default roofLeadsService;