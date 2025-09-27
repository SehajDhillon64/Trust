import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

export default function ResetPasswordVendor() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase sets a recovery session from the email link
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
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
        <h1 className="text-xl font-semibold mb-2 text-black">Reset Password (Vendor)</h1>
        <p className="text-gray-600 mb-4">Enter a new password for your Vendor account.</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded mb-3">{error}</div>}
        {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-2 rounded mb-3">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white rounded py-2">
            {submitting ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

