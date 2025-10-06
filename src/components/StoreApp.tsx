import React, { useState } from 'react';
import { Home, Scan, LogOut, Store, BarChart3, User, Receipt, DollarSign, ArrowLeftRight } from 'lucide-react';
import { useStoreAuth } from '../context/StoreAuthContext';
import StoreDashboard from './StoreDashboard';
import StorePOS from './StorePOS';
import EnhancedStorePOS from './EnhancedStorePOS';
import StoreAccountsView from './StoreAccountsView';
import ReturnsExchange from './ReturnsExchange';

interface StoreAppProps {
  onBackToModeSelection?: () => void;
}

function StoreApp({ onBackToModeSelection }: StoreAppProps) {
  const { user, logout } = useStoreAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'enhanced-pos', icon: Receipt, label: 'Enhanced POS' },
    { id: 'returns', icon: ArrowLeftRight, label: 'Returns & Exchange' },
    { id: 'accounts', icon: DollarSign, label: 'Accounts' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <StoreDashboard />;
      case 'enhanced-pos':
        return <EnhancedStorePOS />;
      case 'returns':
        return <ReturnsExchange />;
      case 'accounts':
        return <StoreAccountsView />;
      default:
        return <StoreDashboard />;
    }
  };

  const handleLogout = async () => {
    await logout();
    if (onBackToModeSelection) {
      onBackToModeSelection();
    }
  };

  if (!user) {
    return null; // This should not happen as the parent component handles authentication
  }

  return (
    <div className="min-h-screen bg-brand-white-dark">
      {/* Header */}
      <header className="bg-brand-white shadow-modern-lg border-b border-modern-100 sticky top-0 z-40">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow animate-pulse-yellow">
                <Store className="text-brand-black text-xl font-bold" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-brand-black tracking-tight">
                  {user.store_name} <span className="text-gradient-yellow">Store</span>
                </h1>
                <p className="text-modern-600 text-sm font-medium">Store Management System</p>
              </div>
            </div>
            
            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-4 py-2 bg-modern-50 rounded-xl">
                <div className="w-8 h-8 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-black" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-black">{user.user_name}</p>
                  <p className="text-xs text-modern-600 capitalize">{user.user_role}</p>
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
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-brand-white shadow-modern-xl h-screen sticky top-0 border-r border-modern-100">
          <div className="p-6">
            <div className="mb-8">
              <h3 className="text-modern-500 text-xs font-bold uppercase tracking-wider mb-4">Store Navigation</h3>
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
                      <Icon 
                        size={20} 
                        className={`transition-all duration-200 ${
                          isActive 
                            ? 'text-brand-black scale-110' 
                            : 'text-modern-600 group-hover:text-brand-black group-hover:scale-105'
                        }`} 
                      />
                    </div>
                    <span className={`font-semibold transition-all duration-200 ${
                      isActive ? 'text-brand-black' : 'text-modern-600 group-hover:text-brand-black'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Store Info Panel */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-modern-100">
            <div className="card-modern bg-gradient-to-br from-brand-yellow/10 to-brand-yellow/5 border-brand-yellow/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 gradient-yellow rounded-lg flex items-center justify-center">
                  <Store size={16} className="text-brand-black" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-black">{user.store_name}</p>
                  <p className="text-xs text-modern-600">Store System</p>
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
  );
}

export default StoreApp;
