import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, DollarSign, ShoppingCart, BarChart3, Users, Clock, AlertTriangle } from 'lucide-react';
import { useStoreAuth } from '../context/StoreAuthContext';
import { supabase } from '../lib/supabase';

interface StoreMetrics {
  totalProducts: number;
  totalStockValue: number;
  todaySales: number;
  totalSales: number;
  lowStockItems: number;
  recentTransactions: any[];
}

function StoreDashboard() {
  const { user } = useStoreAuth();
  const [metrics, setMetrics] = useState<StoreMetrics>({
    totalProducts: 0,
    totalStockValue: 0,
    todaySales: 0,
    totalSales: 0,
    lowStockItems: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.store_id) {
      loadStoreMetrics();
    }
  }, [user?.store_id]);

  const loadStoreMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get store inventory with product details
      const { data: inventory, error: inventoryError } = await supabase
        .from('store_inventory')
        .select(`
          quantity,
          size_stock!inner(
            price,
            barcode,
            variants!inner(
              name,
              categories!inner(name)
            ),
            colors!inner(name)
          )
        `)
        .eq('store_id', user.store_id)
        .gt('quantity', 0);

      if (inventoryError) throw inventoryError;

      // Get today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySales, error: salesError } = await supabase
        .from('sales_transactions')
        .select('quantity, price')
        .eq('store_id', user.store_id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lte('created_at', today + 'T23:59:59.999Z');

      if (salesError) throw salesError;

      // Get all sales for total
      const { data: allSales, error: allSalesError } = await supabase
        .from('sales_transactions')
        .select('quantity, price')
        .eq('store_id', user.store_id);

      if (allSalesError) throw allSalesError;

      // Get recent transactions
      const { data: recentTransactions, error: transactionsError } = await supabase
        .from('sales_transactions')
        .select(`
          id,
          quantity,
          price,
          created_at,
          size_stock!inner(
            barcode,
            variants!inner(
              name,
              categories!inner(name)
            ),
            colors!inner(name)
          )
        `)
        .eq('store_id', user.store_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactionsError) throw transactionsError;

      // Calculate metrics
      const totalProducts = inventory?.length || 0;
      const totalStockValue = inventory?.reduce((sum, item) => 
        sum + (item.quantity * item.size_stock.price), 0) || 0;
      const todaySalesAmount = todaySales?.reduce((sum, sale) => 
        sum + (sale.quantity * sale.price), 0) || 0;
      const totalSalesAmount = allSales?.reduce((sum, sale) => 
        sum + (sale.quantity * sale.price), 0) || 0;
      const lowStockItems = inventory?.filter(item => item.quantity <= 5).length || 0;

      setMetrics({
        totalProducts,
        totalStockValue,
        todaySales: todaySalesAmount,
        totalSales: totalSalesAmount,
        lowStockItems,
        recentTransactions: recentTransactions || []
      });

    } catch (err: any) {
      setError(err.message);
      console.error('Error loading store metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-brand-black mb-3">
            Store <span className="text-gradient-yellow">Dashboard</span>
          </h1>
          <p className="text-modern-600 text-lg font-medium">
            Welcome back, {user?.user_name} • {user?.store_name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
            <BarChart3 className="w-6 h-6 text-brand-black" />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">Total Products</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{metrics.totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">Stock Value</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{formatCurrency(metrics.totalStockValue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">Today's Sales</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{formatCurrency(metrics.todaySales)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">Low Stock Items</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{metrics.lowStockItems}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              metrics.lowStockItems > 0 ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${metrics.lowStockItems > 0 ? 'text-red-600' : 'text-gray-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card-modern">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-brand-black" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-black">Recent Transactions</h3>
              <p className="text-modern-600 text-sm">Latest sales activity</p>
            </div>
          </div>
        </div>

        {metrics.recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {metrics.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-modern-50 rounded-xl hover:bg-modern-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-brand-white rounded-lg flex items-center justify-center shadow-sm">
                    <ShoppingCart className="w-5 h-5 text-brand-black" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-black">
                      {transaction.size_stock.variants.categories.name} - {transaction.size_stock.variants.name}
                    </p>
                    <p className="text-sm text-modern-600">
                      {transaction.size_stock.colors.name} • Qty: {transaction.quantity}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-black">{formatCurrency(transaction.price * transaction.quantity)}</p>
                  <p className="text-sm text-modern-600">{formatDate(transaction.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-modern-300 mx-auto mb-4" />
            <p className="text-modern-600 font-medium">No recent transactions</p>
            <p className="text-modern-500 text-sm">Sales will appear here once you start using the POS system</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreDashboard;
