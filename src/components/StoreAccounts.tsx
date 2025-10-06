import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Store, BarChart3, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StoreAccount {
  id: string;
  store_id: string;
  store_name: string;
  date: string;
  total_sales: number;
  total_profit: number;
  total_gst_collected: number;
  total_discounts_given: number;
  total_returns: number;
  net_revenue: number;
}

interface Store {
  id: string;
  name: string;
  location: string;
}

function StoreAccounts() {
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7'); // days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStores();
    loadAccounts();
  }, [selectedStore, dateRange]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, location')
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error('Error loading stores:', err);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      let query = supabase
        .from('invoices')
        .select(`
          *,
          stores (id, name, location)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (selectedStore !== 'all') {
        query = query.eq('store_id', selectedStore);
      }

      const { data: invoicesData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Group by store and date
      const accountsMap = new Map<string, StoreAccount>();

      invoicesData?.forEach(invoice => {
        const date = new Date(invoice.created_at).toISOString().split('T')[0];
        const key = `${invoice.store_id}-${date}`;
        
        if (!accountsMap.has(key)) {
          accountsMap.set(key, {
            id: key,
            store_id: invoice.store_id,
            store_name: invoice.stores?.name || 'Unknown Store',
            date: date,
            total_sales: 0,
            total_profit: 0,
            total_gst_collected: 0,
            total_discounts_given: 0,
            total_returns: 0,
            net_revenue: 0
          });
        }

        const account = accountsMap.get(key)!;
        const totalAmount = parseFloat(invoice.total_amount);
        const gstAmount = parseFloat(invoice.gst_amount || '0');
        const discountAmount = parseFloat(invoice.discount_amount || '0');

        account.total_sales += totalAmount;
        account.total_gst_collected += gstAmount;
        account.total_discounts_given += discountAmount;
        account.net_revenue += totalAmount;
        
        // Estimate profit (assuming 30% margin)
        account.total_profit += (totalAmount - gstAmount - discountAmount) * 0.3;
      });

      const accountsArray = Array.from(accountsMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setAccounts(accountsArray);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return accounts.reduce((totals, account) => ({
      sales: totals.sales + account.total_sales,
      profit: totals.profit + account.total_profit,
      gst: totals.gst + account.total_gst_collected,
      discounts: totals.discounts + account.total_discounts_given,
      revenue: totals.revenue + account.net_revenue
    }), { sales: 0, profit: 0, gst: 0, discounts: 0, revenue: 0 });
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
          <p className="text-modern-600 text-lg">Financial overview and profit tracking for all stores</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-modern">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-modern-600" />
            <span className="font-semibold text-brand-black">Filters:</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1">Store</label>
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

          <div>
            <label className="block text-sm font-medium text-brand-black mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-modern"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Total Sales</p>
              <p className="text-3xl font-bold text-brand-black mt-2">${totalStats.sales.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card-modern group hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-modern-600 uppercase tracking-wider">Total Profit</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${totalStats.profit.toFixed(2)}</p>
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
            </div>
            <div className="w-12 h-12 bg-brand-yellow/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-brand-black" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Accounts Table */}
      <div className="card-modern">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-black">Daily Store Performance</h3>
            <p className="text-modern-600 text-sm">Detailed breakdown by store and date</p>
          </div>
        </div>

        {accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-modern-200">
                  <th className="text-left py-3 px-4 font-semibold text-brand-black">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-brand-black">Store</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Sales</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Profit</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">GST</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Discounts</th>
                  <th className="text-right py-3 px-4 font-semibold text-brand-black">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account.id} className="border-b border-modern-100 hover:bg-modern-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-modern-400" />
                        <span className="font-medium text-brand-black">
                          {new Date(account.date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4 text-modern-400" />
                        <span className="font-medium text-brand-black">{account.store_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-600">
                      ${account.total_sales.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      ${account.total_profit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-purple-600">
                      ${account.total_gst_collected.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-orange-600">
                      ${account.total_discounts_given.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-brand-black">
                      ${account.net_revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-modern-400 mx-auto mb-3" />
            <p className="text-modern-600">No account data found for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreAccounts;
