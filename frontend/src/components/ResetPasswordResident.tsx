import React, { useEffect, useState } from 'react';
import { rpcCall } from '../services/rpc';

export default function ResetPasswordResident() {
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
  const API_BASE = (import.meta as any)?.env?.VITE_BACKEND_URL || 'https://trust-3.onrender.com';

  useEffect(() => {
    let isMounted = true;
    const processAuthFromUrl = async () => {
      try {
        if (typeof window === 'undefined') return;
        const { hash, search, pathname } = window.location;
        const hashParams = hash && hash !== '#' ? new URLSearchParams(hash.substring(1)) : new URLSearchParams();
        const queryParams = search ? new URLSearchParams(search) : new URLSearchParams();
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = hashParams.get('code') || queryParams.get('code');

        // Just pass tokens to backend to exchange cookies; do not use supabase client
        if (accessToken) {
          await fetch(`${String(API_BASE).replace(/\/+$/, '')}/api/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            credentials: 'include',
            body: JSON.stringify({ accessToken, refreshToken })
          }).catch(() => {});
          window.history.replaceState({}, '', pathname);
        }
      } catch (_) {}
    };

    const exchangeSessionForCookies = async () => {};
    const loadLinkedResident = async () => {
      setLookupLoading(true);
      setError('');
      try {
        // Load linked resident using backend and cookies
        const respProfile = await fetch(`${String(API_BASE).replace(/\/+$/, '')}/api/users/me`, { credentials: 'include' });
        if (!respProfile.ok) {
          setError('No active recovery session. Please use the reset link from your email.');
          return;
        }
        const respResident = await fetch(`${String(API_BASE).replace(/\/+$/, '')}/api/residents/me`, { credentials: 'include' });
        if (!respResident.ok) {
          setError('Failed to load resident. Please try again later.');
          return;
        }
        const residentRow = await respResident.json();
        if (!residentRow) { setError('No resident is linked to this account.'); return; }
        if (isMounted) setResident(residentRow);
      } catch (e: any) {
        setError(e?.message || 'Unexpected error loading account.');
      } finally {
        if (isMounted) setLookupLoading(false);
      }
    };
    (async () => {
      await processAuthFromUrl();
      await exchangeSessionForCookies();
      await loadLinkedResident();
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
      } else {
        setVerified(false);
        setError('Verification failed. Name and DOB do not match our records.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!verified) {
      setError('Please verify resident name and DOB before resetting password.');
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
        const b = await resp.json().catch(() => ({}));
        throw new Error(b?.error || 'Failed to update password');
      }
      setMessage('Password updated. You can now sign in.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-2 text-black">Reset Password (Resident/POA)</h1>
        <p className="text-gray-600 mb-4">First, verify your resident details to continue.</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded mb-3">{error}</div>}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-2 rounded mb-3">{message}</div>}
        {/* Verification */}
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
              <button
                type="submit"
                disabled={lookupLoading || verifying || !resident}
                className="w-full bg-blue-600 text-white rounded py-2"
              >
                {lookupLoading ? 'Loading…' : verifying ? 'Verifying…' : 'Verify Resident'}
              </button>
            )}
            {verified && (
              <div className="text-green-700 bg-green-50 border border-green-200 text-sm p-2 rounded">Verification successful.</div>
            )}
        </form>

        {/* Password Reset */}
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
            {submitting ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

