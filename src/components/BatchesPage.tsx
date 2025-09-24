import React, { useState } from 'react';
import { Users, DollarSign, Check, X, Printer, ArrowLeft, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import BatchReportViewer from './BatchReportViewer';

interface BatchesPageProps {
  onBack: () => void;
}

interface BatchItem {
  residentId: string;
  amount: number;
  approved: boolean;
}

export default function BatchesPage({ onBack }: BatchesPageProps) {
  const [selectedService, setSelectedService] = useState<'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair'>('haircare');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [showBatchReport, setShowBatchReport] = useState(false);
  const [currentBatchForReport, setCurrentBatchForReport] = useState<any>(null);

  const { residents, addTransaction } = useData();
  const { user, currentFacility } = useAuth();

  const serviceLabels = {
    haircare: 'Hair Care',
    footcare: 'Foot Care',
    pharmacy: 'Pharmacy',
    cable: 'Cable TV',
    wheelchairRepair: 'Wheelchair Repair'
  };

  const eligibleResidents = residents.filter(r => 
    r.status === 'active' && r.allowedServices[selectedService]
  );

  const initializeBatch = () => {
    setBatchItems(eligibleResidents.map(r => ({
      residentId: r.id,
      amount: 0,
      approved: true
    })));
  };

  const updateBatchItem = (residentId: string, field: 'amount' | 'approved', value: number | boolean) => {
    setBatchItems(prev => prev.map(item => 
      item.residentId === residentId 
        ? { ...item, [field]: value }
        : item
    ));
  };

  const processBatch = () => {
    const validItems = batchItems.filter(item => item.approved && item.amount > 0);
    
    if (validItems.length === 0) {
      alert('No valid items to process');
      return;
    }

    const results: any[] = [];

    validItems.forEach(item => {
      const resident = residents.find(r => r.id === item.residentId);
      if (!resident) return;

      // Check for sufficient balance
      if (resident.trustBalance < item.amount) {
        results.push({
          resident,
          success: false,
          error: 'Insufficient funds',
          amount: item.amount
        });
        return;
      }

      addTransaction({
        residentId: item.residentId,
        facilityId: currentFacility?.id || '',
        type: 'debit',
        amount: item.amount,
        method: 'manual',
        description: `${serviceLabels[selectedService]} - Batch Payment`,
        createdBy: user?.id || ''
      });
      
      results.push({
        resident,
        success: true,
        amount: item.amount,
        newBalance: resident.trustBalance - item.amount
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
        <h2 style="text-align: center; margin-bottom: 8px;">BATCH SERVICE PAYMENT RECEIPT</h2>
        ${currentFacility?.name ? `<div style="text-align:center; font-weight:bold; margin-bottom: 12px;">${currentFacility.name}</div>` : ''}
        <hr style="margin: 20px 0;">
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Service Type:</strong> ${serviceLabels[selectedService]}</p>
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
          <p>Service Provider: _________________________</p>
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
      serviceType: selectedService,
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

  React.useEffect(() => {
    initializeBatch();
  }, [selectedService]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Batches</h1>
            <p className="text-gray-600">Process service payments for multiple residents</p>
          </div>
        </div>
      </div>

      {/* Service Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Service Type</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(serviceLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedService(key as any)}
              className={`p-3 border-2 rounded-lg text-center transition-colors ${
                selectedService === key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {serviceLabels[selectedService]} Batch ({eligibleResidents.length} eligible residents)
          </h2>
          <button
            onClick={processBatch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>Process Batch</span>
          </button>
        </div>

        {eligibleResidents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Eligible Residents</h3>
            <p className="text-gray-600">No residents are allowed to use {serviceLabels[selectedService]}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Include
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eligibleResidents.map(resident => {
                  const batchItem = batchItems.find(item => item.residentId === resident.id);
                  return (
                    <tr key={resident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={batchItem?.approved || false}
                          onChange={(e) => updateBatchItem(resident.id, 'approved', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{resident.name}</div>
                          <div className="text-sm text-gray-500">{resident.ltcUnit}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-green-600">
                          ${resident.trustBalance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={batchItem?.amount || 0}
                            onChange={(e) => updateBatchItem(resident.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24 pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {batchItem?.amount && batchItem.amount > resident.trustBalance ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Insufficient Funds
                          </span>
                        ) : batchItem?.approved && batchItem?.amount > 0 ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch Results Modal */}
      {showReceipt && batchResults.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Batch Processing Complete</h2>
              <button
                onClick={() => setShowReceipt(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  {serviceLabels[selectedService]} Batch Processed
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
                          -${result.amount.toFixed(2)}
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
                  onClick={() => setShowReceipt(false)}
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
    </div>
  );
}