import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Plus, Eye, Search, Filter, Download, Wallet, Edit3 } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import ResidentForm from './ResidentForm';
import ResidentProfile from './ResidentProfile';
import TransactionForm from './TransactionForm';
import TransactionHistory from './TransactionHistory';
import BatchTransactionForm from './BatchTransactionForm';
import ServiceBatchHistory from './ServiceBatchHistory';
import CashBoxPage from './CashBoxPage';
import PreAuthDebitList from './PreAuthDebitList';
import DepositBatchForm from './DepositBatchForm';
import DepositBatchHistory from './DepositBatchHistory';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import OMInvoicesPage from './OMInvoicesPage';
import {
  getTotalTrustBalances
} from '../services/database';
import { getCashBoxTransactionsByDate } from '../services/cashbox-database';
import OmChatbot from './OmChatbot';
import ChatbotWidget from './ChatbotWidget';
import { supabase } from '../config/supabase';

export default function OMDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'residents' | 'batches' | 'cashbox' | 'preauth' | 'depositbatch' | 'invoices' | 'onlinepayments'>('overview');
  const [showChat, setShowChat] = useState(false);
  const [showAddResident, setShowAddResident] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [showBatchTransaction, setShowBatchTransaction] = useState(false);
  const [showDepositBatch, setShowDepositBatch] = useState(false);
  const [showResidentProfile, setShowResidentProfile] = useState(false);
  const [selectedResident, setSelectedResident] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [residentStatusFilter, setResidentStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  
  const { residents, transactions, getFacilityResidents, getFacilityTransactions, getTotalTrustBalance, getMonthlyCashBoxHistory, getMonthlyManualMoneyReport, getBatchReports, isLoading, getFacilityServiceBatches, getFacilityPreAuthDebits, getDepositBatches } = useData();
  const { user, logout, currentFacility } = useAuth();

  // Debug logging
  console.log('OMDashboard Debug:', {
    user,
    currentFacility,
    residentsCount: residents?.length,
    transactionsCount: transactions?.length,
    isLoading
  });

  const [totalBalances, setTotalBalances] = useState<number>(0);
  

  useEffect(() => {
    if (!currentFacility) return;

    const fetchBalance = async () => {
      
      try {
        const balance = await getTotalTrustBalance(currentFacility.id);
        setTotalBalances(balance);
      } catch (err) {
        console.error("Error fetching total trust balance:", err);
        setTotalBalances(0);
      
      }
    };

    fetchBalance();
  }, [currentFacility]);
 
  // Filter data by current facility
  const facilityResidents = currentFacility ? getFacilityResidents(currentFacility.id) : [];
  const facilityTransactions = currentFacility ? getFacilityTransactions(currentFacility.id) : [];
  const onlinePayments = facilityTransactions.filter(t => t.type === 'credit' && t.description?.startsWith('Online Payment'));
  
  // Total trust balance = resident balances + cash box balance (all part of bank trust account)
  const totalBalance = currentFacility ? getTotalTrustBalance(currentFacility.id) : 0;
  const activeResidents = facilityResidents.filter(r => r.status === 'active').length;
    const recentTransactions = facilityTransactions.slice(0, 5);

  // Selected month range helpers
  const [yearStr, monthStr] = selectedMonth.split('-');
  const selYear = parseInt(yearStr, 10);
  const selMonth = parseInt(monthStr, 10); // 1-12
  const monthStart = new Date(selYear, selMonth - 1, 1, 0, 0, 0);
  const monthEnd = new Date(selYear, selMonth, 0, 23, 59, 59);
  const monthLabel = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Monthly filtered data for UI sections
  const monthlyFacilityTransactions = facilityTransactions.filter(t => {
    const d = new Date(t.timestamp);
    return d >= monthStart && d <= monthEnd;
  });

  // Online payments this month (credits with description starting with 'Online Payment')
  const monthlyOnlinePayments = monthlyFacilityTransactions.filter(
    t => t.type === 'credit' && t.description?.startsWith('Online Payment')
  );
  const totalMonthlyOnlinePayments = monthlyOnlinePayments.reduce((sum, t) => sum + t.amount, 0);

  const [monthlyCashWithdrawalTotal, setMonthlyCashWithdrawalTotal] = useState<number>(0);
  const [accountsClosedByCheque, setAccountsClosedByCheque] = useState<Array<{ id: string; resident_id: string; amount: number; created_at: string }>>([]);

  useEffect(() => {
    const loadMonthlyCashboxAndClosures = async () => {
      if (!currentFacility) return;
      try {
        const startIso = monthStart.toISOString();
        const endIso = monthEnd.toISOString();

        // Cash Box: sum withdrawals from cash_box_transactions in month
        const cashTx = await getCashBoxTransactionsByDate(currentFacility.id, startIso, endIso);
        console.log("CashBox Transactions:", cashTx);
        const cashWithdrawals = cashTx.filter(t => t.transaction_type === 'withdrawal');
        setMonthlyCashWithdrawalTotal(cashTx.reduce((s, t) => s + Number(t.amount || 0), 0));

        // Accounts Closed by Cheque: from resident_withdrawals in month with method = 'cheque'
        const { data: rw, error } = await supabase
          .from('resident_withdrawals')
          .select('id,resident_id,amount,created_at')
          .eq('facility_id', currentFacility.id)
          .eq('method', 'cheque')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAccountsClosedByCheque(rw || []);
      } catch (e) {
        console.warn('Failed loading monthly cashbox/closures', e);
        
        setAccountsClosedByCheque([]);
      }
    };
    loadMonthlyCashboxAndClosures();
  }, [currentFacility?.id, selectedMonth]);

  const serviceTypeLabels: Record<string, string> = {
    haircare: 'Hair Care',
    footcare: 'Foot Care',
    pharmacy: 'Pharmacy',
    cable: 'Cable TV',
    wheelchairRepair: 'Wheelchair Repair',
    miscellaneous: 'Miscellaneous'
  };

  const postedServiceBatchesThisMonth = currentFacility
    ? getFacilityServiceBatches(currentFacility.id).filter(b => b.status === 'posted' && b.postedAt && (() => { const d = new Date(b.postedAt as string); return d >= monthStart && d <= monthEnd; })())
    : [];



  // Replaced by resident_withdrawals query in accountsClosedByCheque state

  const facilityPreAuths = currentFacility ? getFacilityPreAuthDebits(currentFacility.id) : [];
  const preAuthCreditsProcessed = facilityPreAuths.filter(d => d.type === 'credit' && d.status === 'processed' && d.processedAt && (() => { const dt = new Date(d.processedAt as string); return dt >= monthStart && dt <= monthEnd; })());
  const totalPreAuthCreditsProcessed = preAuthCreditsProcessed.reduce((s, d) => s + d.amount, 0);

  const processedDepositBatchesThisMonth = currentFacility
    ? getDepositBatches(currentFacility.id).filter(b => b.status === 'closed' && b.closedAt && (() => { const d = new Date(b.closedAt as string); return d >= monthStart && d <= monthEnd; })())
    : [];

  const generateMonthlyReport = () => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthlyDeposits = facilityTransactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      const currentDate = new Date();
      return t.type === 'credit' &&
             transactionDate.getMonth() === currentDate.getMonth() && 
             transactionDate.getFullYear() === currentDate.getFullYear();
    });
    
    const reportContent = [
      `Monthly Deposits Report - ${currentFacility?.name} - ${currentMonth}`,
      '',
      'SUMMARY:',
      `Total Residents: ${facilityResidents.length}`,
      `Total Trust Balance: $${totalBalance.toFixed(2)}`,
      `Deposits This Month: ${monthlyDeposits.length}`,
      `Total Deposits Amount: $${monthlyDeposits.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`,
      '',
      'DEPOSITS BY SERVICE:',
      'Date,Resident,Description,Type,Amount',
      ...monthlyDeposits.map(t => {
        const resident = facilityResidents.find(r => r.id === t.residentId);
        return `${new Date(t.timestamp).toLocaleDateString()},${resident?.name},${t.description},${t.type},$${t.amount.toFixed(2)}`;
      })
    ].join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_deposits_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateWithdrawalsReport = () => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthlyWithdrawals = facilityTransactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      const currentDate = new Date();
      return t.type === 'debit' &&
             transactionDate.getMonth() === currentDate.getMonth() && 
             transactionDate.getFullYear() === currentDate.getFullYear();
    });
    
    // Group by service type
    const serviceGroups = {
      'Hair Care': monthlyWithdrawals.filter(t => t.description.includes('Hair Care')),
      'Foot Care': monthlyWithdrawals.filter(t => t.description.includes('Foot Care')),
      'Pharmacy': monthlyWithdrawals.filter(t => t.description.includes('Pharmacy')),
      'Cable TV': monthlyWithdrawals.filter(t => t.description.includes('Cable')),
      'Wheelchair Repair': monthlyWithdrawals.filter(t => t.description.includes('Wheelchair')),
      'Other': monthlyWithdrawals.filter(t => !['Hair Care', 'Foot Care', 'Pharmacy', 'Cable', 'Wheelchair'].some(s => t.description.includes(s)))
    };
    
    const reportContent = [
      `Monthly Withdrawals Report - ${currentFacility?.name} - ${currentMonth}`,
      '',
      'SUMMARY:',
      `Total Withdrawals: ${monthlyWithdrawals.length}`,
      `Total Withdrawals Amount: $${monthlyWithdrawals.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`,
      '',
      'WITHDRAWALS BY SERVICE TYPE:',
      ...Object.entries(serviceGroups).map(([service, transactions]) => [
        `\n${service.toUpperCase()}:`,
        `Count: ${transactions.length}`,
        `Total: $${transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`,
        'Date,Resident,Description,Amount',
        ...transactions.map(t => {
          const resident = facilityResidents.find(r => r.id === t.residentId);
          return `${new Date(t.timestamp).toLocaleDateString()},${resident?.name},${t.description},$${t.amount.toFixed(2)}`;
        })
      ]).flat()
    ].join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_withdrawals_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCashBoxHistoryReport = () => {
    if (!currentFacility) return;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const monthlyHistory = getMonthlyCashBoxHistory(currentFacility.id);
    
    const reportContent = [
      `Cash Box History Report - ${currentFacility.name}`,
      `Generated: ${currentDate.toLocaleDateString()}`,
      '',
      'MONTHLY CASH BOX HISTORY:',
      ...monthlyHistory.map(history => [
        `\nMonth: ${history.month}/${history.year}`,
        `Starting Balance: $${history.startingBalance.toFixed(2)}`,
        `Ending Balance: $${history.endingBalance.toFixed(2)}`,
        `Reset Amount: $${history.resetAmount.toFixed(2)}`,
        `Reset Date: ${new Date(history.resetDate).toLocaleDateString()}`,
        `Reset By: ${history.resetBy}`,
        `Transactions Archived: ${history.transactions.length}`
      ]).flat()
    ].join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash_box_history_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateManualMoneyReport = () => {
    if (!currentFacility) return;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const manualEntries = getMonthlyManualMoneyReport(currentFacility.id, currentYear, currentMonth);
    
    const reportContent = [
      `Monthly Manual Money Report - ${currentFacility.name}`,
      `Month: ${currentMonth}/${currentYear}`,
      `Generated: ${currentDate.toLocaleDateString()}`,
      '',
      'MANUAL MONEY ADDITIONS BY OM:',
      `Total Entries: ${manualEntries.length}`,
      `Total Amount Added: $${manualEntries.reduce((sum, entry) => sum + (entry.type === 'cash_addition' ? entry.amount : 0), 0).toFixed(2)}`,
      '',
      'Entry Details:',
      'Date,Type,Amount,Description,Added By',
      ...manualEntries.map(entry => {
        return `${new Date(entry.timestamp).toLocaleDateString()},${entry.type},$${entry.amount.toFixed(2)},${entry.description},${entry.addedBy}`;
      })
    ].join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manual_money_report_${currentYear}_${currentMonth.toString().padStart(2, '0')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateBatchReportsArchive = () => {
    if (!currentFacility) return;
    
    const batchReports = getBatchReports(currentFacility.id);
    
    const reportContent = [
      `Batch Reports Archive - ${currentFacility.name}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      'SAVED BATCH REPORTS:',
      `Total Reports: ${batchReports.length}`,
      '',
      ...batchReports.map(report => [
        `\n--- BATCH REPORT ${report.batchId} ---`,
        `Service Type: ${report.serviceType}`,
        `Created: ${new Date(report.createdAt).toLocaleDateString()}`,
        `Created By: ${report.createdBy}`,
        '',
        report.reportContent,
        '\n' + '='.repeat(50)
      ]).flat()
    ].join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_reports_archive_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportTransactionHistory = () => {
    const csvContent = [
      ['Date', 'Resident', 'Description', 'Method', 'Type', 'Amount'].join(','),
      ...facilityTransactions.map(transaction => {
        const resident = facilityResidents.find(r => r.id === transaction.residentId);
        return [
          new Date(transaction.timestamp).toLocaleDateString(),
          resident?.name || '',
          transaction.description,
          transaction.method,
          transaction.type,
          transaction.amount.toFixed(2)
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateFacilityMonthlyReport = () => {
    if (!currentFacility) return;

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    const start = new Date(year, month - 1, 1, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59); // end of month

    const monthName = start.toLocaleString('default', { month: 'long', year: 'numeric' });

    const facResidents = getFacilityResidents(currentFacility.id);
    const facTransactions = getFacilityTransactions(currentFacility.id);

    const monthlyTransactions = facTransactions.filter(t => {
      const d = new Date(t.timestamp);
      return d >= start && d <= end;
    });

    const totalCredits = monthlyTransactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalDebits = monthlyTransactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const netChange = totalCredits - totalDebits;

    const endingBalance = getTotalTrustBalance(currentFacility.id);
    const openingBalance = endingBalance - netChange;

    // Cash box summary using cash transactions
    const cashTx = monthlyTransactions.filter(t => t.method === 'cash');
    const cashDeposits = cashTx.filter(t => t.type === 'credit');
    const cashWithdrawals = cashTx.filter(t => t.type === 'debit');
    const cashDepositsTotal = cashDeposits.reduce((s, t) => s + t.amount, 0);
    const cashWithdrawalsTotal = cashWithdrawals.reduce((s, t) => s + t.amount, 0);

    // Service batches
    const allServiceBatches = getFacilityServiceBatches(currentFacility.id);
    const serviceBatchesCreated = allServiceBatches.filter(b => {
      const d = new Date(b.createdAt);
      return d >= start && d <= end;
    });
    const serviceBatchesPosted = allServiceBatches.filter(b => b.postedAt && (() => { const d = new Date(b.postedAt!); return d >= start && d <= end; })());

    // Deposit batches
    const allDepositBatches = getDepositBatches(currentFacility.id);
    const depositBatchesCreated = allDepositBatches.filter(b => { const d = new Date(b.createdAt); return d >= start && d <= end; });
    const depositBatchesProcessed = allDepositBatches.filter(b => b.closedAt && (() => { const d = new Date(b.closedAt!); return d >= start && d <= end; })());

    // Pre-auth processed in month (by processedAt) and/or for target month
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const facilityPreAuths = getFacilityPreAuthDebits(currentFacility.id);
    const preauthProcessed = facilityPreAuths.filter(d => d.status === 'processed' && d.processedAt && (() => { const dt = new Date(d.processedAt!); return dt >= start && dt <= end; })());
    const preauthForMonthProcessed = facilityPreAuths.filter(d => d.targetMonth === ym && d.status === 'processed');

    // Build PDF
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let yPos = margin;

    const addText = (text: string, options: { fontSize?: number; fontWeight?: 'normal' | 'bold'; align?: 'left' | 'center' | 'right'; color?: [number, number, number]; lineHeight?: number } = {}) => {
      const { fontSize = 12, fontWeight = 'normal', align = 'left', color = [0, 0, 0], lineHeight = 18 } = options;
      doc.setFont('helvetica', fontWeight);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const x = align === 'center' ? pageWidth / 2 : (align === 'right' ? pageWidth - margin : margin);
      doc.text(text, x, yPos, { align });
      yPos += lineHeight;
    };

    // Header
    addText('MONTHLY FACILITY REPORT', { fontSize: 20, fontWeight: 'bold', align: 'center' });
    addText(`Facility: ${currentFacility.name}`, { fontSize: 12, align: 'center', color: [80, 80, 80] });
    addText(`Report Period: ${monthName}`, { fontSize: 12, align: 'center', color: [80, 80, 80] });
    yPos += 10;

    // Summary Box
    const boxX = margin;
    const boxY = yPos;
    const boxW = pageWidth - margin * 2;
    const boxH = 90;
    doc.setDrawColor(200);
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, 'FD');
    yPos += 20;
    addText(`Opening Balance: $${openingBalance.toFixed(2)}`, { fontSize: 12, fontWeight: 'bold' });
    addText(`Total Credits: +$${totalCredits.toFixed(2)}`);
    addText(`Total Debits: -$${totalDebits.toFixed(2)}`);
    addText(`Net Change: ${netChange >= 0 ? '+' : ''}$${netChange.toFixed(2)}`, { fontWeight: 'bold' });
    addText(`Closing Balance: $${(openingBalance + netChange).toFixed(2)}`, { fontWeight: 'bold' });
    yPos = boxY + boxH + 20;

    // Cash Box Summary
    addText('Cash Box Summary', { fontSize: 14, fontWeight: 'bold' });
    addText(`Cash Deposits: ${cashDeposits.length} • $${cashDepositsTotal.toFixed(2)}`);
    addText(`Cash Withdrawals: ${cashWithdrawals.length} • $${cashWithdrawalsTotal.toFixed(2)}`);
    yPos += 10;

    // Helper to add tables with title
    const addTable = (title: string, head: string[], body: any[][]) => {
      addText(title, { fontSize: 14, fontWeight: 'bold' });
      if (body.length === 0) {
        addText('None', { color: [100, 100, 100] });
        yPos += 10;
        return;
      }
      autoTable(doc, {
        startY: yPos,
        head: [head],
        body,
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        theme: 'grid',
        margin: { left: margin, right: margin },
      });
      // @ts-ignore - autotable adds this prop at runtime
      yPos = (doc as any).lastAutoTable.finalY + 20;
    };

    // Service Batches Created
    addTable(
      'Service Batches Created This Month',
      ['Date', 'Service', 'Status', 'Residents', 'Total Amount'],
      serviceBatchesCreated.map(b => [
        new Date(b.createdAt).toLocaleDateString(),
        b.serviceType,
        b.status.toUpperCase(),
        String(b.items.length),
        `$${b.totalAmount.toFixed(2)}`,
      ]),
    );

    // Service Batches Posted
    addTable(
      'Service Batches Posted This Month',
      ['Posted Date', 'Service', 'Residents', 'Total Amount'],
      serviceBatchesPosted.map(b => [
        b.postedAt ? new Date(b.postedAt).toLocaleDateString() : '',
        serviceTypeLabels[b.serviceType] || b.serviceType,
        String(b.items.length),
        `$${b.totalAmount.toFixed(2)}`,
      ]),
    );

    // Deposit Batches Created
    addTable(
      'Deposit Batches Created This Month',
      ['Date', 'Batch', 'Entries', 'Total', 'Cash', 'Cheques'],
      depositBatchesCreated.map(b => [
        new Date(b.createdAt).toLocaleDateString(),
        b.community_dbatch_number || b.id,
        String(b.entries.length),
        `$${b.totalAmount.toFixed(2)}`,
        `$${b.totalCash.toFixed(2)}`,
        `$${b.totalCheques.toFixed(2)}`,
      ]),
    );

    // Deposit Batches Processed
    addTable(
      'Deposit Batches Processed This Month',
      ['Processed Date', 'Batch', 'Entries', 'Total'],
      depositBatchesProcessed.map(b => [
        b.closedAt ? new Date(b.closedAt).toLocaleDateString() : '',
        b.community_dbatch_number || b.id,
        String(b.entries.length),
        `$${b.totalAmount.toFixed(2)}`,
      ]),
    );

    // Pre-Authorizations Processed
    addTable(
      'Pre-Authorizations Processed This Month',
      ['Processed Date', 'Resident', 'Type', 'Amount', 'Description'],
      preauthProcessed.map(a => {
        const res = facResidents.find(r => r.id === a.residentId);
        return [
          a.processedAt ? new Date(a.processedAt).toLocaleDateString() : '',
          res?.name || '',
          a.type.toUpperCase(),
          `$${a.amount.toFixed(2)}`,
          a.description,
        ];
      }),
    );

    // Footer
    if (yPos < pageHeight - 40) {
      yPos = pageHeight - 30;
    }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, yPos);
    doc.text('POA Trust Account Management System', pageWidth - margin, yPos, { align: 'right' });

    // Save
    const fileName = `facility_monthly_report_${currentFacility.name.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2, '0')}.pdf`;
    doc.save(fileName);
  };

  const downloadMonthlyOverviewReport = () => {
    if (!currentFacility) return;

    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let yPos = margin;

    const addText = (text: string, options: { fontSize?: number; fontWeight?: 'normal' | 'bold'; align?: 'left' | 'center' | 'right'; color?: [number, number, number]; lineHeight?: number } = {}) => {
      const { fontSize = 12, fontWeight = 'normal', align = 'left', color = [0, 0, 0], lineHeight = 18 } = options;
      doc.setFont('helvetica', fontWeight);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const x = align === 'center' ? pageWidth / 2 : (align === 'right' ? pageWidth - margin : margin);
      doc.text(text, x, yPos, { align });
      yPos += lineHeight;
    };

    // Header
    addText('MONTHLY OVERVIEW REPORT', { fontSize: 20, fontWeight: 'bold', align: 'center' });
    addText(`Facility: ${currentFacility.name}`, { fontSize: 12, align: 'center', color: [80, 80, 80] });
    addText(`Report Period: ${monthLabel}`, { fontSize: 12, align: 'center', color: [80, 80, 80] });
    yPos += 10;

    // Withdrawals section
    addText('Withdrawals', { fontSize: 14, fontWeight: 'bold' });
    addText(`Total Cash Withdrawals: $${monthlyCashWithdrawalTotal.toFixed(2)}`);
    yPos += 6;
    // Posted Service Batches with Cheque #
    addText('Posted Service Batches', { fontSize: 12, fontWeight: 'bold' });
    if (postedServiceBatchesThisMonth.length === 0) {
      addText('None', { color: [100, 100, 100] });
      yPos += 10;
    } else {
      autoTable(doc, {
        startY: yPos,
        head: [[ 'Type', 'Batch No', 'Amount', 'Cheque #' ]],
        body: postedServiceBatchesThisMonth.map((b: any) => [
          serviceTypeLabels[b.serviceType] || b.serviceType,
          (b.service_batch_no ?? b.id) as string,
          `$${Number(b.totalAmount || 0).toFixed(2)}`,
          (b.cheque_number || '-')
        ]),
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        theme: 'grid',
        margin: { left: margin, right: margin },
      });
      // @ts-ignore
      yPos = (doc as any).lastAutoTable.finalY + 20;
    }

    // Accounts Closed by Cheque
    addText('Accounts Closed by Cheque', { fontSize: 12, fontWeight: 'bold' });
    if (accountsClosedByCheque.length === 0) {
      addText('None', { color: [100, 100, 100] });
      yPos += 10;
    } else {
      autoTable(doc, {
        startY: yPos,
        head: [[ 'Resident', 'Date', 'Amount' ]],
        body: accountsClosedByCheque.map(t => {
          const resident = facilityResidents.find(r => r.id === t.resident_id);
          return [
            resident?.name || 'Resident',
            new Date(t.created_at).toLocaleDateString(),
            `$${Number(t.amount || 0).toFixed(2)}`
          ];
        }),
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        theme: 'grid',
        margin: { left: margin, right: margin },
      });
      // @ts-ignore
      yPos = (doc as any).lastAutoTable.finalY + 20;
    }

    // Credits section
    addText('Credits', { fontSize: 14, fontWeight: 'bold' });
    addText(`Pre-Auth Credits Processed: $${totalPreAuthCreditsProcessed.toFixed(2)} (Count: ${preAuthCreditsProcessed.length})`);
    yPos += 6;

    // Online Payments Received
    addText('Online Payments Received', { fontSize: 12, fontWeight: 'bold' });
    addText(`Total Online Payments: $${totalMonthlyOnlinePayments.toFixed(2)} (Count: ${monthlyOnlinePayments.length})`);
    if (monthlyOnlinePayments.length === 0) {
      addText('None', { color: [100, 100, 100] });
      yPos += 10;
    } else {
      autoTable(doc, {
        startY: yPos,
        head: [[ 'Date', 'Resident', 'Amount', 'Description' ]],
        body: monthlyOnlinePayments.map((t: any) => {
          const resident = facilityResidents.find(r => r.id === t.residentId);
          return [
            new Date(t.timestamp).toLocaleDateString(),
            resident?.name || '',
            `$${Number(t.amount || 0).toFixed(2)}`,
            t.description || ''
          ];
        }),
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        theme: 'grid',
        margin: { left: margin, right: margin },
      });
      // @ts-ignore
      yPos = (doc as any).lastAutoTable.finalY + 20;
    }

    // Processed Deposit Batches
    addText('Processed Deposit Batches', { fontSize: 12, fontWeight: 'bold' });
    if (processedDepositBatchesThisMonth.length === 0) {
      addText('None', { color: [100, 100, 100] });
      yPos += 10;
    } else {
      autoTable(doc, {
        startY: yPos,
        head: [[ 'Batch', 'Processed', 'Total', 'Cash', 'Cheques' ]],
        body: processedDepositBatchesThisMonth.map((b: any) => [
          b.community_dbatch_number || b.id,
          b.closedAt ? new Date(b.closedAt).toLocaleDateString() : '',
          `$${Number(b.totalAmount || 0).toFixed(2)}`,
          `$${Number(b.totalCash || 0).toFixed(2)}`,
          `$${Number(b.totalCheques || 0).toFixed(2)}`
        ]),
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        theme: 'grid',
        margin: { left: margin, right: margin },
      });
      // @ts-ignore
      yPos = (doc as any).lastAutoTable.finalY + 20;
    }

    // Footer
    if (yPos < pageHeight - 40) {
      yPos = pageHeight - 30;
    }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, yPos);
    doc.text('POA Trust Account Management System', pageWidth - margin, yPos, { align: 'right' });

    const [yearStr, monthStr] = selectedMonth.split('-');
    const fileName = `monthly_overview_${currentFacility.name.replace(/\s+/g, '_')}_${yearStr}_${monthStr}.pdf`;
    doc.save(fileName);
  };

  const filteredResidents = facilityResidents
    .filter(r => residentStatusFilter === 'all' ? true : r.status === residentStatusFilter)
    .filter(resident =>
      resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.ltcUnit?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show error if no facility
  if (!currentFacility) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Facility Assigned</h1>
          <p className="text-gray-600">Please contact your administrator to assign you to a facility.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Office Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.name}
            </p>
            {currentFacility && (
              <p className="text-blue-600 font-semibold mt-1 text-lg">
                📍 {currentFacility.name}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddResident(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resident</span>
            </button>
            <button
              onClick={logout}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
                     {[
             { key: 'overview', label: 'Overview' },
             { key: 'residents', label: 'Residents' },
             { key: 'preauth', label: 'Pre-Auth Debits' },
             { key: 'depositbatch', label: 'Deposit Batch' },
             { key: 'invoices', label: 'Invoices' },
             { key: 'batches', label: 'Service Batches' },
             { key: 'cashbox', label: 'Cash Box' },
             { key: 'onlinepayments', label: 'Online Payments' }
           ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeView === tab.key
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6">
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Facility Info Banner */}
            {currentFacility && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Managing: {currentFacility.name}</h2>
                    <p className="text-blue-100 text-sm">{currentFacility.address}</p>
                    <p className="text-blue-100 text-sm">{currentFacility.phone} • {currentFacility.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Community Status</p>
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 mt-1">
                      {currentFacility.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total Trust Balance (Bank + Cash Box)"
                value={`$${totalBalance.toFixed(2)}`}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Active Residents"
                value={activeResidents}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Recent Transactions"
                value={recentTransactions.length}
                icon={Eye}
                color="purple"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                 <button
                  onClick={() => setActiveView('preauth')}
                  className="flex flex-col items-center p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors group"
                >
                  <Edit3 className="w-8 h-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Pre-Auth Debits</span>
                  <span className="text-xs text-gray-500 text-center mt-1">Monthly authorizations</span>
                </button>
                
                <button
                  onClick={() => setActiveView('depositbatch')}
                  className="flex flex-col items-center p-4 border border-green-200 rounded-lg hover:bg-green-50 transition-colors group"
                >
                  <DollarSign className="w-8 h-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Deposit Batch</span>
                  <span className="text-xs text-gray-500 text-center mt-1">Create multiple deposits</span>
                </button>

                 <button
                  onClick={() => setActiveView('invoices')}
                  className="flex flex-col items-center p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors group"
                >
                  <Wallet className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Invoice</span>
                  <span className="text-xs text-gray-500 text-center mt-1">Manage Invoices</span>
                </button>

                <button
                  onClick={() => setActiveView('batches')}
                  className="flex flex-col items-center p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors group"
                >
                  <Users className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Service Batch</span>
                  <span className="text-xs text-gray-500 text-center mt-1">Multiple residents</span>
                </button>
                
        

                <button
                  onClick={() => setActiveView('cashbox')}
                  className="flex flex-col items-center p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors group"
                >
                  <Wallet className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Cash Box</span>
                  <span className="text-xs text-gray-500 text-center mt-1">Manage cash flow</span>
                </button>

               
              </div>
            </div>


            {/* Monthly Report Sections */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-md font-semibold text-gray-900">Monthly Report • {monthLabel}</h3>
                  <p className="text-gray-500 text-sm">Withdrawals and Credits overview for the selected month</p>
                </div>
               <div className="flex items-center space-x-3">
                 <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-2 border border-gray-400 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  <button
                    onClick={downloadMonthlyOverviewReport}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
               </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Withdrawals Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Withdrawals</h4>
                  <div className="rounded-lg border border-gray-200 p-4 mb-4">
                    <div className="text-sm text-gray-600">Total Cash Withdrawals</div>
                    <div className="text-2xl font-bold text-red-600">${monthlyCashWithdrawalTotal.toFixed(2)}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Posted Service Batches</div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full table-auto text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Type</th>
                            <th className="px-3 py-2 text-left text-gray-600">Batch No</th>
                            <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                            <th className="px-3 py-2 text-left text-gray-600">Cheque #</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {postedServiceBatchesThisMonth.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-gray-500" colSpan={4}>None</td>
                            </tr>
                          ) : (
                            postedServiceBatchesThisMonth.map((b: any) => {
                              const batchNo = (b.service_batch_no ?? b.id) as string;
                              const typeLabel = serviceTypeLabels[b.serviceType] || b.serviceType;
                              return (
                                <tr key={b.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-900">{typeLabel}</td>
                                  <td className="px-3 py-2 text-gray-900">{batchNo}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900">${Number(b.totalAmount || 0).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-gray-900">{b.cheque_number || '-'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Accounts Closed by Cheque</div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full table-auto text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Resident</th>
                            <th className="px-3 py-2 text-left text-gray-600">Date</th>
                            <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {accountsClosedByCheque.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-gray-500" colSpan={3}>None</td>
                            </tr>
                          ) : (
                            accountsClosedByCheque.map(t => {
                              const resident = facilityResidents.find(r => r.id === t.resident_id);
                              return (
                                <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-900">{resident?.name || 'Resident'}</td>
                                  <td className="px-3 py-2 text-gray-900">{new Date(t.created_at).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900">${Number(t.amount || 0).toFixed(2)}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Credits Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Credits</h4>
                  <div className="rounded-lg border border-gray-200 p-4 mb-4">
                    <div className="text-sm text-gray-600">Pre-Auth Credits Processed</div>
                    <div className="text-2xl font-bold text-green-600">${totalPreAuthCreditsProcessed.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Count: {preAuthCreditsProcessed.length}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 mb-4">
                    <div className="text-sm text-gray-600">Online Payments Received</div>
                    <div className="text-2xl font-bold text-green-600">${totalMonthlyOnlinePayments.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Count: {monthlyOnlinePayments.length}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Processed Deposit Batches</div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full table-auto text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Batch</th>
                            <th className="px-3 py-2 text-left text-gray-600">Processed</th>
                            <th className="px-3 py-2 text-right text-gray-600">Total</th>
                            <th className="px-3 py-2 text-right text-gray-600">Cash</th>
                            <th className="px-3 py-2 text-right text-gray-600">Cheques</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {processedDepositBatchesThisMonth.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-gray-500" colSpan={5}>None</td>
                            </tr>
                          ) : (
                            processedDepositBatchesThisMonth.map((b: any) => (
                              <tr key={b.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{b.community_dbatch_number || b.id}</td>
                                <td className="px-3 py-2 text-gray-900">{b.closedAt ? new Date(b.closedAt).toLocaleDateString() : ''}</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-900">${Number(b.totalAmount || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-gray-900">${Number(b.totalCash || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-gray-900">${Number(b.totalCheques || 0).toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
          
          </div>
        )}

        {activeView === 'residents' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search residents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={residentStatusFilter}
                    onChange={(e) => setResidentStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Residents List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Residents ({residentStatusFilter[0].toUpperCase() + residentStatusFilter.slice(1)})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resident Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResidents.map(resident => (
                      <tr key={resident.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{resident.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{resident.ltcUnit || 'Not specified'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-green-600">
                            ${resident.trustBalance.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${resident.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {resident.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedResident(resident.id);
                              setShowResidentProfile(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'batches' && (
          <ServiceBatchHistory onBack={() => setActiveView('overview')} />
        )}

        {activeView === 'cashbox' && (
          <CashBoxPage onBack={() => setActiveView('overview')} />
        )}

        {activeView === 'preauth' && (
          <PreAuthDebitList />
        )}

        {activeView === 'depositbatch' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Deposit Batch Management</h2>
                  <p className="text-gray-600 mt-1">Create deposit batches with individual cash and cheque entries</p>
                </div>
                <button
                  onClick={() => setShowDepositBatch(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Deposit Batch</span>
                </button>
              </div>

              <DepositBatchHistory />
            </div>

          </div>
        )}

        {activeView === 'invoices' && (
          <OMInvoicesPage />
        )}

        

        {activeView === 'onlinepayments' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Online Payments</h2>
              <div className="flex items-center space-x-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-400 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    const [y, m] = selectedMonth.split('-');
                    const start = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1, 0, 0, 0);
                    const end = new Date(parseInt(y, 10), parseInt(m, 10), 0, 23, 59, 59);
                    const monthly = onlinePayments.filter(t => {
                      const d = new Date(t.timestamp);
                      return d >= start && d <= end;
                    });

                    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' });
                    const margin = 40;
                    const pageWidth = doc.internal.pageSize.getWidth();

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    const title = `Online Payments - ${currentFacility?.name || ''}`;
                    doc.text(title, margin, 50);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(11);
                    const sub = `${start.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                    doc.text(sub, margin, 70);

                    const total = monthly.reduce((s, t) => s + t.amount, 0);
                    doc.setFontSize(10);
                    doc.text(`Total: $${total.toFixed(2)}  (Count: ${monthly.length})`, pageWidth - margin, 70, { align: 'right' });

                    autoTable(doc, {
                      startY: 90,
                      head: [[ 'Date', 'Resident', 'Description', 'Amount' ]],
                      body: monthly.map((p: any) => {
                        const resident = facilityResidents.find(r => r.id === p.residentId);
                        return [
                          new Date(p.timestamp).toLocaleDateString(),
                          resident?.name || '',
                          p.description || '',
                          `$${Number(p.amount || 0).toFixed(2)}`
                        ];
                      }),
                      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
                      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
                      theme: 'grid',
                      margin: { left: margin, right: margin },
                    });

                    const fileName = (() => {
                      const [yy, mm] = selectedMonth.split('-');
                      return `online_payments_${currentFacility?.name?.replace(/\s+/g, '_') || 'facility'}_${yy}_${mm}.pdf`;
                    })();
                    doc.save(fileName);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download Month
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Print
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left text-gray-600">Resident</th>
                    <th className="px-3 py-2 text-left text-gray-600">Description</th>
                    <th className="px-3 py-2 text-right text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(() => {
                    const [y, m] = selectedMonth.split('-');
                    const start = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1, 0, 0, 0);
                    const end = new Date(parseInt(y, 10), parseInt(m, 10), 0, 23, 59, 59);
                    const monthly = onlinePayments.filter(t => {
                      const d = new Date(t.timestamp);
                      return d >= start && d <= end;
                    });
                    return monthly.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={4}>No online payments recorded for this period</td>
                    </tr>
                  ) : (
                      monthly.map(p => {
                        const resident = facilityResidents.find(r => r.id === p.residentId);
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">{new Date(p.timestamp).toLocaleDateString()}</td>
                            <td className="px-3 py-2 text-gray-900">{resident?.name || ''}</td>
                            <td className="px-3 py-2 text-gray-900">{p.description}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">${p.amount.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>


      {/* Chat Popup */}
      {showChat && (
        <div className="fixed bottom-20 right-6 bg-white border border-gray-200 rounded-lg shadow-2xl" style={{ width: 380, maxWidth: '90vw' }}>
          <ChatbotWidget />
        </div>
      )}

      {/* Modals */}
      {showAddResident && (
        <ResidentForm onClose={() => setShowAddResident(false)} />
      )}

      {showResidentProfile && selectedResident && (
        <ResidentProfile 
          resident={facilityResidents.find(r => r.id === selectedResident)!}
          onClose={() => {
            setShowResidentProfile(false);
            setSelectedResident('');
          }}
        />
      )}

      {showTransaction && selectedResident && (
        <TransactionForm 
          residentId={selectedResident}
          initialType={transactionType}
          onClose={() => {
            setShowTransaction(false);
            setSelectedResident('');
          }}
        />
      )}

      {showBatchTransaction && (
        <BatchTransactionForm onClose={() => setShowBatchTransaction(false)} />
      )}

      {showDepositBatch && (
        <DepositBatchForm onClose={() => setShowDepositBatch(false)} />
      )}
    </div>
  );
}