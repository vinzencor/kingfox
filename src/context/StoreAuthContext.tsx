import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, StoreSession, StoreAuthResponse } from '../lib/supabase';

interface StoreAuthContextType {
  user: StoreSession | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const StoreAuthContext = createContext<StoreAuthContextType | undefined>(undefined);

interface StoreAuthProviderProps {
  children: ReactNode;
}

export function StoreAuthProvider({ children }: StoreAuthProviderProps) {
  const [user, setUser] = useState<StoreSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionToken = localStorage.getItem('store_session_token');
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('validate_store_session', {
        token: sessionToken
      });

      if (error) {
        console.error('Session validation error:', error);
        localStorage.removeItem('store_session_token');
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const sessionData = data[0];
        setUser({
          user_id: sessionData.user_id,
          store_id: sessionData.store_id,
          store_name: sessionData.store_name,
          user_name: sessionData.user_name,
          user_role: sessionData.user_role
        });
      } else {
        localStorage.removeItem('store_session_token');
      }
    } catch (err: any) {
      console.error('Error checking session:', err);
      localStorage.removeItem('store_session_token');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('authenticate_store_user', {
        user_email: email,
        user_password: password
      });

      if (error) {
        setError('Authentication failed. Please check your credentials.');
        return false;
      }

      if (!data || data.length === 0) {
        setError('Invalid email or password.');
        return false;
      }

      const authData: StoreAuthResponse = data[0];
      
      // Store session token
      localStorage.setItem('store_session_token', authData.session_token);
      
      // Set user state
      setUser({
        user_id: authData.user_id,
        store_id: authData.store_id,
        store_name: authData.store_name,
        user_name: authData.user_name,
        user_role: authData.user_role
      });

      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('store_session_token');
      if (sessionToken) {
        // Invalidate session on server
        await supabase.rpc('logout_store_user', {
          token: sessionToken
        });
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      // Clear local state regardless of server response
      localStorage.removeItem('store_session_token');
      setUser(null);
      setError(null);
    }
  };

  const value: StoreAuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <StoreAuthContext.Provider value={value}>
      {children}
    </StoreAuthContext.Provider>
  );
}

export function useStoreAuth() {
  const context = useContext(StoreAuthContext);
  if (context === undefined) {
    throw new Error('useStoreAuth must be used within a StoreAuthProvider');
  }
  return context;
}
