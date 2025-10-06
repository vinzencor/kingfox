import React, { useState } from 'react';
import { Store, Settings } from 'lucide-react';
import App from '../App';
import StoreLogin from './StoreLogin';
import StoreApp from './StoreApp';
import { StoreAuthProvider, useStoreAuth } from '../context/StoreAuthContext';

type AppMode = 'admin' | 'store';

function AppModeSelector({ onModeSelect }: { onModeSelect: (mode: AppMode) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-white-dark to-modern-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 gradient-yellow rounded-3xl flex items-center justify-center shadow-yellow-glow animate-pulse-yellow mx-auto mb-8">
            <span className="text-brand-black text-3xl font-bold">W</span>
          </div>
          <h1 className="text-5xl font-bold text-brand-black mb-4">
            Warehouse <span className="text-gradient-yellow">Pro</span>
          </h1>
          <p className="text-modern-600 text-xl font-medium">Choose your access level</p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Mode */}
          <button
            onClick={() => onModeSelect('admin')}
            className="card-modern group hover:shadow-modern-xl transition-all duration-300 hover:scale-105 p-8"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-brand-black mb-3">Admin Dashboard</h3>
              <p className="text-modern-600 font-medium mb-4">
                Full system access for warehouse management, inventory control, and store administration
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Products</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Stores</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Inventory</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Analytics</span>
              </div>
            </div>
          </button>

          {/* Store Mode */}
          <button
            onClick={() => onModeSelect('store')}
            className="card-modern group hover:shadow-modern-xl transition-all duration-300 hover:scale-105 p-8"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Store className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-brand-black mb-3">Store Access</h3>
              <p className="text-modern-600 font-medium mb-4">
                Store-specific dashboard with POS system, inventory tracking, and sales management
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">POS System</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Sales</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Stock</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Reports</span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-modern-500 text-sm">
            Select the appropriate access level for your role
          </p>
        </div>
      </div>
    </div>
  );
}

function StoreInterface({ onBackToModeSelection }: { onBackToModeSelection?: () => void }) {
  const { isAuthenticated } = useStoreAuth();

  if (!isAuthenticated) {
    return <StoreLogin onLoginSuccess={() => {}} onBackToModeSelection={onBackToModeSelection} />;
  }

  return <StoreApp onBackToModeSelection={onBackToModeSelection} />;
}

function AppRouter() {
  const [appMode, setAppMode] = useState<AppMode | null>(null);

  const handleModeSelect = (mode: AppMode) => {
    setAppMode(mode);
  };

  const handleBackToModeSelection = () => {
    setAppMode(null);
  };

  if (!appMode) {
    return <AppModeSelector onModeSelect={handleModeSelect} />;
  }

  if (appMode === 'admin') {
    return <App onBackToModeSelection={handleBackToModeSelection} />;
  }

  if (appMode === 'store') {
    return (
      <StoreAuthProvider>
        <StoreInterface onBackToModeSelection={handleBackToModeSelection} />
      </StoreAuthProvider>
    );
  }

  return null;
}

export default AppRouter;
