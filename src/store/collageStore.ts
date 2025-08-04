// src/store/collageStore.ts - FIXED: Proper photo deletion without optimistic updates
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';
import { RealtimeChannel } from '@supabase/supabase-js';

// Helper function to get file URL
const getFileUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Helper for deep merging objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// Default scene settings
const defaultSettings = {
  animationPattern: 'grid_wall',
  photoCount: 100,
  animationSpeed: 50,
  cameraDistance: 15,
  cameraHeight: 8,
  cameraRotationSpeed: 20,
  photoSize: 1.0,
  photoBrightness: 1.0,
  backgroundColor: '#000000',
  backgroundGradient: true,
  backgroundGradientStart: '#1a1a2e',
  backgroundGradientEnd: '#16213e',
  backgroundGradientAngle: 45,
  floorColor: '#111111',
  showFloor: true,
  showGrid: true,
  ambientLightIntensity: 0.4,
  spotlightIntensity: 0.8,
  patterns: {
    grid_wall: { enabled: true },
    float: { enabled: false },
    wave: { enabled: false },
    spiral: { enabled: false }
  }
};

export interface Photo {
  id: string;
  collage_id: string;
  url: string;
  created_at: string;
}

export interface Collage {
  id: string;
  name: string;
  code: string;
  created_at: string;
  user_id: string;
  photoCount?: number;
  settings: any;
}

export interface SceneSettings {
  animationPattern?: string;
  patterns?: any;
  photoCount?: number;
  animationSpeed?: number;
  cameraDistance?: number;
  cameraHeight?: number;
  cameraRotationSpeed?: number;
  photoSize?: number;
  photoBrightness?: number;
  backgroundColor?: string;
  backgroundGradient?: boolean;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundGradientAngle?: number;
  floorColor?: string;
  showFloor?: boolean;
  showGrid?: boolean;
  ambientLightIntensity?: number;
  spotlightIntensity?: number;
  [key: string]: any;
}

interface CollageStore {
  // State
  photos: Photo[];
  photosById: Map<string, Photo>;
  currentCollage: Collage | null;
  loading: boolean;
  error: string | null;
  collages: Collage[];
  realtimeChannel: RealtimeChannel | null;
  isRealtimeConnected: boolean;
  lastRefreshTime: number;
  pollingInterval: NodeJS.Timeout | null;

  // Actions
  fetchCollages: () => Promise<void>;
  fetchCollageByCode: (code: string) => Promise<Collage | null>;
  fetchCollageById: (id: string) => Promise<Collage | null>;
  createCollage: (name: string) => Promise<Collage | null>;
  updateCollageSettings: (collageId: string, settings: Partial<SceneSettings>) => Promise<any>;
  updateCollageName: (collageId: string, name: string) => Promise<any>;
  uploadPhoto: (collageId: string, file: File) => Promise<Photo | null>;
  deletePhoto: (photoId: string) => Promise<void>;
  fetchPhotosByCollageId: (collageId: string) => Promise<void>;
  refreshPhotos: (collageId: string) => Promise<void>;
  
  // Real-time subscription methods
  setupRealtimeSubscription: (collageId: string) => void;
  cleanupRealtimeSubscription: () => void;
  
  // Internal methods
  addPhotoToState: (photo: Photo) => void;
  removePhotoFromState: (photoId: string) => void;
  startPolling: (collageId: string) => void;
  stopPolling: () => void;
}

