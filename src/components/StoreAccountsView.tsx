import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, BarChart3, ShoppingBag } from 'lucide-react';
import { useStoreAuth } from '../context/StoreAuthContext';
import { supabase } from '../lib/supabase';

interface DailyStats {
  date: string;
  total_sales: number;
  total_profit: number;
  total_gst_collected: number;
  total_discounts_given: number;
  net_revenue: number;
  orders_count: number;
}

function StoreAccountsView() {
  const { user } = useStoreAuth();
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [dateRange, setDateRange] = useState<string>('7'); // days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.store_id) {
      loadStoreStats();
    }
  }, [user?.store_id, dateRange]);

  const loadStoreStats = async () => {
    if (!user?.store_id) return;

    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('store_id', user.store_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by date
      const statsMap = new Map<string, DailyStats>();

      invoicesData?.forEach(invoice => {
        const date = new Date(invoice.created_at).toISOString().split('T')[0];
        
        if (!statsMap.has(date)) {
          statsMap.set(date, {
            date: date,
            total_sales: 0,
            total_profit: 0,
            total_gst_collected: 0,
            total_discounts_given: 0,
            net_revenue: 0,
            orders_count: 0
          });
        }

        const stats = statsMap.get(date)!;
        const totalAmount = parseFloat(invoice.total_amount);
        const gstAmount = parseFloat(invoice.gst_amount || '0');
        const discountAmount = parseFloat(invoice.discount_amount || '0');

        stats.total_sales += totalAmount;
        stats.total_gst_collected += gstAmount;
        stats.total_discounts_given += discountAmount;
        stats.net_revenue += totalAmount;
        stats.orders_count += 1;
        
        // Estimate profit (assuming 30% margin)
        stats.total_profit += (totalAmount - gstAmount - discountAmount) * 0.3;
      });

      const statsArray = Array.from(statsMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setDailyStats(statsArray);
    } catch (err) {
      console.error('Error loading store stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return dailyStats.reduce((totals, stats) => ({
      sales: totals.sales + stats.total_sales,
      profit: totals.profit + stats.total_profit,
      gst: totals.gst + stats.total_gst_collected,
      discounts: totals.discounts + stats.total_discounts_given,
      revenue: totals.revenue + stats.net_revenue,
      orders: totals.orders + stats.orders_count
    }), { sales: 0, profit: 0, gst: 0, discounts: 0, revenue: 0, orders: 0 });
  };

  const totalStats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-modern-600">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-brand-black mb-3">
            Store <span className="text-gradient-yellow">Accounts</span>
          </h2>
          <p className="text-modern-600 text-lg">Financial overview and performance tracking</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card-modern">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-modern-600" />
            <span className="font-semibold text-brand-black">Date Range:</span>
          </div>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-modern"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Total Sales</p>
              <p className="text-3xl font-bold text-brand-black mt-2">${totalStats.sales.toFixed(2)}</p>
              <p className="text-sm text-modern-600 mt-1">{totalStats.orders} orders</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Estimated Profit</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${totalStats.profit.toFixed(2)}</p>
              <p className="text-sm text-modern-600 mt-1">~30% margin</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">GST Collected</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">${totalStats.gst.toFixed(2)}</p>
              <p className="text-sm text-modern-600 mt-1">Tax amount</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Discounts Given</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">${totalStats.discounts.toFixed(2)}</p>
              <p className="text-sm text-modern-600 mt-1">Customer savings</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Net Revenue</p>
              <p className="text-3xl font-bold text-brand-black mt-2">${totalStats.revenue.toFixed(2)}</p>
              <p className="text-sm text-modern-600 mt-1">After discounts</p>
            </div>
            <div className="w-12 h-12 bg-brand-yellow/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-brand-black" />
            </div>
          </div>
        </div>

        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Avg Order Value</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">
                ${totalStats.orders > 0 ? (totalStats.sales / totalStats.orders).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-modern-600 mt-1">Per transaction</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Performance Table */}
      <div className="card-modern">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-black">Daily Performance</h3>
            <p className="text-modern-600 text-sm">Detailed breakdown by date</p>
          </div>
        </div>

        {dailyStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-modern-200">
                  <th className="text-left py-3 px-4 font-semibold text-brand-black">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Orders</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Sales</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Profit</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">GST</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Discounts</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map(stats => (
                  <tr key={stats.date} className="border-b border-modern-100 hover:bg-modern-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-modern-400" />
                        <span className="font-medium text-brand-black">
                          {new Date(stats.date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                      {stats.orders_count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-600">
                      ${stats.total_sales.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      ${stats.total_profit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-purple-600">
                      ${stats.total_gst_collected.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-orange-600">
                      ${stats.total_discounts_given.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-brand-black">
                      ${stats.net_revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-modern-400 mx-auto mb-3" />
            <p className="text-modern-600">No sales data found for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreAccountsView;
