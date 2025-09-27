import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContextSupabase';
import { CheckCircle, Search, FileText, Upload, X, Plus } from 'lucide-react';
import { Resident, ServiceBatch } from '../types';
import AddVendorModal from './AddVendorModal';

export default function OMInvoicesPage() {
  const { currentFacility, user } = useAuth();
  const { invoices, updateInvoiceOmNotes, markInvoicePaid, refreshData, getFacilityResidents, createServiceBatch, addResidentToBatch } = useData();
  const dataAny = useData() as any;
  const vendors = dataAny.vendors as Array<{ id: string; name: string; email: string }> | undefined;
  const addVendorToFacility = dataAny.addVendorToFacility as (facilityId: string, email: string, name?: string, password?: string) => Promise<void>;
  const unlinkVendorFromFacility = dataAny.unlinkVendorFromFacility as (vendorUserId: string, facilityId: string) => Promise<void>;
  // currentFacility is already from useAuth above
  const [activeTab, setActiveTab] = useState<'invoices' | 'vendors'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'submitted' | 'paid' | 'all'>('submitted');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [search, setSearch] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceBatch['serviceType']>('haircare');
  const [isExporting, setIsExporting] = useState(false);
  
  const [showAddVendor, setShowAddVendor] = useState(false);
  

  const facilityInvoices = useMemo(() => {
    const list = invoices.filter(inv => inv.facilityId === currentFacility?.id);
    const filtered = list.filter(inv => statusFilter === 'all' ? inv.status !== 'open' : inv.status === statusFilter);
    if (!search) return filtered;
    return filtered.filter(inv => inv.items.some(it => it.description.toLowerCase().includes(search.toLowerCase())) || inv.id.includes(search));
  }, [invoices, currentFacility?.id, statusFilter, search]);

  const selected = facilityInvoices.find(i => i.id === selectedInvoiceId);

  const invoiceTotal = useMemo(() => {
    return selected ? selected.items.reduce((s, i) => s + i.amount, 0) : 0;
  }, [selected?.id, selected?.items]);

  const amountPaidFromNotes = useMemo(() => {
    if (!selected?.omNotes) return 0;
    const lines = String(selected.omNotes).split(/\n+/);
    let total = 0;
    const rx = /payment\s*\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/i;
    for (const line of lines) {
      const m = line.match(rx);
      if (m) {
        const val = parseFloat(m[1]);
        if (!isNaN(val)) total += val;
      }
    }
    return total;
  }, [selected?.omNotes, selected?.id]);

  const remainingAmount = Math.max(0, invoiceTotal - amountPaidFromNotes);

  const facilityResidents: Resident[] = useMemo(() => {
    if (!currentFacility) return [];
    return getFacilityResidents(currentFacility.id);
  }, [currentFacility?.id, getFacilityResidents]);

  // Display header info
  const detailsTop = selected ? (
    <div className="bg-gray-50 border rounded-lg p-3 mb-3 text-sm text-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <div className="font-medium text-gray-900">Vendor</div>
          <div>{selected.vendorName || '—'}</div>
          <div className="text-gray-600">{selected.vendorEmail || ''}</div>
        </div>
        <div className="md:col-span-2">
          <div className="font-medium text-gray-900">Address</div>
          <div className="whitespace-pre-wrap">{selected.vendorAddress || '—'}</div>
        </div>
        <div>
          <div className="font-medium text-gray-900">Invoice Date</div>
          <div>{selected.invoiceDate ? new Date(selected.invoiceDate).toLocaleDateString() : '—'}</div>
        </div>
      </div>
    </div>
  ) : null;

  const onSaveNote = async () => {
    if (!selected) return;
    await updateInvoiceOmNotes(selected.id, noteDraft);
    await refreshData();
  };

  const onMarkPaid = async () => {
    if (!selected || !user) return;
    await markInvoicePaid(selected.id, noteDraft);
    await refreshData();
  };

  

  const onExportToServiceBatch = async () => {
    if (!selected || !currentFacility || !user) return;
    try {
      setIsExporting(true);
      // Create a new open service batch for the chosen service type
      const batchId = await createServiceBatch(serviceType, currentFacility.id, user.id);
      // For each invoice item, add to batch with same amount for the resident
      for (const item of selected.items) {
        await addResidentToBatch(batchId, item.residentId, item.amount);
      }
      setExportOpen(false);
      // Optionally refresh batches/invoices view
      await refreshData();
      alert('Exported invoice items to a new service batch.');
    } catch (e) {
      console.error('Failed to export to service batch:', e);
      alert('Failed to export to service batch');
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Top toggle buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'invoices' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'vendors' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Vendor Management
          </button>
        </div>
      </div>

      {activeTab === 'invoices' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="submitted">Submitted</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by invoice id or item description"
                className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {facilityInvoices.map(inv => {
                  const total = inv.items.reduce((s, i) => s + i.amount, 0);
                  let paid = 0;
                  if (inv.omNotes) {
                    const rx = /payment\s*\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/ig;
                    const matches = inv.omNotes.matchAll(rx);
                    for (const m of matches) { const v = parseFloat(m[1]); if (!isNaN(v)) paid += v; }
                  }
                  const remaining = Math.max(0, total - paid);
                  const isPartial = inv.status !== 'paid' && paid > 0 && remaining > 0;
                  return (
                    <button
                      key={inv.id}
                      onClick={() => { setSelectedInvoiceId(inv.id); setNoteDraft(inv.omNotes || ''); }}
                      className={`w-full text-left p-4 hover:bg-gray-100 ${selectedInvoiceId === inv.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">Invoice #{inv.invoice_no}</div>
                          <div className="text-sm text-gray-500">Items: {inv.items.length}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full ${inv.status === 'submitted' ? (isPartial ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800') : 'bg-green-100 text-green-800'}`}>{isPartial ? 'partially paid' : inv.status}</span>
                      </div>
                    </button>
                  );
                })}
                {facilityInvoices.length === 0 && (
                  <div className="p-6 text-gray-500">No invoices for this filter.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>
                <div className="flex items-center gap-2">
                  {selected && selected.items.length > 0 && (
                    <button
                      onClick={() => setExportOpen(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" /> Export to Service Batch
                    </button>
                  )}
                  {selected && (
                    <button
                      onClick={async () => {
                        if (!selected || !currentFacility) return;
                        const { generateInvoicePdf } = await import('../utils/invoicePdf');
                        const residentMap = new Map(facilityResidents.map(r => [r.id, r]));
                        const blob = await generateInvoicePdf(selected, currentFacility, (id: string) => residentMap.get(id) || null);
                        const { saveAs } = await import('file-saver');
                        saveAs(blob, `invoice-${selected.invoice_no || selected.id.slice(0,8)}.pdf`);
                      }}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 inline-flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Download Invoice
                    </button>
                  )}
                  {selected && selected.status === 'submitted' && (
                    <button onClick={onMarkPaid} disabled={remainingAmount > 0} title={remainingAmount > 0 ? 'Remaining balance must be $0.00 to mark paid' : ''} className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 ${remainingAmount > 0 ? 'bg-green-600/50 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                      <CheckCircle className="w-4 h-4" /> Mark Paid
                    </button>
                  )}
                </div>
              </div>
              {!selected ? (
                <div className="p-6 text-gray-500">Select an invoice to review.</div>
              ) : (
                <div className="p-4 space-y-4">
                  {detailsTop}
                  <div className="border rounded overflow-hidden">
                    <div className="grid grid-cols-5 bg-gray-50 text-xs font-medium text-gray-600 px-3 py-2">
                      <div>Resident</div>
                      <div>Resident ID</div>
                      <div>Amount</div>
                      <div>Description</div>
                      <div>Date</div>
                    </div>
                    {selected.items.map(item => {
                      const res = facilityResidents.find(r => r.id === item.residentId);
                      return (
                        <div key={item.id} className="grid grid-cols-5 items-center px-3 py-2 border-t">
                          <div className="text-sm text-gray-600">{res?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-600">{res?.residentId || ''}</div>
                          <div className="text-sm text-gray-600">${item.amount.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">{item.description}</div>
                          <div className="text-sm text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</div>
                        </div>
                      );
                    })}
                    {selected.items.length === 0 && (
                      <div className="px-3 py-4 text-sm text-gray-500">No items.</div>
                    )}
                  </div>
                  {selected.status !== 'paid' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes to Vendor</label>
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        rows={3}
                        placeholder="Optional notes for the vendor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="mt-2 flex items-center justify-end">
                        <button onClick={onSaveNote} className="text-blue-600 hover:text-blue-800">Save Notes</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'vendors' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Vendor Management</h2>
            <button
              onClick={() => setShowAddVendor(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Vendor
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700">Manage vendors allowed to submit invoices.</div>
            <div className="divide-y divide-gray-100 border rounded">
              {(vendors || []).map((v: any) => (
                <div key={v.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{v.name || v.email}</div>
                    <div className="text-xs text-gray-600">{v.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!currentFacility?.id) return;
                        await unlinkVendorFromFacility(v.id, currentFacility.id);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              ))}
              {(vendors || []).length === 0 && (
                <div className="p-3 text-sm text-gray-500">No vendors linked yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {exportOpen && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Export Invoice Items</h3>
              <button onClick={() => setExportOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-700">
                Choose a service type to create a new open batch and add all invoice items.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceBatch['serviceType'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="haircare">Hair Care</option>
                <option value="footcare">Foot Care</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="cable">Cable TV</option>
                <option value="miscellaneous">Miscellaneous</option>
                <option value="wheelchairRepair">Wheelchair Repair</option>
              </select>
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setExportOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={onExportToServiceBatch}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : 'Create Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddVendor && currentFacility?.id && (
        <AddVendorModal
          facilityId={currentFacility.id}
          onClose={() => setShowAddVendor(false)}
          onAdded={async () => {
            await dataAny.refreshVendorsForFacility?.(currentFacility.id);
          }}
        />
      )}

      
    </div>
  );
}