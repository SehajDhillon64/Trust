import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';

export default function ResetPasswordResident() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

  useEffect(() => {
    let isMounted = true;
    const loadLinkedResident = async () => {
      setLookupLoading(true);
      setError('');
      try {
        const { data: session } = await supabase.auth.getSession();
        const authUserId = session.session?.user?.id;
        if (!authUserId) {
          setError('No active recovery session. Please use the reset link from your email.');
          return;
        }
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUserId)
          .single();
        if (profileError || !profile) {
          setError('Unable to load your account. Please contact support.');
          return;
        }
        const { data: residentRow, error: residentError } = await supabase
          .from('residents')
          .select('*')
          .eq('linked_user_id', profile.id)
          .maybeSingle();
        if (residentError) {
          setError('Failed to load resident. Please try again later.');
          return;
        }
        if (!residentRow) {
          setError('No resident is linked to this account.');
          return;
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
      } catch (e: any) {
        setError(e?.message || 'Unexpected error loading account.');
      } finally {
        if (isMounted) setLookupLoading(false);
      }
    };
    loadLinkedResident();
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
        setStep(4);
      } else {
        setVerified(false);
        setError('Verification failed. Name and DOB do not match our records.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const saveTermsAcceptance = async () => {
    setUpdating(true);
    setError('');
    try {
      const { data: session } = await supabase.auth.getSession();
      const authUserId = session.session?.user?.id;
      if (!authUserId) throw new Error('No active session');
      const { error } = await supabase
        .from('users')
        .update({ terms_accepted_at: new Date().toISOString(), terms_version: 'v1' })
        .eq('auth_user_id', authUserId);
      if (error) throw error;
      setAcceptedTerms(true);
      setStep(2);
    } catch (e: any) {
      setError(e?.message || 'Failed to record acceptance');
    } finally {
      setUpdating(false);
    }
  };

  const saveSelectedServices = async () => {
    if (!resident) return;
    setUpdating(true);
    setError('');
    try {
      const updates: any = { allowed_services: selectedServices };
      const { error } = await supabase
        .from('residents')
        .update(updates)
        .eq('id', resident.id);
      if (error) throw error;
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
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
        <h1 className="text-xl font-semibold mb-2 text-black">Account Setup (Resident/POA)</h1>
        <p className="text-gray-600 mb-4">
          {step === 1 && 'Please review and accept the service conditions.'}
          {step === 2 && 'Select services you authorize for this resident.'}
          {step === 3 && 'Confirm resident name and date of birth.'}
          {step === 4 && 'Set your password to complete setup.'}
        </p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded mb-3">{error}</div>}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-2 rounded mb-3">{message}</div>}

        {/* Step 1: Terms */}
        {step === 1 && (
          <div className="space-y-4 mb-6">
            <div className="h-52 overflow-y-auto border rounded p-3 text-sm text-black/80">
              <p>
                By continuing, you agree to the Service Conditions and Privacy Policy. You consent to
                electronic communications and will use this system only for authorized purposes.
              </p>
              <p className="mt-2">
                For full details, contact your facility administrator. Version: v1.
              </p>
            </div>
            <label className="inline-flex items-center space-x-2 text-black">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
              <span>I accept the service conditions</span>
            </label>
            <button
              type="button"
              onClick={saveTermsAcceptance}
              disabled={!acceptedTerms || updating}
              className="w-full bg-blue-600 text-white rounded py-2"
            >
              {updating ? 'Saving…' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 2: Select Services */}
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
            <button
              type="button"
              onClick={saveSelectedServices}
              disabled={updating || !resident}
              className="w-full bg-blue-600 text-white rounded py-2"
            >
              {updating ? 'Saving…' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 3: Verify Name/DOB */}
        {step === 3 && (
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
        )}

        {/* Step 4: Password Reset */}
        {step === 4 && (
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
        )}
      </div>
    </div>
  );
}

