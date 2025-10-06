import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, Scan, Search, Calendar, Package, User, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { useStoreAuth } from '../context/StoreAuthContext';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  customer_name: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  size_stock_id: string;
  product_name: string;
  product_category: string;
  product_color: string;
  product_size: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ReturnItem {
  invoice_item_id: string;
  size_stock_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  return_quantity: number;
}

interface ExchangeItem {
  size_stock_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
}

function ReturnsExchange() {
  const { user } = useStoreAuth();
  const [step, setStep] = useState<'search' | 'select' | 'process'>('search');
  const [searchType, setSearchType] = useState<'phone' | 'invoice'>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [eligibleInvoices, setEligibleInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [scannerInput, setScannerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);

  // Auto-focus scanner input
  useEffect(() => {
    if (step === 'process' && returnType === 'exchange' && scannerRef.current) {
      scannerRef.current.focus();
    }
  }, [step, returnType]);

  const searchCustomerByPhone = async (phone: string) => {
    if (!phone || phone.length < 10) return;

    try {
      setLoading(true);
      
      // Find customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (customerError || !customerData) {
        alert('Customer not found with this phone number');
        return;
      }

      setCustomer(customerData);

      // Find eligible invoices (within 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (
            id,
            size_stock_id,
            product_name,
            product_category,
            product_color,
            product_size,
            barcode,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('customer_id', customerData.id)
        .eq('store_id', user?.store_id)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      const processedInvoices = invoicesData?.map(invoice => ({
        ...invoice,
        items: invoice.invoice_items || []
      })) || [];

      setEligibleInvoices(processedInvoices);
      setStep('select');
    } catch (err) {
      console.error('Error searching customer:', err);
      alert('Error searching for customer');
    } finally {
      setLoading(false);
    }
  };

  const searchByInvoiceNumber = async (invoiceNumber: string) => {
    if (!invoiceNumber) return;

    try {
      setLoading(true);

      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (*),
          invoice_items (
            id,
            size_stock_id,
            product_name,
            product_category,
            product_color,
            product_size,
            barcode,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('invoice_number', invoiceNumber)
        .eq('store_id', user?.store_id)
        .single();

      if (error || !invoiceData) {
        alert('Invoice not found');
        return;
      }

      // Check if within 14 days
      const invoiceDate = new Date(invoiceData.created_at);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      if (invoiceDate < fourteenDaysAgo) {
        alert('This invoice is older than 14 days and not eligible for returns/exchanges');
        return;
      }

      setCustomer(invoiceData.customers);
      setSelectedInvoice({
        ...invoiceData,
        items: invoiceData.invoice_items || []
      });
      setStep('process');
    } catch (err) {
      console.error('Error searching invoice:', err);
      alert('Error searching for invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'phone') {
      searchCustomerByPhone(searchValue);
    } else {
      searchByInvoiceNumber(searchValue);
    }
  };

  const selectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setStep('process');
  };

  const addReturnItem = (item: InvoiceItem, returnQuantity: number) => {
    const existingIndex = returnItems.findIndex(ri => ri.invoice_item_id === item.id);
    
    if (existingIndex >= 0) {
      const updated = [...returnItems];
      updated[existingIndex].return_quantity = returnQuantity;
      setReturnItems(updated);
    } else {
      setReturnItems([...returnItems, {
        invoice_item_id: item.id,
        size_stock_id: item.size_stock_id,
        product_name: item.product_name,
        barcode: item.barcode,
        quantity: item.quantity,
        unit_price: item.unit_price,
        return_quantity: returnQuantity
      }]);
    }
  };

  const scanExchangeProduct = async (barcode: string) => {
    if (!barcode || !user?.store_id) return;

    try {
      const { data: productData, error } = await supabase
        .from('store_inventory')
        .select(`
          quantity,
          size_stock!inner(
            id, barcode, price,
            variants!inner(name, categories!inner(name)),
            colors!inner(name),
            sizes!inner(name)
          )
        `)
        .eq('store_id', user.store_id)
        .eq('size_stock.barcode', barcode.trim())
        .single();

      if (error || !productData) {
        alert('Product not found or not available in this store');
        return;
      }

      const product = productData.size_stock;
      const productName = `${product.categories.name} - ${product.variants.name} (${product.colors.name}, ${product.sizes.name})`;

      const existingIndex = exchangeItems.findIndex(ei => ei.size_stock_id === product.id);
      
      if (existingIndex >= 0) {
        const updated = [...exchangeItems];
        updated[existingIndex].quantity += 1;
        setExchangeItems(updated);
      } else {
        setExchangeItems([...exchangeItems, {
          size_stock_id: product.id,
          product_name: productName,
          barcode: product.barcode,
          quantity: 1,
          unit_price: product.price
        }]);
      }

      setScannerInput('');
    } catch (err) {
      console.error('Error scanning product:', err);
      alert('Error scanning product');
    }
  };

  const handleScannerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setScannerInput(value);
    
    if (value.length >= 8) {
      setTimeout(() => {
        if (e.target.value === value) {
          scanExchangeProduct(value);
        }
      }, 100);
    }
  };

  const processReturn = async () => {
    if (!selectedInvoice || !customer || returnItems.length === 0) return;

    try {
      setLoading(true);

      const totalRefund = returnItems.reduce((sum, item) => 
        sum + (item.unit_price * item.return_quantity), 0
      );

      // Create return record
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .insert({
          store_id: user?.store_id,
          customer_id: customer.id,
          original_invoice_id: selectedInvoice.id,
          return_type: returnType,
          total_refund_amount: returnType === 'return' ? totalRefund : 0,
          status: 'completed'
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Add return items
      for (const item of returnItems) {
        await supabase
          .from('return_items')
          .insert({
            return_id: returnData.id,
            size_stock_id: item.size_stock_id,
            quantity: item.return_quantity,
            original_price: item.unit_price,
            refund_amount: item.unit_price * item.return_quantity
          });

        // Update store inventory (add back returned items)
        const { data: currentInventory } = await supabase
          .from('store_inventory')
          .select('quantity')
          .eq('store_id', user?.store_id)
          .eq('size_stock_id', item.size_stock_id)
          .single();

        if (currentInventory) {
          await supabase
            .from('store_inventory')
            .update({
              quantity: currentInventory.quantity + item.return_quantity
            })
            .eq('store_id', user?.store_id)
            .eq('size_stock_id', item.size_stock_id);
        }
      }

      // Handle exchange items
      if (returnType === 'exchange' && exchangeItems.length > 0) {
        for (const item of exchangeItems) {
          await supabase
            .from('exchange_items')
            .insert({
              return_id: returnData.id,
              size_stock_id: item.size_stock_id,
              quantity: item.quantity,
              price: item.unit_price
            });

          // Update store inventory (remove exchanged items)
          const { data: currentInventory } = await supabase
            .from('store_inventory')
            .select('quantity')
            .eq('store_id', user?.store_id)
            .eq('size_stock_id', item.size_stock_id)
            .single();

          if (currentInventory) {
            await supabase
              .from('store_inventory')
              .update({
                quantity: Math.max(0, currentInventory.quantity - item.quantity)
              })
              .eq('store_id', user?.store_id)
              .eq('size_stock_id', item.size_stock_id);
          }
        }
      }

      alert(`${returnType === 'return' ? 'Return' : 'Exchange'} processed successfully!`);
      
      // Reset form
      setStep('search');
      setSearchValue('');
      setCustomer(null);
      setEligibleInvoices([]);
      setSelectedInvoice(null);
      setReturnItems([]);
      setExchangeItems([]);
      
    } catch (err) {
      console.error('Error processing return:', err);
      alert('Error processing return/exchange');
    } finally {
      setLoading(false);
    }
  };

  const getTotalRefund = () => {
    return returnItems.reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0);
  };

  const getTotalExchangeValue = () => {
    return exchangeItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-brand-black mb-3">
            Returns & <span className="text-gradient-yellow">Exchange</span>
          </h2>
          <p className="text-modern-600 text-lg">Process returns and exchanges within 14 days</p>
        </div>
      </div>

      {step === 'search' && (
        <div className="card-modern max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-brand-black mb-2">Find Customer or Invoice</h3>
            <p className="text-modern-600">Search by phone number or invoice number</p>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setSearchType('phone')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  searchType === 'phone'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Search by Phone
              </button>
              <button
                onClick={() => setSearchType('invoice')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  searchType === 'invoice'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Search by Invoice
              </button>
            </div>

            <div>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={searchType === 'phone' ? 'Enter phone number' : 'Enter invoice number'}
                className="input-modern w-full text-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={!searchValue || loading}
              className="btn-primary w-full py-3 text-lg"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-6">
          <div className="card-modern">
            <div className="flex items-center space-x-3 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-brand-black">{customer?.name}</h3>
                <p className="text-modern-600">{customer?.phone}</p>
              </div>
            </div>
          </div>

          <div className="card-modern">
            <h3 className="text-xl font-bold text-brand-black mb-4">Eligible Invoices (Last 14 Days)</h3>
            
            {eligibleInvoices.length > 0 ? (
              <div className="space-y-3">
                {eligibleInvoices.map(invoice => (
                  <div
                    key={invoice.id}
                    onClick={() => selectInvoice(invoice)}
                    className="p-4 border border-modern-200 rounded-lg hover:bg-modern-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-brand-black">{invoice.invoice_number}</p>
                        <p className="text-sm text-modern-600">
                          {new Date(invoice.created_at).toLocaleDateString()} • {invoice.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-brand-black">${parseFloat(invoice.total_amount).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-modern-400 mx-auto mb-3" />
                <p className="text-modern-600">No eligible invoices found within the last 14 days</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep('search')}
            className="btn-outline"
          >
            Back to Search
          </button>
        </div>
      )}

      {step === 'process' && selectedInvoice && (
        <div className="space-y-6">
          {/* Invoice Info */}
          <div className="card-modern">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-brand-black">{selectedInvoice.invoice_number}</h3>
                <p className="text-modern-600">
                  {customer?.name} • {new Date(selectedInvoice.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setReturnType('return')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    returnType === 'return'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  Return
                </button>
                <button
                  onClick={() => setReturnType('exchange')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    returnType === 'exchange'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  Exchange
                </button>
              </div>
            </div>
          </div>

          {/* Original Items */}
          <div className="card-modern">
            <h3 className="text-xl font-bold text-brand-black mb-4">Original Items</h3>
            <div className="space-y-3">
              {selectedInvoice.items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-modern-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-brand-black">{item.product_name}</p>
                    <p className="text-sm text-modern-600">
                      {item.product_color} • {item.product_size} • ${item.unit_price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-modern-600">Qty: {item.quantity}</span>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      placeholder="Return qty"
                      className="input-modern w-24"
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 0;
                        if (qty > 0) {
                          addReturnItem(item, qty);
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exchange Scanner */}
          {returnType === 'exchange' && (
            <div className="card-modern">
              <h3 className="text-xl font-bold text-brand-black mb-4">Scan Exchange Items</h3>
              <div className="flex items-center space-x-3 mb-4">
                <Scan className="w-6 h-6 text-blue-600" />
                <input
                  ref={scannerRef}
                  type="text"
                  value={scannerInput}
                  onChange={handleScannerInput}
                  placeholder="Scan barcode for exchange item"
                  className="input-modern flex-1 text-lg font-mono"
                  autoFocus
                />
              </div>

              {exchangeItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-brand-black">Exchange Items:</h4>
                  {exchangeItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <span className="text-green-800">{item.product_name}</span>
                      <span className="text-green-600">Qty: {item.quantity} • ${item.unit_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {returnItems.length > 0 && (
            <div className="card-modern">
              <h3 className="text-xl font-bold text-brand-black mb-4">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Refund:</span>
                  <span className="font-bold text-red-600">${getTotalRefund().toFixed(2)}</span>
                </div>
                {returnType === 'exchange' && (
                  <>
                    <div className="flex justify-between">
                      <span>Exchange Value:</span>
                      <span className="font-bold text-blue-600">${getTotalExchangeValue().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">Net Amount:</span>
                      <span className={`font-bold ${getTotalExchangeValue() - getTotalRefund() >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${Math.abs(getTotalExchangeValue() - getTotalRefund()).toFixed(2)}
                        {getTotalExchangeValue() - getTotalRefund() >= 0 ? ' (to collect)' : ' (to refund)'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setStep('search')}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={processReturn}
                  disabled={loading || returnItems.length === 0}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Processing...' : `Process ${returnType === 'return' ? 'Return' : 'Exchange'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReturnsExchange;
