import React, { useState, useEffect } from 'react';
import { Building2, Users, Plus, Settings, Eye, Mail, Phone, MapPin, Calendar, ArrowLeft, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContextSupabase';
import { useAuth } from '../contexts/AuthContext';
import { Facility, User } from '../types';
import OMDashboard from './OMDashboard';



export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'managers' | 'dashboards' | 'facility-dashboard'>('overview');
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [showAddManager, setShowAddManager] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [viewingFacility, setViewingFacility] = useState<Facility | null>(null);
  const [showEditFacility, setShowEditFacility] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  const [facilityForm, setFacilityForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    officeManagerEmail: ''
  });
  const [managerForm, setManagerForm] = useState({
    facilityId: '',
    email: '',
    name: ''
  });
  const [showAddAdditionalManager, setShowAddAdditionalManager] = useState(false);
  const [additionalManagerForm, setAdditionalManagerForm] = useState({
    facilityId: '',
    email: '',
    name: ''
  });

  // Add state for Connect accounts


  const { 
    facilities, 
    getFacilityResidents, 
    getFacilityTransactions, 
    addFacility, 
    updateFacility,
    addAssignment,
    deleteAssignment,
    assignments,
    getFacilityAssignments,
    getTotalTrustBalance,
    sendInviteByEmail,
    provisionUser,
    listOfficeManagers,
    clearOfficeManagerFacility
  } = useData();
  const { createOfficeManagerAccount } = useData();
  const { user, logout, setCurrentFacility } = useAuth();

  // OM listing state
  const [omUsers, setOmUsers] = useState<User[]>([]);
  const [isLoadingOms, setIsLoadingOms] = useState<boolean>(false);
  const reloadOms = async () => {
    try {
      setIsLoadingOms(true);
      const list = await listOfficeManagers();
      setOmUsers(list);
    } catch (e) {
    } finally {
      setIsLoadingOms(false);
    }
  };
  useEffect(() => {
    // Load once on mount; also when facilities list changes (names)
    reloadOms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities.length]);

  // Role guard: Only Admins can access this page
  if (user?.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const totalFacilities = facilities.length;
  const totalResidents = facilities.reduce((sum, f) => sum + getFacilityResidents(f.id).length, 0);

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!managerForm.facilityId || !managerForm.email || !managerForm.name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Directly create OM in auth and public users (no email)
      await createOfficeManagerAccount(managerForm.facilityId, managerForm.email, managerForm.name);

      // Optionally record assignment locally
      addAssignment({
        facilityId: managerForm.facilityId,
        managerEmail: managerForm.email,
        managerName: managerForm.name,
        assignedBy: user?.id || 'admin',
        status: 'active'
      });

      alert(`Manager ${managerForm.name} has been created and assigned. No email was sent.`);
    } catch (error) {
      alert(`There was an error processing the manager assignment.`);
    }
    
    // Reset form and close modal
    setManagerForm({ facilityId: '', email: '', name: '' });
    setShowAddManager(false);
  };

  const handleAddAdditionalManager = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!additionalManagerForm.facilityId || !additionalManagerForm.email || !additionalManagerForm.name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Direct creation in auth and public users
      await createOfficeManagerAccount(additionalManagerForm.facilityId, additionalManagerForm.email, additionalManagerForm.name);
      
      // Add the assignment to the data store
      addAssignment({
        facilityId: additionalManagerForm.facilityId,
        managerEmail: additionalManagerForm.email,
        managerName: additionalManagerForm.name,
        assignedBy: user?.id || 'admin',
        status: 'active'
      });
      
      alert(`Additional manager ${additionalManagerForm.name} has been created and assigned. No email was sent.`);
    } catch (error) {
      alert(`There was an error adding the additional manager.`);
    }
    
    // Reset form and close modal
    setAdditionalManagerForm({ facilityId: '', email: '', name: '' });
    setShowAddAdditionalManager(false);
  };

  const handleViewFacilityDashboard = (facility: Facility) => {
    setViewingFacility(facility);
    setCurrentFacility(facility);
    setActiveView('facility-dashboard');
  };

  const handleEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setFacilityForm({
      name: facility.name,
      address: facility.address,
      phone: facility.phone || '',
      email: facility.email,
      officeManagerEmail: facility.officeManagerEmail || ''
    });
    setShowEditFacility(true);
  };

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!facilityForm.name || !facilityForm.address) {
      alert('Please fill in all required fields (Name and Address)');
      return;
    }

    // Add the facility first
    const facility = await addFacility({
      name: facilityForm.name,
      address: facilityForm.address,
      phone: facilityForm.phone || undefined,
      email: facilityForm.email || '',
      officeManagerEmail: facilityForm.officeManagerEmail || '',
      status: 'active'
    });

    // Only create and send signup invitation if Office Manager email is provided
    if (facilityForm.officeManagerEmail) {
      try {
        await provisionUser({
          email: facilityForm.officeManagerEmail,
          role: 'OM',
          name: facilityForm.name,
          communityName: facilityForm.name,
          companyId: user?.companyId
        });
        alert(`Facility "${facilityForm.name}" has been added successfully. OM account created with community-name password. Ask them to reset it.`);
      } catch (error) {
        alert(`Facility "${facilityForm.name}" has been added successfully, but there was an error provisioning the OM user.`);
      }
    } else {
      alert(`Facility "${facilityForm.name}" has been added successfully. You can assign an office manager later if needed.`);
    }
    
    // Reset form and close modal
    setFacilityForm({ name: '', address: '', phone: '', email: '', officeManagerEmail: '' });
    setShowAddFacility(false);
  };

  const handleUpdateFacility = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingFacility || !facilityForm.name || !facilityForm.address) {
      alert('Please fill in all required fields (Name and Address)');
      return;
    }

    updateFacility(editingFacility.id, {
      name: facilityForm.name,
      address: facilityForm.address,
      phone: facilityForm.phone || undefined,
      email: facilityForm.email,
      officeManagerEmail: facilityForm.officeManagerEmail
    });
    
    // Reset form and close modal
    setFacilityForm({ name: '', address: '', phone: '', email: '', officeManagerEmail: '' });
    setEditingFacility(null);
    setShowEditFacility(false);
    
    alert(`Facility "${facilityForm.name}" has been updated successfully.`);
  };

  const handleBackToAdmin = () => {
    setViewingFacility(null);
    setCurrentFacility(null);
    setActiveView('overview');
  };

  const handleRemoveOm = async (userId: string, managerName: string, facilityName: string) => {
    const confirmed = window.confirm(`Remove ${managerName} from ${facilityName || 'No Facility'}? This will clear their facility access.`);
    if (!confirmed) return;
    try {
      await clearOfficeManagerFacility(userId);
      await reloadOms();
      alert(`${managerName} access cleared.`);
    } catch (e) {
      alert('Failed to remove access.');
    }
  };

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
        <div className={`p-3 rounded-full ${color === 'red' ? 'bg-red-100' : color === 'blue' ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Icon className={`w-6 h-6 ${color === 'red' ? 'text-red-600' : color === 'blue' ? 'text-blue-600' : 'text-gray-600'}`} />
        </div>
      </div>
    </div>
  );

  // Payment status component
  const FacilityConnectStatus = ({ facility }: { facility: Facility }) => {
    return (
      <div className="flex items-center text-xs text-green-600">
        <CheckCircle className="w-3 h-3 mr-1" />
        Payment Ready
      </div>
    );
  };

  // If viewing a specific facility dashboard, show that instead
  if (activeView === 'facility-dashboard' && viewingFacility) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header for facility dashboard */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAdmin}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Admin</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Viewing: {viewingFacility.name}
                </h1>
                <p className="text-gray-600 mt-1">Admin view of facility dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>
        <OMDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Administrator</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddFacility(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility</span>
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
            { key: 'dashboards', label: 'Facility Dashboards' },
            { key: 'managers', label: 'Office Managers' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeView === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
            {/* Stats - Removed Total Transactions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard
                title="Total Facilities"
                value={totalFacilities}
                icon={Building2}
                color="blue"
              />
              <StatCard
                title="Total Residents"
                value={totalResidents}
                icon={Users}
                color="green"
              />
            </div>

            {/* Recent Facilities with Unique Codes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Facilities</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {facilities.slice(0, 5).map(facility => {
                  const residents = getFacilityResidents(facility.id);
                  const transactions = getFacilityTransactions(facility.id);
                  return (
                    <div key={facility.id} className="p-6 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-3">
                          <p className="font-medium text-gray-900">{facility.name}</p>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {facility.uniqueCode}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{facility.address}</p>
                        {facility.phone && (
                          <p className="text-xs text-gray-500">{facility.phone}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {residents.length} residents
                        </p>
                        <div className="mt-1">
                          <FacilityConnectStatus facility={facility} />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          facility.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {facility.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === 'dashboards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Facility Dashboards</h2>
                <p className="text-gray-600 mt-2">View and manage individual facility dashboards</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {facilities.map(facility => {
                  const residents = getFacilityResidents(facility.id);
                  
                  return (
                    <div key={facility.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{facility.name}</h3>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {facility.uniqueCode}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{facility.address}</p>
                        {facility.phone && (
                          <p className="text-sm text-gray-500">{facility.phone}</p>
                        )}
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Residents:</span>
                          <span className="font-medium">{residents.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Trust Balance:</span>
                          <span className="font-medium text-green-600">${getTotalTrustBalance(facility.id).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Status:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            facility.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {facility.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Connect Account:</span>
                          <FacilityConnectStatus facility={facility} />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <button
                          onClick={() => handleViewFacilityDashboard(facility)}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Dashboard</span>
                        </button>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setAdditionalManagerForm({ ...additionalManagerForm, facilityId: facility.id });
                              setShowAddAdditionalManager(true);
                            }}
                            className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            + Manager
                          </button>
                          <button
                            onClick={() => handleEditFacility(facility)}
                            className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === 'managers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Office Managers</h2>
                <p className="text-gray-600 mt-1">List of users with OM role and their assigned facilities. Remove to clear access.</p>
                <button
                  onClick={() => setShowAddManager(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Manager</span>
                </button>                  
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoadingOms && (
                      <tr>
                        <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>Loading…</td>
                      </tr>
                    )}
                    {!isLoadingOms && omUsers.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>No office managers found.</td>
                      </tr>
                    )}
                    {!isLoadingOms && omUsers.map((om) => {
                      const fac = om.facilityId ? facilities.find(f => f.id === om.facilityId) : null;
                      return (
                        <tr key={om.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{om.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{om.email}</td>
                          <td className="px-4 py-3 text-sm">
                            {fac ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-900">{fac.name}</span>
                                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{fac.uniqueCode}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">No Facility</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveOm(om.id, om.name || om.email, fac?.name || '')}
                              className="inline-flex items-center text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm"
                              title="Remove access (clear facility)"
                              disabled={!om.facilityId}
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Facility Modal */}
      {showAddFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Facility</h2>
            </div>
            <form onSubmit={handleAddFacility} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facility Name *</label>
                <input
                  type="text"
                  value={facilityForm.name}
                  onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter facility name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  rows={2}
                  value={facilityForm.address}
                  onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={facilityForm.phone}
                  onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(xxx) xxx-xxxx (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={facilityForm.email}
                  onChange={(e) => setFacilityForm({ ...facilityForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="facility@email.com (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Office Manager Email</label>
                <input
                  type="email"
                  value={facilityForm.officeManagerEmail}
                  onChange={(e) => setFacilityForm({ ...facilityForm, officeManagerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="manager@email.com (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">If provided, a signup invitation will be sent to this email address</p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFacility(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manager Modal */}
      {showAddManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Assign Office Manager</h2>
            </div>
            <form onSubmit={handleAssignManager} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Facility *</label>
                <select
                  value={managerForm.facilityId}
                  onChange={(e) => setManagerForm({ ...managerForm, facilityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose facility...</option>
                  {facilities.map(facility => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} ({facility.uniqueCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager Email *</label>
                <input
                  type="email"
                  value={managerForm.email}
                  onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="manager@facility.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager Name *</label>
                <input
                  type="text"
                  value={managerForm.name}
                  onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter manager's full name"
                  required
                />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm">
                  The Office Manager will receive login credentials and can manage residents and POAs for this facility.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddManager(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Assign Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Additional Manager Modal */}
      {showAddAdditionalManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Additional Office Manager</h2>
            </div>
            <form onSubmit={handleAddAdditionalManager} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager Email *</label>
                <input
                  type="email"
                  value={additionalManagerForm.email}
                  onChange={(e) => setAdditionalManagerForm({ ...additionalManagerForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="manager@facility.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager Name *</label>
                <input
                  type="text"
                  value={additionalManagerForm.name}
                  onChange={(e) => setAdditionalManagerForm({ ...additionalManagerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter manager's full name"
                  required
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  This person will receive the same Office Manager access as the primary manager for this facility. A signup invitation will be sent to their email.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAdditionalManager(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Facility Modal */}
      {showEditFacility && editingFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Facility</h2>
            </div>
            <form onSubmit={handleUpdateFacility} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facility Name *</label>
                <input
                  type="text"
                  value={facilityForm.name}
                  onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter facility name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  rows={2}
                  value={facilityForm.address}
                  onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={facilityForm.phone}
                  onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(xxx) xxx-xxxx (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facility Email</label>
                <input
                  type="email"
                  value={facilityForm.email}
                  onChange={(e) => setFacilityForm({ ...facilityForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="facility@email.com (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Office Manager Email</label>
                <input
                  type="email"
                  value={facilityForm.officeManagerEmail}
                  onChange={(e) => setFacilityForm({ ...facilityForm, officeManagerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="manager@email.com (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">Current Office Manager's email address</p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditFacility(false);
                    setEditingFacility(null);
                    setFacilityForm({ name: '', address: '', phone: '', email: '', officeManagerEmail: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}