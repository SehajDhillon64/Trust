import React, { useEffect, useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, UserCircle, Calendar, Building2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContextSupabase';
import { Facility } from '../types';
import { getFacilities, sendRoleBasedResetPasswordEmail } from '../services/database';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotRole, setForgotRole] = useState<'OM' | 'POA' | 'Resident' | 'Vendor'>('POA');
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    token: '',
    name: '',
    confirmPassword: '',
    role: 'POA' as 'OM' | 'POA' | 'Resident',
    residentName: '',
    residentDob: '',
    facilityId: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, setupAccount, signup, isLoading, currentFacility } = useAuth();
  const { facilities } = useData();
  const [facilityOptions, setFacilityOptions] = useState<Facility[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadFacilities = async () => {
      try {
        const list = await getFacilities();
        if (mounted) setFacilityOptions(list);
      } catch (_) {
        // ignore
      }
    };
    // Prefer facilities from context when available (authenticated), else fetch publicly
    if (facilities && facilities.length > 0) {
      setFacilityOptions(facilities);
    } else {
      loadFacilities();
    }
    return () => { mounted = false };
  }, [facilities?.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    

    try {
      let success = false;
      
      if (isSetup) {
        
        success = await setupAccount(formData.token, formData.password);
      } else if (isLogin) {
        success = await login(formData.email, formData.password);
      } else {
        // Sign up mode
        
        if (!formData.name) {
          setError('Name is required for signup.');
          return;
        }
        // Validate role specific inputs
        if ((formData.role === 'POA' || formData.role === 'Resident')) {
          if (!formData.residentName || !formData.residentDob) {
            setError('Resident name and date of birth are required.');
            return;
          }
          if (!formData.facilityId && !currentFacility?.id) {
            setError('Please select a facility.');
            return;
          }
          if (!acceptedTerms) {
            setError('You must agree to the service conditions to continue.');
            return;
          }
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }
        
        
        
        success = await signup({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          facilityId: formData.facilityId || currentFacility?.id || '',
          residentName: formData.residentName || undefined,
          residentDob: formData.residentDob || undefined,
          termsAcceptedAt: acceptedTerms ? new Date().toISOString() : undefined,
          termsVersion: acceptedTerms ? 'v1' : undefined
        });
        
        
        
        if (success) {
          // Clear the form
          setFormData({
            email: formData.email, // Keep email for easy login
            password: '',
            token: '',
            name: '',
            confirmPassword: '',
            role: 'POA',
            residentName: '',
            residentDob: '',
            facilityId: ''
          });
          setAcceptedTerms(false);
          setSuccess('Account created successfully! You can now log in.');
          setIsLogin(true); // Switch to login mode
          return;
        } else {
          setError('Failed to create account. Please check the console for more details and try again.');
          return;
        }
      }

      if (!success) {
        const errorMsg = isLogin ? 'Invalid credentials. Please try again.' : 'Failed to create account. Please try again.';
        setError(errorMsg);
      }
    } catch (err) {
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (err instanceof Error) {
        
        
        // Provide more specific error messages based on the error
        const normalizedMsg = err.message.toLowerCase();
        if (normalizedMsg.includes('already registered') || normalizedMsg.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please log in or reset your password.';
        } else if (normalizedMsg.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (normalizedMsg.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please try a stronger password.';
        } else if (normalizedMsg.includes('network') || normalizedMsg.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    }
  };

  const sendReset = async () => {
    setError('');
    setSuccess('');
    if (!formData.email) {
      setError('Enter your email first');
      return;
    }
    try {
      await sendRoleBasedResetPasswordEmail({ email: formData.email, role: forgotRole });
      setSuccess('Reset email sent. Check your inbox.');
      setShowForgot(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Trust Account Manager
          </h1>
          <p className="text-gray-600">
            {isSetup ? 'Complete your account setup' : (isLogin ? 'Secure access to resident trust accounts' : 'Create your account to get started')}
          </p>
        </div>

        {!isSetup && !isLogin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              If you received an email invitation, please check your email for the setup link.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSetup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Setup Token
              </label>
              <input
                type="text"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter token from email"
                required
              />
            </div>
          )}

          {!isSetup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
          )}

          {!isSetup && !isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          {!isSetup && !isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['POA','Resident','OM'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r as any })}
                    className={`px-3 py-2 border rounded-lg text-sm ${formData.role === r ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isSetup && !isLogin && (formData.role === 'POA' || formData.role === 'Resident') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <UserCircle className="w-4 h-4 text-gray-500" />
                    <span>Resident Name</span>
                  </label>
                  <input
                    type="text"
                    value={formData.residentName}
                    onChange={(e) => setFormData({ ...formData, residentName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Resident full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Date of Birth</span>
                  </label>
                  <input
                    type="date"
                    value={formData.residentDob}
                    onChange={(e) => setFormData({ ...formData, residentDob: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span>Facility</span>
                  </label>
                  <select
                    value={formData.facilityId || currentFacility?.id || ''}
                    onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="" disabled>Select facility</option>
                    {(currentFacility ? [currentFacility] : facilityOptions).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {!showForgot && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          )}

          {!showForgot && !isSetup && !isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {!showForgot && !isSetup && !isLogin && (
            <div className="flex items-start space-x-2">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1"
                required
              />
              <label htmlFor="accept-terms" className="text-sm text-gray-700">
                I agree to the
                <button type="button" onClick={() => setShowTerms(true)} className="ml-1 text-blue-600 hover:text-blue-700 underline">
                  service conditions
                </button>
                .
              </label>
            </div>
          )}

          {showTerms && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowTerms(false)} />
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6">
                <button
                  type="button"
                  onClick={() => setShowTerms(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Conditions</h2>
                <div className="prose max-w-none h-72 overflow-y-auto text-sm text-gray-700 border rounded-md p-4">
                  <p>
                    By creating an account as a POA or Resident, you agree to our Terms of
                    Service and Privacy Policy. You consent to electronic communications and
                    acknowledge that your use of this system is for authorized purposes only.
                    You are responsible for maintaining the confidentiality of your credentials.
                  </p>
                  <p className="mt-3">
                    Data may be processed according to applicable regulations. For full details,
                    please review the official policy documents provided by your facility or
                    organization administrator.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-end space-x-3">
                  <button type="button" onClick={() => setShowTerms(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
                  <button
                    type="button"
                    onClick={() => { setAcceptedTerms(true); setShowTerms(false); }}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    I Agree
                  </button>
                </div>
              </div>
            </div>
          )}

          {showForgot && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                Choose your role so we can send the correct reset link.
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['POA','Resident','OM','Vendor'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForgotRole(r as any)}
                    className={`px-3 py-2 border rounded-lg text-sm ${forgotRole === r ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={sendReset}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700"
              >
                Send Reset Email
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {!showForgot && (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Please wait...' : (isSetup ? 'Complete Setup' : (isLogin ? 'Sign In' : 'Sign Up'))}
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          {!isSetup && (
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              {isLogin ? 'Need to set up your account?' : 'Already have an account? Sign in'}
            </button>
          )}
          
          {!isLogin && (
            <button
              onClick={() => setIsSetup(!isSetup)}
              className="block w-full mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Have a setup token? Click here
            </button>
          )}

          {isLogin && (
            <button
              onClick={() => setShowForgot(!showForgot)}
              className="block w-full mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              {showForgot ? 'Back to sign in' : 'Forgot your password?'}
            </button>
          )}
        </div>

        
      </div>
    </div>
  );
}