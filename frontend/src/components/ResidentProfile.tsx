import React, { useState } from 'react';
import { Eye, EyeOff, Edit3, Save, X, User, DollarSign, Calendar, MapPin, Phone, Mail, CreditCard, Wallet, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import { Resident } from '../types';
import TransactionHistory from './TransactionHistory';

interface ResidentProfileProps {
  resident: Resident;
  onClose: () => void;
}

export default function ResidentProfile({ resident, onClose }: ResidentProfileProps) {
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);
  const [allowedServices, setAllowedServices] = useState(resident.allowedServices);
  const [bankDetails, setBankDetails] = useState(resident.bankDetails || {
    bankName: '',
    accountNumber: '',
    transitNumber: '',
    institutionNumber: '',
    accountType: 'checking' as const,
    notes: ''
  });
  const { updateResident, getFacilityTransactions, closeResidentTrust, provisionUser } = useData();
  const { currentFacility } = useAuth();

  const [showCloseTrustModal, setShowCloseTrustModal] = useState(false);
  const [closeMethod, setCloseMethod] = useState<'cash' | 'cheque'>('cash');
  const [closeNote, setCloseNote] = useState('Account closure');

  // Get all transactions for this resident
  const facilityTransactions = currentFacility ? getFacilityTransactions(currentFacility.id) : [];
  const residentTransactions = facilityTransactions.filter(t => t.residentId === resident.id);

  const handleCloseTrust = () => {
    setShowCloseTrustModal(true);
  };

  const handleSubmitCloseTrust = async () => {
    const result = await closeResidentTrust(resident.id, { method: closeMethod, note: closeNote });
    if (!result.success) {
      alert(result.error || 'Failed to close trust');
      return;
    }
    alert('Resident set to inactive and trust closed.');
    setShowCloseTrustModal(false);
  };

  const handleSaveServices = () => {
    updateResident(resident.id, { allowedServices });
    setIsEditingServices(false);
  };

  const handleCancelEdit = () => {
    setAllowedServices(resident.allowedServices);
    setIsEditingServices(false);
  };

  const handleSaveBankDetails = () => {
    updateResident(resident.id, { bankDetails });
    setIsEditingBankDetails(false);
  };

  const handleCancelBankEdit = () => {
    setBankDetails(resident.bankDetails || {
      bankName: '',
      accountNumber: '',
      transitNumber: '',
      institutionNumber: '',
      accountType: 'checking' as const,
      notes: ''
    });
    setIsEditingBankDetails(false);
  };

  const serviceOptions = [
    { key: 'haircare', label: 'Hair Care' },
    { key: 'footcare', label: 'Foot Care' },
    { key: 'pharmacy', label: 'Pharmacy' },
    { key: 'cable', label: 'Cable TV' },
    { key: 'wheelchairRepair', label: 'Wheelchair Repair' }
  ];

  const isManuallyManaged = !resident.linkedUserId;

  const [showEnableOnlineModal, setShowEnableOnlineModal] = useState(false);
  const [onlineEmail, setOnlineEmail] = useState('');
  const [onlineName, setOnlineName] = useState('');
  const [isSubmittingOnline, setIsSubmittingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const canEnableOnline = isManuallyManaged && resident.status === 'active' && !!currentFacility;
  const canManageOnline = !isManuallyManaged && resident.status === 'active' && !!currentFacility;

  const handleEnableOnline = async () => {
    if (!currentFacility) return;
    setOnlineError(null);
    if (!onlineEmail) {
      setOnlineError('Email is required');
      return;
    }
    try {
      setIsSubmittingOnline(true);
      await provisionUser({
        email: onlineEmail,
        name: onlineName || resident.name,
        role: 'Resident',
        facilityId: currentFacility.id,
        residentId: resident.id,
        communityName: currentFacility.name
      });
      setShowEnableOnlineModal(false);
      alert(resident.linkedUserId ? 'Account email updated and invitation sent.' : 'Online access enabled and invitation sent.');
    } catch (e: any) {
      setOnlineError(e?.message || 'Failed to enable online access');
    } finally {
      setIsSubmittingOnline(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">{resident.name}</h2>
            <p className="text-blue-100 mt-1">Resident Profile</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">Resident ID</h3>
              </div>
              <p className="text-lg font-semibold text-gray-900">{resident.residentId}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">Room/Unit</h3>
              </div>
              <p className="text-lg font-semibold text-gray-900">{resident.ltcUnit || 'Not specified'}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Account Balance</h3>
              </div>
              <p className="text-lg font-semibold text-green-600">${resident.trustBalance.toFixed(2)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">Date of Birth</h3>
              </div>
              <p className="text-lg font-semibold text-gray-900">{resident.dob}</p>
            </div>
          </div>

          {/* Management Type */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Management</h3>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                resident.linkedUserId 
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {resident.linkedUserId 
                  ? 'Managed Online'
                  : 'Manual Management'
                }
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                resident.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {resident.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              {canEnableOnline && (
                <button
                  onClick={() => setShowEnableOnlineModal(true)}
                  className="ml-auto bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enable Online Access
                </button>
              )}
              {resident.status === 'active' && (
                <button
                  onClick={handleCloseTrust}
                  className="ml-auto bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Close Trust & Inactivate
                </button>
              )}
            </div>
          </div>

          {/* Allowed Services */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Allowed Services</h3>
              {isManuallyManaged && (
                <div className="flex space-x-2">
                  {isEditingServices ? (
                    <>
                      <button
                        onClick={handleSaveServices}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingServices(true)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {!isManuallyManaged && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  This resident has online account access. Service permissions are managed through their online portal.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {serviceOptions.map(service => {
                const isAllowed = isEditingServices ? 
                  allowedServices[service.key as keyof typeof allowedServices] : 
                  resident.allowedServices[service.key as keyof typeof resident.allowedServices];

                return (
                  <div key={service.key} className="flex items-center space-x-2">
                    {isEditingServices && isManuallyManaged ? (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={(e) => setAllowedServices({
                            ...allowedServices,
                            [service.key]: e.target.checked
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{service.label}</span>
                      </label>
                    ) : (
                      <>
                        <div className={`w-4 h-4 rounded-full ${
                          isAllowed ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className={`text-sm ${
                          isAllowed ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {service.label}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Wallet className="h-5 w-5 mr-2 text-blue-600" />
                Bank Details
              </h3>
              <div className="flex space-x-2">
                {isEditingBankDetails ? (
                  <>
                    <button
                      onClick={handleSaveBankDetails}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelBankEdit}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingBankDetails(true)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {isEditingBankDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bank name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type *
                    </label>
                    <select
                      value={bankDetails.accountType}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, accountType: e.target.value as 'checking' | 'savings' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select account type</option>
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter account number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transit Number
                    </label>
                    <input
                      type="text"
                      value={bankDetails.transitNumber}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, transitNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter transit number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institution Number
                    </label>
                    <input
                      type="text"
                      value={bankDetails.institutionNumber}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, institutionNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter institution number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={bankDetails.notes || ''}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional notes about bank details"
                  />
                </div>
              </div>
            ) : (
              <div>
                {!resident.bankDetails || !resident.bankDetails.bankName ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Bank Details</h4>
                    <p className="text-gray-600 mb-4">No banking information has been added for this resident.</p>
                    <button
                      onClick={() => setIsEditingBankDetails(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center mx-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bank Details
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <tbody className="divide-y divide-gray-200">
                        <tr className="bg-white">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 w-1/3">Bank Name</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{resident.bankDetails.bankName}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">Account Type</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                              {resident.bankDetails.accountType}
                            </span>
                          </td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">Account Number</td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                            •••• •••• {resident.bankDetails.accountNumber.slice(-4)}
                          </td>
                        </tr>
                        {resident.bankDetails.transitNumber && (
                          <tr className="bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Transit Number</td>
                            <td className="px-4 py-3 text-sm text-gray-700 font-mono">{resident.bankDetails.transitNumber}</td>
                          </tr>
                        )}
                        {resident.bankDetails.institutionNumber && (
                          <tr className="bg-white">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Institution Number</td>
                            <td className="px-4 py-3 text-sm text-gray-700 font-mono">{resident.bankDetails.institutionNumber}</td>
                          </tr>
                        )}
                        {resident.bankDetails.notes && (
                          <tr className="bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Notes</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{resident.bankDetails.notes}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Transaction History ({residentTransactions.length} total)
            </h3>
            <div className="max-h-96 overflow-y-auto">
              <TransactionHistory residentFilter={resident.id} />
            </div>
          </div>
        </div>
      </div>

      {showCloseTrustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Close Trust Account</h2>
              <button
                onClick={() => setShowCloseTrustModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">Remaining Balance</p>
                <p className="text-2xl font-bold text-gray-900">${Number(resident.trustBalance || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Debit Method</label>
                <select
                  value={closeMethod}
                  onChange={(e) => setCloseMethod(e.target.value as 'cash' | 'cheque')}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note (optional)</label>
                <input
                  type="text"
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Account closure"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                {closeMethod === 'cash'
                  ? 'A cash withdrawal will be recorded in the cash box.'
                  : 'A cheque debit will be recorded. No cash box change.'}
              </div>
            </div>
            <div className="p-6 flex justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => setShowCloseTrustModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCloseTrust}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Close Trust & Inactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnableOnlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Manage Online Access</h2>
              <button
                onClick={() => setShowEnableOnlineModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isSubmittingOnline}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Email Address</label>
                  <input
                    type="email"
                    value={onlineEmail}
                    onChange={(e) => setOnlineEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="name@email.com"
                    disabled={isSubmittingOnline}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Full Name (optional)</label>
                  <input
                    type="text"
                    value={onlineName}
                    onChange={(e) => setOnlineName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={resident.name}
                    disabled={isSubmittingOnline}
                  />
                </div>
              </div>

              {onlineError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{onlineError}</div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                An invitation email will be sent to set a password. The account will be linked for online access.
              </div>
            </div>
            <div className="p-6 flex justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => setShowEnableOnlineModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmittingOnline}
              >
                Cancel
              </button>
              <button
                onClick={handleEnableOnline}
                className={`px-6 py-2 rounded-lg text-white transition-colors ${isSubmittingOnline ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isSubmittingOnline}
              >
                {isSubmittingOnline ? 'Saving...' : (resident.linkedUserId ? 'Update Account Email' : 'Enable Online Access')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Enable Online Access Modal
// Rendered conditionally within the component when showEnableOnlineModal is true