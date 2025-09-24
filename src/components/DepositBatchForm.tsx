import React, { useState } from 'react';
import { X, DollarSign, Users, Plus, Minus, Printer, FileText, Banknote, CreditCard } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import ResidentSearch from './ResidentSearch';

interface DepositEntry {
  id: string;
  residentId: string;
  amount: number;
  method: 'cash' | 'cheque';
  description?: string;
  chequeNumber?: string;
}

interface DepositBatchFormProps {
  onClose: () => void;
}

export default function DepositBatchForm({ onClose }: DepositBatchFormProps) {
  const [depositEntries, setDepositEntries] = useState<DepositEntry[]>([]);
  const [batchDescription, setBatchDescription] = useState('');

  const { residents, addTransaction, updateBalance, getFacilityResidents, createDepositBatchRemote, createDepositBatch } = useData();
  const { user, currentFacility } = useAuth();

  // Get residents for current facility
  const facilityResidents = currentFacility ? getFacilityResidents(currentFacility.id) : [];

  const addDepositEntry = () => {
    const newEntry: DepositEntry = {
      id: Date.now().toString(),
      residentId: '',
      amount: 0,
      method: 'cash',
      description: '',
      chequeNumber: ''
    };
    setDepositEntries([...depositEntries, newEntry]);
  };

  const removeDepositEntry = (entryId: string) => {
    setDepositEntries(depositEntries.filter(entry => entry.id !== entryId));
  };

  const updateDepositEntry = (entryId: string, field: keyof DepositEntry, value: string | number) => {
    setDepositEntries(depositEntries.map(entry => 
      entry.id === entryId ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (depositEntries.length === 0) {
      alert('Please add at least one deposit entry');
      return;
    }

    // Validate all entries
    const invalidEntries = depositEntries.filter(entry => 
      !entry.residentId || entry.amount <= 0 || 
      (entry.method === 'cheque' && !entry.chequeNumber)
    );

    if (invalidEntries.length > 0) {
      alert('Please complete all deposit entries with valid amounts and required fields');
      return;
    }

    if (!currentFacility) {
      alert('No facility selected');
      return;
    }

    // Create deposit batch (prefer remote-backed if available)
    const payload = depositEntries.map(entry => ({
      residentId: entry.residentId,
      amount: entry.amount,
      method: entry.method,
      description: entry.description,
      chequeNumber: entry.chequeNumber
    }));

    const result = createDepositBatchRemote
      ? await createDepositBatchRemote(currentFacility.id, payload, batchDescription)
      : await createDepositBatch(currentFacility.id, payload, batchDescription);

    if (result.success) {
      alert('Deposit batch saved successfully! You can process it later from the Saved Batches tab.');
      onClose();
    } else {
      alert(`Failed to save deposit batch: ${result.error}`);
    }
  };

  const reset = () => {
    setDepositEntries([]);
    setBatchDescription('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto text-gray-900">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Deposit Batch</h2>
              <p className="text-gray-900 mt-1">Add individual cash and cheque deposits for residents</p>
            </div>
            <button onClick={onClose} className="text-gray-900 hover:text-gray-900">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Batch Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Batch Description (Optional)
              </label>
              <input
                type="text"
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                placeholder="e.g., Weekly allowance deposits, Family contributions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Deposit Entries */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Deposit Entries</h3>
                <button
                  type="button"
                  onClick={addDepositEntry}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Entry</span>
                </button>
              </div>

              {depositEntries.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <DollarSign className="w-12 h-12 text-gray-900 mx-auto mb-4" />
                  <p className="text-gray-900">No deposit entries yet. Click "Add Entry" to start.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {depositEntries.map((entry, index) => (
                    <div key={entry.id} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Entry #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeDepositEntry(entry.id)}
                          className="text-red-700 hover:text-red-800"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Resident Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Resident *
                          </label>
                          <ResidentSearch
                            residents={facilityResidents}
                            value={entry.residentId}
                            onChange={(residentId) => updateDepositEntry(entry.id, 'residentId', residentId)}
                            placeholder="Search resident..."
                            required
                          />
                        </div>

                        {/* Deposit Method */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Method *
                          </label>
                          <select
                            value={entry.method}
                            onChange={(e) => updateDepositEntry(entry.id, 'method', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          >
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Amount *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.amount || ''}
                            onChange={(e) => updateDepositEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            placeholder="0.00"
                            required
                          />
                        </div>

                        {/* Cheque Number (if cheque) */}
                        {entry.method === 'cheque' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">
                              Cheque Number *
                            </label>
                            <input
                              type="text"
                              value={entry.chequeNumber || ''}
                              onChange={(e) => updateDepositEntry(entry.id, 'chequeNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              placeholder="Cheque #"
                              required
                            />
                          </div>
                        )}
                      </div>

                      {/* Entry Description */}
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Entry Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={entry.description || ''}
                          onChange={(e) => updateDepositEntry(entry.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="Additional notes for this deposit..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {depositEntries.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Batch Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-900">Total Entries:</span>
                    <span className="font-medium ml-2">{depositEntries.length}</span>
                  </div>
                  <div>
                    <span className="text-blue-900">Cash Deposits:</span>
                    <span className="font-medium ml-2">
                      ${depositEntries.filter(e => e.method === 'cash').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-900">Cheque Deposits:</span>
                    <span className="font-medium ml-2">
                      ${depositEntries.filter(e => e.method === 'cheque').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-900">Total Amount:</span>
                    <span className="font-medium ml-2">
                      ${depositEntries.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={depositEntries.length === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>Save as Open Batch</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}