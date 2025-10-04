import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sendRoleBasedResetPasswordEmail } from '../services/database';

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotRole, setForgotRole] = useState<'OM' | 'POA' | 'Resident' | 'Vendor'>('POA');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const ok = await login(formData.email.trim(), formData.password);
      if (!ok) {
        setError('Invalid credentials. Please try again.');
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
          <p className="text-gray-600">Secure access to resident trust accounts</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              {isLoading ? 'Please wait...' : 'Sign In'}
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          {(
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