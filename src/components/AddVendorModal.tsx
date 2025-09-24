import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';

export default function AddVendorModal({
  facilityId,
  onClose,
  onAdded
}: {
  facilityId: string;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const dataAny = useData() as any;
  const addVendorToFacility = dataAny.addVendorToFacility as (facilityId: string, email: string, name?: string, password?: string) => Promise<void>;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !email) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await addVendorToFacility(facilityId, email, name || undefined, password || undefined);
      onAdded && onAdded();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to add vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add or Link Vendor</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="vendor@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional display name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Set Temporary Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional; defaults to vendor123!"
            />
            <p className="text-xs text-gray-500 mt-1">They should reset on first login.</p>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding…' : 'Add/Link Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

