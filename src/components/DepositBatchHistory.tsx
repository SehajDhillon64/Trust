import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle, Calendar, DollarSign, Pencil, Printer, Trash2, Search } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import EditDepositBatchModal from './EditDepositBatchModal';

export default function DepositBatchHistory() {
  const { getDepositBatches, closeDepositBatch, closeDepositBatchRemote, residents, deleteOpenDepositBatch } = useData();
  const { currentFacility } = useAuth();

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [printingBatchId, setPrintingBatchId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed'>('open');
  const [batchSearch, setBatchSearch] = useState('');

  const batches = useMemo(() => {
    if (!currentFacility) return { open: [], closed: [] } as const;
    const all = getDepositBatches(currentFacility.id);
    return {
      open: all.filter(b => b.status === 'open'),
      closed: all.filter(b => b.status === 'closed')
    } as const;
  }, [currentFacility?.id, getDepositBatches]);

  const getResidentName = (residentId: string) => {
    const r = residents.find(x => x.id === residentId);
    return r?.name || 'Unknown Resident';
  };

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '');

  const handleProcess = async (batchId: string) => {
    if (!confirm('Process this deposit batch? This will add funds to all listed resident accounts.')) return;
    const result = closeDepositBatchRemote
      ? await closeDepositBatchRemote(batchId)
      : await closeDepositBatch(batchId);
    if (!result.success) {
      alert(`Failed to process batch: ${result.error}`);
    } else {
      alert('Batch processed successfully');
    }
  };

  if (!currentFacility) return null;

  const editingBatch = editingBatchId ? batches.open.find(b => b.id === editingBatchId) || null : null;
  
  const filteredOpen = batches.open.filter(b =>
    batchSearch.trim() === ''
      ? true
      : String(b.community_dbatch_number || b.id).toLowerCase().includes(batchSearch.trim().toLowerCase())
  );
  const filteredClosed = batches.closed.filter(b =>
    batchSearch.trim() === ''
      ? true
      : String(b.community_dbatch_number || b.id).toLowerCase().includes(batchSearch.trim().toLowerCase())
  );

  return (
    <div className="space-y-6 text-gray-900">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {statusFilter === 'open' ? 'Open' : 'Processed'} Deposit Batches
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900" />
              <input
                type="text"
                placeholder="Search by batch no..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-56 pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'open' | 'closed')}
              className="border border-gray-400 rounded-lg py-2 px-3 text-sm text-gray-900"
            >
              <option value="open">Open</option>
              <option value="closed">Processed</option>
            </select>
          </div>
        </div>
        {statusFilter === 'open' ? (
          filteredOpen.length === 0 ? (
            <div className="text-center py-10 text-gray-900">No open deposit batches</div>
          ) : (
            <div className="divide-y divide-gray-200">
              <table className="w-full table-auto border mt-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2">Batch</th>
                    <th className="border px-4 py-2">Cheque</th>
                    <th className="border px-4 py-2">Cash</th>
                    <th className="border px-4 py-2">Edit</th>
                    <th className="border px-4 py-2">Delete</th>
                    <th className="border px-4 py-2">Process</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpen.map(batch => (
                    <tr key={batch.id}>
                      <td className="border px-4 py-2">{batch.community_dbatch_number}</td>
                      <td className="border px-4 py-2">${batch.totalCheques.toFixed(2)}</td>
                      <td className="border px-4 py-2">${batch.totalCash.toFixed(2)}</td>
                      <td className="border px-4 py-2">
                        <button
                          onClick={() => setEditingBatchId(batch.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="border px-4 py-2">
                        {deleteOpenDepositBatch && (
                          <button
                            onClick={async () => {
                              if (!confirm('Delete this open deposit batch? This cannot be undone.')) return;
                              const res = await deleteOpenDepositBatch(batch.id);
                              if (!res.success) alert(res.error || 'Failed to delete');
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        <button
                          onClick={() => handleProcess(batch.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center space-x-2"
                        >
                          Process Batch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredClosed.length === 0 ? (
            <div className="text-center py-10 text-gray-900">No processed batches</div>
          ) : (
            <div className="divide-y divide-gray-200">
              <table className="w-full table-auto border mt-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2">Batch</th>
                    <th className="border px-4 py-2">Date</th>
                    <th className="border px-4 py-2">Entries</th>
                    <th className="border px-4 py-2">Total</th>
                    <th className="border px-4 py-2">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClosed.map(batch => (
                    <tr key={batch.id}>
                      <td className="border px-4 py-2">{batch.community_dbatch_number}</td>
                      <td className="border px-4 py-2">{formatDate(batch.closedAt)}</td>
                      <td className="border px-4 py-2">{batch.entries.length}</td>
                      <td className="border px-4 py-2">${batch.totalAmount.toFixed(2)}</td>
                      <td className="border px-4 py-2">
                        <button
                          onClick={() => setPrintingBatchId(batch.id)}
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
            </div>
          )
        )}
      </div>

      {editingBatch && (
        <EditDepositBatchModal
          batch={editingBatch}
          onClose={() => setEditingBatchId(null)}
        />
      )}

      {printingBatchId && (
        <DepositBatchPrintModal
          batch={batches.closed.find(b => b.id === printingBatchId)!}
          residents={residents}
          facilityName={currentFacility?.name}
          onClose={() => setPrintingBatchId(null)}
        />
      )}
    </div>
  );
}

interface DepositBatchPrintModalProps {
  batch: any;
  residents: any[];
  facilityName?: string;
  onClose: () => void;
}

function DepositBatchPrintModal({ batch, residents, facilityName, onClose }: DepositBatchPrintModalProps) {
  const handlePrint = () => {
    const html = generateDepositBatchReportHTML(batch, residents, facilityName);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto text-gray-900">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Deposit Batch #{batch.community_dbatch_number || batch.id}</h3>
          <div className="space-x-2">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-3 py-1 rounded">Print</button>
            <button onClick={onClose} className="px-3 py-1 rounded border">Close</button>
          </div>
        </div>
        <div className="p-4">
          <table className="w-full table-auto border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Resident</th>
                <th className="border px-2 py-1 text-left">Method</th>
                <th className="border px-2 py-1 text-left">Cheque #</th>
                <th className="border px-2 py-1 text-right">Amount</th>
                <th className="border px-2 py-1 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {batch.entries.map((e: any) => {
                const r = residents.find(x => x.id === e.residentId);
                return (
                  <tr key={e.id}>
                    <td className="border px-2 py-1">{r?.name || 'Resident'}</td>
                    <td className="border px-2 py-1">{e.method}</td>
                    <td className="border px-2 py-1">{e.chequeNumber || '-'}</td>
                    <td className="border px-2 py-1 text-right">${e.amount.toFixed(2)}</td>
                    <td className="border px-2 py-1">{e.description || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function generateDepositBatchReportHTML(batch: any, residents: any[], facilityName?: string) {
  const rows = batch.entries.map((e: any) => {
    const r = residents.find(x => x.id === e.residentId);
    const name = r?.name || 'Resident';
    return `
      <tr>
        <td>${name}</td>
        <td>${e.method}</td>
        <td>${e.chequeNumber || '-'}</td>
        <td style="text-align:right; font-weight:bold;">$${e.amount.toFixed(2)}</td>
        <td>${e.description || '-'}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
  <html><head><title>Deposit Batch ${batch.community_dbatch_number || batch.id}</title>
  <style>
    body{font-family:Arial,sans-serif; padding:24px;}
    table{width:100%; border-collapse:collapse}
    th,td{border:1px solid #ddd; padding:8px}
    th{background:#f5f5f5; text-transform:uppercase; font-size:12px; letter-spacing:.5px}
    tfoot td{font-weight:bold;}
  </style>
  </head>
  <body>
    ${facilityName ? `<div style="text-align:center; font-weight:bold; font-size:18px; margin-bottom:6px;">${facilityName}</div>` : ''}
    <h2>Deposit Batch ${batch.community_dbatch_number || batch.id}</h2>
    <div style="margin-bottom:12px; color:#555;">Processed on ${batch.closedAt ? new Date(batch.closedAt).toLocaleString() : ''}</div>
    <table>
      <thead>
        <tr>
          <th>Resident</th>
          <th>Method</th>
          <th>Cheque #</th>
          <th>Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Totals</td>
          <td style="text-align:right;">$${batch.totalAmount.toFixed(2)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </body></html>`;
}