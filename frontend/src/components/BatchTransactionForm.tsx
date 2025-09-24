import React, { useState } from 'react';
import { X, DollarSign, Users, Plus, Minus, Printer, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import BatchReportViewer from './BatchReportViewer';

interface BatchTransactionFormProps {
  onClose: () => void;
}

export default function BatchTransactionForm({ onClose }: BatchTransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'cheque' | 'manual'>('cash');
  const [description, setDescription] = useState('');
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [showBatchReport, setShowBatchReport] = useState(false);
  const [currentBatchForReport, setCurrentBatchForReport] = useState<any>(null);

  const { residents, addTransaction } = useData();
  const { user, currentFacility } = useAuth();

  const handleResidentToggle = (residentId: string) => {
    setSelectedResidents(prev => 
      prev.includes(residentId) 
        ? prev.filter(id => id !== residentId)
        : [...prev, residentId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) return;
    
    if (selectedResidents.length === 0) {
      alert('Please select at least one resident');
      return;
    }

    const results: any[] = [];

    selectedResidents.forEach(residentId => {
      const resident = residents.find(r => r.id === residentId);
      if (!resident) return;

      // Check for sufficient balance on withdrawals
      if (transactionType === 'debit' && resident.trustBalance < transactionAmount) {
        results.push({
          resident,
          success: false,
          error: 'Insufficient funds'
        });
        return;
      }

      addTransaction({
        residentId,
        facilityId: currentFacility?.id || '',
        type: transactionType,
        amount: transactionAmount,
        method,
        description: description || `Batch ${transactionType === 'credit' ? 'Deposit' : 'Withdrawal'} - ${method}`,
        createdBy: user?.id || ''
      });
      
      results.push({
        resident,
        success: true,
        amount: transactionAmount,
        type: transactionType,
        newBalance: transactionType === 'credit' 
          ? resident.trustBalance + transactionAmount
          : resident.trustBalance - transactionAmount
      });
    });

    setBatchResults(results);
    setShowReceipt(true);
  };

  const printBatchReceipt = () => {
    const successfulTransactions = batchResults.filter(r => r.success);
    const totalAmount = successfulTransactions.reduce((sum, r) => sum + r.amount, 0);
    
    const receiptContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 8px;">BATCH TRANSACTION RECEIPT</h2>
        ${currentFacility?.name ? `<div style=\"text-align:center; font-weight:bold; margin-bottom: 12px;\">${currentFacility.name}</div>` : ''}
        <hr style="margin: 20px 0;">
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Transaction Type:</strong> ${transactionType === 'credit' ? 'BATCH DEPOSIT' : 'BATCH WITHDRAWAL'}</p>
        <p><strong>Amount per Resident:</strong> $${amount}</p>
        <p><strong>Method:</strong> ${method.toUpperCase()}</p>
        <p><strong>Total Residents:</strong> ${successfulTransactions.length}</p>
        <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
        <hr style="margin: 20px 0;">
        <h3>Residents Processed:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr style="background-color: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Resident Name</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">New Balance</th>
          </tr>
          ${successfulTransactions.map(r => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${r.resident.name}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${r.amount.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${r.newBalance.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        <hr style="margin: 20px 0;">
        <div style="margin-top: 40px;">
          <p>Processed by: _________________________</p>
          <br>
          <p>Date: _________________________</p>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(receiptContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  const viewBatchReport = () => {
    const successfulTransactions = batchResults.filter(r => r.success);
    const totalAmount = successfulTransactions.reduce((sum, r) => sum + r.amount, 0);
    
    // Create a mock batch object for the report viewer
    const mockBatch = {
      id: `BATCH-${new Date().getTime()}`,
      facilityId: 'current-facility',
      serviceType: 'general' as any, // For batch transactions, we'll use a general type
      status: 'posted' as const,
      createdAt: new Date().toISOString(),
      postedAt: new Date().toISOString(),
      createdBy: user?.id || '',
      postedBy: user?.id || '',
      items: successfulTransactions.map((result, index) => ({
        id: `item-${index}`,
        residentId: result.resident.id,
        amount: result.amount,
        status: result.success ? 'processed' as const : 'failed' as const,
        errorMessage: result.error,
        processedAt: new Date().toISOString()
      })),
      totalAmount: totalAmount,
      processedCount: successfulTransactions.length
    };
    
    setCurrentBatchForReport(mockBatch);
    setShowBatchReport(true);
  };

  const serviceLabels = {
    general: `Batch ${transactionType === 'credit' ? 'Deposit' : 'Withdrawal'}`,
    haircare: 'Hair Care',
    footcare: 'Foot Care',
    pharmacy: 'Pharmacy',
    cable: 'Cable TV',
    wheelchairRepair: 'Wheelchair Repair'
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Batch {transactionType === 'credit' ? 'Add Funds' : 'Withdraw Funds'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  <span>Batch Add Funds</span>
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
                  <span>Batch Withdraw</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount per Resident</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={`Enter description for this batch ${transactionType === 'credit' ? 'deposit' : 'withdrawal'}...`}
              />
            </div>

            {/* Resident Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Residents ({selectedResidents.length} selected)
              </label>
              <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedResidents.length === residents.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedResidents(residents.map(r => r.id));
                        } else {
                          setSelectedResidents([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900">Select All</span>
                  </label>
                </div>
                {residents.map(resident => (
                  <div key={resident.id} className="p-3 border-b border-gray-100 last:border-b-0">
                    <label className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedResidents.includes(resident.id)}
                          onChange={() => handleResidentToggle(resident.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{resident.name}</p>
                          <p className="text-sm text-gray-600">{resident.ltcUnit}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">${resident.trustBalance.toFixed(2)}</p>
                        {transactionType === 'debit' && amount && parseFloat(amount) > resident.trustBalance && (
                          <p className="text-xs text-red-600">Insufficient funds</p>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
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
                disabled={selectedResidents.length === 0}
                className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  transactionType === 'credit'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Process Batch {transactionType === 'credit' ? 'Deposits' : 'Withdrawals'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Batch Results Modal */}
      {showReceipt && batchResults.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Batch Transaction Complete</h2>
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
                  Batch {transactionType === 'credit' ? 'Deposits' : 'Withdrawals'} Processed
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {batchResults.filter(r => r.success).length} of {batchResults.length} Successful
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Transaction Summary:</h4>
                {batchResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{result.resident.name}</span>
                      {result.success ? (
                        <span className="text-green-600 font-semibold">
                          {transactionType === 'credit' ? '+' : '-'}${result.amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-red-600 text-sm">{result.error}</span>
                      )}
                    </div>
                    {result.success && (
                      <p className="text-sm text-gray-600">
                        New Balance: ${result.newBalance.toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={viewBatchReport}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Report</span>
                </button>
                <button
                  onClick={printBatchReceipt}
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

      {/* Batch Report Viewer */}
      {showBatchReport && currentBatchForReport && (
        <BatchReportViewer
          batch={currentBatchForReport}
          residents={residents}
          serviceLabels={serviceLabels}
          facilityName={currentFacility?.name}
          onClose={() => {
            setShowBatchReport(false);
            setCurrentBatchForReport(null);
          }}
        />
      )}
    </>
  );
}