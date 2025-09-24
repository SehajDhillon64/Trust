import React, { useState } from 'react';
import { Calendar, Download, X, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import { simplifyTransactionDescription } from '../utils/format';
import jsPDF from 'jspdf';

interface MonthlyTransactionReportProps {
  residentId: string;
  onClose: () => void;
}

export default function MonthlyTransactionReport({ residentId, onClose }: MonthlyTransactionReportProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  const { residents, generateMonthlyReport, facilities } = useData();
  const { user } = useAuth();
  const audience = user?.role === 'Resident' ? 'resident' : user?.role === 'POA' ? 'poa' : user?.role === 'OM' ? 'om' : user?.role === 'Admin' ? 'admin' : 'vendor';
  
  const resident = residents.find(r => r.id === residentId);
  const facility = resident ? facilities.find(f => f.id === resident.facilityId) : null;
  const monthlyReport = generateMonthlyReport(residentId, selectedYear, selectedMonth);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const handleDownloadPDF = () => {
    if (!resident || !facility) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPos = margin;

    // Helper function to add text with automatic line wrapping
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      doc.setFontSize(options.fontSize || 12);
      doc.setFont('helvetica', options.fontWeight || 'normal');
      
      if (options.align === 'center') {
        doc.text(text, pageWidth / 2, y, { align: 'center' });
      } else if (options.align === 'right') {
        doc.text(text, pageWidth - margin, y, { align: 'right' });
      } else {
        doc.text(text, x, y);
      }
      
      return y + (options.lineHeight || 7);
    };

    // Header
    yPos = addText(facility.name, margin, yPos, { 
      fontSize: 14, fontWeight: 'bold', align: 'center' 
    });
    yPos += 3;
    yPos = addText('MONTHLY TRANSACTION REPORT', margin, yPos, { 
      fontSize: 18, fontWeight: 'bold', align: 'center' 
    });
    yPos += 5;

    // Facility and Resident Info
    yPos = addText(`Facility: ${facility.name}`, margin, yPos, { fontSize: 12, fontWeight: 'bold' });
    yPos = addText(`Address: ${facility.address}`, margin, yPos);
    yPos = addText(`Phone: ${facility.phone}`, margin, yPos);
    yPos += 5;

    yPos = addText(`Resident: ${resident.name}`, margin, yPos, { fontSize: 14, fontWeight: 'bold' });
    yPos = addText(`Resident ID: ${resident.residentId}`, margin, yPos);
    yPos = addText(`LTC Unit: ${resident.ltcUnit}`, margin, yPos);
    yPos = addText(`Report Period: ${monthNames[selectedMonth - 1]} ${selectedYear}`, margin, yPos, { fontWeight: 'bold' });
    yPos += 10;

    // Financial Summary
    yPos = addText('FINANCIAL SUMMARY', margin, yPos, { fontSize: 14, fontWeight: 'bold' });
    yPos += 3;
    
    // Create a box for the summary
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    const summaryBoxHeight = 35;
    doc.rect(margin, yPos, pageWidth - 2 * margin, summaryBoxHeight);
    
    yPos += 8;
    yPos = addText(`Starting Balance: $${monthlyReport.startingBalance.toFixed(2)}`, margin + 5, yPos);
    yPos = addText(`Total Credits: +$${monthlyReport.totalCredits.toFixed(2)}`, margin + 5, yPos);
    yPos = addText(`Total Debits: -$${monthlyReport.totalDebits.toFixed(2)}`, margin + 5, yPos);
    yPos = addText(`Net Change: ${monthlyReport.netChange >= 0 ? '+' : ''}$${monthlyReport.netChange.toFixed(2)}`, margin + 5, yPos, { fontWeight: 'bold' });
    yPos = addText(`Ending Balance: $${monthlyReport.endingBalance.toFixed(2)}`, margin + 5, yPos, { fontWeight: 'bold' });
    yPos += 15;

    // Transaction Details
    if (monthlyReport.transactions.length > 0) {
      yPos = addText('TRANSACTION DETAILS', margin, yPos, { fontSize: 14, fontWeight: 'bold' });
      yPos += 5;

      // Table headers
      const colWidths = [25, 35, 60, 25, 30]; // Date, Type, Description, Method, Amount
      const colPositions = [margin];
      for (let i = 1; i < colWidths.length; i++) {
        colPositions.push(colPositions[i-1] + colWidths[i-1]);
      }

      // Draw table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 10, 'F');
      
      yPos = addText('Date', colPositions[0], yPos, { fontSize: 10, fontWeight: 'bold' });
      addText('Type', colPositions[1], yPos - 7, { fontSize: 10, fontWeight: 'bold' });
      addText('Description', colPositions[2], yPos - 7, { fontSize: 10, fontWeight: 'bold' });
      addText('Method', colPositions[3], yPos - 7, { fontSize: 10, fontWeight: 'bold' });
      addText('Amount', colPositions[4], yPos - 7, { fontSize: 10, fontWeight: 'bold' });
      yPos += 2;

      // Draw table data
      monthlyReport.transactions.forEach((transaction, index) => {
        // Check if we need a new page
        if (yPos > doc.internal.pageSize.height - 30) {
          doc.addPage();
          yPos = margin;
        }

        const bgColor = index % 2 === 0 ? 255 : 248;
        doc.setFillColor(bgColor, bgColor, bgColor);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');

        yPos = addText(new Date(transaction.timestamp).toLocaleDateString(), colPositions[0], yPos, { fontSize: 9 });
        addText(transaction.type.toUpperCase(), colPositions[1], yPos - 7, { fontSize: 9 });
        
        // Simplify for audience and truncate if too long
        const simplified = simplifyTransactionDescription(transaction.description, { audience });
        const maxDescLength = 35;
        const description = simplified.length > maxDescLength 
          ? simplified.substring(0, maxDescLength) + '...'
          : simplified;
        addText(description, colPositions[2], yPos - 7, { fontSize: 9 });
        
        addText(transaction.method.toUpperCase(), colPositions[3], yPos - 7, { fontSize: 9 });
        const amountText = `${transaction.type === 'credit' ? '+' : '-'}$${transaction.amount.toFixed(2)}`;
        addText(amountText, colPositions[4], yPos - 7, { fontSize: 9, fontWeight: 'bold' });
        yPos += 2;
      });
    } else {
      yPos = addText('No transactions found for this period.', margin, yPos, { fontSize: 12 });
    }

    // Footer
    yPos = doc.internal.pageSize.height - 30;
    yPos = addText('Report generated on: ' + new Date().toLocaleString(), margin, yPos, { fontSize: 10 });
    yPos = addText('POA Trust Account Management System', margin, yPos, { fontSize: 10 });

    // Save the PDF
    const fileName = `${resident.name.replace(/\s+/g, '_')}_${monthNames[selectedMonth - 1]}_${selectedYear}_Report.pdf`;
    doc.save(fileName);
  };

  if (!resident) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Monthly Transaction Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Period Selection */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Select Report Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">{resident.name}</h3>
                <p className="text-blue-100">
                  {monthNames[selectedMonth - 1]} {selectedYear} Transaction Summary
                </p>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">Starting Balance</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${monthlyReport.startingBalance.toFixed(2)}
              </p>
            </div>

            <div className="bg-white border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">Total Credits</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                +${monthlyReport.totalCredits.toFixed(2)}
              </p>
            </div>

            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-600">Total Debits</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                -${monthlyReport.totalDebits.toFixed(2)}
              </p>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">Ending Balance</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                ${monthlyReport.endingBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Net Change Indicator */}
          <div className={`rounded-lg p-4 ${
            monthlyReport.netChange >= 0 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              {monthlyReport.netChange >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${
                monthlyReport.netChange >= 0 ? 'text-green-800' : 'text-red-800'
              }`}>
                Net Change: {monthlyReport.netChange >= 0 ? '+' : ''}${monthlyReport.netChange.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">
                Transaction Details ({monthlyReport.transactions.length})
              </h4>
            </div>
            
            {monthlyReport.transactions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                <p className="text-gray-600">No transactions found for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyReport.transactions.map(transaction => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {simplifyTransactionDescription(transaction.description, { audience })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.method === 'cash'
                              ? 'bg-green-100 text-green-800'
                              : transaction.method === 'cheque'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.method === 'cash' ? 'Cash' : 
                             transaction.method === 'cheque' ? 'Cheque' : 
                             'Manual'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}