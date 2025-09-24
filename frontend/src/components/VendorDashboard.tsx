import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContextSupabase';
import { Plus, Send, FileText, CheckCircle, Trash2, Pencil, Building2 } from 'lucide-react';
import { Facility, Invoice, Resident } from '../types';

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const {
    facilities,
    getFacilityResidents,
    invoices,
    createInvoice,
    addInvoiceItem,
    updateInvoiceItem,
    removeInvoiceItem,
    submitInvoice,
    refreshData
  } = useData();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'open' | 'submitted' | 'paid' | 'all'>('open');
  const [searchResident, setSearchResident] = useState('');
  const [newItem, setNewItem] = useState<{ residentId: string; amount: string; description: string }>({ residentId: '', amount: '', description: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [mustReset, setMustReset] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    if (facilities.length >= 1 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [facilities, selectedFacilityId]);

  useEffect(() => {
    // Check auth metadata for mustResetPassword flag
    const checkMeta = async () => {
      try {
        const { supabase } = await import('../config/supabase');
        const { data } = await supabase.auth.getUser();
        const meta: any = data.user?.user_metadata || {};
        if (meta.mustResetPassword === true) {
          setMustReset(true);
        }
      } catch {}
    };
    checkMeta();
  }, []);

  const facilityResidents: Resident[] = useMemo(() => {
    if (!selectedFacilityId) return [];
    return getFacilityResidents(selectedFacilityId);
  }, [selectedFacilityId, getFacilityResidents]);

  const facilityInvoices: Invoice[] = useMemo(() => {
    return invoices
      .filter(inv => (!selectedFacilityId || inv.facilityId === selectedFacilityId) && (filterStatus === 'all' || inv.status === filterStatus))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, selectedFacilityId, filterStatus]);

  const activeInvoice = useMemo(() => facilityInvoices.find(i => i.id === activeInvoiceId), [facilityInvoices, activeInvoiceId]);

  const handleCreateInvoice = async () => {
    if (!selectedFacilityId) return;
    try {
      setCreateError(null);
      const inv = await createInvoice(selectedFacilityId);
      setActiveInvoiceId(inv.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create invoice';
      setCreateError(message);
    }
  };

  const selectedFacility = useMemo(() => facilities.find(f => f.id === selectedFacilityId) || null, [facilities, selectedFacilityId]);

  const filteredResidents = facilityResidents.filter(r => {
    if (!searchResident) return true;
    return (
      r.name.toLowerCase().includes(searchResident.toLowerCase()) ||
      r.residentId.toLowerCase().includes(searchResident.toLowerCase())
    );
  });

  const onAddItem = async () => {
    if (!activeInvoice) return;
    if (!newItem.residentId || !newItem.amount || Number(newItem.amount) <= 0) return;
    await addInvoiceItem(activeInvoice.id, newItem.residentId, Number(newItem.amount), newItem.description || '');
    await refreshData();
    setNewItem({ residentId: '', amount: '', description: '' });
  };

  const onRemoveItem = async (itemId: string) => {
    if (!activeInvoice) return;
    await removeInvoiceItem(activeInvoice.id, itemId);
    await refreshData();
  };

  const onUpdateItem = async (itemId: string, updates: Partial<{ amount: number; description: string }>) => {
    if (!activeInvoice) return;
    await updateInvoiceItem(activeInvoice.id, itemId, updates);
    await refreshData();
  };

  const onSubmitInvoice = async () => {
    if (!activeInvoice) return;
    await submitInvoice(activeInvoice.id);
    await refreshData();
  };

  // Vendor details editing state
  const [vendorDetails, setVendorDetails] = useState<{ vendorName: string; vendorAddress: string; vendorEmail: string; invoiceDate: string }>(
    { vendorName: '', vendorAddress: '', vendorEmail: '', invoiceDate: '' }
  );

  useEffect(() => {
    if (activeInvoice) {
      setVendorDetails({
        vendorName: activeInvoice.vendorName || user?.name || '',
        vendorAddress: activeInvoice.vendorAddress || '',
        vendorEmail: activeInvoice.vendorEmail || user?.email || '',
        invoiceDate: (activeInvoice.invoiceDate ? new Date(activeInvoice.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
      });
    }
  }, [activeInvoice?.id]);

  const { updateInvoiceVendorDetails } = useData();

  const onSaveVendorDetails = async () => {
    if (!activeInvoice) return;
    try {
      await updateInvoiceVendorDetails(activeInvoice.id, {
        vendorName: vendorDetails.vendorName,
        vendorAddress: vendorDetails.vendorAddress,
        vendorEmail: vendorDetails.vendorEmail,
        invoiceDate: vendorDetails.invoiceDate,
      });
    } catch (e) {
      console.error('Failed to save vendor details', e);
    }
  };

  // PDF download
  const handleDownloadPdf = async () => {
    if (!activeInvoice || !selectedFacility) return;
    const { generateInvoicePdf } = await import('../utils/invoicePdf');
    const residentMap = new Map(facilityResidents.map(r => [r.id, r]));
    const blob = await generateInvoicePdf(activeInvoice, selectedFacility, (id: string) => residentMap.get(id) || null);
    const { saveAs } = await import('file-saver');
    saveAs(blob, `invoice-${activeInvoice.invoice_no || activeInvoice.id.slice(0,8)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {mustReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Update your password</h2>
            <p className="text-sm text-gray-700 mb-4">Your password was set by your Office Manager. Please create a new password to continue.</p>
            {pwErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded mb-3">{pwErr}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">New Password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <button
                onClick={async () => {
                  setPwErr('');
                  if (!newPw || newPw.length < 6) { setPwErr('Password must be at least 6 characters'); return; }
                  if (newPw !== confirmPw) { setPwErr('Passwords do not match'); return; }
                  try {
                    const { supabase } = await import('../config/supabase');
                    const { error } = await supabase.auth.updateUser({ password: newPw, data: { mustResetPassword: false } as any });
                    if (error) throw error;
                    setMustReset(false);
                  } catch (e: any) {
                    setPwErr(e?.message || 'Failed to update password');
                  }
                }}
                className="w-full bg-blue-600 text-white rounded-lg py-2"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
            <p className="text-gray-600 mt-1">Create and submit invoices to facility Office Managers</p>
          </div>
          <div>
            <button onClick={logout} className="text-gray-600 hover:text-gray-900 transition-colors">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            {selectedFacility ? (
              <div className="text-gray-900 font-medium">{selectedFacility.name}</div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-gray-600">No facility linked. Please contact your administrator.</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status:</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="open">Open</option>
              <option value="submitted">Submitted</option>
              <option value="paid">Paid</option>
              <option value="all">All</option>
            </select>
            <button
              onClick={handleCreateInvoice}
              disabled={!selectedFacilityId}
              className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Invoice
            </button>
            {createError && (
              <span className="text-sm text-red-600 ml-2">{createError}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {facilityInvoices.map(inv => (
                <button
                  key={inv.id}
                  onClick={() => setActiveInvoiceId(inv.id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${activeInvoiceId === inv.id ? 'bg-blue-50' : ''}`}
                >
                  <div>
                    <div className="font-medium text-gray-900">Invoice #{inv.invoice_no}</div>
                    <div className="text-sm text-gray-500">Created {new Date(inv.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded-full ${inv.status === 'open' ? 'bg-yellow-100 text-yellow-800' : inv.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {inv.status}
                    </span>
                  </div>
                </button>
              ))}
              {facilityInvoices.length === 0 && (
                <div className="p-6 text-gray-500">No invoices yet for this facility.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>
              <div className="flex items-center gap-2">
                {activeInvoice && activeInvoice.status !== 'open' && (
                  <button onClick={handleDownloadPdf} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Download PDF
                  </button>
                )}
                {activeInvoice && activeInvoice.status === 'open' && (
                  <button onClick={onSubmitInvoice} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-flex items-center gap-2">
                    <Send className="w-4 h-4" /> Submit to OM
                  </button>
                )}
              </div>
            </div>
            {!activeInvoice ? (
              <div className="p-6 text-gray-500">Select or create an invoice to edit.</div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Summary header for vendor's view */}
                <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <div className="font-medium text-gray-900">Vendor</div>
                      <div>{vendorDetails.vendorName || user?.name}</div>
                      <div className="text-gray-600">{vendorDetails.vendorEmail || user?.email}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">Address</div>
                      <div className="whitespace-pre-wrap">{vendorDetails.vendorAddress || 'Add address below'}</div>
                    </div>
                  </div>
                </div>
                {/* Vendor details */}
                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Vendor Name</label>
                      <input
                        value={vendorDetails.vendorName}
                        onChange={(e) => setVendorDetails(prev => ({ ...prev, vendorName: e.target.value }))}
                        disabled={activeInvoice.status !== 'open'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Vendor Email</label>
                      <input
                        type="email"
                        value={vendorDetails.vendorEmail}
                        onChange={(e) => setVendorDetails(prev => ({ ...prev, vendorEmail: e.target.value }))}
                        disabled={activeInvoice.status !== 'open'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Vendor Address</label>
                      <textarea
                        rows={2}
                        value={vendorDetails.vendorAddress}
                        onChange={(e) => setVendorDetails(prev => ({ ...prev, vendorAddress: e.target.value }))}
                        disabled={activeInvoice.status !== 'open'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={vendorDetails.invoiceDate}
                        onChange={(e) => setVendorDetails(prev => ({ ...prev, invoiceDate: e.target.value }))}
                        disabled={activeInvoice.status !== 'open'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {activeInvoice.status === 'open' && (
                    <div className="mt-3 text-right">
                      <button onClick={onSaveVendorDetails} className="text-blue-600 hover:text-blue-800">Save Vendor Details</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Resident</label>
                    <input
                      value={searchResident}
                      onChange={(e) => setSearchResident(e.target.value)}
                      placeholder="Search resident by name or Resident ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="max-h-40 overflow-auto mt-2 border rounded">
                      {filteredResidents.map(r => (
                        <button
                          key={r.id}
                          onClick={() => setNewItem(prev => ({ ...prev, residentId: r.id }))}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${newItem.residentId === r.id ? 'bg-blue-50' : ''}`}
                        >
                          <div className="text-sm font-medium text-gray-900">{r.name}</div>
                          <div className="text-xs text-gray-500">Resident ID: {r.residentId}</div>
                        </button>
                      ))}
                      {filteredResidents.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No residents match.</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.amount}
                      onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <input
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Service description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button onClick={onAddItem} disabled={activeInvoice.status !== 'open'} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>

                <div className="border rounded overflow-hidden overflow-x-auto">
                  <div className="grid grid-cols-5 bg-gray-50 text-xs font-medium text-gray-600 px-3 py-2 min-w-[700px]">
                    <div>Resident</div>
                    <div>Resident ID</div>
                    <div>Amount</div>
                    <div>Description</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {(activeInvoice.items || []).map(item => {
                    const res = facilityResidents.find(r => r.id === item.residentId);
                    return (
                      <div key={item.id} className="grid grid-cols-5 items-center px-3 py-2 border-t min-w-[700px]">
                        <div className="ext-sm text-gray-600">{res?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-600">{res?.residentId || ''}</div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={item.amount}
                            onBlur={(e) => onUpdateItem(item.id, { amount: Number(e.target.value || item.amount) })}
                            disabled={activeInvoice.status !== 'open'}
                            className="w-24 px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <input
                            defaultValue={item.description}
                            onBlur={(e) => onUpdateItem(item.id, { description: e.target.value })}
                            disabled={activeInvoice.status !== 'open'}
                            className="w-24 px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          {activeInvoice.status === 'open' && (
                            <button onClick={() => onRemoveItem(item.id)} className="text-red-600 hover:text-red-800 inline-flex items-center gap-1">
                              <Trash2 className="w-4 h-4" /> Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeInvoice.items.length === 0 && (
                    <div className="px-3 py-4 text-sm text-gray-500">No items yet. Add residents and amounts above.</div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-6 pt-2">
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-gray-900">${activeInvoice.items.reduce((s, i) => s + i.amount, 0).toFixed(2)}</span>
                  </div>
                  {activeInvoice.status === 'submitted' && (
                    <div className="text-blue-700 bg-blue-50 px-3 py-1 rounded">Submitted to OM</div>
                  )}
                  {activeInvoice.status === 'paid' && (
                    <div className="text-green-700 bg-green-50 px-3 py-1 rounded inline-flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Paid</div>
                  )}
                </div>

                {activeInvoice.omNotes && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Notes from OM</div>
                    <div className="whitespace-pre-wrap text-sm text-gray-800 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {activeInvoice.omNotes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}