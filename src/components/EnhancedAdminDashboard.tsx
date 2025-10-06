import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  Percent, 
  Receipt, 
  BarChart3,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardMetrics {
  totalSales: number;
  totalRevenue: number;
  totalDiscounts: number;
  totalGST: number;
  totalTransactions: number;
  totalStores: number;
  totalProducts: number;
  averageOrderValue: number;
  topSellingProducts: any[];
  recentTransactions: any[];
  salesByStore: any[];
  dailySales: any[];
}

function EnhancedAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSales: 0,
    totalRevenue: 0,
    totalDiscounts: 0,
    totalGST: 0,
    totalTransactions: 0,
    totalStores: 0,
    totalProducts: 0,
    averageOrderValue: 0,
    topSellingProducts: [],
    recentTransactions: [],
    salesByStore: [],
    dailySales: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7'); // days
  const [selectedStore, setSelectedStore] = useState('all');
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, selectedStore]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Load stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true);

      if (storesError) throw storesError;
      setStores(storesData || []);

      // Build query filters
      let salesQuery = supabase
        .from('sales_transactions')
        .select(`
          *,
          stores!inner(name, location),
          size_stock!inner(
            variants!inner(name, categories!inner(name)),
            colors!inner(name),
            sizes!inner(name)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (selectedStore !== 'all') {
        salesQuery = salesQuery.eq('store_id', selectedStore);
      }

      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Load invoices for additional metrics
      let invoicesQuery = supabase
        .from('invoices')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (selectedStore !== 'all') {
        invoicesQuery = invoicesQuery.eq('store_id', selectedStore);
      }

      const { data: invoicesData, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;

      // Calculate metrics
      const totalRevenue = (salesData || []).reduce((sum, sale) => sum + parseFloat(sale.final_amount || sale.total_amount || 0), 0);
      const totalDiscounts = (salesData || []).reduce((sum, sale) => sum + parseFloat(sale.discount_amount || 0), 0);
      const totalGST = (salesData || []).reduce((sum, sale) => sum + parseFloat(sale.gst_amount || 0), 0);
      const totalTransactions = salesData?.length || 0;
      const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Top selling products
      const productSales = (salesData || []).reduce((acc, sale) => {
        const productKey = `${sale.size_stock?.variants?.categories?.name} - ${sale.size_stock?.variants?.name}`;
        if (!acc[productKey]) {
          acc[productKey] = {
            name: productKey,
            quantity: 0,
            revenue: 0
          };
        }
        acc[productKey].quantity += sale.quantity;
        acc[productKey].revenue += parseFloat(sale.final_amount || sale.total_amount || 0);
        return acc;
      }, {});

      const topSellingProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);

      // Sales by store
      const storeSales = (salesData || []).reduce((acc, sale) => {
        const storeName = sale.stores?.name || 'Unknown Store';
        if (!acc[storeName]) {
          acc[storeName] = {
            name: storeName,
            sales: 0,
            revenue: 0
          };
        }
        acc[storeName].sales += sale.quantity;
        acc[storeName].revenue += parseFloat(sale.final_amount || sale.total_amount || 0);
        return acc;
      }, {});

      const salesByStore = Object.values(storeSales);

      // Daily sales for the chart
      const dailySalesMap = (salesData || []).reduce((acc, sale) => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            sales: 0,
            revenue: 0
          };
        }
        acc[date].sales += sale.quantity;
        acc[date].revenue += parseFloat(sale.final_amount || sale.total_amount || 0);
        return acc;
      }, {});

      const dailySales = Object.values(dailySalesMap).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Get total products count
      const { count: productsCount } = await supabase
        .from('size_stock')
        .select('*', { count: 'exact', head: true });

      setMetrics({
        totalSales: (salesData || []).reduce((sum, sale) => sum + sale.quantity, 0),
        totalRevenue,
        totalDiscounts,
        totalGST,
        totalTransactions,
        totalStores: storesData?.length || 0,
        totalProducts: productsCount || 0,
        averageOrderValue,
        topSellingProducts,
        recentTransactions: (salesData || []).slice(0, 10),
        salesByStore,
        dailySales
      });

    } catch (err: any) {
      setError(err.message);
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
          onClick={loadDashboardData}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-brand-black mb-3">
            Enhanced <span className="text-gradient-yellow">Analytics</span>
          </h2>
          <p className="text-modern-600 text-lg font-medium">Comprehensive sales analytics and business insights</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-modern-600" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-modern"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-modern-600" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="input-modern"
            >
              <option value="all">All Stores</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          
          <button className="btn-outline flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">Total Revenue</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{formatCurrency(metrics.totalRevenue)}</p>
              <p className="text-sm text-green-600 mt-1">+12.5% from last period</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">Total Sales</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{metrics.totalSales}</p>
              <p className="text-sm text-blue-600 mt-1">{metrics.totalTransactions} transactions</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Discounts */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">Total Discounts</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{formatCurrency(metrics.totalDiscounts)}</p>
              <p className="text-sm text-orange-600 mt-1">
                {metrics.totalRevenue > 0 ? ((metrics.totalDiscounts / (metrics.totalRevenue + metrics.totalDiscounts)) * 100).toFixed(1) : 0}% of gross sales
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Percent className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* GST Collected */}
        <div className="card-modern group hover:shadow-modern-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-modern-600 text-sm font-medium uppercase tracking-wider">GST Collected</p>
              <p className="text-3xl font-bold text-brand-black mt-2">{formatCurrency(metrics.totalGST)}</p>
              <p className="text-sm text-purple-600 mt-1">Tax revenue</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-modern">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-brand-black">Business Overview</h3>
            <TrendingUp className="w-5 h-5 text-modern-600" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-modern-600">Average Order Value</span>
              <span className="font-bold text-brand-black">{formatCurrency(metrics.averageOrderValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-modern-600">Total Stores</span>
              <span className="font-bold text-brand-black">{metrics.totalStores}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-modern-600">Total Products</span>
              <span className="font-bold text-brand-black">{metrics.totalProducts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-modern-600">Transactions</span>
              <span className="font-bold text-brand-black">{metrics.totalTransactions}</span>
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="card-modern">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-brand-black">Top Products</h3>
            <Package className="w-5 h-5 text-modern-600" />
          </div>
          <div className="space-y-3">
            {metrics.topSellingProducts.length > 0 ? (
              metrics.topSellingProducts.map((product: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-modern-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-semibold text-brand-black text-sm">{product.name}</p>
                    <p className="text-xs text-modern-600">{product.quantity} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-black text-sm">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-modern-600 text-center py-4">No sales data available</p>
            )}
          </div>
        </div>

        {/* Sales by Store */}
        <div className="card-modern">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-brand-black">Store Performance</h3>
            <Users className="w-5 h-5 text-modern-600" />
          </div>
          <div className="space-y-3">
            {metrics.salesByStore.length > 0 ? (
              metrics.salesByStore.map((store: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-modern-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-semibold text-brand-black text-sm">{store.name}</p>
                    <p className="text-xs text-modern-600">{store.sales} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-black text-sm">{formatCurrency(store.revenue)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-modern-600 text-center py-4">No store data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card-modern">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-brand-black" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-black">Recent Transactions</h3>
              <p className="text-modern-600 text-sm">Latest sales activity across all stores</p>
            </div>
          </div>
        </div>

        {metrics.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-modern-200">
                  <th className="text-left py-3 px-4 font-semibold text-brand-black">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-black">Store</th>
                  <th className="text-center py-3 px-4 font-semibold text-brand-black">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Discount</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">GST</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Date</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentTransactions.map((transaction: any, index) => (
                  <tr key={index} className="border-b border-modern-100 hover:bg-modern-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-brand-black text-sm">
                          {transaction.size_stock?.variants?.categories?.name} - {transaction.size_stock?.variants?.name}
                        </p>
                        <p className="text-xs text-modern-600">
                          {transaction.size_stock?.colors?.name} • {transaction.size_stock?.sizes?.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-modern-600">{transaction.stores?.name}</td>
                    <td className="py-3 px-4 text-center font-semibold text-brand-black">{transaction.quantity}</td>
                    <td className="py-3 px-4 text-right font-semibold text-brand-black">
                      {formatCurrency(parseFloat(transaction.final_amount || transaction.total_amount || 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {transaction.discount_amount ? formatCurrency(parseFloat(transaction.discount_amount)) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-purple-600">
                      {transaction.gst_amount ? formatCurrency(parseFloat(transaction.gst_amount)) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-modern-600">
                      {formatDate(transaction.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-modern-300 mx-auto mb-4" />
            <p className="text-modern-600 font-medium">No recent transactions</p>
            <p className="text-modern-500 text-sm">Transaction data will appear here once sales are made</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedAdminDashboard;
