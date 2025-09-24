import React, { useMemo, useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { DepositBatch } from '../types'
import { useData } from '../contexts/DataContextSupabase'
import { useAuth } from '../contexts/AuthContext'
import ResidentSearch from './ResidentSearch'

interface EditDepositBatchModalProps {
  batch: DepositBatch
  onClose: () => void
}

export default function EditDepositBatchModal({ batch, onClose }: EditDepositBatchModalProps) {
  const { residents, addEntryToDepositBatch, updateDepositBatchEntry, removeEntryFromDepositBatch, getFacilityResidents } = useData()
  const { currentFacility } = useAuth()

  const [newEntry, setNewEntry] = useState({
    residentId: '',
    amount: '',
    method: 'cash' as 'cash' | 'cheque',
    description: '',
    chequeNumber: ''
  })
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const facilityResidents = useMemo(() => currentFacility ? getFacilityResidents(currentFacility.id) : residents, [currentFacility?.id, residents])

  const handleEntryUpdate = async (entryId: string, updates: Partial<{ amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>) => {
    if (!updateDepositBatchEntry) return
    setIsSaving(entryId)
    try {
      await updateDepositBatchEntry(batch.id, entryId, updates)
    } finally {
      setIsSaving(null)
    }
  }

  const handleEntryRemove = async (entryId: string) => {
    if (!removeEntryFromDepositBatch) return
    if (!confirm('Remove this entry from the batch?')) return
    setRemovingId(entryId)
    try {
      await removeEntryFromDepositBatch(batch.id, entryId)
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddEntry = async () => {
    if (!addEntryToDepositBatch) return
    if (!newEntry.residentId || !newEntry.amount || parseFloat(newEntry.amount) <= 0) {
      alert('Please select a resident and enter a valid amount')
      return
    }
    if (newEntry.method === 'cheque' && !newEntry.chequeNumber) {
      alert('Cheque number is required for cheque method')
      return
    }
    setAdding(true)
    try {
      await addEntryToDepositBatch(batch.id, {
        residentId: newEntry.residentId,
        amount: parseFloat(newEntry.amount),
        method: newEntry.method,
        description: newEntry.description || undefined,
        chequeNumber: newEntry.chequeNumber || undefined
      })
      setNewEntry({ residentId: '', amount: '', method: 'cash', description: '', chequeNumber: '' })
    } finally {
      setAdding(false)
    }
  }

  const isClosed = batch.status !== 'open'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto text-gray-900">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Deposit Batch #{batch.community_dbatch_number}</h2>
            <p className="text-sm text-gray-900">Status: {batch.status.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-900" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Entries list */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">Entries</h3>
            {batch.entries.length === 0 ? (
              <div className="text-gray-900 text-sm">No entries yet.</div>
            ) : (
              <div className="space-y-3">
                {batch.entries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-900 mb-1">Resident</label>
                        <select
                          value={entry.residentId}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                        >
                          <option value="">Select resident...</option>
                          {facilityResidents.map(r => (
                            <option key={r.id} value={r.id}>{r.name}{r.ltcUnit ? ` (${r.ltcUnit})` : ''}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-900 mb-1">Method</label>
                        <select
                          value={entry.method}
                          disabled={isClosed || isSaving === entry.id}
                          onChange={(e) => handleEntryUpdate(entry.id, { method: e.target.value as 'cash' | 'cheque' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-900 mb-1">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entry.amount}
                          disabled={isClosed || isSaving === entry.id}
                          onChange={(e) => handleEntryUpdate(entry.id, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-900 mb-1">Cheque #</label>
                        <input
                          type="text"
                          value={entry.chequeNumber || ''}
                          disabled={isClosed || entry.method !== 'cheque' || isSaving === entry.id}
                          onChange={(e) => handleEntryUpdate(entry.id, { chequeNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Required if cheque"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleEntryRemove(entry.id)}
                          disabled={isClosed || removingId === entry.id}
                          className="inline-flex items-center space-x-1 text-red-700 hover:text-red-800"
                        >
                          <Minus className="w-4 h-4" />
                          <span>{removingId === entry.id ? 'Removing...' : 'Remove'}</span>
                        </button>
                        {isSaving === entry.id && <span className="text-xs text-gray-500">Saving...</span>}
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs text-gray-900 mb-1">Description</label>
                      <input
                        type="text"
                        value={entry.description || ''}
                        disabled={isClosed || isSaving === entry.id}
                        onChange={(e) => handleEntryUpdate(entry.id, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new entry */}
          {!isClosed && (
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-900 mb-3">Add Entry</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-900 mb-1">Resident</label>
                  <ResidentSearch
                    residents={facilityResidents}
                    value={newEntry.residentId}
                    onChange={(residentId) => setNewEntry(prev => ({ ...prev, residentId }))}
                    placeholder="Search resident..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-900 mb-1">Method</label>
                  <select
                    value={newEntry.method}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, method: e.target.value as 'cash' | 'cheque' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-900 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-900 mb-1">Cheque #</label>
                  <input
                    type="text"
                    value={newEntry.chequeNumber}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, chequeNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Required if cheque"
                    disabled={newEntry.method !== 'cheque'}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddEntry}
                    disabled={adding}
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{adding ? 'Adding...' : 'Add Entry'}</span>
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-gray-900 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Notes for this deposit"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end">
            <button onClick={onClose} className="px-5 py-2 border rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}