import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';

export default function ConfirmSignupResident() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [resident, setResident] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const initialServices = useMemo(() => ({
    haircare: false,
    footcare: false,
    pharmacy: false,
    cable: false,
    wheelchairRepair: false,
    miscellaneous: false,
  }), []);
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>(initialServices);

  const API_BASE = (import.meta as any)?.env?.VITE_BACKEND_URL || 'https://trust-3.onrender.com';

  useEffect(() => {
    let isMounted = true;

    const getAccessToken = async (): Promise<string | null> => {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || null;
      } catch {
        return null;
      }
    };

    const materializeProfile = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        await fetch(`${String(API_BASE).replace(/\/+$/, '')}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        }).catch(() => {});
      } catch {}
    };

    const processAuthFromUrl = async () => {
      try {
        if (typeof window === 'undefined') return;
        const { hash, search, pathname } = window.location;

        // Read params from both hash and query string (Supabase may use either)
        const hashParams = hash && hash !== '#' ? new URLSearchParams(hash.substring(1)) : new URLSearchParams();
        const queryParams = search ? new URLSearchParams(search) : new URLSearchParams();

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = hashParams.get('code') || queryParams.get('code');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          window.history.replaceState({}, '', pathname);
          return;
        }

        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (_) {}
          window.history.replaceState({}, '', pathname);
        }
      } catch (_) {}
    };

    const loadLinkedResident = async (): Promise<boolean> => {
      setLookupLoading(true);
      setError('');
      try {
        // Mirror ResetPasswordResident logic: derive auth_user_id -> users -> residents
        const { data: session } = await supabase.auth.getSession();
        const authUserId = session.session?.user?.id;
        if (!authUserId) {
          setError('No active session. Open this link from your email.');
          return false;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUserId)
          .single();
        if (profileError || !profile) {
          setError('Unable to load your account. Please contact support.');
          return false;
        }

        const { data: residentRow, error: residentError } = await supabase
          .from('residents')
          .select('*')
          .eq('linked_user_id', profile.id)
          .maybeSingle();
        if (residentError) {
          setError('Failed to load resident. Please try again later.');
          return false;
        }
        if (!residentRow) {
          setError('No resident is linked to this account.');
          return false;
        }

        if (isMounted) {
          setResident(residentRow);
          const defaults = {
            haircare: !!residentRow?.allowed_services?.haircare,
            footcare: !!residentRow?.allowed_services?.footcare,
            pharmacy: !!residentRow?.allowed_services?.pharmacy,
            cable: !!residentRow?.allowed_services?.cable,
            wheelchairRepair: !!residentRow?.allowed_services?.wheelchairRepair,
            miscellaneous: !!residentRow?.allowed_services?.miscellaneous,
          };
          setSelectedServices(defaults);
        }
        return true;
      } catch (e: any) {
        setError(e?.message || 'Unexpected error loading account.');
        return false;
      } finally {
        if (isMounted) setLookupLoading(false);
      }
    };

    const exchangeSessionForCookies = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token || null;
        const refreshToken = data.session?.refresh_token || null;
        if (accessToken) {
          await fetch(`${String(API_BASE).replace(/\/+$/, '')}/api/auth/exchange`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({ accessToken, refreshToken }),
          }).catch(() => {});
          // Proactively materialize profile so subsequent resident load succeeds even if cookies are blocked
          await materializeProfile();
        }
      } catch (_) {
      }
    };

    (async () => {
      await processAuthFromUrl();
      await exchangeSessionForCookies();
      if (isMounted) {
        const ok = await loadLinkedResident();
        if (!ok) {
          await materializeProfile();
          await loadLinkedResident();
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalize = (s: string) => (s || '').trim().toLowerCase();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resident) return;
    setVerifying(true);
    try {
      const nameMatches = normalize(fullName) === normalize(resident.name || '');
      const dobInputNorm = (dob || '').slice(0, 10);
      const dobResidentNorm = String(resident.dob || '').slice(0, 10);
      if (nameMatches && dobInputNorm && dobInputNorm === dobResidentNorm) {
        setVerified(true);
        setStep(2);
      } else {
        setVerified(false);
        setError('Verification failed. Name and DOB do not match our records.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const saveSelectedServices = async () => {
    if (!resident) return;
    setUpdating(true);
    setError('');
    try {
      const resp = await fetch(`${String(API_BASE).replace(/\/+$/, '')}/api/residents/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ allowedServices: selectedServices })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to save services');
      }
      setStep(3);
    } catch (e: any) {
      setError(e?.message || 'Failed to save services');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!verified) {
      setError('Please verify resident name and DOB before setting password.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(`${String(API_BASE).replace(/\/+$/, '')}/api/auth/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to update password');
      }
      setMessage('Setup complete. You can now sign in.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-2 text-black">Confirm Signup</h1>
        <p className="text-gray-600 mb-4">
          {step === 1 && 'Confirm resident name and date of birth.'}
          {step === 2 && 'Select services you authorize for this resident.'}
          {step === 3 && 'Set your password to complete setup.'}
        </p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded mb-3">{error}</div>}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-2 rounded mb-3">{message}</div>}

        {step === 1 && (
          <form onSubmit={handleVerify} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Resident Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Mary Thompson"
                disabled={lookupLoading || verified}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={lookupLoading || verified}
                required
              />
            </div>
            {!verified && (
              <button type="submit" disabled={lookupLoading || verifying || !resident} className="w-full bg-blue-600 text-white rounded py-2">
                {lookupLoading ? 'Loading…' : verifying ? 'Verifying…' : 'Verify Resident'}
              </button>
            )}
            {verified && (
              <div className="text-green-700 bg-green-50 border border-green-200 text-sm p-2 rounded">Verification successful.</div>
            )}
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(initialServices).map((key) => (
                <label key={key} className="inline-flex items-center space-x-2 text-black">
                  <input
                    type="checkbox"
                    checked={!!selectedServices[key]}
                    onChange={(e) => setSelectedServices({ ...selectedServices, [key]: e.target.checked })}
                  />
                  <span className="capitalize">{key}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={saveSelectedServices} disabled={updating || !resident} className="w-full bg-blue-600 text-white rounded py-2">
              {updating ? 'Saving…' : 'Continue'}
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2 " disabled={!verified} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" disabled={!verified} />
            </div>
            <button type="submit" disabled={submitting || !verified} className="w-full bg-blue-600 text-white rounded py-2">
              {submitting ? 'Updating…' : 'Complete Setup'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

