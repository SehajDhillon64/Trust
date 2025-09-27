import React, { useState } from 'react';
import { X, User, Mail, Calendar, MapPin, Send, Building2 } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';

interface ResidentFormProps {
  onClose: () => void;
}

export default function ResidentForm({ onClose }: ResidentFormProps) {
  const [formData, setFormData] = useState({
    residentId: '',
    name: '',
    dob: '',
    ltcUnit: '',
    isSelfManaged: true,
    email: '',
    poaName: '',
    poaEmail: '',
    skipEmail: false,
    bankDetails: {
      bankName: '',
      accountNumber: '',
      transitNumber: '',
      institutionNumber: '',
      accountType: 'checking' as const,
      notes: ''
    },
    allowedServices: {
      haircare: true,
      footcare: true,
      pharmacy: true,
      cable: true,
      wheelchairRepair: true,
      miscellaneous: false
    }
  });
const [formError, setFormError] = useState<string | null>(null);
  const { addResident, checkResidentIdExists } = useData();
  const { currentFacility } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentFacility) {
      setFormError('No facility selected');
      return;
    }
    
    // Check if resident ID already exists in this facility
    if (checkResidentIdExists(formData.residentId, currentFacility.id)) {
      setFormError('Resident ID already exists in this facility');
      return;
    }
    
    addResident({
      residentId: formData.residentId,
      name: formData.name,
      dob: formData.dob,
      ltcUnit: formData.ltcUnit,
      trustBalance: 0,
      isSelfManaged: formData.isSelfManaged,
      status: 'active',
      bankDetails: formData.bankDetails.bankName ? formData.bankDetails : undefined,
      allowedServices: formData.allowedServices,
      facilityId: currentFacility.id,
      email: formData.email,
      poaEmail: formData.poaEmail,
      poaName: formData.poaName,
      skipEmail: formData.skipEmail
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add New Resident</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Resident Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Resident Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resident ID *
                </label>
                <input
                  type="text"
                  value={formData.residentId}
                  onChange={(e) => setFormData({ ...formData, residentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., SM001, GY002"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Unique ID for this resident in your facility</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter resident's full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LTC Unit/Room
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.ltcUnit}
                  onChange={(e) => setFormData({ ...formData, ltcUnit: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Wing A - Room 101"
                />
              </div>
            </div>
          </div>

          {/* Management Type removed per simplification to just Managed Online */}

          {/* Email Setup */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Email Setup</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.skipEmail}
                  onChange={(e) => setFormData({ ...formData, skipEmail: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Skip email setup (manual only)</span>
              </label>
            </div>

            {!formData.skipEmail && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account email address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="name@email.com"
                      required={!formData.skipEmail}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Email Setup Process</h4>
                  </div>
                  <p className="text-blue-800 text-sm">
                    An email with account setup instructions will be sent to the account email. They can then:
                  </p>
                  <ul className="text-blue-800 text-sm mt-2 ml-4 list-disc">
                    <li>Set up their password</li>
                    <li>View trust account balance</li>
                    <li>View transaction history</li>
                    <li>Manage service authorizations</li>
                  </ul>
                </div>
              </div>
            )}

            {formData.skipEmail && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Manual Management Only</h4>
                <p className="text-gray-700 text-sm">
                  This account will be managed manually by Office Managers. No email will be sent.
                  All transactions will be processed by office staff through manual entries.
                </p>
              </div>
            )}
          </div>

          {/* Bank Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Bank Details</h3>
            </div>
            <p className="text-sm text-gray-600">Optional banking information for the resident</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bank name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={formData.bankDetails.accountType}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, accountType: e.target.value as 'checking' | 'savings' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Account number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transit Number
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.transitNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, transitNumber: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Transit number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution Number
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.institutionNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, institutionNumber: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Institution number"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.bankDetails.notes}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails, notes: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Additional notes about bank details"
              />
            </div>
          </div>

          {/* Allowed Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Allowed Services</h3>
            <p className="text-sm text-gray-600">Select which services this resident is allowed to purchase</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'haircare', label: 'Hair Care' },
                { key: 'footcare', label: 'Foot Care' },
                { key: 'pharmacy', label: 'Pharmacy' },
                { key: 'cable', label: 'Cable TV' },
                { key: 'wheelchairRepair', label: 'Wheelchair Repair' },
                { key: 'miscellaneous', label: 'Miscellaneous' }
              ].map(service => (
                <label key={service.key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allowedServices[service.key as keyof typeof formData.allowedServices]}
                    onChange={(e) => setFormData({
                      ...formData,
                      allowedServices: {
                        ...formData.allowedServices,
                        [service.key]: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{service.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            {formError && (
              <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 mr-3">
                <p className="text-red-700 text-sm">{formError}</p>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              {!formData.skipEmail && <Send className="w-4 h-4" />}
                {formData.skipEmail ? 'Add Resident' : 'Add Resident & Send Email'}
              <span>Add Resident</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}