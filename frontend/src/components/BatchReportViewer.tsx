import React from 'react';
import { Printer, X, Users, DollarSign, Calendar, User } from 'lucide-react';
import { ServiceBatch } from '../types';

interface BatchReportViewerProps {
  batch: ServiceBatch;
  residents: any[];
  onClose: () => void;
  serviceLabels: Record<string, string>;
  facilityName?: string;
}

export default function BatchReportViewer({ 
  batch, 
  residents, 
  onClose, 
  serviceLabels,
  facilityName
}: BatchReportViewerProps) {
  
  const printBatchReport = () => {
    const reportContent = generateBatchReportHTML(batch, residents, serviceLabels, facilityName);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generateBatchReportHTML = (
    batch: ServiceBatch, 
    residents: any[], 
    serviceLabels: Record<string, string>,
    facilityName?: string
  ) => {
    const processedItems = batch.items.filter(item => item.status === 'processed');
    const failedItems = batch.items.filter(item => item.status === 'failed');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch Report - ${batch.id}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              margin-bottom: 30px;
              padding-bottom: 20px;
            }
            .report-title {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .batch-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
            }
            .info-group {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-weight: bold;
              color: #555;
              margin-bottom: 5px;
            }
            .info-value {
              color: #333;
              font-size: 16px;
            }
            .summary-stats {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .stat-card {
              text-align: center;
              padding: 20px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
            }
            .stat-card.success {
              border-color: #4CAF50;
              background-color: #f1f8e9;
            }
            .stat-card.failed {
              border-color: #f44336;
              background-color: #ffebee;
            }
            .stat-card.total {
              border-color: #2196F3;
              background-color: #e3f2fd;
            }
            .stat-number {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .stat-label {
              font-size: 14px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .residents-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .residents-table th,
            .residents-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .residents-table th {
              background-color: #f5f5f5;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .residents-table tbody tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .amount-cell {
              text-align: right;
              font-weight: bold;
            }
            .status-success {
              color: #4CAF50;
              font-weight: bold;
            }
            .status-failed {
              color: #f44336;
              font-weight: bold;
            }
            .total-row {
              border-top: 2px solid #333;
              font-weight: bold;
              background-color: #f0f0f0;
            }
            .signature-section {
              margin-top: 50px;
              border-top: 1px solid #ccc;
              padding-top: 30px;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              margin: 20px 0 10px 0;
              padding-bottom: 2px;
            }
            .error-message {
              color: #f44336;
              font-size: 12px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${facilityName ? `<div style="font-size: 18px; font-weight: bold; color: #111; margin-bottom: 6px;">${facilityName}</div>` : ''}
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
              <div class="info-value">${new Date(batch.createdAt).toLocaleDateString()} ${new Date(batch.createdAt).toLocaleTimeString()}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Status:</div>
              <div class="info-value">${batch.status === 'posted' ? 'PROCESSED' : 'OPEN'}</div>
            </div>
            ${batch.postedAt ? `
              <div class="info-group">
                <div class="info-label">Posted Date:</div>
                <div class="info-value">${new Date(batch.postedAt).toLocaleDateString()} ${new Date(batch.postedAt).toLocaleTimeString()}</div>
              </div>
            ` : ''}
          </div>

          <div class="summary-stats">
            <div class="stat-card total">
              <div class="stat-number">${batch.items.length}</div>
              <div class="stat-label">Total Residents</div>
            </div>
            <div class="stat-card success">
              <div class="stat-number">${processedItems.length}</div>
              <div class="stat-label">Processed</div>
            </div>
            <div class="stat-card failed">
              <div class="stat-number">${failedItems.length}</div>
              <div class="stat-label">Failed</div>
            </div>
          </div>

          <table class="residents-table">
            <thead>
              <tr>
                <th>Resident Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${batch.items.map(item => {
                const resident = residents.find(r => r.id === item.residentId);
                const residentName = batch.status === 'posted' ? 'Resident' : (resident?.name || 'Unknown Resident');
                
                return `
                  <tr>
                    <td>${residentName}</td>
                    <td class="amount-cell">$${item.amount.toFixed(2)}</td>
                    <td class="${item.status === 'processed' ? 'status-success' : 'status-failed'}">
                      ${item.status.toUpperCase()}
                    </td>
                    <td>
                      ${item.errorMessage ? `<span class="error-message">${item.errorMessage}</span>` : '-'}
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td>TOTAL</td>
                <td class="amount-cell">$${batch.totalAmount.toFixed(2)}</td>
                <td colspan="2">
                  ${processedItems.length} of ${batch.items.length} residents processed
                </td>
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
  };

  const processedItems = batch.items.filter(item => item.status === 'processed');
  const failedItems = batch.items.filter(item => item.status === 'failed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Batch Report - {serviceLabels[batch.serviceType]}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Batch #{batch.id} • {batch.status === 'posted' ? 'Processed' : 'Open'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={printBatchReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Batch Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Created</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(batch.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(batch.createdAt).toLocaleTimeString()}
              </p>
            </div>

            {batch.postedAt && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Posted</span>
                </div>
                <p className="text-lg font-semibold text-green-900">
                  {new Date(batch.postedAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-green-600">
                  {new Date(batch.postedAt).toLocaleTimeString()}
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Residents</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{batch.items.length}</p>
              <p className="text-sm text-blue-600">
                {processedItems.length} processed
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Total Amount</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${batch.totalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-green-600">
                {processedItems.length > 0 ? `$${processedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)} processed` : 'Not processed'}
              </p>
            </div>
          </div>

          {/* Residents Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resident Details ({batch.items.length} residents)
            </h3>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resident Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batch.items.map((item, index) => {
                    const resident = residents.find(r => r.id === item.residentId);
                    const residentName = batch.status === 'posted' ? 'Resident' : (resident?.name || 'Unknown Resident');
                    
                    return (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {residentName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ${item.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'processed' 
                              ? 'bg-green-100 text-green-800' 
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.errorMessage && (
                            <span className="text-sm text-red-600 italic">
                              {item.errorMessage}
                            </span>
                          )}
                          {!item.errorMessage && <span className="text-sm text-gray-400">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">
                      TOTAL
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      ${batch.totalAmount.toFixed(2)}
                    </td>
                    <td colSpan={2} className="px-6 py-3 text-sm font-medium text-gray-600">
                      {processedItems.length} of {batch.items.length} residents processed
                      {failedItems.length > 0 && (
                        <span className="text-red-600 ml-2">
                          • {failedItems.length} failed
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={printBatchReport}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print PDF Report</span>
            </button>
            <button
              onClick={onClose}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}