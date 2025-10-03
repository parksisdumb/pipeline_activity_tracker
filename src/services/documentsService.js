import { supabase } from '../lib/supabase';

const documentsService = {
  // List documents with filters and pagination
  async listDocuments(filters = {}, pagination = {}) {
    try {
      const { 
        search = '', 
        type = [], 
        status = [], 
        tags = [],
        uploaded_by = null,
        uploaded_at_from = null,
        uploaded_at_to = null,
        expiring_days = null 
      } = filters;
      
      const { 
        limit = 50, 
        offset = 0, 
        sort_by = 'uploaded_at', 
        sort_order = 'desc' 
      } = pagination;

      let query = supabase?.from('documents')?.select(`
          id,
          tenant_id,
          name,
          type,
          storage_path,
          mime_type,
          size_bytes,
          uploaded_by,
          uploaded_at,
          version,
          valid_from,
          valid_to,
          status,
          tags,
          notes,
          account_id,
          property_id,
          contact_id,
          opportunity_id,
          created_at,
          updated_at,
          uploader:uploaded_by (
            id,
            full_name,
            email
          ),
          account:account_id (
            id,
            name
          ),
          property:property_id (
            id,
            name
          )
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        query = query?.ilike('name', `%${search}%`);
      }

      if (type?.length > 0) {
        query = query?.in('type', type);
      }

      if (status?.length > 0) {
        query = query?.in('status', status);
      }

      if (tags?.length > 0) {
        query = query?.overlaps('tags', tags);
      }

      if (uploaded_by) {
        query = query?.eq('uploaded_by', uploaded_by);
      }

      if (uploaded_at_from) {
        query = query?.gte('uploaded_at', uploaded_at_from);
      }

      if (uploaded_at_to) {
        query = query?.lte('uploaded_at', uploaded_at_to);
      }

      if (expiring_days) {
        const expiry_date = new Date();
        expiry_date?.setDate(expiry_date?.getDate() + expiring_days);
        query = query?.not('valid_to', 'is', null)?.gte('valid_to', new Date()?.toISOString()?.split('T')?.[0])?.lte('valid_to', expiry_date?.toISOString()?.split('T')?.[0]);
      }

      // Apply sorting and pagination
      query = query?.order(sort_by, { ascending: sort_order === 'asc' })?.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error?.message };
      }

      return { 
        success: true, 
        data: data || [], 
        total: count || 0,
        hasMore: count ? offset + limit < count : false
      };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Upload new document
  async uploadDocument(file, metadata = {}) {
    try {
      const {
        name,
        type = 'other',
        valid_from = null,
        valid_to = null,
        tags = [],
        notes = '',
        account_id = null,
        property_id = null,
        contact_id = null,
        opportunity_id = null
      } = metadata;

      // Get current user session
      const { data: { session } } = await supabase?.auth?.getSession();
      if (!session?.user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get user profile to access tenant_id
      const { data: profile, error: profileError } = await supabase?.from('user_profiles')?.select('tenant_id')?.eq('id', session?.user?.id)?.single();

      if (profileError || !profile?.tenant_id) {
        return { success: false, error: 'Unable to get user tenant information' };
      }

      // Generate storage path with tenant isolation
      const documentId = crypto.randomUUID();
      const fileExtension = file?.name?.split('.')?.pop();
      const sanitizedName = name?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'document';
      const storagePath = `${profile?.tenant_id}/${documentId}-${sanitizedName}.${fileExtension}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase?.storage?.from('tenant-docs')?.upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        return { success: false, error: uploadError?.message };
      }

      // Calculate file hash (simple checksum for integrity)
      const arrayBuffer = await file?.arrayBuffer();
      const hashBuffer = await crypto.subtle?.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hash = hashArray?.map(b => b?.toString(16)?.padStart(2, '0'))?.join('');

      // Insert document metadata
      const { data: document, error: docError } = await supabase?.from('documents')?.insert([{
          name: name || file?.name,
          type,
          storage_path: storagePath,
          mime_type: file?.type,
          size_bytes: file?.size,
          uploaded_by: session?.user?.id,
          valid_from,
          valid_to,
          sha256_hash: sha256Hash,
          tags,
          notes,
          account_id,
          property_id,
          contact_id,
          opportunity_id
        }])?.select()?.single();

      if (docError) {
        // Clean up uploaded file if metadata insertion fails
        await supabase?.storage?.from('tenant-docs')?.remove([storagePath]);
        return { success: false, error: docError?.message };
      }

      // Log upload event
      await this.logEvent(document?.id, 'upload', {
        file_name: file?.name,
        file_size: file?.size,
        mime_type: file?.type
      });

      return { success: true, data: document };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Get signed URL for private document access
  async getSignedUrl(documentId, expiresInSeconds = 3600) {
    try {
      // Get document info first to validate access
      const { data: document, error: docError } = await supabase?.from('documents')?.select('id, storage_path, name, mime_type')?.eq('id', documentId)?.single();

      if (docError || !document) {
        return { success: false, error: 'Document not found' };
      }

      // Generate signed URL
      const { data, error } = await supabase?.storage?.from('tenant-docs')?.createSignedUrl(document?.storage_path, expiresInSeconds);

      if (error) {
        return { success: false, error: error?.message };
      }

      // Log download event
      await this.logEvent(documentId, 'download', {
        expires_in: expiresInSeconds
      });

      return { 
        success: true, 
        data: {
          signedUrl: data?.signedUrl,
          document: document
        }
      };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Replace document (creates new version)
  async replaceDocument(documentId, file, metadata = {}) {
    try {
      // Get existing document
      const { data: existingDoc, error: docError } = await supabase?.from('documents')?.select('*')?.eq('id', documentId)?.single();

      if (docError || !existingDoc) {
        return { success: false, error: 'Document not found' };
      }

      // Upload new file
      const { name, valid_to, notes } = metadata;
      const uploadResult = await this.uploadDocument(file, {
        name: name || existingDoc?.name,
        type: existingDoc?.type,
        valid_from: existingDoc?.valid_from,
        valid_to: valid_to !== undefined ? valid_to : existingDoc?.valid_to,
        tags: existingDoc?.tags,
        notes: notes !== undefined ? notes : existingDoc?.notes,
        account_id: existingDoc?.account_id,
        property_id: existingDoc?.property_id,
        contact_id: existingDoc?.contact_id,
        opportunity_id: existingDoc?.opportunity_id
      });

      if (!uploadResult?.success) {
        return uploadResult;
      }

      // Update new document to reference previous version
      const { data: updatedDoc, error: updateError } = await supabase?.from('documents')?.update({
          version: existingDoc?.version + 1,
          previous_document_id: documentId
        })?.eq('id', uploadResult?.data?.id)?.select()?.single();

      if (updateError) {
        return { success: false, error: updateError?.message };
      }

      // Log replace event
      await this.logEvent(uploadResult?.data?.id, 'replace', {
        previous_version: existingDoc?.version,
        new_version: updatedDoc?.version,
        previous_document_id: documentId
      });

      return { success: true, data: updatedDoc };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Update document metadata
  async updateDocumentMetadata(documentId, updates) {
    try {
      const allowedUpdates = ['name', 'valid_from', 'valid_to', 'tags', 'notes', 'status'];
      const sanitizedUpdates = {};
      
      Object.keys(updates)?.forEach(key => {
        if (allowedUpdates?.includes(key)) {
          sanitizedUpdates[key] = updates?.[key];
        }
      });

      if (Object.keys(sanitizedUpdates)?.length === 0) {
        return { success: false, error: 'No valid updates provided' };
      }

      const { data, error } = await supabase?.from('documents')?.update(sanitizedUpdates)?.eq('id', documentId)?.select()?.single();

      if (error) {
        return { success: false, error: error?.message };
      }

      // Log metadata update event
      await this.logEvent(documentId, 'metadata_update', {
        updated_fields: Object.keys(sanitizedUpdates),
        changes: sanitizedUpdates
      });

      return { success: true, data };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Delete document
  async deleteDocument(documentId) {
    try {
      // Get document info for cleanup
      const { data: document, error: docError } = await supabase?.from('documents')?.select('storage_path, name')?.eq('id', documentId)?.single();

      if (docError || !document) {
        return { success: false, error: 'Document not found' };
      }

      // Delete from storage first
      const { error: storageError } = await supabase?.storage?.from('tenant-docs')?.remove([document?.storage_path]);

      if (storageError) {
        return { success: false, error: storageError?.message };
      }

      // Delete from database
      const { error: deleteError } = await supabase?.from('documents')?.delete()?.eq('id', documentId);

      if (deleteError) {
        return { success: false, error: deleteError?.message };
      }

      // Log delete event (this will also be deleted due to CASCADE, but good for immediate tracking)
      await this.logEvent(documentId, 'delete', {
        document_name: document?.name,
        storage_path: document?.storage_path
      });

      return { success: true, data: { message: 'Document deleted successfully' } };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Get document events (audit trail)
  async listDocumentEvents(documentId, pagination = {}) {
    try {
      const { limit = 50, offset = 0 } = pagination;

      const { data, error, count } = await supabase?.from('document_events')?.select(`
          id,
          document_id,
          event_type,
          event_at,
          meta,
          user:user_id (
            id,
            full_name,
            email
          )
        `, { count: 'exact' })?.eq('document_id', documentId)?.order('event_at', { ascending: false })?.range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error?.message };
      }

      return { 
        success: true, 
        data: data || [], 
        total: count || 0 
      };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Get expiring documents
  async getExpiringDocuments(withinDays = 30) {
    try {
      const { data, error } = await supabase?.rpc('get_documents_expiring', { within_days: withinDays });

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Update document statuses (maintenance function)
  async updateDocumentStatuses() {
    try {
      const { data, error } = await supabase?.rpc('update_document_status');

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: { message: 'Document statuses updated' } };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  },

  // Log document event (internal helper)
  async logEvent(documentId, eventType, metadata = {}) {
    try {
      await supabase?.from('document_events')?.insert([{
          document_id: documentId,
          event_type: eventType,
          meta: metadata
        }]);
    } catch (error) {
      console.error('Failed to log document event:', error);
    }
  },

  // Get document statistics for KPI tiles
  async getDocumentStats() {
    try {
      // Get overall counts
      const { data: allDocs, error: allError } = await supabase?.from('documents')?.select('id, status, valid_to')?.neq('status', 'missing');

      if (allError) {
        return { success: false, error: allError?.message };
      }

      const total = allDocs?.length || 0;
      const valid = allDocs?.filter(d => d?.status === 'valid')?.length || 0;
      const expiring = allDocs?.filter(d => d?.status === 'expiring')?.length || 0;
      const expired = allDocs?.filter(d => d?.status === 'expired')?.length || 0;

      // Get expiring in different timeframes
      const now = new Date();
      const in30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      const in60Days = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000));
      const in90Days = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

      const expiring30 = allDocs?.filter(d => 
        d?.valid_to && new Date(d.valid_to) <= in30Days && new Date(d.valid_to) >= now
      )?.length || 0;
      const expiring60 = allDocs?.filter(d => 
        d?.valid_to && new Date(d.valid_to) <= in60Days && new Date(d.valid_to) >= now
      )?.length || 0;
      const expiring90 = allDocs?.filter(d => 
        d?.valid_to && new Date(d.valid_to) <= in90Days && new Date(d.valid_to) >= now
      )?.length || 0;

      // Check for missing required documents (placeholder logic)
      const missingRequired = 0; // This would need business logic to determine required docs

      return {
        success: true,
        data: {
          total,
          valid,
          expiring,
          expired,
          expiring30,
          expiring60,
          expiring90,
          missingRequired
        }
      };

    } catch (error) {
      return { success: false, error: error?.message };
    }
  }
};

export default documentsService;