export const useCollageStore = create<CollageStore>((set, get) => ({
  // Initial state
  photos: [],
  photosById: new Map(),
  currentCollage: null,
  loading: false,
  error: null,
  collages: [],
  realtimeChannel: null,
  isRealtimeConnected: false,
  lastRefreshTime: 0,
  pollingInterval: null,

  // Add photo to state - ENHANCED
  addPhotoToState: (photo: Photo) => {
    console.log('➕ BEFORE addPhotoToState - Current photos count:', get().photos.length);
    console.log('➕ Adding photo with ID:', photo.id?.slice(-6));
    set((state) => {
      // Check if photo already exists in our Map
      const exists = state.photosById.has(photo.id);
      if (exists) {
        console.log('🔄 Photo already exists in state:', photo.id);
        return state;
      }
      
      console.log('✅ Adding photo to state:', photo.id);
      console.log('➕ Current photo count BEFORE:', state.photos.length);
      
      // Create new photos array with the new photo at the beginning
      const newPhotos = [photo, ...state.photos]; 
      
      // Create new Map with the added photo
      const newPhotosById = new Map(state.photosById);
      newPhotosById.set(photo.id, photo);
      
      console.log('➕ New photo count AFTER:', newPhotos.length);
      
      // Add new photo at the beginning (most recent first)
      const newState = {
        photos: newPhotos,
        photosById: newPhotosById,
        lastRefreshTime: Date.now()
      };
      
      console.log('➕ Setting new state:', newState);
      return newState;
    });
    
    console.log('➕ AFTER addPhotoToState - Current photos count:', get().photos.length);
  },

  // Remove photo from state - ENHANCED
  removePhotoFromState: (photoId: string) => {
    console.log('🗑️ BEFORE removePhotoFromState - Current photos count:', get().photos.length);
    console.log('🗑️ STORE: Removing photo with ID:', photoId?.slice(-6), 'from photos array');
    
    set((state) => {
      const beforeCount = state.photos.length;
      console.log('🗑️ Current photo count BEFORE:', beforeCount);
      
      // Check if photo exists in our Map
      if (!state.photosById.has(photoId)) {
        console.log('⚠️ WARNING: Photo not found in photosById Map for removal:', photoId);
      }
      
      // Create new photos array without the deleted photo
      const newPhotos = state.photos.filter(p => p.id !== photoId);
      
      // Create new Map without the deleted photo
      const newPhotosById = new Map(state.photosById);
      newPhotosById.delete(photoId);
      
      const afterCount = newPhotos.length;
      console.log('🗑️ New photo count AFTER:', afterCount);
      
      console.log(`🗑️ Photos: ${beforeCount} -> ${afterCount}`);
      
      if (beforeCount === afterCount) {
        console.log('⚠️ WARNING: Photo not found in state for removal:', photoId);
        console.log('⚠️ Current photo IDs:', state.photos.map(p => p.id?.slice(-6)));
        
        // Return a new state object even if photo wasn't found
        return {
          ...state,
          photosById: newPhotosById, // Still update the Map in case it was there
          lastRefreshTime: Date.now()
        };
      }
      
      const newState = {
        photos: newPhotos,
        photosById: newPhotosById,
        lastRefreshTime: Date.now(),
        error: null
      };
      
      return newState;
    });
    
    console.log('🗑️ AFTER removePhotoFromState - Current photos count:', get().photos.length);
  },

  // Enhanced realtime subscription with better error handling
  setupRealtimeSubscription: (collageId: string) => {
    // Clean up existing
    // Always clean up existing subscription to prevent duplicates
    get().cleanupRealtimeSubscription();
    
    // Create a unique channel name to avoid conflicts
    const channelName = `photos_${collageId}`;
    console.log('🚀 Setting up realtime subscription for collage:', collageId, 'on channel:', channelName);
    
    try {
      // Create a new channel
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'photos',
            filter: `collage_id=eq.${collageId}`
          },
          (payload) => {
            console.log('🔔 Realtime event received:', payload.eventType, payload.new?.id || payload.old?.id);
            
            if (payload.eventType === 'INSERT' && payload.new) {
              console.log('➕ REALTIME INSERT:', payload.new.id.slice(-6), 'for collage:', collageId);
              get().addPhotoToState(payload.new as Photo);
            }
            else if (payload.eventType === 'DELETE' && payload.old) {
              console.log('🗑️ REALTIME DELETE:', payload.old.id.slice(-6), 'for collage:', collageId);
              // Force immediate state update for deletions
              try {
                const photoId = payload.old.id;
                console.log('🗑️ REALTIME: Calling removePhotoFromState for ID:', photoId.slice(-6));
                
                // CRITICAL: Force immediate state update for deletions
                get().removePhotoFromState(photoId);
              } catch (error) {
                console.error('❌ Error handling DELETE event:', error);
              }
              
            }
            else if (payload.eventType === 'UPDATE' && payload.new) {
              console.log('📝 REALTIME UPDATE:', payload.new.id.slice(-6), 'for collage:', collageId);
              // Handle photo updates if needed
              set((state) => ({
                photos: state.photos.map(p => 
                  p.id === payload.new.id ? payload.new as Photo : p
                ),
                lastRefreshTime: Date.now()
              }));
            }
          }
        )
        .subscribe((status) => {
          console.log('🔔 Realtime status:', status);
          const connected = status === 'SUBSCRIBED';
          
          // Update connection status
          set({ 
            isRealtimeConnected: connected,
            realtimeChannel: channel // Store the channel reference
          });
          
          if (!connected) {
            console.log('🔄 Realtime disconnected, starting polling fallback...');
            get().startPolling(collageId);
          } else if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime connected, stopping polling...');
            get().stopPolling();
          }
        });
    } catch (error) {
      console.error('❌ Error setting up realtime subscription:', error);
      // Start polling as fallback
      get().startPolling(collageId);
    }
  },

  cleanupRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    
    if (channel) {
      try {
        console.log('🧹 Cleaning up realtime subscription for channel:', channel.topic);
        // Use removeChannel instead of just unsubscribe for complete cleanup
        supabase.removeChannel(channel);
        console.log('🧹 Channel removed completely');
      } catch (error) {
        console.error('❌ Error cleaning up channel:', error);
      }
    }
    
    set({ realtimeChannel: null, isRealtimeConnected: false });
    get().stopPolling();
  },

  // Polling fallback when realtime fails
  startPolling: (collageId: string) => {
    get().stopPolling(); // Clear any existing polling
    
    console.log('🔄 Starting polling fallback for collage:', collageId, '(every 3 seconds)');
    const interval = setInterval(() => {
      console.log('📡 Polling for photo updates...');
      get().refreshPhotos(collageId);
    }, 3000); // Poll every 3 seconds
    
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      console.log('⏹️ Stopping polling');
      clearInterval(interval);
      set({ pollingInterval: null });
    }
  },

  refreshPhotos: async (collageId: string) => {
    try {
      await get().fetchPhotosByCollageId(collageId);
      console.log('🔄 Photos refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh photos:', error);
    }
  },

  fetchPhotosByCollageId: async (collageId: string) => {
    try {
      console.log('📸 Fetching photos for collage:', collageId);
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('collage_id', collageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const duration = performance.now() - startTime;
      console.log(`📸 Fetched ${data?.length || 0} photos in ${duration.toFixed(0)}ms`);
      
      // Build a Map of photos by ID for faster lookups
      const photosById = new Map<string, Photo>();
      (data || []).forEach(photo => {
        photosById.set(photo.id, photo as Photo);
      });
      
      set({ 
        photos: data as Photo[], 
        photosById,
        lastRefreshTime: Date.now() 
      });
      
      return data as Photo[];
      
    } catch (error: any) {
      console.error('❌ Fetch photos error:', error);
      set({ error: error.message });
      throw error;
    }
  },

  fetchCollages: async () => {
    set({ loading: true, error: null });
    try {
      // Get current user ID from auth store
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        set({ error: 'User not authenticated', loading: false, collages: [] });
        return;
      }

      const { data, error } = await supabase
        .from('collages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ collages: data as Collage[], loading: false });
    } catch (error: any) {
      console.error('Error fetching collages:', error);
      set({ error: error.message, loading: false, collages: [] });
    }
  },

  // FIXED: fetchCollageByCode - Handle missing collages properly
  fetchCollageByCode: async (code: string) => {
    set({ loading: true, error: null, photos: [] });
    
    try {
      console.log('🔍 Fetching collage by code:', code);

      // FIXED: Use .maybeSingle() instead of .single() to handle 0 rows
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('code', code)
        .maybeSingle(); // CHANGED: This returns null instead of throwing error when no rows found

      if (collageError) {
        console.error('❌ Collage fetch error:', collageError);
        throw collageError;
      }

      if (!collage) {
        // FIXED: Handle when collage doesn't exist
        console.log('❌ No collage found with code:', code);
        set({ 
          error: `No collage found with code "${code}". Please check the code and try again.`,
          loading: false,
          currentCollage: null 
        });
        return null;
      }

      console.log('✅ Found collage:', collage.id, collage.name);

      // Fetch settings - also use maybeSingle for consistency
      const { data: settings } = await supabase
          .from('collage_settings')
          .select('settings')
          .eq('collage_id', collage.id)
          .maybeSingle(); // CHANGED: Use maybeSingle here too

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
      } as Collage;

      set({ currentCollage: collageWithSettings, loading: false, error: null });
      
      // Fetch photos and setup subscription
      try {
        await get().fetchPhotosByCollageId(collage.id);
        // CRITICAL: Set up realtime subscription AFTER fetching photos
        get().setupRealtimeSubscription(collage.id);
      } catch (photoError) {
        console.error('❌ Error fetching initial photos:', photoError);
        // Don't fail the whole operation if photos can't be fetched
      }
      
      console.log('✅ Successfully loaded collage:', collage.name);
      return collageWithSettings;
    } catch (error: any) {
      console.error('❌ fetchCollageByCode error:', error);
      set({ 
        error: error.message || 'Failed to load collage', 
        loading: false,
        currentCollage: null 
      });
      return null;
    }
  },

  // FIXED: fetchCollageById - Handle missing collages properly
  fetchCollageById: async (id: string) => {
    set({ loading: true, error: null, photos: [] });
    try {
      console.log('🔍 Fetching collage by ID:', id);

      // FIXED: Use .maybeSingle() instead of .single()
      const { data: collage, error: collageError } = await supabase
        .from('collages')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // CHANGED: This returns null instead of throwing error when no rows found

      if (collageError) {
        console.error('❌ Collage fetch error:', collageError);
        throw collageError;
      }

      if (!collage) {
        // FIXED: Handle when collage doesn't exist
        console.log('❌ No collage found with ID:', id);
        set({ 
          error: `No collage found with ID "${id}".`,
          loading: false,
          currentCollage: null 
        });
        return null;
      }

      console.log('✅ Found collage:', collage.id, collage.name);

      // Fetch settings - also use maybeSingle for consistency
      const { data: settings } = await supabase
        .from('collage_settings')
        .select('settings')
        .eq('collage_id', id)
        .maybeSingle(); // CHANGED: Use maybeSingle here too

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings ? deepMerge(defaultSettings, settings.settings) : defaultSettings
      } as Collage;

      set({ currentCollage: collageWithSettings, loading: false, error: null });
      
      // Fetch photos and setup subscription
      try {
        await get().fetchPhotosByCollageId(id);
        // CRITICAL: Set up realtime subscription AFTER fetching photos
        get().setupRealtimeSubscription(id);
      } catch (photoError) {
        console.error('❌ Error fetching initial photos:', photoError);
        // Don't fail the whole operation if photos can't be fetched
      }
      
      console.log('✅ Successfully loaded collage:', collage.name);
      return collageWithSettings;
    } catch (error: any) {
      console.error('❌ fetchCollageById error:', error);
      set({ 
        error: error.message || 'Failed to load collage', 
        loading: false,
        currentCollage: null 
      });
      return null;
    }
  },

  createCollage: async (name: string) => {
    set({ loading: true, error: null });
    try {
      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('User must be logged in to create a collage');
      }
      
      // Generate a 4-digit random code
      const generateCode = () => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 4; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      // Initial code generation
      let code = generateCode();
      console.log('Creating collage:', name, 'with initial code:', code, 'for user:', userId);
      
      // Try to insert with the generated code and user ID
      let { data: collage, error: collageError } = await supabase
        .from('collages')
        .insert([{ 
          name, 
          code,
          user_id: userId 
        }])
        .select()
        .single();
      
      // If there's a unique constraint violation, try again with a new code
      let attempts = 1;
      const MAX_ATTEMPTS = 5;
      
      while (collageError && collageError.code === '23505' && attempts < MAX_ATTEMPTS) {
        console.log(`Code ${code} already exists, trying again (attempt ${attempts}/${MAX_ATTEMPTS})`);
        code = generateCode();
        attempts++;
        
        // Try again with a new code and include user_id
        const result = await supabase
          .from('collages')
          .insert([{ 
            name, 
            code,
            user_id: userId 
          }])
          .select()
          .single();
          
        collage = result.data;
        collageError = result.error;
      }
      
      if (collageError) throw collageError;
      
      // The trigger will automatically create default settings
      // Fetch the settings that were created by the trigger
      const { data: settings, error: settingsError } = await supabase
        .from('collage_settings')
        .select('*')
        .eq('collage_id', collage.id)
        .single();
      
      if (settingsError) {
        console.warn('Warning: Could not fetch collage settings:', settingsError);
        // Don't throw here, we can still return the collage without settings
      }

      const collageWithSettings = {
        ...collage,
        settings: settings?.settings || defaultSettings
      } as Collage;

      set((state) => ({
        collages: [collageWithSettings, ...state.collages],
        loading: false
      }));

      return collageWithSettings;
    } catch (error: any) {
      console.error('Create collage error:', error);
      
      // Provide a more user-friendly error message
      let errorMessage = error.message;
      if (error.code === '23505') {
        errorMessage = 'Could not generate a unique code. Please try again.';
      }
      
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  updateCollageSettings: async (collageId: string, settings: Partial<SceneSettings>) => {
    try {
      const currentCollage = get().currentCollage;
      if (!currentCollage) throw new Error('No current collage');

      const mergedSettings = deepMerge(currentCollage.settings, settings);

      const { data, error } = await supabase
        .from('collage_settings')
        .update({ settings: mergedSettings })
        .eq('collage_id', collageId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        currentCollage: state.currentCollage ? {
          ...state.currentCollage,
          settings: mergedSettings
        } : null
      }));

      return data;
    } catch (error: any) {
      console.error('Failed to update collage settings:', error.message);
      throw error;
    }
  },

  // NEW: Update collage name
  updateCollageName: async (collageId: string, name: string) => {
    try {
      console.log('📝 Updating collage name:', collageId, name);

      const { data, error } = await supabase
        .from('collages')
        .update({ name })
        .eq('id', collageId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set((state) => ({
        currentCollage: state.currentCollage ? {
          ...state.currentCollage,
          name: name
        } : null,
        collages: state.collages.map(collage => 
          collage.id === collageId ? { ...collage, name } : collage
        )
      }));

      console.log('✅ Collage name updated successfully');
      return data;
    } catch (error: any) {
      console.error('❌ Failed to update collage name:', error);
      throw error;
    }
  },

  // Enhanced upload with better error handling
  uploadPhoto: async (collageId: string, file: File) => {
    try {
      console.log('📤 Starting photo upload:', file.name, 'for collage:', collageId);
      
      // Validation
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only images are supported.');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${collageId}/${nanoid()}.${fileExt}`;

      console.log('📤 Uploading to storage path:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ File uploaded to storage:', uploadData.path);

      // Get public URL
      const publicUrl = getFileUrl('photos', uploadData.path);
      console.log('🔗 Public URL:', publicUrl);

      // Insert photo record
      const { data: photo, error: dbError } = await supabase
        .from('photos')
        .insert([{
          collage_id: collageId,
          url: publicUrl
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('photos').remove([uploadData.path]);
        throw dbError;
      }

      console.log('✅ Photo record created:', photo.id);
      console.log('🔔 Realtime should now broadcast this to all clients');
      
      // Add to local state immediately for instant feedback
      get().addPhotoToState(photo as Photo);
      
      return photo as Photo;
      
    } catch (error: any) {
      console.error('❌ Upload photo error:', error);
      throw error;
    }
  },

  // FIXED: Enhanced delete with proper database-first approach
  deletePhoto: async (photoId: string) => {
    try {
      console.log('🗑️ STORE: Starting photo deletion for ID:', photoId?.slice(-6), 'from', get().photos.length, 'photos');
      
      // Store original photos array for potential rollback
      const originalPhotos = [...get().photos];
      
      // FIRST: Optimistically remove from UI for immediate feedback
      get().removePhotoFromState(photoId);
      console.log('🗑️ OPTIMISTIC: Removed from UI, now deleting from database');
      
      // First, get the photo to find the storage path
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('url')
        .eq('id', photoId)
        .maybeSingle(); // FIXED: Use maybeSingle instead of single

      if (fetchError) {
        console.error('❌ Error fetching photo for deletion:', fetchError.message);
        
        // Check if this is a "not found" error, which is fine - the photo is already gone
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('0 rows')) {
          console.log('✅ Photo not found in database - already deleted');
          return; // Photo is already gone, our optimistic update was correct
        } else {
          // Real error - rollback the optimistic update
          console.error('❌ Rolling back optimistic update due to fetch error');
          set({ photos: originalPhotos });
          throw fetchError;
        }
      }
      
      if (!photo) {
        console.warn('⚠️ Photo not found in database:', photoId);
        // Remove from state since it doesn't exist in DB
        get().removePhotoFromState(photoId);
        return;
      }

      // Extract storage path from URL
      let storagePath = null;
      try {
        const url = new URL(photo.url);
        const pathParts = url.pathname.split('/');
        const storagePathIndex = pathParts.findIndex(part => part === 'photos');
        
        if (storagePathIndex !== -1) {
          storagePath = pathParts.slice(storagePathIndex + 1).join('/');
          console.log('🗑️ Storage path:', storagePath);
        }
      } catch (urlError) {
        console.warn('⚠️ Could not parse photo URL for storage cleanup:', urlError);
        // Continue with deletion even if we can't parse the URL
      }

      // Delete from database
      const { error: deleteDbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (deleteDbError) {
        console.error('❌ Database delete error:', deleteDbError.message);
        
        // Check if this is a "not found" error, which is fine
        if (deleteDbError.code === 'PGRST116' || deleteDbError.message.includes('0 rows')) {
          console.log('✅ Photo was already deleted from database');
          // This is fine - photo was already gone, our optimistic update was correct
        } else {
          // Real error - rollback the optimistic update
          console.error('❌ Rolling back optimistic update due to delete error');
          set({ photos: originalPhotos });
          throw deleteDbError;
        }
      } else {
        console.log('✅ Photo deleted from database successfully');
      }
     
      // Delete from storage (non-critical)
      if (storagePath) {
        try {
          const { error: deleteStorageError } = await supabase.storage
            .from('photos')
            .remove([storagePath]);
  
          if (deleteStorageError) {
            console.warn('⚠️ Storage delete error (non-fatal):', deleteStorageError.message);
          } else {
            console.log('✅ Photo file deleted from storage');
          }
        } catch (storageError) {
          console.warn('⚠️ Storage delete exception (non-fatal):', storageError);
        }
      }

      console.log('✅ Photo deletion process completed for ID:', photoId);
      console.log('🗑️ Photos count AFTER deletion:', get().photos.length);
      
    } catch (error: any) {
      console.error('❌ Delete photo error:', error);
      
      // Don't throw error for "already deleted" scenarios
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        console.log('✅ Treating as successful deletion (photo was already gone)');
        return;
      }
      
      throw error;
    }
  }
}));