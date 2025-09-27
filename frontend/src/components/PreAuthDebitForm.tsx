import React, { useState } from 'react';
import { X, DollarSign, Calendar, FileText, Save } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';

interface PreAuthDebitFormProps {
  residentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PreAuthDebitForm({ residentId, onClose, onSuccess }: PreAuthDebitFormProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('debit');
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addPreAuthDebit, residents } = useData();
  const { user } = useAuth();

  const resident = residents.find(r => r.id === residentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !targetMonth || !user || !resident) return;

    setIsSubmitting(true);

    try {
      addPreAuthDebit({
        residentId,
        facilityId: resident.facilityId,
        authorizedBy: user.id,
        amount: parseFloat(amount),
        description,
        type,
        authorizedDate: new Date().toISOString(),
        targetMonth,
        isActive: true,
        status: 'pending'
      });

      onSuccess();
      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
            Monthly Pre-Authorization Setup
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Pre-Authorization Information</h3>
            <p className="text-sm text-blue-700">
              You're authorizing a one-time {type} {type === 'credit' ? 'to' : 'from'} <strong>{resident?.name}'s</strong> trust account 
              for <strong>{formatMonthDisplay(targetMonth)}</strong>. This is not a recurring charge.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('debit')}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                    type === 'debit'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Debit (Remove Money)
                </button>
                <button
                  type="button"
                  onClick={() => setType('credit')}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                    type === 'credit'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Credit (Add Money)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Target Month
              </label>
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Select the month for which this authorization applies
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Amount for {formatMonthDisplay(targetMonth)}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="h-4 w-4 inline mr-1" />
                Description/Purpose
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Cable service for January, Phone charges for February, etc."
                required
              />
            </div>

            <div className={`border rounded-lg p-4 ${
              type === 'credit' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`text-sm ${
                type === 'credit' ? 'text-green-800' : 'text-yellow-800'
              }`}>
                <strong>Important:</strong> This authorization will {type === 'credit' ? 'add funds to' : 'debit funds from'} the trust account 
                for {formatMonthDisplay(targetMonth)} only. Each month requires a separate authorization with its own amount. 
                This is not a recurring payment.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !amount || !description || !targetMonth}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Authorize Monthly {type === 'credit' ? 'Credit' : 'Debit'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}