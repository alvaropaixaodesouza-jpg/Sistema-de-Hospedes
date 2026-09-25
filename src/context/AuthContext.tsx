import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  loginDemo: (role?: UserRole, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Demo User Profile
const DEFAULT_DEMO_USER: UserProfile = {
  id: 'user-demo-admin',
  pousada_id: 'pousada-master-001',
  full_name: 'Recepção Principal (Demo)',
  role: 'admin',
  active: true,
  created_at: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(isSupabaseConfigured ? null : DEFAULT_DEMO_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Supabase Session Observer
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    }).catch(() => { setUser(null); setIsLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(() => { void fetchUserProfile(session.user.id); }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data && data.active) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      console.error('Error fetching user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = (role: UserRole = 'admin', name: string = 'Recepção Principal') => {
    if (isSupabaseConfigured) return;
    setUser({
      id: `user-demo-${role}`,
      pousada_id: 'pousada-master-001',
      full_name: name,
      role: role,
      active: true,
      created_at: new Date().toISOString()
    });
  };

  const logout = () => {
    if (isSupabaseConfigured) {
      supabase.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isConfigured: isSupabaseConfigured, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
