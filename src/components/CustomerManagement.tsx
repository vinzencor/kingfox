import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, Calendar, ShoppingBag, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  created_at: string;
  total_orders?: number;
  total_spent?: number;
  last_order_date?: string;
}

interface CustomerTransaction {
  id: string;
  invoice_number: string;
  total_amount: number;
  created_at: string;
  store_name: string;
  items_count: number;
}

function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // Get customers with their order statistics
      const { data: customersData, error } = await supabase
        .from('customers')
        .select(`
          *,
          invoices (
            id,
            total_amount,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process customer data with statistics
      const processedCustomers = customersData?.map(customer => ({
        ...customer,
        total_orders: customer.invoices?.length || 0,
        total_spent: customer.invoices?.reduce((sum: number, invoice: any) => sum + parseFloat(invoice.total_amount), 0) || 0,
        last_order_date: customer.invoices?.[0]?.created_at || null
      })) || [];

      setCustomers(processedCustomers);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerTransactions = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          created_at,
          stores (name),
          invoice_items (id)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactions = data?.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: parseFloat(invoice.total_amount),
        created_at: invoice.created_at,
        store_name: invoice.stores?.name || 'Unknown Store',
        items_count: invoice.invoice_items?.length || 0
      })) || [];

      setCustomerTransactions(transactions);
    } catch (err) {
      console.error('Error loading customer transactions:', err);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    loadCustomerTransactions(customer.id);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-modern-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="btn-outline flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customers</span>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-brand-black">Customer Details</h2>
              <p className="text-modern-600">View customer information and transaction history</p>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="card-modern">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-brand-yellow/20 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-brand-black" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-brand-black">{selectedCustomer.name}</h3>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1 text-modern-600">
                    <Phone className="w-4 h-4" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.email && (
                    <div className="flex items-center space-x-1 text-modern-600">
                      <Mail className="w-4 h-4" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 text-modern-600">
                    <Calendar className="w-4 h-4" />
                    <span>Since {new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedCustomer.total_orders}</p>
                  <p className="text-sm text-blue-600">Total Orders</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">${selectedCustomer.total_spent?.toFixed(2)}</p>
                  <p className="text-sm text-green-600">Total Spent</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card-modern">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-black">Transaction History</h3>
              <p className="text-modern-600 text-sm">All purchases made by this customer</p>
            </div>
          </div>

          {customerTransactions.length > 0 ? (
            <div className="space-y-3">
              {customerTransactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-modern-50 rounded-lg border border-modern-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-brand-black" />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-black">{transaction.invoice_number}</p>
                      <p className="text-sm text-modern-600">{transaction.store_name} • {transaction.items_count} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-black">${transaction.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-modern-600">{new Date(transaction.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-modern-400 mx-auto mb-3" />
              <p className="text-modern-600">No transactions found for this customer</p>
            </div>
          )}
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
            Customer <span className="text-gradient-yellow">Management</span>
          </h2>
          <p className="text-modern-600 text-lg">Manage customer information and view purchase history</p>
        </div>
      </div>

      {/* Search */}
      <div className="card-modern">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-modern-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customers by name, phone, or email..."
            className="input-modern pl-12 w-full text-lg"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            onClick={() => handleCustomerSelect(customer)}
            className="card-modern cursor-pointer hover:scale-105 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-brand-yellow/20 rounded-xl flex items-center justify-center group-hover:bg-brand-yellow/30 transition-colors">
                  <Users className="w-6 h-6 text-brand-black" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-black group-hover:text-brand-yellow-dark transition-colors">
                    {customer.name}
                  </h3>
                  <p className="text-sm text-modern-600">{customer.phone}</p>
                  {customer.email && (
                    <p className="text-xs text-modern-500">{customer.email}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-modern-200">
              <div className="flex justify-between text-sm">
                <span className="text-modern-600">Orders: <span className="font-semibold text-brand-black">{customer.total_orders}</span></span>
                <span className="text-modern-600">Spent: <span className="font-semibold text-green-600">${customer.total_spent?.toFixed(2)}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-modern-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-modern-600 mb-2">No customers found</h3>
          <p className="text-modern-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Customers will appear here after their first purchase'}
          </p>
        </div>
      )}
    </div>
  );
}

export default CustomerManagement;
