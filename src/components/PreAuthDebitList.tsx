import React, { useState } from 'react';
import { Download, Calendar, DollarSign, Users, CheckCircle, XCircle, FileText, Eye, Play, Check } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';

export default function PreAuthDebitList() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'preauth' | 'batches'>('preauth');

  const {
    getFacilityPreAuthDebits,
    residents,
    createMonthlyPreAuthList,
    closeMonthlyPreAuthList,
    getMonthlyPreAuthList,
    getFacilityMonthlyPreAuthLists,
    generatePreAuthListReport,
    processPreAuthDebit,
    processAllPreAuthDebits,
    getDepositBatches,
    closeDepositBatch
  } = useData();
  
  const { user, currentFacility } = useAuth();

  // Get all debits for the facility (not filtered by month for overview)
  const allFacilityDebits = currentFacility ? getFacilityPreAuthDebits(currentFacility.id) : [];
  
  // Get debits for the selected month
  const monthlyDebits = currentFacility ? getFacilityPreAuthDebits(currentFacility.id, selectedMonth) : [];
  
  const monthlyList = currentFacility ? getMonthlyPreAuthList(currentFacility.id, selectedMonth) : undefined;
  const allMonthlyLists = currentFacility ? getFacilityMonthlyPreAuthLists(currentFacility.id) : [];

  const totalMonthlyAmount = monthlyDebits.reduce((sum, debit) => sum + debit.amount, 0);
  const pendingDebits = monthlyDebits.filter(debit => debit.status === 'pending');

  // Get deposit batches
  const depositBatches = currentFacility ? getDepositBatches(currentFacility.id) : [];
  const openBatches = depositBatches.filter(batch => batch.status === 'open');
  const closedBatches = depositBatches.filter(batch => batch.status === 'closed');

  const handleCreateMonthlyList = () => {
    if (!currentFacility || monthlyList || monthlyDebits.length === 0) return;
    
    createMonthlyPreAuthList(currentFacility.id, selectedMonth);
  };

  const handleCloseList = (listId: string) => {
    if (!user || !confirm('Are you sure you want to close this monthly list? This will mark all authorizations as processed and cannot be undone.')) return;
    
    closeMonthlyPreAuthList(listId, user.id);
  };

  const handleProcessAuthorization = async (authId: string) => {
    const auth = allFacilityDebits.find(d => d.id === authId);
    const actionType = auth?.type === 'credit' ? 'credit' : 'debit';
    const actionDesc = auth?.type === 'credit' ? 'add funds to' : 'debit funds from';
    
    if (!confirm(`Process this authorization? This will ${actionDesc} the resident's trust account.`)) return;
    
    try {
      const result = await processPreAuthDebit(authId);
      if (result && !result.success) {
        alert(`Failed to process authorization: ${result.error}`);
      } else {
        alert('Authorization processed successfully!');
      }
    } catch (error) {
      console.error('Error processing authorization:', error);
      alert('Failed to process authorization. Please try again.');
    }
  };

  const handleProcessAllAuthorizations = async () => {
    if (pendingDebits.length === 0) {
      alert('No pending authorizations to process.');
      return;
    }

    const confirmMessage = `Process all ${pendingDebits.length} pending authorizations for ${formatMonthDisplay(selectedMonth)}? This will add/debit funds to/from all affected resident trust accounts.`;
    
    if (!confirm(confirmMessage)) return;

    setIsProcessingAll(true);
    try {
      const debitIds = pendingDebits.map(d => d.id);
      const result = await processAllPreAuthDebits(debitIds);
      
      if (result.successCount > 0) {
        alert(`Successfully processed ${result.successCount} authorization(s).${result.failedCount > 0 ? ` Failed: ${result.failedCount}` : ''}`);
      } else {
        alert('Failed to process any authorizations. Please check the error details.');
      }
      
      if (result.errors.length > 0) {
        console.error('Batch processing errors:', result.errors);
      }
    } catch (error) {
      console.error('Error processing all authorizations:', error);
      alert('Failed to process authorizations. Please try again.');
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleDownloadReport = (listId: string) => {
    const report = generatePreAuthListReport(listId);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pre-auth-debit-list-${selectedMonth}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getResidentName = (residentId: string) => {
    const resident = residents.find(r => r.id === residentId);
    return resident?.name || 'Unknown Resident';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 text-gray-900">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" />
            Monthly Pre-Authorizations & Batches
          </h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-900">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1 border border-gray-400 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Authorizations for {formatMonthDisplay(selectedMonth)}</p>
                <p className="text-2xl font-bold text-blue-900">{monthlyDebits.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Total Amount for {formatMonthDisplay(selectedMonth)}</p>
                <p className="text-2xl font-bold text-green-900">${totalMonthlyAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-gray-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">List Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {monthlyList ? monthlyList.status : 'Not Created'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly List Management */}
      {activeTab === 'preauth' ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Authorizations for {formatMonthDisplay(selectedMonth)}
              </h3>
              <div className="flex space-x-2">
                {!monthlyList && monthlyDebits.length > 0 && (
                  <button
                    onClick={handleCreateMonthlyList}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Monthly List
                  </button>
                )}
                {monthlyList && monthlyList.status === 'open' && (
                  <button
                    onClick={() => handleCloseList(monthlyList.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Close List
                  </button>
                )}
                {monthlyList && (
                  <button
                    onClick={() => handleDownloadReport(monthlyList.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </button>
                )}
                {pendingDebits.length > 0 && (
                  <button
                    onClick={handleProcessAllAuthorizations}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center"
                    disabled={isProcessingAll}
                  >
                    {isProcessingAll ? (
                      <Play className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isProcessingAll ? 'Processing...' : 'Process All'}
                  </button>
                )}
              </div>
            </div>

            {monthlyDebits.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-900" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Authorizations for {formatMonthDisplay(selectedMonth)}</h3>
                <p className="mt-2 text-gray-900">
                  No pre-authorization debits have been created for this month yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {monthlyList && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        List Status: <span className={monthlyList.status === 'open' ? 'text-green-600' : 'text-red-600'}>
                          {monthlyList.status.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-sm text-gray-900">
                        Created: {formatDate(monthlyList.createdAt)}
                        {monthlyList.closedAt && ` • Closed: ${formatDate(monthlyList.closedAt)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${monthlyList.totalAmount.toFixed(2)}</p>
                      <p className="text-sm text-gray-900">{monthlyList.authorizations.length} authorizations</p>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Resident
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Authorized Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyDebits.map((auth) => (
                        <tr key={auth.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getResidentName(auth.residentId)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              auth.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {auth.type?.toUpperCase() || 'DEBIT'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${auth.amount.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{auth.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(auth.authorizedDate)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              auth.status === 'processed' ? 'bg-green-100 text-green-800' : 
                              auth.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {auth.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {auth.status === 'pending' && (
                              <button
                                onClick={() => handleProcessAuthorization(auth.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 transition-colors"
                                title="Process Authorization"
                              >
                                Process
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Historical Monthly Lists */}
          {allMonthlyLists.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Monthly Lists</h3>
              
              <div className="space-y-2">
                {allMonthlyLists
                  .sort((a, b) => b.month.localeCompare(a.month))
                  .map((list) => (
                    <div key={list.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{formatMonthDisplay(list.month)}</p>
                        <p className="text-sm text-gray-600">
                          {list.authorizations.length} authorizations • ${list.totalAmount.toFixed(2)} total
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          list.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {list.status}
                        </span>
                        <button
                          onClick={() => handleDownloadReport(list.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Download Report"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Saved Deposit Batches</h3>
          </div>
          
          {depositBatches.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-900" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Saved Batches</h3>
              <p className="mt-2 text-gray-900">
                Create deposit batches from the Deposit Batch form.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Open Batches */}
              {openBatches.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Open Batches</h4>
                  <div className="space-y-3">
                    {openBatches.map((batch) => (
                      <div key={batch.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {batch.description || 'Deposit Batch'} - {formatDate(batch.createdAt)}
                            </p>
                            <p className="text-sm text-gray-900 mt-1">
                              {batch.entries.length} entries • Cash: ${batch.totalCash.toFixed(2)} • Cheques: ${batch.totalCheques.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-900">
                              Total: <span className="font-medium">${batch.totalAmount.toFixed(2)}</span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={async () => {
                                if (confirm('Process this batch? This will add funds to all resident accounts.')) {
                                  const result = await closeDepositBatch(batch.id);
                                  if (result.success) {
                                    alert('Batch processed successfully!');
                                  } else {
                                    alert(`Failed to process batch: ${result.error}`);
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                            >
                              Process Batch
                            </button>
                          </div>
                        </div>
                        
                        {/* Show entries */}
                        <div className="mt-3 border-t pt-3">
                          <p className="text-sm font-medium text-gray-900 mb-2">Entries:</p>
                          <div className="space-y-1">
                            {batch.entries.slice(0, 3).map((entry, index) => (
                              <p key={index} className="text-sm text-gray-900">
                                • {getResidentName(entry.residentId)} - ${entry.amount.toFixed(2)} ({entry.method})
                                {entry.chequeNumber && ` - Cheque #${entry.chequeNumber}`}
                              </p>
                            ))}
                            {batch.entries.length > 3 && (
                              <p className="text-sm text-gray-900 italic">
                                ...and {batch.entries.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Closed Batches */}
              {closedBatches.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Processed Batches</h4>
                  <div className="space-y-2">
                    {closedBatches.map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {batch.description || 'Deposit Batch'} - {formatDate(batch.createdAt)}
                          </p>
                          <p className="text-sm text-gray-900">
                            {batch.entries.length} entries • ${batch.totalAmount.toFixed(2)} • Processed: {batch.closedAt && formatDate(batch.closedAt)}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Processed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}