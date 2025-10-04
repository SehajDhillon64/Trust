import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, Facility } from '../types';
import { supabase } from '../config/supabase';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setCurrentFacility: (facility: Facility | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock facilities for demonstration
const mockFacilities: Facility[] = [
  {
    id: '1',
    name: 'Sunrise Manor Long Term Care',
    address: '123 Care Street, Toronto, ON',
    phone: '(416) 555-0123',
    email: 'admin@sunrisemanor.ca',
    officeManagerEmail: 'sarah.johnson@ltc.com',
    createdAt: '2024-01-01',
    status: 'active',
    uniqueCode: 'SM001',
    companyId: 'COMPANY-1'
  },
  {
    id: '2',
    name: 'Golden Years Care Center',
    address: '456 Elder Ave, Vancouver, BC',
    phone: '(604) 555-0456',
    email: 'info@goldenyears.ca',
    officeManagerEmail: 'mike.wilson@goldenyears.ca',
    createdAt: '2024-01-15',
    status: 'active',
    uniqueCode: 'GY002',
    companyId: 'COMPANY-1'
  }
];

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: '0',
    name: 'System Administrator',
    email: 'admin@trustmanager.com',
    role: 'Admin'
  },
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@ltc.com',
    role: 'OM',
    facilityId: '1'
  },
  {
    id: '1b',
    name: 'David Chen',
    email: 'david.chen@goldenyears.ca',
    role: 'OM',
    facilityId: '2'
  },
  {
    id: '2', 
    name: 'Michael Brown',
    email: 'michael.brown@email.com',
    role: 'POA',
    facilityId: '1'
  },
  {
    id: '3',
    name: 'Emma Wilson',
    email: 'emma.wilson@email.com', 
    role: 'Resident',
    facilityId: 'GY002'
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false, // Start with true while checking session
    currentFacility: null
  });

  
  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // 1) Sign in on the client to obtain tokens immediately
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.session) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // 2) Persist tokens into secure HTTP-only cookies for backend usage
      const API_BASE = ((((import.meta as any)?.env?.VITE_BACKEND_URL) || 'https://trust-3.onrender.com') as string).replace(/\/+$/, '');
      try {
        await fetch(`${API_BASE}/api/auth/exchange`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token
          })
        });
      } catch {}

      // 3) Load profile and facility from backend (service role, RLS-safe)
      const profileResp = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
      if (!profileResp.ok) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
      const body = await profileResp.json();

      // Map backend row to frontend types
      const mappedUser: User = {
        id: body.user?.id,
        name: body.user?.name || (email.split('@')[0] || 'User'),
        email: body.user?.email || email,
        role: body.user?.role,
        facilityId: body.user?.facility_id || undefined,
        companyId: body.companyId || body.user?.company_id || undefined,
      };

      let mappedFacility: Facility | null = null;
      if (body.facility) {
        const f = body.facility;
        mappedFacility = {
          id: f.id,
          name: f.name,
          address: f.address || '',
          phone: f.phone || '',
          email: f.email || '',
          officeManagerEmail: f.office_manager_email || '',
          createdAt: f.created_at || new Date().toISOString(),
          status: (f.status as any) || 'active',
          uniqueCode: f.unique_code || '',
          companyId: f.company_id || mappedUser.companyId || ''
        };
      }

      setAuthState({
        user: mappedUser,
        isAuthenticated: true,
        isLoading: false,
        currentFacility: mappedFacility
      });
      return true;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = async () => {
    try {
      // Sign out locally and clear backend cookies
      try { await supabase.auth.signOut(); } catch {}
      const API_BASE = ((((import.meta as any)?.env?.VITE_BACKEND_URL) || 'https://trust-3.onrender.com') as string).replace(/\/+$/, '');
      try {
        await fetch(`${API_BASE}/api/auth/signout`, { method: 'POST', credentials: 'include' });
      } catch {}
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        currentFacility: null
      });
    } catch (error) {
    }
  };

  const setCurrentFacility = (facility: Facility | null) => {
    setAuthState(prev => ({ ...prev, currentFacility: facility }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, setCurrentFacility }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};