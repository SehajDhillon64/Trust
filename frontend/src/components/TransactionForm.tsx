import React, { useState } from 'react';
import { X, DollarSign, Plus, Minus, Printer } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';

interface TransactionFormProps {
  residentId: string;
  initialType?: 'credit' | 'debit';
  onClose: () => void;
}

export default function TransactionForm({ residentId, initialType = 'credit', onClose }: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>(initialType);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'cheque' | 'manual'>('cash');
  const [description, setDescription] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const { residents, addTransaction } = useData();
  const { user, currentFacility } = useAuth();

  const resident = residents.find(r => r.id === residentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) return;

    // Check for sufficient balance on withdrawals
    if (transactionType === 'debit' && resident && resident.trustBalance < transactionAmount) {
      alert('Insufficient funds for this withdrawal');
      return;
    }

    addTransaction({
      residentId,
      facilityId: currentFacility?.id || '',
      type: transactionType,
      amount: transactionAmount,
      method,
      description: description || `${transactionType === 'credit' ? 'Deposit' : 'Withdrawal'} - ${method}`,
      createdBy: user?.id || ''
        });
    
    // Store transaction details for receipt
    setLastTransaction({
      resident: resident,
      amount: transactionAmount,
      type: transactionType,
      method: method,
      description: description || `${transactionType === 'credit' ? 'Deposit' : 'Withdrawal'} - ${method}`,
      newBalance: transactionType === 'credit' 
        ? resident.trustBalance + transactionAmount
        : resident.trustBalance - transactionAmount,
      date: new Date().toLocaleDateString()
    });
    
    // Reset form
    setAmount('');
    setDescription('');
    setTransactionType('credit');
    setMethod('cash');
    
    setShowReceipt(true);
  };

  if (!resident) return null;

  const printReceipt = () => {
    const receiptContent = `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 8px;">TRUST ACCOUNT RECEIPT</h2>
        ${currentFacility?.name ? `<div style="text-align:center; font-weight:bold; margin-bottom: 12px;">${currentFacility.name}</div>` : ''}
        <hr style="margin: 20px 0;">
        <p><strong>Resident Name:</strong> ${lastTransaction?.resident?.name}</p>
        <p><strong>Date:</strong> ${lastTransaction?.date}</p>
        <p><strong>Transaction Type:</strong> ${lastTransaction?.type === 'credit' ? 'DEPOSIT' : 'WITHDRAWAL'}</p>
        <p><strong>Amount:</strong> $${lastTransaction?.amount?.toFixed(2)}</p>
        <p><strong>Method:</strong> ${lastTransaction?.method?.toUpperCase()}</p>
        <p><strong>Description:</strong> ${lastTransaction?.description}</p>
        <p><strong>New Balance:</strong> $${lastTransaction?.newBalance?.toFixed(2)}</p>
        <hr style="margin: 20px 0;">
        <div style="margin-top: 40px;">
          <p>Signed by Resident/POA: _________________________</p>
          <br>
          <p>${lastTransaction?.type === 'credit' ? 'Received' : 'Given'} by: _________________________</p>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(receiptContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {transactionType === 'credit' ? 'Add Funds' : 'Withdraw Funds'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Resident Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900">{resident.name}</h3>
            <p className="text-sm text-gray-600">Current Balance: ${resident.trustBalance.toFixed(2)}</p>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Transaction Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('credit')}
                className={`p-3 border-2 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                  transactionType === 'credit'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Funds</span>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('debit')}
                className={`p-3 border-2 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                  transactionType === 'debit'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                inputMode="decimal"
                pattern="^\\d*(?:\\.\\d{0,2})?$"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || /^\d*(?:\.\d{0,2})?$/.test(v)) setAmount(v);
                }}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="manual">Manual Entry</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <select
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            >
              <option value="">Select service or enter custom description</option>
              {resident?.allowedServices.haircare && <option value="Hair Care Service">Hair Care Service</option>}
              {resident?.allowedServices.footcare && <option value="Foot Care Service">Foot Care Service</option>}
              {resident?.allowedServices.pharmacy && <option value="Pharmacy Purchase">Pharmacy Purchase</option>}
              {resident?.allowedServices.cable && <option value="Cable TV Payment">Cable TV Payment</option>}
              {resident?.allowedServices.wheelchairRepair && <option value="Wheelchair Repair">Wheelchair Repair</option>}
              <option value="Personal Care Items">Personal Care Items</option>
              <option value="Clothing">Clothing</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
            {description === 'Other' && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mt-2"
                placeholder="Enter custom description..."
              />
            )}
          </div>

          {/* Warning for withdrawals */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              💼 Manual transaction processing for cash, check, or direct entries.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 text-white rounded-lg transition-colors ${
                transactionType === 'credit'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {transactionType === 'credit' ? 'Add Funds' : 'Withdraw Funds'}
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* Receipt Modal */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Transaction Complete</h2>
              <button
                onClick={() => {
                  setShowReceipt(false);
                  onClose();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  {lastTransaction.type === 'credit' ? 'Funds Added Successfully' : 'Funds Withdrawn Successfully'}
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {lastTransaction.type === 'credit' ? '+' : '-'}${lastTransaction.amount.toFixed(2)}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  New Balance: ${lastTransaction.newBalance.toFixed(2)}
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><strong>Resident:</strong> {lastTransaction.resident.name}</p>
                <p><strong>Date:</strong> {lastTransaction.date}</p>
                <p><strong>Method:</strong> {lastTransaction.method.toUpperCase()}</p>
                <p><strong>Description:</strong> {lastTransaction.description}</p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={printReceipt}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => {
                    setShowReceipt(false);
                    onClose();
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}