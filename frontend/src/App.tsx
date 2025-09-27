import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContextSupabase';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import OMDashboard from './components/OMDashboard';
import POADashboard from './components/POADashboard';
import VendorDashboard from './components/VendorDashboard';
import ResetPasswordOM from './components/ResetPasswordOM';
import ResetPasswordResident from './components/ResetPasswordResident';
import ResetPasswordVendor from './components/ResetPasswordVendor';

function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">Your account role is not recognized or you do not have access.</p>
      </div>
    </div>
  );
}

function LandingOrRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <LandingPage />;
  if (user?.role === 'Admin') return <Navigate to="/dashboard/admin" replace />;
  if (user?.role === 'OM') return <Navigate to="/dashboard/om" replace />;
  if (user?.role === 'POA' || user?.role === 'Resident') return <Navigate to="/dashboard/poa" replace />;
  if (user?.role === 'Vendor') return <Navigate to="/dashboard/vendor" replace />;
  return <AccessDenied />;
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Array<'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor'> }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && (!user?.role || !roles.includes(user.role as any))) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

const componentModules: Record<string, () => Promise<{ default: React.ComponentType<any> }>> = import.meta.glob('./components/*.tsx');

function ComponentsIndex() {
  const links = useMemo(() => {
    return Object.keys(componentModules)
      .map((path) => path.replace('./components/', '').replace('.tsx', ''))
      .sort();
  }, []);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Components</h1>
      <ul className="list-disc list-inside space-y-1">
        {links.map((name) => (
          <li key={name}>
            <Link className="text-blue-600 hover:underline" to={`/components/${name}`}>{name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DynamicComponentPage() {
  const { name } = useParams();
  const [LoadedComponent, setLoadedComponent] = useState<React.ComponentType<any> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoadedComponent(null);
    setErrorMessage(null);
    if (!name) return;
    const key = `./components/${name}.tsx`;
    const loader = componentModules[key];
    if (!loader) {
      setErrorMessage(`Component not found: ${name}`);
      return;
    }
    loader()
      .then((mod) => {
        if (mod && mod.default) {
          setLoadedComponent(() => mod.default);
        } else {
          setErrorMessage(`No default export in ${name}`);
        }
      })
      .catch((err) => {
        setErrorMessage(String(err?.message || err));
      });
  }, [name]);

  if (errorMessage) {
    return (
      <div className="p-6">
        <p className="text-red-600">{errorMessage}</p>
        <div className="mt-3">
          <Link className="text-blue-600 hover:underline" to="/components">Back to list</Link>
        </div>
      </div>
    );
  }

  if (!LoadedComponent) {
    return (
      <div className="p-6 text-gray-600">Loading component...</div>
    );
  }

  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <LoadedComponent />
    </Suspense>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<LandingOrRedirect />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/reset-password/om" element={<ResetPasswordOM />} />
      <Route path="/reset-password/resident" element={<ResetPasswordResident />} />
      <Route path="/reset-password/resident/" element={<ResetPasswordResident />} />
      <Route path="/reset-password/vendor" element={<ResetPasswordVendor />} />

      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/om"
        element={
          <ProtectedRoute roles={['OM']}>
            <OMDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/poa"
        element={
          <ProtectedRoute roles={['POA', 'Resident']}>
            <POADashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/vendor"
        element={
          <ProtectedRoute roles={['Vendor']}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/components"
        element={
          <ProtectedRoute>
            <ComponentsIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="/components/:name"
        element={
          <ProtectedRoute>
            <DynamicComponentPage />
          </ProtectedRoute>
        }
      />

      <Route path="/unauthorized" element={<AccessDenied />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
      useEffect(() => {
    const preventScroll = (event: WheelEvent) => {
      if ((document.activeElement as HTMLInputElement)?.type === "number") {
        event.preventDefault();
      }
    };

    document.addEventListener("wheel", preventScroll, { passive: false });
    return () => document.removeEventListener("wheel", preventScroll);
  }, []);
  
  return (
  <AuthProvider>
    <DataProvider>
      <AppContent />
    </DataProvider>
  </AuthProvider>
);
}

export default App;