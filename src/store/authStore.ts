import { create } from 'zustand';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
};

type AuthState = {
  user: User | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,
  error: null,

  clearError: () => set({ error: null }),

  signUp: async (email, password) => {
    set({ loading: true, error: null });
    
    try {
      // First attempt to create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            email: email
          }
        }
      });
      
      if (authError) {
        set({ 
          loading: false,
          error: authError.message
        });
        return { error: authError };
      }

      // If auth user creation is successful but no user was returned
      if (!authData.user) {
        set({ 
          loading: false,
          error: 'Failed to create user account. Please try again.'
        });
        return { error: new Error('User creation failed') };
      }

      // Insert into public.users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: email,
          }
        ])
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.signOut();
        
        set({ 
          loading: false,
          error: 'Failed to create user profile. Please try again.'
        });
        return { error: profileError };
      }
      
      set({ 
        loading: false,
        error: null
      });
      
      return { error: null };
    } catch (err: any) {
      // Handle network errors and unexpected failures
      const errorMessage = err.status === 500
        ? 'Our services are temporarily unavailable. Please try again in a few minutes.'
        : err.message || 'An unexpected error occurred. Please try again.';
      
      set({ 
        loading: false,
        error: errorMessage
      });
      return { error: err };
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        set({ 
          loading: false,
          error: error.message
        });
        return { error };
      }
      
      set({ 
        loading: false, 
        user: data.user || null, 
        session: data.session,
        error: null
      });
      
      return { error: null };
    } catch (err: any) {
      const errorMessage = err.status === 500
        ? 'Our services are temporarily unavailable. Please try again in a few minutes.'
        : err.message || 'An unexpected error occurred. Please try again.';
      
      set({ 
        loading: false,
        error: errorMessage
      });
      return { error: err };
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ loading: false, user: null, session: null });
    } catch (err: any) {
      set({ 
        loading: false,
        error: err.message
      });
    }
  },

  initialize: async () => {
    set({ loading: true, error: null });
    
    // Check if already initialized to prevent duplicate initialization
    const state = get();
    if (state.initialized) {
      set({ loading: false });
      return;
    }
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        set({ 
          loading: false, 
          initialized: true,
          error: sessionError.message
        });
        return;
      }
      
      if (session && session.user) {
        set({ 
          user: session.user,
          session,
          loading: false,
          initialized: true
        });
        return;
      }
      
      // Set up auth state listener
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ 
          user: session?.user || null,
          session
        });
      });
      
      set({ 
        loading: false, 
        initialized: true,
        error: null
      });
    } catch (err: any) {
      set({ 
        loading: false, 
        initialized: true,
        error: err.message
      });
    }
  },
}));