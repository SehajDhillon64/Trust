import React, { useState } from 'react';
import { User, DollarSign, History, Plus, FileText, X, Settings, Calendar } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import TransactionHistory from './TransactionHistory';
import MonthlyTransactionReport from './MonthlyTransactionReport';
import PreAuthDebitForm from './PreAuthDebitForm';
import OnlinePaymentModal from './OnlinePaymentModal';
import { simplifyTransactionDescription } from '../utils/format';

export default function POADashboard() {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showServiceSettings, setShowServiceSettings] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [showPreAuthForm, setShowPreAuthForm] = useState(false);
  const [showOnlinePayment, setShowOnlinePayment] = useState(false);
  const { residents, transactions, getResidentTransactions, updateResident, facilities, getResidentPreAuthDebits, isLoading } = useData();
  const { user, logout } = useAuth();

  // Debug logging
  console.log('POADashboard Debug:', {
    user,
    residentsCount: residents?.length,
    transactionsCount: transactions?.length,
    facilitiesCount: facilities?.length,
    isLoading
  });

  // Find resident linked to this user
  const linkedResident = residents.find(r => r.linkedUserId === user?.id);
  const residentTransactions = linkedResident ? getResidentTransactions(linkedResident.id) : [];
  const audience = user?.role === 'Resident' ? 'resident' : user?.role === 'POA' ? 'poa' : user?.role === 'OM' ? 'om' : user?.role === 'Admin' ? 'admin' : 'vendor';
  
  // Find the facility for this resident
  const residentFacility = linkedResident ? facilities.find(f => f.id === linkedResident.facilityId) : null;

  console.log('POADashboard - linkedResident:', linkedResident);
  console.log('POADashboard - residentFacility:', residentFacility);

  const handleServiceAuthorizationChange = (service: keyof typeof linkedResident.allowedServices, authorized: boolean) => {
    if (!linkedResident) return;
    
    updateResident(linkedResident.id, {
      serviceAuthorizations: {
        ...linkedResident.serviceAuthorizations,
        [service]: authorized
      }
    });
  };

  const handleServiceSettingChange = (service: keyof typeof linkedResident.allowedServices, allowed: boolean) => {
    if (!linkedResident) return;
    
    const newAllowedServices = {
      ...linkedResident.allowedServices,
      [service]: allowed
    };
    
    const newServiceAuthorizations = {
      ...linkedResident.serviceAuthorizations,
      [service]: allowed
    };
    
    updateResident(linkedResident.id, {
      allowedServices: newAllowedServices,
      serviceAuthorizations: newServiceAuthorizations
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account data...</p>
        </div>
      </div>
    );
  }

  if (!linkedResident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Not Linked</h1>
          <p className="text-gray-600">Please contact the office manager to link your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.role === 'Resident' ? 'My Account' : 'POA Dashboard'}
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.role === 'Resident' 
                ? `Welcome, ${user.name}` 
                : `Managing account for ${linkedResident.name}`
              }
            </p>
            {residentFacility && (
              <p className="text-blue-600 font-semibold mt-1 text-lg">
                📍 {residentFacility.name}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowMonthlyReport(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Monthly Reports</span>
            </button>
            <button
              onClick={() => setShowServiceSettings(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Service Settings</span>
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

      {/* Main Content */}
      <main className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Facility Info Banner */}
          {residentFacility && (
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-sm text-white p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Community: {residentFacility.name}</h2>
                  <p className="text-purple-100 text-sm">{residentFacility.address}</p>
                  <p className="text-purple-100 text-sm">{residentFacility.phone}</p>
                </div>
                <div className="sm:text-right text-left">
                  <p className="text-purple-100 text-sm">Resident ID</p>
                  <p className="text-white font-semibold">{linkedResident.residentId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Account Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resident Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Resident Information</h2>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{linkedResident.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-medium text-gray-900">{linkedResident.dob}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">LTC Unit</p>
                  <p className="font-medium text-gray-900">{linkedResident.ltcUnit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account Type</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    linkedResident.linkedUserId
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {linkedResident.linkedUserId ? 'Managed Online' : 'Manual Management'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Service Authorizations</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(linkedResident.serviceAuthorizations || linkedResident.allowedServices).map(([service, authorized]) => 
                      authorized && (
                        <span key={service} className="inline-flex px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          {service === 'wheelchairRepair' ? 'Wheelchair' : service === 'miscellaneous' ? 'Miscellaneous' : service.charAt(0).toUpperCase() + service.slice(1)}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Balance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Trust Account Balance</h2>
                </div>
              </div>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-green-600 mb-2">
                  ${linkedResident.trustBalance.toFixed(2)}
                </p>
                <p className="text-gray-600">Available Balance</p>
              </div>
              <div className="text-center py-3">
                <button
                  onClick={() => setShowOnlinePayment(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Funds Online
                </button>
              </div>
            </div>
          </div>

          {/* Pre-Authorization Debits */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-900">Monthly Pre-Authorizations</h2>
              </div>
            </div>
            
            {(() => {
              const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
              const preAuthDebits = linkedResident ? getResidentPreAuthDebits(linkedResident.id) : [];
              const currentMonthDebits = preAuthDebits.filter(debit => debit.targetMonth === currentMonth);
              const upcomingDebits = preAuthDebits.filter(debit => debit.targetMonth > currentMonth);
              
              if (preAuthDebits.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Pre-Authorizations</h3>
                    <p className="text-gray-600 mb-4">Set up monthly pre-authorizations (credits or debits) for specific months with varying amounts.</p>
                    <button
                      onClick={() => setShowPreAuthForm(true)}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Setup Pre-Authorization
                    </button>
                  </div>
                );
              }
              
              const formatMonthDisplay = (monthStr: string) => {
                const [year, month] = monthStr.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return date.toLocaleString('default', { month: 'long', year: 'numeric' });
              };
              
              return (
                <div className="p-6">
                  {currentMonthDebits.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Current Month ({formatMonthDisplay(currentMonth)})</h4>
                      <div className="space-y-3">
                        {currentMonthDebits.map(auth => (
                          <div key={auth.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 border rounded-lg ${
                            auth.type === 'credit' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                          }`}>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-medium text-gray-900">{auth.description}</p>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  auth.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {auth.type?.toUpperCase() || 'DEBIT'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Authorized: {new Date(auth.authorizedDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="sm:text-right text-left">
                              <p className={`font-semibold ${
                                auth.type === 'credit' ? 'text-green-600' : 'text-gray-900'
                              }`}>
                                {auth.type === 'credit' ? '+' : '-'}${auth.amount.toFixed(2)}
                              </p>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                auth.status === 'processed' ? 'bg-green-100 text-green-800' : 
                                auth.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {auth.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {upcomingDebits.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Upcoming Months</h4>
                      <div className="space-y-3">
                        {upcomingDebits
                          .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
                          .map(auth => (
                            <div key={auth.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="font-medium text-gray-900">{auth.description}</p>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    auth.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {auth.type?.toUpperCase() || 'DEBIT'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  For: {formatMonthDisplay(auth.targetMonth)} • Authorized: {new Date(auth.authorizedDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="sm:text-right text-left">
                                <p className={`font-semibold ${
                                  auth.type === 'credit' ? 'text-green-600' : 'text-gray-900'
                                }`}>
                                  {auth.type === 'credit' ? '+' : '-'}${auth.amount.toFixed(2)}
                                </p>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  auth.status === 'processed' ? 'bg-green-100 text-green-800' : 
                                  auth.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {auth.status}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowPreAuthForm(true)}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Add New Authorization
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <History className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
              </div>
              <span className="text-sm text-gray-600">
                Last 30 days
              </span>
            </div>
            
            {residentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
                <p className="text-gray-600 mb-4">Start by adding funds to the account</p>
                <div className="text-gray-500 text-sm">
                  Contact office manager to add funds
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {residentTransactions
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 10)
                  .map(transaction => (
                    <div key={transaction.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{simplifyTransactionDescription(transaction.description, { audience })}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.timestamp).toLocaleDateString()}
                          </p>
                          
                        </div>
                      </div>
                      <div className="sm:text-right text-left">
                        <p className={`text-lg font-semibold ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Account Actions */}
         
        </div>
      </main>



      {/* Monthly Report Modal */}
      {showMonthlyReport && linkedResident && (
        <MonthlyTransactionReport
          residentId={linkedResident.id}
          onClose={() => setShowMonthlyReport(false)}
        />
      )}

      {/* Full History Modal */}
      {showFullHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Complete Transaction History</h2>
              <button
                onClick={() => setShowFullHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <TransactionHistory residentFilter={linkedResident?.id} />
            </div>
          </div>
        </div>
      )}

      {/* Service Settings Modal - Fixed with proper closing */}
     {showServiceSettings && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    onClick={() => setShowServiceSettings(false)}
  >
    <div 
      className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      onClick={(e) => {
        e.stopPropagation(); // This prevents clicks inside modal from closing it
      }}
    >
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Service Authorizations</h2>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Added this to prevent event bubbling
            setShowServiceSettings(false);
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                {user?.role === 'POA' 
                  ? `Manage service settings and payment authorization for ${linkedResident?.name}.`
                  : `View service authorization settings for ${linkedResident?.name}.`
                }
              </p>
              
          
              
              {[
                { key: 'haircare', label: 'Hair Care Services' },
                { key: 'footcare', label: 'Foot Care Services' },
                { key: 'pharmacy', label: 'Pharmacy Purchases' },
                { key: 'cable', label: 'Cable TV Services' },
                { key: 'wheelchairRepair', label: 'Wheelchair Repair' },
                { key: 'miscellaneous', label: 'Miscellaneous' }
              ].map(service => {
                const isAllowedByFacility = linkedResident?.allowedServices[service.key as keyof typeof linkedResident.allowedServices];
                const isAuthorized = linkedResident?.serviceAuthorizations?.[service.key as keyof typeof linkedResident.serviceAuthorizations] ?? isAllowedByFacility ?? false;
                
                return (
                  <div key={service.key} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{service.label}</h3>
                      <div className="flex items-center space-x-4">
                        {user?.role === 'POA' && (
                          <label className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Enable Service:</span>
                            <input
                              type="checkbox"
                              checked={isAllowedByFacility}
                              onChange={(e) => handleServiceSettingChange(service.key as any, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                        )}
                        
                        
                        
                        {user?.role !== 'POA' && (
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            isAllowedByFacility 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            Service: {isAllowedByFacility ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </div>
                    </div>
                    
          
                  </div>
                );
              })}
              
              
              
               <button
        onClick={(e) => {
          e.stopPropagation(); // Added this to prevent event bubbling
          setShowServiceSettings(false);
        }}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Close Settings
      </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Auth Debit Form Modal */}
      {showPreAuthForm && linkedResident && (
        <PreAuthDebitForm
          residentId={linkedResident.id}
          onClose={() => setShowPreAuthForm(false)}
          onSuccess={() => {
            // Form will automatically refresh the display since we're using useData
          }}
        />
      )}

      {/* Online Payment Modal */}
      {showOnlinePayment && linkedResident && residentFacility && (
        <OnlinePaymentModal
          residentId={linkedResident.id}
          facilityId={residentFacility.id}
          onClose={() => setShowOnlinePayment(false)}
          onSuccess={() => {
            setShowOnlinePayment(false);
          }}
        />
      )}
    </div>
  );
}