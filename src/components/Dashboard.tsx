import React, { useState, useEffect } from 'react';
import { Package, Store, TrendingUp, AlertTriangle, BarChart3, ShoppingCart, DollarSign, Activity } from 'lucide-react';
import { useSupabaseInventory } from '../context/SupabaseInventoryContext';
import { supabase } from '../lib/supabase';

function Dashboard() {
  const { categories, stores, sizes, loading, error, getTotalStock, getStoreStock } = useSupabaseInventory();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const totalProducts = categories.reduce((total, cat) => total + cat.variants.length, 0);
  const totalStock = getTotalStock();
  const totalStores = stores.length;
  const totalStoreStock = stores.reduce((total, store) => total + getStoreStock(store.id), 0);

  const lowStockItems = categories.flatMap(cat =>
    cat.variants.flatMap(variant =>
      variant.colors.flatMap(color =>
        Object.entries(color.sizes).filter(([_, stock]) => stock > 0 && stock < 10).map(([sizeId, stock]) => ({
          category: cat.name,
          variant: variant.name,
          color: color.name,
          size: sizes.find(s => s.id === sizeId)?.name || sizeId.toUpperCase(),
          stock
        }))
      )
    )
  );

  // Load sales data and recent activity
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // Load recent sales transactions
        const { data: sales, error: salesError } = await supabase
          .from('sales_transactions')
          .select(`
            *,
            stores (name, location),
            variants (name, categories (name)),
            colors (name),
            sizes (name)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (salesError) throw salesError;
        setSalesData(sales || []);

        // Calculate total revenue from today
        const today = new Date().toISOString().split('T')[0];
        const { data: todaysSales, error: revenueError } = await supabase
          .from('sales_transactions')
          .select('total_amount')
          .gte('created_at', today);

        if (revenueError) throw revenueError;
        const revenue = (todaysSales || []).reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
        setTotalRevenue(revenue);

        // Create recent activity from various sources
        const activities = [];

        // Add recent sales
        (sales || []).slice(0, 3).forEach(sale => {
          activities.push({
            type: 'sale',
            title: 'Sale Completed',
            description: `${sale.variants?.name} sold at ${sale.stores?.name}`,
            time: sale.created_at,
            amount: sale.total_amount,
            icon: ShoppingCart,
            color: 'accent-success'
          });
        });

        // Add recent categories (mock data for demo)
        if (categories.length > 0) {
          activities.push({
            type: 'product',
            title: 'Product Category Active',
            description: `${categories[0].name} category with ${categories[0].variants.length} variants`,
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            icon: Package,
            color: 'brand-yellow'
          });
        }

        // Sort by time and take most recent
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 5));

      } catch (err) {
        console.error('Error loading analytics:', err);
      }
    };

    if (!loading && categories.length > 0) {
      loadAnalytics();
    }
  }, [loading, categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-yellow">
            <BarChart3 className="w-8 h-8 text-brand-black" />
          </div>
          <p className="text-modern-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern text-center py-16">
        <div className="w-16 h-16 bg-accent-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-accent-error" />
        </div>
        <h3 className="text-xl font-bold text-brand-black mb-2">Error Loading Dashboard</h3>
        <p className="text-modern-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h2 className="text-4xl font-bold text-brand-black mb-3">
          Command <span className="text-gradient-yellow">Center</span>
        </h2>
        <p className="text-modern-600 text-lg font-medium">Real-time warehouse intelligence and analytics</p>
      </div>

      {/* Hero Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Products Card */}
        <div className="card-modern group hover:scale-105 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 gradient-yellow opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Total Products</p>
              <p className="text-4xl font-bold text-brand-black mt-3 mb-2">{totalProducts}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-accent-success rounded-full"></div>
                <p className="text-sm text-accent-success font-medium">+2 this week</p>
              </div>
            </div>
            <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow group-hover:animate-pulse-yellow">
              <Package className="w-8 h-8 text-brand-black" />
            </div>
          </div>
        </div>

        {/* Warehouse Stock Card */}
        <div className="card-modern group hover:scale-105 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brand-black opacity-5 rounded-full -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Warehouse Stock</p>
              <p className="text-4xl font-bold text-brand-black mt-3 mb-2">{totalStock.toLocaleString()}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-accent-success rounded-full"></div>
                <p className="text-sm text-accent-success font-medium">+5% this month</p>
              </div>
            </div>
            <div className="w-16 h-16 gradient-black rounded-2xl flex items-center justify-center shadow-modern-lg group-hover:shadow-modern-xl transition-all duration-300">
              <TrendingUp className="w-8 h-8 text-brand-white" />
            </div>
          </div>
        </div>

        {/* Active Stores Card */}
        <div className="card-modern group hover:scale-105 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 gradient-yellow opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Active Stores</p>
              <p className="text-4xl font-bold text-brand-black mt-3 mb-2">{totalStores}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-accent-info rounded-full animate-pulse"></div>
                <p className="text-sm text-accent-info font-medium">All operational</p>
              </div>
            </div>
            <div className="w-16 h-16 bg-brand-white border-2 border-brand-yellow rounded-2xl flex items-center justify-center shadow-modern group-hover:shadow-yellow-glow transition-all duration-300">
              <Store className="w-8 h-8 text-brand-black" />
            </div>
          </div>
        </div>

        {/* Store Inventory Card */}
        <div className="card-modern group hover:scale-105 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brand-black opacity-5 rounded-full -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Store Inventory</p>
              <p className="text-4xl font-bold text-brand-black mt-3 mb-2">{totalStoreStock.toLocaleString()}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-brand-yellow rounded-full"></div>
                <p className="text-sm text-brand-yellow-dark font-medium">Distributed</p>
              </div>
            </div>
            <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center shadow-yellow-glow group-hover:animate-pulse-yellow">
              <ShoppingCart className="w-8 h-8 text-brand-black" />
            </div>
          </div>
        </div>

        {/* Today's Revenue Card */}
        <div className="card-modern group hover:scale-105 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-accent-success opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Today's Revenue</p>
              <p className="text-4xl font-bold text-brand-black mt-3 mb-2">${totalRevenue.toFixed(2)}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-accent-success rounded-full animate-pulse"></div>
                <p className="text-sm text-accent-success font-medium">Live tracking</p>
              </div>
            </div>
            <div className="w-16 h-16 bg-accent-success/10 border-2 border-accent-success/20 rounded-2xl flex items-center justify-center shadow-modern group-hover:shadow-lg transition-all duration-300">
              <DollarSign className="w-8 h-8 text-accent-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Alert */}
        <div className="card-modern relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-warning to-brand-yellow"></div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-brand-black">Stock Alerts</h3>
              <p className="text-modern-600 text-sm font-medium">Items requiring attention</p>
            </div>
            <div className="w-12 h-12 bg-accent-warning/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-accent-warning" />
            </div>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-yellow-glow">
                  <Package className="w-8 h-8 text-brand-black" />
                </div>
                <p className="text-modern-600 font-medium">All items are well stocked!</p>
                <p className="text-modern-500 text-sm">No action required</p>
              </div>
            ) : (
              lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-accent-warning/5 rounded-xl border border-accent-warning/20 hover:bg-accent-warning/10 transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-accent-warning rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-semibold text-brand-black">{item.category} - {item.variant}</p>
                      <p className="text-sm text-modern-600">{item.color} • Size {item.size}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-accent-warning">{item.stock}</span>
                    <p className="text-xs text-modern-500">units left</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Store Performance */}
        <div className="card-modern relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 gradient-yellow"></div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-brand-black">Store Performance</h3>
              <p className="text-modern-600 text-sm font-medium">Inventory distribution</p>
            </div>
            <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
              <BarChart3 className="w-6 h-6 text-brand-black" />
            </div>
          </div>
          <div className="space-y-6">
            {stores.map(store => {
              const storeStock = getStoreStock(store.id);
              const maxStock = Math.max(...stores.map(s => getStoreStock(s.id)), 1);
              const percentage = (storeStock / maxStock) * 100;

              return (
                <div key={store.id} className="group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 gradient-black rounded-xl flex items-center justify-center shadow-modern">
                        <Store className="w-5 h-5 text-brand-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-brand-black">{store.name}</p>
                        <p className="text-sm text-modern-600">{store.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-brand-black">{storeStock}</span>
                      <p className="text-xs text-modern-500">items</p>
                    </div>
                  </div>
                  <div className="w-full bg-modern-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="gradient-yellow h-3 rounded-full transition-all duration-500 shadow-yellow-glow group-hover:animate-pulse-yellow"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="card-modern relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 gradient-black"></div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-brand-black">Activity Timeline</h3>
            <p className="text-modern-600 text-sm font-medium">Recent system events</p>
          </div>
          <div className="flex items-center space-x-2 bg-modern-50 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 bg-accent-success rounded-full animate-pulse"></div>
            <span className="text-modern-700 text-sm font-medium">Live Updates</span>
          </div>
        </div>

        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 gradient-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-yellow-glow">
                <Activity className="w-8 h-8 text-brand-black" />
              </div>
              <p className="text-modern-600 font-medium">No recent activity</p>
              <p className="text-modern-500 text-sm">Activity will appear here as you use the system</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              const colorClass = activity.color === 'accent-success' ? 'accent-success' :
                               activity.color === 'brand-yellow' ? 'brand-yellow' : 'brand-black';

              const timeAgo = new Date(activity.time) ?
                Math.floor((Date.now() - new Date(activity.time).getTime()) / (1000 * 60 * 60)) : 0;

              return (
                <div key={index} className={`flex items-start space-x-4 p-4 bg-${colorClass}/5 rounded-xl border-l-4 border-${colorClass} hover:bg-${colorClass}/10 transition-all duration-200 group`}>
                  <div className={`w-12 h-12 bg-${colorClass}/10 rounded-xl flex items-center justify-center group-hover:bg-${colorClass}/20 transition-all duration-200`}>
                    <Icon className={`w-6 h-6 text-${colorClass}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-brand-black">{activity.title}</p>
                      <span className="text-sm text-modern-500 font-medium">
                        {timeAgo > 0 ? `${timeAgo}h ago` : 'Just now'}
                      </span>
                    </div>
                    <p className="text-modern-600">{activity.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`px-2 py-1 bg-${colorClass}/10 rounded-lg`}>
                        <span className={`text-xs font-medium text-${colorClass === 'brand-yellow' ? 'brand-yellow-dark' : colorClass}`}>
                          {activity.type.toUpperCase()}
                        </span>
                      </div>
                      {activity.amount && (
                        <span className="text-lg font-bold text-accent-success">
                          ${parseFloat(activity.amount).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;