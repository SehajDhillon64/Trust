import { supabase } from '../config/supabase';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, DollarSign, Wallet, History, Printer, X, RefreshCw, Download } from 'lucide-react';
import ResidentSearch from './ResidentSearch';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { createClient } from '@supabase/supabase-js';

import autoTable from "jspdf-autotable";

import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContextSupabase';
import {
  getCashBoxBalance,
  processCashBoxTransaction,
  resetCashBoxMonthly,
  
  subscribeToCashBoxBalance,
  subscribeToCashBoxTransactions,
  getMonthlyCashBoxHistory,
  initializeCashBoxBalance,
  CashBoxTransaction
} from '../services/cashbox-database';



interface CashBoxPageProps {
  onBack: () => void;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);



export default function CashBoxPage({ onBack }: CashBoxPageProps) {
  const { user, currentFacility } = useAuth();
  const { residents, generateUniqueCode, updateResident } = useData();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CashBoxTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [monthlyTransactions, setMonthlyTransactions] = useState<any[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(false);

  // Report section state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Fetch monthly transactions on month/year change
  useEffect(() => {
    const fetchMonthlyTransactions = async () => {
      if (!currentFacility) return;
      const { data, error } = await supabase.rpc('get_cash_box_transactions_by_month_year', {
        p_facility_id: currentFacility.id,
        p_month: selectedMonth + 1,
        p_year: selectedYear
      });
      setMonthlyTransactions(data as any[]);
      setLoadingMonthly(false);
    };

    fetchMonthlyTransactions();
  }, [selectedMonth, selectedYear, currentFacility]);


  // Load initial data
  useEffect(() => {
    if (!currentFacility || !user) return;

    const loadCashBoxData = async () => {
      setLoading(true);
      // First, ensure cash box balance is initialized
      const initResult = await initializeCashBoxBalance(currentFacility.id, user.id);
      if (!initResult.success) {
        console.error('Failed to initialize cash box balance:', initResult.error);
      }
      // Now load the balance
      const currentBalance = await getCashBoxBalance(currentFacility.id);
      setBalance(currentBalance);
      setLoading(false);
    };
    loadCashBoxData();

    // Subscribe to balance changes
    const balanceSub = subscribeToCashBoxBalance(currentFacility.id ,(newBalance) => {
      setBalance(newBalance);
    });

    // Subscribe to new cash box transactions and refresh lists in real time
    const txSub = subscribeToCashBoxTransactions(currentFacility.id, async () => {
      const [latestTxns, monthly] = await Promise.all([
        supabase.rpc('get_cash_box_transactions_by_month_year', {
          p_facility_id: currentFacility.id,
          p_month: selectedMonth + 1,
          p_year: selectedYear
        })
      ]);
      setTransactions(latestTxns as any);
      if ((monthly as any).data) {
        setMonthlyTransactions((monthly as any).data);
      }
    });
  
    return () => {
      balanceSub.unsubscribe();
      txSub.unsubscribe();
    };
  }, [currentFacility, user, selectedMonth, selectedYear]);
    
  
  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFacility || !user || isProcessing) return;

    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (transactionType === 'withdrawal' && transactionAmount > balance) {
      alert('Insufficient funds in cash box');
      return;
    }

    setIsProcessing(true);

    try {
      const transactionId = generateUniqueCode('CBT');
      const result = await processCashBoxTransaction(
        currentFacility.id,
        transactionType,
        transactionAmount,
        description || `Cash Box ${transactionType}`,
        selectedResidentId || null,
        user.id,
        transactionId
      );

      if (result.success) {
        // Update balance
        if (result.balance !== undefined) {
          setBalance(result.balance);
        }

        // Update resident trust balance if a resident was selected
        if (selectedResidentId) {
          const r = residents.find(r => r.id === selectedResidentId);
          if (r) {
            const delta = transactionType === 'deposit' ? transactionAmount : -transactionAmount;
            const newBal = Number(r.trustBalance || 0) + delta;
            try {
              await updateResident(selectedResidentId, { trustBalance: newBal });
            } catch (err) {
              console.warn('Failed to update resident trust balance after cash box transaction:', err);
            }
          }
        }

        // Also refresh the monthlyTransactions immediately
        const { data: monthlyData } = await supabase.rpc('get_cash_box_transactions_by_month_year', {
          p_facility_id: currentFacility.id,
          p_month: selectedMonth + 1,
          p_year: selectedYear
        });
        if (monthlyData) {
          setMonthlyTransactions(monthlyData as any[]);
        }

        // Show receipt (prefer RPC-returned transaction; fallback to find by id in monthly data)
        let receiptTx: any = (result as any).transaction || null;
        if (!receiptTx && Array.isArray(monthlyData)) {
          receiptTx = (monthlyData as any[]).find((t: any) => t.transaction_id === transactionId) || null;
        }
        if (receiptTx) {
          setLastTransaction(receiptTx);
          setShowReceipt(true);
          // Automatically print the receipt for the new transaction
          printReceipt(receiptTx);
        }

        // Reset form
        setAmount('');
        setDescription('');
        setSelectedResidentId('');
      } else {
        alert(result.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      alert('An error occurred while processing the transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateReceiptHTML = (transaction: CashBoxTransaction) => {
    return `
      <html>
        <head>
          <title>Cash Box Receipt</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            html, body { height: 100%; }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            h2 { text-align: center; margin-bottom: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin: 20px 0; }
            .details p { margin: 10px 0; }
            .amount {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px dashed #000;
            }
            @media print {
              @page { margin: 10mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>CASH BOX RECEIPT</h2>
            ${currentFacility?.name ? `<p style="font-weight:bold; margin-top:4px;">${currentFacility.name}</p>` : ''}
          </div>
          <div class="details">
            <p><strong>Date:</strong> ${new Date(transaction.created_at).toLocaleString()}</p>
            <p><strong>Transaction ID:</strong> ${transaction.transaction_id || transaction.id}</p>
            <p><strong>Type:</strong> ${(transaction.transaction_type || '').toString().toUpperCase()}</p>
            ${transaction.resident_name ? `<p><strong>Resident:</strong> ${transaction.resident_name}</p>` : ''}
            <p><strong>Description:</strong> ${transaction.description}</p>
          </div>
          <div class="amount">
            $${Number(transaction.amount ?? 0).toFixed(2)}
          </div>
          <div class="footer">
            <p><strong>Cash Box Balance:</strong> $${Number(transaction.balance_after ?? 0).toFixed(2)}</p>
            <p><strong>Processed By:</strong> ${transaction.created_by_name || ''}</p>
          </div>
                            <script>
            setTimeout(function() {
              try { window.focus(); } catch (e) {}
              try { window.print(); } catch (e) {}
            }, 150);
          </script>
        </body>
      </html>
     `;
   };

  const printReceipt = async (tx?: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let transaction: CashBoxTransaction | null = null;
    if (tx) {
      if (typeof tx === 'string') {
        transaction = (monthlyTransactions as any[]).find(t => t.id === tx || t.transaction_id === tx)
          || transactions.find(t => t.id === tx || t.transaction_id === tx) || null;
      } else {
        transaction = tx as CashBoxTransaction;
      }
    } else {
      transaction = lastTransaction;
    }

    if (!transaction) {
      printWindow.close();
      return;
    }

    const receiptHTML = generateReceiptHTML(transaction as CashBoxTransaction);
    printWindow.document.open();
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const handleReset = async () => {
    if (!currentFacility || !user) return;

    const confirmMessage = `This will:
• Reset the cash box to $2500.00
• Archive all current month transactions
• Generate a monthly report

Are you sure you want to continue?`;

    if (!confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      const result = await resetCashBoxMonthly(currentFacility.id, user.id);
      
      if (result.success) {
        // Generate report
        await generateMonthlyReport();
        
        // Update balance
        setBalance(2500.00);
        
        // Clear current month transactions
        alert('Cash box has been reset to $2500.00. Monthly report has been generated.');
      } else {
        alert(result.error || 'Failed to reset cash box');
      }
    } catch (error) {
      console.error('Reset error:', error);
      alert('An error occurred while resetting the cash box');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMonthlyReport = async () => {
    if (!currentFacility) return;

    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    
    // Get monthly history
    const history = await getMonthlyCashBoxHistory(currentFacility.id, year, now.getMonth() + 1);
    const monthData = history[0];

    const reportContent = `
MONTHLY CASH BOX REPORT
=======================
Facility: ${currentFacility.name}
Month: ${monthName} ${year}
Generated: ${now.toLocaleString()}

SUMMARY
-------
Starting Balance: $2,500.00
Ending Balance: $${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Net Change: $${(balance - 2500).toLocaleString('en-US', { minimumFractionDigits: 2 })}

Total Withdrawals: $${monthData?.total_withdrawals?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
Total Deposits: $${monthData?.total_deposits?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
Transaction Count: ${monthData?.transaction_count || 0}

TRANSACTION HISTORY
------------------
${transactions.map(t => `
${new Date(t.created_at).toLocaleDateString()} ${new Date(t.created_at).toLocaleTimeString()}
${t.transaction_type.toUpperCase()}: $${t.amount.toFixed(2)}
Resident: ${t.resident_name || 'N/A'}
Description: ${t.description}
Balance After: $${t.balance_after.toFixed(2)}
Processed By: ${t.created_by_name}
`).join('\n')}

End of Report
    `.trim();

    // Download as text file
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash_box_report_${year}_${(now.getMonth() + 1).toString().padStart(2, '0')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Form state
  const [transactionType, setTransactionType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  
  // Modal state
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<CashBoxTransaction | null>(null);

  // Get facility residents (active only)
  const facilityResidents = currentFacility
    ? residents.filter(r => r.facilityId === currentFacility.id && r.status === 'active')
    : [];

  const downloadPDF = () => {
    const doc = new jsPDF();
  
    const title = `Cash Box Transactions - ${months[selectedMonth]} ${selectedYear}`;
    doc.setFontSize(16);
    if (currentFacility?.name) {
      doc.setFontSize(12);
      doc.text(String(currentFacility.name), doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
    }
    doc.setFontSize(16);
    doc.text(title, 14, 28);
  
    if (monthlyTransactions.length === 0) {
      doc.setFontSize(12);
      doc.text("No transactions available for this month.", 14, 38);
    } else {
      const tableData = monthlyTransactions.map((txn: any, index: number) => [
        index + 1,
        txn.transaction_type?.toUpperCase(),
        txn.amount.toFixed(2),
        txn.resident_name || 'N/A',
        txn.description,
        new Date(txn.created_at).toLocaleDateString(),
        txn.created_by_name || 'N/A',
      ]);
  
      autoTable(doc, {
        head: [["#", "Type", "Amount", "Resident", "Description", "Date", "Processed By"]],
        body: tableData,
        startY: 38,
      });
    }
  
    doc.save(`transactions_${months[selectedMonth]}_${selectedYear}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  return (
    <div className="space-y-6 text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Box Management</h1>
            <p className="text-gray-900">Manage physical cash transactions</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          disabled={isProcessing}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset to $2500 (Month End)</span>
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Balance</h2>
              
              <p className="text-3xl font-bold text-green-600">
                ${balance}
              </p>
              
            </div>
          </div>
          <button
            onClick={generateMonthlyReport}
            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Download Report</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Cash Box Transactions Report</h1>

        <div className="flex gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="p-2 border border-gray-400 rounded text-gray-900"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="p-2 border border-gray-400 rounded text-gray-900"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={downloadPDF}
            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Download PDF</span>
          </button>
        </div>

        {loading ? (
          <p>Loading transactions...</p>
        ) : (
          <table className="w-full table-auto border mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Resident Name</th>
                <th className="border px-4 py-2">Description</th>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Amount</th>
                <th className="border px-4 py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTransactions.map((tx, idx) => (
                <tr key={idx}>
                  <td className="border px-4 py-2">{tx.resident_name}</td>
                  <td className="border px-4 py-2">{tx.description}</td>
                  <td className="border px-4 py-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">${Number(tx.amount ?? 0).toFixed(2)}</td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => printReceipt(tx)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 inline-flex items-center space-x-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Transaction</h2>
          
          <form onSubmit={handleTransaction} className="space-y-4">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionType('withdrawal')}
                  className={`p-3 border-2 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                    transactionType === 'withdrawal'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span>Withdrawal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('deposit')}
                  className={`p-3 border-2 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                    transactionType === 'deposit'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Deposit</span>
                </button>
              </div>
            </div>

            {/* Resident Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Resident (Optional)
              </label>
              <ResidentSearch
                residents={facilityResidents}
                value={selectedResidentId}
                onChange={setSelectedResidentId}
                placeholder="Search resident..."
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="number"
                          step="0.01"
                          min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter transaction description..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                transactionType === 'withdrawal'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isProcessing ? 'Processing...' : `Process ${transactionType === 'withdrawal' ? 'Withdrawal' : 'Deposit'}`}
            </button>
          </form>
        </div>

      
      </div>

       {/* Receipt Modal */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-gray-900">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Transaction Complete</h2>
              <button
                onClick={() => setShowReceipt(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  {lastTransaction.transaction_type === 'withdrawal' ? 'Withdrawal' : 'Deposit'} Complete
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  ${lastTransaction.amount.toFixed(2)}
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><strong>Transaction ID:</strong> {lastTransaction.transaction_id}</p>
                {lastTransaction.resident_name && (
                  <p><strong>Resident:</strong> {lastTransaction.resident_name}</p>
                )}
                <p><strong>Description:</strong> {lastTransaction.description}</p>
                <p><strong>New Balance:</strong> ${lastTransaction.balance_after.toFixed(2)}</p>
                <p><strong>Date:</strong> {new Date(lastTransaction.created_at).toLocaleString()}</p>
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
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 border border-gray-300 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
    </div>
  );
}

