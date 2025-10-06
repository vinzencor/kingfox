import React, { useState } from 'react';
import { Package, Store, BarChart3, Scan, Home, Camera, User, LogOut, TrendingUp, Receipt, Users, DollarSign, ArrowLeftRight } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProductManagement from './components/ProductManagement';
import BarcodeManagement from './components/BarcodeManagement';
import StoreManagement from './components/StoreManagement';
import POSSystem from './components/POSSystem';
import PhotoManagement from './components/PhotoManagement';
import AdminLogin from './components/AdminLogin';
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard';
import EnhancedStorePOS from './components/EnhancedStorePOS';
import CustomerManagement from './components/CustomerManagement';
import StoreAccounts from './components/StoreAccounts';
import ReturnsExchange from './components/ReturnsExchange';
import { SupabaseInventoryProvider } from './context/SupabaseInventoryContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

interface AppProps {
  onBackToModeSelection?: () => void;
}

function AdminInterface({ onBackToModeSelection }: AppProps) {
  const { user, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    logout();
    if (onBackToModeSelection) {
      onBackToModeSelection();
    }
  };

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'analytics', icon: TrendingUp, label: 'Enhanced Analytics' },
    { id: 'products', icon: Package, label: 'Products' },
    { id: 'barcodes', icon: BarChart3, label: 'Barcodes' },
    { id: 'stores', icon: Store, label: 'Stores' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'accounts', icon: DollarSign, label: 'Store Accounts' },
    { id: 'returns', icon: ArrowLeftRight, label: 'Returns & Exchange' },
    { id: 'photos', icon: Camera, label: 'Photos' },
    { id: 'pos', icon: Scan, label: 'POS System' },
    { id: 'enhanced-pos', icon: Receipt, label: 'Enhanced POS' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'analytics':
        return <EnhancedAdminDashboard />;
      case 'products':
        return <ProductManagement />;
      case 'barcodes':
        return <BarcodeManagement />;
      case 'stores':
        return <StoreManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'accounts':
        return <StoreAccounts />;
      case 'returns':
        return <ReturnsExchange />;
      case 'photos':
        return <PhotoManagement />;
      case 'pos':
        return <POSSystem />;
      case 'enhanced-pos':
        return <EnhancedStorePOS />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SupabaseInventoryProvider>
      <div className="min-h-screen bg-brand-white-dark">
        {/* Header */}
        <header className="bg-brand-white shadow-modern-lg border-b border-modern-100 sticky top-0 z-40">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow animate-pulse-yellow">
                  <span className="text-brand-black text-xl font-bold">W</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-brand-black tracking-tight">
                    Warehouse <span className="text-gradient-yellow">Pro</span>
                  </h1>
                  <p className="text-modern-600 text-sm font-medium">Advanced Management System</p>
                </div>
              </div>

              {/* Admin Profile & Logout */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 px-4 py-2 bg-modern-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-black">{user?.name}</p>
                    <p className="text-xs text-modern-600">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-outline flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 bg-modern-50 px-4 py-2 rounded-xl">
                  <div className="w-2 h-2 bg-accent-success rounded-full animate-pulse"></div>
                  <span className="text-modern-700 text-sm font-medium">System Online</span>
                </div>
                <div className="w-10 h-10 gradient-black rounded-xl flex items-center justify-center shadow-modern">
                  <span className="text-brand-white text-sm font-bold">A</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-72 bg-brand-white shadow-modern-xl h-screen sticky top-0 border-r border-modern-100">
            <div className="p-6">
              <div className="mb-8">
                <h3 className="text-modern-500 text-xs font-bold uppercase tracking-wider mb-4">Navigation</h3>
              </div>
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full nav-item ${
                        isActive ? 'nav-item-active' : 'nav-item-inactive'
                      } group`}
                    >
                      <div className={`p-2 rounded-lg transition-all duration-200 ${
                        isActive ? 'bg-brand-black/10' : 'group-hover:bg-modern-100'
                      }`}>
                        <Icon size={20} className={isActive ? 'text-brand-black' : 'text-modern-500 group-hover:text-brand-black'} />
                      </div>
                      <span className="text-base">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-brand-yellow rounded-full shadow-yellow-glow"></div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-modern-100">
              <div className="card-modern bg-gradient-to-br from-brand-yellow/10 to-brand-yellow/5 border-brand-yellow/20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 gradient-yellow rounded-lg flex items-center justify-center">
                    <Package size={16} className="text-brand-black" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-black">Pro Version</p>
                    <p className="text-xs text-modern-600">All features unlocked</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </SupabaseInventoryProvider>
  );
}

function App({ onBackToModeSelection }: AppProps) {
  return (
    <AdminAuthProvider>
      <AdminAppWrapper onBackToModeSelection={onBackToModeSelection} />
    </AdminAuthProvider>
  );
}

function AdminAppWrapper({ onBackToModeSelection }: AppProps) {
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => {}} onBackToModeSelection={onBackToModeSelection} />;
  }

  return <AdminInterface onBackToModeSelection={onBackToModeSelection} />;
}

export default App;