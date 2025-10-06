import React, { useState, useEffect } from 'react';
import { Settings, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
  onBackToModeSelection?: () => void;
}

function AdminLogin({ onLoginSuccess, onBackToModeSelection }: AdminLoginProps) {
  const { login, loading, error, isAuthenticated } = useAdminAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await login(formData.email, formData.password);
    if (success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-white-dark to-modern-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-6">
            <Settings className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-brand-black mb-2">
            Admin <span className="text-blue-600">Login</span>
          </h1>
          <p className="text-modern-600 text-lg font-medium">Access the admin dashboard</p>
        </div>

        {/* Login Form */}
        <div className="card-modern">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Global Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-modern-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter admin email"
                  className={`input-modern pl-12 ${formErrors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {formErrors.email && (
                <p className="text-red-500 text-sm mt-1 font-medium">{formErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-modern-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  className={`input-modern pl-12 pr-12 ${formErrors.password ? 'border-red-300 focus:border-red-500' : ''}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-modern-400 hover:text-modern-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-sm mt-1 font-medium">{formErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Sign In to Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-modern-100">
            <div className="flex justify-between items-center">
              <p className="text-modern-500 text-sm">
                Administrator access only
              </p>
              {onBackToModeSelection && (
                <button
                  onClick={onBackToModeSelection}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Back to Mode Selection
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Demo Credentials Info */}
        <div className="mt-6 card-modern bg-gradient-to-br from-blue-50 to-blue-25 border-blue-200">
          <div className="text-center">
            <p className="text-sm font-semibold text-blue-800 mb-2">Admin Access</p>
            <p className="text-xs text-blue-600">
              Use your administrator credentials to access the system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
