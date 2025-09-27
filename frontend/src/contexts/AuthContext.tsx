import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, Facility } from '../types';
import { signInUser, signOutUser, getCurrentUser, getResidentsByFacility } from '../services/database';
import { supabase } from '../config/supabase';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setupAccount: (token: string, password: string) => Promise<boolean>;
  signup: (userData: { email: string; password: string; name: string; role: 'OM' | 'POA' | 'Resident'; facilityId: string; residentName?: string; residentDob?: string; residentId?: string }) => Promise<boolean>;
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
      const userData = await signInUser(email, password);
      setAuthState({
        user: userData.user,
        isAuthenticated: true,
        isLoading: false,
        currentFacility: userData.facility
      });
      return true;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const setupAccount = async (token: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // TODO: Implement token-based account setup with Supabase
      // For now, we'll use mock data until the invitation system is implemented
      const user = mockUsers[1]; // Mock POA user
      const facility = mockFacilities.find(f => f.id === user.facilityId);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        currentFacility: facility || null
      });
      return true;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const signup = async (userData: { email: string; password: string; name: string; role: 'OM' | 'POA' | 'Resident'; facilityId: string; residentName?: string; residentDob?: string; residentId?: string }): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }, 30000);
    
    try {
      // Resolve resident ID before provisioning (optional for POA/Resident)
      let targetResidentId: string | undefined = userData.residentId;
      if ((userData.role === 'POA' || userData.role === 'Resident') && !targetResidentId) {
        if (userData.facilityId && userData.residentName && userData.residentDob) {
          const facilityResidents = await getResidentsByFacility(userData.facilityId);
          const nameNorm = (userData.residentName || '').trim().toLowerCase();
          const dobNorm = (userData.residentDob || '').slice(0, 10);
          const matches = facilityResidents.filter(r => r.name.trim().toLowerCase() === nameNorm && String(r.dob).slice(0,10) === dobNorm);
          if (matches.length === 1) {
            targetResidentId = matches[0].id;
          } else if (matches.length > 1) {
            throw new Error('Multiple residents matched. Please contact support');
          } else {
            throw new Error('Resident not found for provided name/DOB/facility');
          }
        }
      }

      // Provision via server to bypass RLS and handle linking server-side
      const apiBase = (((import.meta as any)?.env?.VITE_BACKEND_URL) || 'https://trust-3.onrender.com').replace(/\/+$/, '')
      const resp = await fetch(`${apiBase}/api/users/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          facilityId: userData.facilityId,
          residentId: targetResidentId
        })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Provision failed with status ${resp.status}`);
      }
      const provisionResult = await resp.json();

      // Clear timeout since operation completed
      clearTimeout(timeoutId);
      
      // Auto-login won't happen immediately due to email confirmation
      // For now, set loading to false and let user know to check email
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return true;
    } catch (error) {
      
      // Clear timeout since operation completed (with error)
      clearTimeout(timeoutId);
      
      // Ensure loading state is always reset
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Log additional error details
      if (error instanceof Error) {
      }
      
      // Propagate error so the caller can display a specific message
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
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
    <AuthContext.Provider value={{ ...authState, login, logout, setupAccount, signup, setCurrentFacility }}>
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