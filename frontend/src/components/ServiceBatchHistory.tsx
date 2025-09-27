import React, { useState } from 'react';
import { Users, DollarSign, Eye, Plus, Search, X, ArrowLeft, Clock, Check, AlertCircle, Printer, FileText, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import { ServiceBatch } from '../types';
import BatchReportViewer from './BatchReportViewer';

interface ServiceBatchHistoryProps {
  onBack: () => void;
}

type ServiceType = 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair' | 'miscellaneous';

export default function ServiceBatchHistory({ onBack }: ServiceBatchHistoryProps) {
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ServiceBatch | null>(null);
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [showBatchReport, setShowBatchReport] = useState(false);
  const [batchForReport, setBatchForReport] = useState<ServiceBatch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'posted' | 'all'>('open');

  const { 
    getFacilityServiceBatches, 
    getServiceBatch, 
    getFacilityResidents,
    createServiceBatch,
    addResidentToBatch,
    removeResidentFromBatch,
    updateBatchItem,
    postServiceBatch,
    deleteOpenServiceBatch
  } = useData();
  const { user, currentFacility } = useAuth();

  const serviceLabels = {
    haircare: 'Hair Care',
    footcare: 'Foot Care',
    pharmacy: 'Pharmacy',
    cable: 'Cable TV',
    wheelchairRepair: 'Wheelchair Repair',
    miscellaneous: 'Miscellaneous'
  };

  const facilityResidents = currentFacility ? getFacilityResidents(currentFacility.id) : [];
  
  const handleServiceClick = (serviceType: ServiceType) => {
    setSelectedService(serviceType);
  };

  const handleBatchClick = (batchId: string) => {
    const batch = getServiceBatch(batchId);
    if (batch) {
      setSelectedBatch(batch);
      setShowBatchDetails(true);
    }
  };

  const handleCreateNewBatch = async () => {
    if (!selectedService || !currentFacility || !user) return;
    try {
      const batchId = await createServiceBatch(selectedService, currentFacility.id, user.id);
      const newBatch = getServiceBatch(batchId);
      if (newBatch) {
        setSelectedBatch(newBatch);
        setShowBatchDetails(true);
      }
    } catch (error) {
    }
    await getFacilityServiceBatches(currentFacility.id, selectedService);
  };

  const handleAddResident = async (residentId: string, amount: number) => {
    if (!selectedBatch || selectedBatch.status !== 'open') return;
    try {
      await addResidentToBatch(selectedBatch.id, residentId, amount);
      setSelectedBatch(prev => prev && {
        ...prev,
        items: [...prev.items, { id: crypto.randomUUID(), residentId, amount, status: 'open' }]
      });
    } catch (error) {
    }
  };

  const handleRemoveResident = async (residentId: string) => {
    if (!selectedBatch || selectedBatch.status !== 'open') return;
    try {
      await removeResidentFromBatch(selectedBatch.id, residentId);
      setSelectedBatch(prev => prev && {
        ...prev,
        items: prev.items.filter(item => item.residentId !== residentId)
      });
    } catch (error) {
    }
  };

  const handleUpdateAmount = async (residentId: string, amount: number) => {
    if (!selectedBatch || selectedBatch.status !== 'open') return;
    try {
      await updateBatchItem(selectedBatch.id, residentId, amount);
      const updatedBatch = getServiceBatch(selectedBatch.id);
      if (updatedBatch) setSelectedBatch(updatedBatch);
    } catch (error) {
    }
  };

  const handlePostBatch = async (chequeNo?: string) => {
    if (!selectedBatch || selectedBatch.status !== 'open' || !user) return;
    try {
      await postServiceBatch(selectedBatch.id, user.id, chequeNo);
      const updatedBatch = getServiceBatch(selectedBatch.id);
      if (updatedBatch) setSelectedBatch(updatedBatch);
    } catch (error) {
    }
  };

  const handleViewReport = (batchId: string) => {
    const batch = getServiceBatch(batchId);
    if (batch) {
      setBatchForReport(batch);
      setShowBatchReport(true);
    }
  };

  const handlePrintBatch = (batchId: string) => {
    const batch = getServiceBatch(batchId);
    if (batch) {
      printBatchReport(batch);
    }
  };

  const printBatchReport = (batch: ServiceBatch) => {
    const processedItems = batch.items.filter(item => item.status === 'processed');
    
    const reportContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch Report - ${batch.id}</title>
          <style>
            @media print { body { margin: 0; } }
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 30px; padding-bottom: 20px; }
            .report-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .batch-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background-color: #f8f9fa; padding: 20px; border-radius: 8px; }
            .info-group { display: flex; flex-direction: column; }
            .info-label { font-weight: bold; color: #555; margin-bottom: 5px; }
            .info-value { color: #333; font-size: 16px; }
            .residents-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .residents-table th, .residents-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .residents-table th { background-color: #f5f5f5; font-weight: bold; }
            .residents-table tbody tr:nth-child(even) { background-color: #f9f9f9; }
            .amount-cell { text-align: right; font-weight: bold; }
            .total-row { border-top: 2px solid #333; font-weight: bold; background-color: #f0f0f0; }
            .signature-section { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 30px; }
            .signature-line { border-bottom: 1px solid #333; margin: 20px 0 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            ${currentFacility?.name ? `<div style="font-size:18px; font-weight:bold; color:#111; margin-bottom:6px;">${currentFacility.name}</div>` : ''}
            <div class="report-title">SERVICE BATCH REPORT</div>
            <div style="color: #666; font-size: 16px;">${serviceLabels[batch.serviceType]}</div>
          </div>
          <div class="batch-info">
            <div class="info-group">
              <div class="info-label">Batch ID:</div>
              <div class="info-value">#${batch.id}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Service Type:</div>
              <div class="info-value">${serviceLabels[batch.serviceType]}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Created Date:</div>
              <div class="info-value">${new Date(batch.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Status:</div>
              <div class="info-value">${batch.status === 'posted' ? 'PROCESSED' : 'OPEN'}</div>
            </div>
          </div>
          <table class="residents-table">
            <thead>
              <tr>
                <th>Resident Name</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${batch.items.map(item => {
                const resident = facilityResidents.find(r => r.id === item.residentId);
                const residentName = resident?.name || 'Unknown Resident';
                return `
                  <tr>
                    <td>${residentName}</td>
                    <td class="amount-cell">$${item.amount.toFixed(2)}</td>
                    <td>${item.status.toUpperCase()}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td>TOTAL</td>
                <td class="amount-cell">$${batch.totalAmount.toFixed(2)}</td>
                <td>${processedItems.length} of ${batch.items.length} processed</td>
              </tr>
            </tbody>
          </table>
          <div class="signature-section">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
              <div>
                <div>Service Provider Signature:</div>
                <div class="signature-line"></div>
                <div style="margin-top: 10px;">Print Name: _________________________</div>
              </div>
              <div>
                <div>Date: _________________________</div>
                <div style="margin-top: 30px;">Facility Representative:</div>
                <div class="signature-line"></div>
              </div>
            </div>
          </div>
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getAuthorizedResidents = (serviceType: ServiceType) => {
    return facilityResidents.filter(resident => 
      resident.status === 'active' && 
      resident.allowedServices[serviceType]
    );
  };

  const getAvailableResidents = () => {
    if (!selectedService || !selectedBatch) return [];
    
    const authorizedResidents = getAuthorizedResidents(selectedService);
    const batchResidentIds = selectedBatch.items.map(item => item.residentId);
    
    return authorizedResidents.filter(resident => 
      !batchResidentIds.includes(resident.id) &&
      (searchTerm === '' || resident.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const batches = selectedService && currentFacility 
    ? getFacilityServiceBatches(currentFacility.id, selectedService)
        .filter(b => (statusFilter === 'all' ? true : b.status === statusFilter))
        .filter(b =>
          batchSearch.trim() === ''
            ? true
            : String(b.service_batch_no || b.id).toLowerCase().includes(batchSearch.trim().toLowerCase())
        )
    : [];

  // Service Selection View
  if (!selectedService) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Batch History</h1>
              <p className="text-gray-600">View and manage service batch history by type</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Service Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(serviceLabels).map(([key, label]) => {
              const serviceType = key as ServiceType;
              const serviceBatches = currentFacility 
                ? getFacilityServiceBatches(currentFacility.id, serviceType)
                : [];
              const openBatches = serviceBatches.filter(b => b.status === 'open').length;
              const totalBatches = serviceBatches.length;

              return (
                <button
                  key={key}
                  onClick={() => handleServiceClick(serviceType)}
                  className="p-4 border-2 border-gray-300 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      {totalBatches} total batches
                    </p>
                    <p className="text-sm text-blue-600">
                      {openBatches} open batches
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Service Batch List View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedService(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {serviceLabels[selectedService]} Batches
            </h1>
            <p className="text-gray-600">Manage batch history for {serviceLabels[selectedService]}</p>
          </div>
        </div>
        <button
          onClick={handleCreateNewBatch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Batch</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Batch History ({batches.length} batches)
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by batch no..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="w-56 pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg py-2 px-3 text-sm"
              >
                <option value="open">Open</option>
                <option value="posted">Posted</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>
        
        {batches.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Found</h3>
            <p className="text-gray-600 mb-4">No batches have been created for {serviceLabels[selectedService]} yet</p>
            <button
              onClick={handleCreateNewBatch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Batch
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {batches.map(batch => (
              <div key={batch.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Batch #{batch.service_batch_no}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        batch.status === 'open' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {batch.status === 'open' ? (
                          <><Clock className="w-3 h-3 mr-1" /> Open</>
                        ) : (
                          <><Check className="w-3 h-3 mr-1" /> Posted</>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Created:</span><br />
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </div>
                      {batch.postedAt && (
                        <div>
                          <span className="font-medium">Posted:</span><br />
                          {new Date(batch.postedAt).toLocaleDateString()}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Residents:</span><br />
                        {batch.items.length}
                      </div>
                      <div>
                        <span className="font-medium">Total Amount:</span><br />
                        <span className="text-green-600 font-semibold">
                          ${batch.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    {batch.status === 'open' && deleteOpenServiceBatch && (
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this open batch? This cannot be undone.')) return;
                          const res = await deleteOpenServiceBatch(batch.id);
                          if (!res.success) alert(res.error || 'Failed to delete');
                        }}
                        className="bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
      
                    <button
                      onClick={() => handlePrintBatch(batch.id)}
                      className="bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={() => handleBatchClick(batch.id)}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Details Modal */}
      {showBatchDetails && selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          onClose={() => {
            setShowBatchDetails(false);
            setSelectedBatch(null);
          }}
          onAddResident={handleAddResident}
          onRemoveResident={handleRemoveResident}
          onUpdateAmount={handleUpdateAmount}
          onPostBatch={handlePostBatch}
          availableResidents={getAvailableResidents()}
          allResidents={facilityResidents}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      )}

      {/* Batch Report Viewer */}
      {showBatchReport && batchForReport && (
        <BatchReportViewer
          batch={batchForReport}
          residents={facilityResidents}
          serviceLabels={serviceLabels}
          facilityName={currentFacility?.name}
          onClose={() => {
            setShowBatchReport(false);
            setBatchForReport(null);
          }}
        />
      )}
    </div>
  );
}

interface BatchDetailsModalProps {
  batch: ServiceBatch;
  onClose: () => void;
  onAddResident: (residentId: string, amount: number) => void | Promise<void>;
  onRemoveResident: (residentId: string) => void | Promise<void>;
  onUpdateAmount: (residentId: string, amount: number) => void | Promise<void>;
  onPostBatch: (chequeNumber?: string) => void | Promise<void>;
  availableResidents: any[];
  allResidents: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

function BatchDetailsModal({
  batch,
  onClose,
  onAddResident,
  onRemoveResident,
  onUpdateAmount,
  onPostBatch,
  availableResidents,
  allResidents,
  searchTerm,
  onSearchChange
}: BatchDetailsModalProps) {
  const [showAddResidents1, setShowAddResidents1] = useState(false);
  const [residentAmountById, setResidentAmountById] = useState<Record<string, string>>({});
  const [chequeNumberInput, setChequeNumberInput] = useState<string>('');
  const serviceLabels = {
    haircare: 'Hair Care',
    footcare: 'Foot Care',
    pharmacy: 'Pharmacy',
    cable: 'Cable TV',
    wheelchairRepair: 'Wheelchair Repair',
    miscellaneous: 'Miscellaneous'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {serviceLabels[batch.serviceType]} Batch #{batch.service_batch_no}
            </h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>Created: {new Date(batch.createdAt).toLocaleDateString()}</span>
              {batch.postedAt && (
                <span>Posted: {new Date(batch.postedAt).toLocaleDateString()}</span>
              )}
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                batch.status === 'open' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {batch.status === 'open' ? 'Open' : 'Posted'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-600 font-medium">Residents</p>
              <p className="text-2xl font-bold text-blue-900">{batch.items.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-600 font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-green-900">${batch.totalAmount.toFixed(2)}</p>
            </div>
            {batch.status === 'posted' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <Check className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-purple-600 font-medium">Processed</p>
                <p className="text-2xl font-bold text-purple-900">{batch.processedCount}</p>
              </div>
            )}
          </div>

          {batch.status === 'open' && (
            <div className="flex flex-col space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cheque Number (optional)</label>
                  <input
                    type="text"
                    value={chequeNumberInput}
                    onChange={(e) => setChequeNumberInput(e.target.value)}
                    placeholder="Enter cheque number for this batch (if applicable)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddResidents1(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Residents</span>
                </button>
                {batch.items.length > 0 && (
                  <button
                    onClick={() => onPostBatch(chequeNumberInput || undefined)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Post Batch
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Batch Items ({batch.items.length})
            </h3>
            
            {batch.items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No residents in this batch</p>
                {batch.status === 'open' && (
                  <button
                    onClick={() => setShowAddResidents1(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add some residents to get started
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {batch.items.map(item => {
                  const resident = allResidents.find(r => r.id === item.residentId);
                  return (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {resident?.name || 'Unknown Resident'}
                          </p>
                          {batch.status === 'open' && resident && (
                            <p className="text-sm text-gray-600">{resident.ltcUnit}</p>
                          )}
                          {item.status === 'failed' && (
                            <p className="text-sm text-red-600 flex items-center mt-1">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          {batch.status === 'open' ? (
                            <>
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={item.amount}
                                  onBlur={(e) => onUpdateAmount(item.residentId, parseFloat(e.target.value) || 0)}
                                  className="w-80 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <button
                                onClick={() => onRemoveResident(item.residentId)}
                                className="text-red-600 hover:text-red-700 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">${item.amount.toFixed(2)}</p>
                              <p className={`text-xs ${
                                item.status === 'processed' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {item.status === 'processed' ? 'Processed' : 'Failed'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {showAddResidents1 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add Residents to Batch</h3>
                <button
                  onClick={() => setShowAddResidents1(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search authorized residents..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {availableResidents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      {searchTerm ? 'No residents found matching your search' : 'No authorized residents available'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableResidents.map(resident => (
                      <div key={resident.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{resident.name}</p>
                          <p className="text-sm text-gray-600">{resident.ltcUnit}</p>
                          <p className="text-sm text-green-600">Balance: ${resident.trustBalance.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={residentAmountById[resident.id] || ''}
                              onChange={(e) => setResidentAmountById(prev => ({ ...prev, [resident.id]: e.target.value }))}
                              placeholder="0.00"
                              className="w-28 pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const amountStr = residentAmountById[resident.id] || '';
                              const amount = parseFloat(amountStr);
                              if (!amount || isNaN(amount) || amount <= 0) return;
                              onAddResident(resident.id, amount);
                              setShowAddResidents1(false);
                            }}
                            disabled={!residentAmountById[resident.id] || isNaN(parseFloat(residentAmountById[resident.id])) || parseFloat(residentAmountById[resident.id]) <= 0}
                            className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}