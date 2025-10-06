import React, { useState, useEffect, useRef } from 'react';
import { Scan, ShoppingCart, Plus, Minus, Trash2, Calculator, Receipt, Settings, Percent, Zap } from 'lucide-react';
import { useStoreAuth } from '../context/StoreAuthContext';
import { supabase } from '../lib/supabase';
import InvoiceGenerator from './InvoiceGenerator';

interface CartItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
  availableStock: number;
}

interface GSTSettings {
  gst_rate: number;
  gst_number: string;
  is_gst_enabled: boolean;
}

function EnhancedStorePOS() {
  const { user } = useStoreAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // GST and Discount states
  const [gstSettings, setGstSettings] = useState<GSTSettings>({ gst_rate: 18, gst_number: '', is_gst_enabled: true });
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  
  // Customer details for invoice
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  // Invoice generation
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<any>(null);

  useEffect(() => {
    if (user?.store_id) {
      loadGSTSettings();
    }
  }, [user?.store_id]);

  // Auto-focus the barcode input when scanner is active
  useEffect(() => {
    if (scannerActive && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scannerActive, success, error]);

  // Fetch customer data by phone number
  const fetchCustomerByPhone = async (phone: string) => {
    if (!phone || phone.length < 10) return;

    try {
      setLoadingCustomer(true);

      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (customer && !error) {
        setCustomerName(customer.name);
        setCustomerEmail(customer.email || '');
        setCustomerId(customer.id);
      } else {
        // Clear customer data if not found
        setCustomerName('');
        setCustomerEmail('');
        setCustomerId(null);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const loadGSTSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_gst_settings')
        .select('*')
        .eq('store_id', user.store_id)
        .single();

      if (error) throw error;
      if (data) {
        setGstSettings({
          gst_rate: data.gst_rate,
          gst_number: data.gst_number || '',
          is_gst_enabled: data.is_gst_enabled
        });
      }
    } catch (err: any) {
      console.error('Error loading GST settings:', err);
    }
  };

  const scanBarcode = async (barcode: string) => {
    if (!barcode.trim() || !user?.store_id) return;

    try {
      setLoading(true);
      setError(null);

      // Get product details and store inventory
      const { data: productData, error: productError } = await supabase
        .from('store_inventory')
        .select(`
          quantity,
          size_stock!inner(
            id,
            barcode,
            price,
            variants!inner(
              name,
              categories!inner(name)
            ),
            colors!inner(name),
            sizes!inner(name)
          )
        `)
        .eq('store_id', user.store_id)
        .eq('size_stock.barcode', barcode.trim())
        .single();

      if (productError || !productData) {
        setError('Product not found or not available in this store');
        return;
      }

      if (productData.quantity <= 0) {
        setError('Product is out of stock');
        return;
      }

      // Check if item already in cart
      const existingItemIndex = cart.findIndex(item => item.barcode === barcode.trim());
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const existingItem = cart[existingItemIndex];
        if (existingItem.quantity >= productData.quantity) {
          setError('Cannot add more items than available in stock');
          return;
        }
        
        setCart(prev => prev.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          id: productData.size_stock.id,
          barcode: barcode.trim(),
          name: productData.size_stock.variants.name,
          color: productData.size_stock.colors.name,
          category: productData.size_stock.variants.categories.name,
          size: productData.size_stock.sizes.name,
          price: productData.size_stock.price,
          quantity: 1,
          availableStock: productData.quantity
        };
        
        setCart(prev => [...prev, newItem]);
      }

      // Add to scan history
      setScanHistory(prev => [barcode, ...prev.slice(0, 9)]);

      setBarcodeInput('');
      setSuccess('Item added to cart');
      setTimeout(() => setSuccess(null), 2000);

      // Re-focus input for next scan
      setTimeout(() => barcodeInputRef.current?.focus(), 100);

    } catch (err: any) {
      setError(err.message);
      // Re-focus input for next scan
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // Handle barcode scanner input
  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcodeInput(value);

    // Auto-process when barcode is complete (typically 8-13 characters)
    if (value.length >= 8 && scannerActive) {
      // Small delay to ensure full barcode is captured
      setTimeout(() => {
        if (e.target.value === value) { // Ensure value hasn't changed
          scanBarcode(value);
        }
      }, 100);
    }
  };

  // Handle Enter key press (common with barcode scanners)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      scanBarcode(barcodeInput);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scanBarcode(barcodeInput);
  };

  const updateQuantity = (barcode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(barcode);
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.barcode === barcode) {
        if (newQuantity > item.availableStock) {
          setError(`Only ${item.availableStock} items available in stock`);
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (barcode: string) => {
    setCart(prev => prev.filter(item => item.barcode !== barcode));
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDiscountAmount = () => {
    const subtotal = getSubtotal();
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    } else if (discountType === 'fixed') {
      return Math.min(discountValue, subtotal);
    }
    return 0;
  };

  const getGSTAmount = () => {
    if (!gstSettings.is_gst_enabled) return 0;
    const afterDiscount = getSubtotal() - getDiscountAmount();
    return (afterDiscount * gstSettings.gst_rate) / 100;
  };

  const getTotalAmount = () => {
    return getSubtotal() - getDiscountAmount() + getGSTAmount();
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const processPayment = async () => {
    if (cart.length === 0 || !user?.store_id) return;

    try {
      setProcessingPayment(true);
      setError(null);

      const subtotal = getSubtotal();
      const discountAmount = getDiscountAmount();
      const gstAmount = getGSTAmount();
      const finalAmount = getTotalAmount();

      // Generate invoice number
      const invoiceNumber = `KF-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Handle customer creation/update
      let finalCustomerId = customerId;
      if (customerPhone && customerName) {
        if (!customerId) {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              phone: customerPhone,
              name: customerName,
              email: customerEmail || null
            })
            .select()
            .single();

          if (!customerError && newCustomer) {
            finalCustomerId = newCustomer.id;
            setCustomerId(newCustomer.id);
          }
        } else {
          // Update existing customer
          await supabase
            .from('customers')
            .update({
              name: customerName,
              email: customerEmail || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', customerId);
        }
      }

      // Create invoice record
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          store_id: user.store_id,
          customer_id: finalCustomerId,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_email: customerEmail || null,
          subtotal: subtotal,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discountAmount,
          gst_rate: gstSettings.is_gst_enabled ? gstSettings.gst_rate : 0,
          gst_amount: gstAmount,
          total_amount: finalAmount,
          payment_method: 'cash'
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Process each item in the cart
      for (const item of cart) {
        // Create invoice item
        const { error: invoiceItemError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoiceData.id,
            size_stock_id: item.id,
            product_name: item.name,
            product_category: item.category,
            product_color: item.color,
            product_size: item.size,
            barcode: item.barcode,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity
          });

        if (invoiceItemError) throw invoiceItemError;

        // Record sale transaction
        const { error: saleError } = await supabase
          .from('sales_transactions')
          .insert({
            store_id: user.store_id,
            size_stock_id: item.id,
            barcode: item.barcode,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
            discount_type: discountType,
            discount_value: discountValue,
            discount_amount: (discountAmount * item.price * item.quantity) / subtotal,
            gst_rate: gstSettings.is_gst_enabled ? gstSettings.gst_rate : 0,
            gst_amount: (gstAmount * item.price * item.quantity) / subtotal,
            total_amount: item.price * item.quantity,
            final_amount: (finalAmount * item.price * item.quantity) / subtotal
          });

        if (saleError) throw saleError;

        // Update store inventory
        const { error: inventoryError } = await supabase
          .from('store_inventory')
          .update({
            quantity: item.availableStock - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('store_id', user.store_id)
          .eq('size_stock_id', item.id);

        if (inventoryError) throw inventoryError;
      }

      // Clear cart and reset form
      setCart([]);
      setDiscountType('none');
      setDiscountValue(0);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');

      setSuccess(`Payment processed successfully! Invoice: ${invoiceNumber}`);
      setTimeout(() => setSuccess(null), 5000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const generateInvoice = async () => {
    if (cart.length === 0) return;

    try {
      const invoiceData = {
        company: 'KingFox',
        invoice_number: `KF-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        date: new Date().toLocaleDateString(),
        customer: {
          name: customerName || 'Walk-in Customer',
          phone: customerPhone,
          email: customerEmail
        },
        items: cart.map(item => ({
          name: `${item.category} - ${item.name}`,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: getSubtotal(),
        discount: {
          type: discountType,
          value: discountValue,
          amount: getDiscountAmount()
        },
        gst: {
          rate: gstSettings.gst_rate,
          amount: getGSTAmount()
        },
        total: getTotalAmount(),
        store_name: user?.store_name,
        store_location: 'Store Location' // TODO: Get from store data
      };

      setCurrentInvoiceData(invoiceData);
      setShowInvoice(true);

    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user) {
    return (
      <div className="card-modern text-center py-16">
        <h3 className="text-xl font-bold text-brand-black mb-2">Access Denied</h3>
        <p className="text-modern-600">Please log in to access the POS system</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-brand-black mb-3">
            Enhanced <span className="text-gradient-yellow">POS System</span>
          </h2>
          <p className="text-modern-600 text-lg font-medium">Complete point of sale with GST, discounts & invoicing</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-modern-600">Store</p>
            <p className="font-bold text-brand-black">{user.store_name}</p>
          </div>
          <div className="w-12 h-12 bg-brand-yellow/20 rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6 text-brand-black" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Barcode Scanner */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Input */}
          <div className="card-modern">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                  <Scan className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-black">Barcode Scanner</h3>
                  <p className="text-modern-600 text-sm">Scan or enter product barcode</p>
                </div>
              </div>

              {/* Scanner Status */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${scannerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium text-brand-black">
                    {scannerActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={() => setScannerActive(!scannerActive)}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    scannerActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {scannerActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Zap className={`w-5 h-5 ${scannerActive ? 'text-green-600' : 'text-modern-400'}`} />
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={handleBarcodeInput}
                    onKeyPress={handleKeyPress}
                    placeholder={scannerActive ? "Ready for barcode scan..." : "Scanner disabled"}
                    className={`input-modern pl-12 flex-1 text-lg font-mono tracking-wider ${
                      scannerActive ? 'border-green-300 focus:border-green-500' : 'border-gray-300'
                    }`}
                    disabled={loading || !scannerActive}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!barcodeInput.trim() || loading || !scannerActive}
                  className="btn-primary px-6"
                >
                  {loading ? 'Scanning...' : 'Add'}
                </button>
              </div>
            </form>

            {/* Quick Discount Buttons */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-brand-black mb-3 flex items-center space-x-2">
                <Percent className="w-4 h-4 text-blue-600" />
                <span>Quick Discount</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => { setDiscountType('percentage'); setDiscountValue(5); }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    discountType === 'percentage' && discountValue === 5
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  5% Off
                </button>
                <button
                  onClick={() => { setDiscountType('percentage'); setDiscountValue(10); }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    discountType === 'percentage' && discountValue === 10
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  10% Off
                </button>
                <button
                  onClick={() => { setDiscountType('percentage'); setDiscountValue(15); }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    discountType === 'percentage' && discountValue === 15
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  15% Off
                </button>
                <button
                  onClick={() => { setDiscountType('none'); setDiscountValue(0); }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    discountType === 'none'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                  }`}
                >
                  No Discount
                </button>
              </div>
              {discountType !== 'none' && (
                <div className="mt-3 p-2 bg-white rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700 font-medium">
                    Current: {discountType === 'percentage' ? `${discountValue}% discount` : `$${discountValue} off`}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm font-medium">{success}</p>
              </div>
            )}
          </div>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <div className="card-modern">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Scan className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-brand-black">Recent Scans</h4>
                <span className="ml-auto text-sm text-modern-500">{scanHistory.length} scans</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {scanHistory.map((scan, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-modern-50 rounded-lg">
                    <span className="font-mono text-sm text-brand-black">{scan}</span>
                    <span className="text-xs text-modern-500">#{scanHistory.length - index}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setScanHistory([])}
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear History
              </button>
            </div>
          )}

          {/* GST & Discount Settings */}
          <div className="card-modern">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">GST & Discount Settings</h3>
                <p className="text-modern-600 text-sm">Configure tax and discount options</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GST Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-brand-black">GST Configuration</h4>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="gst-enabled"
                    checked={gstSettings.is_gst_enabled}
                    onChange={(e) => setGstSettings(prev => ({ ...prev, is_gst_enabled: e.target.checked }))}
                    className="w-4 h-4 text-brand-yellow"
                  />
                  <label htmlFor="gst-enabled" className="text-sm font-medium text-brand-black">
                    Enable GST ({gstSettings.gst_rate}%)
                  </label>
                </div>
                {gstSettings.is_gst_enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-brand-black mb-1">GST Rate (%)</label>
                      <input
                        type="number"
                        value={gstSettings.gst_rate}
                        onChange={(e) => setGstSettings(prev => ({ ...prev, gst_rate: parseFloat(e.target.value) || 0 }))}
                        className="input-modern w-full"
                        min="0"
                        max="50"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-black mb-1">GST Number</label>
                      <input
                        type="text"
                        value={gstSettings.gst_number}
                        onChange={(e) => setGstSettings(prev => ({ ...prev, gst_number: e.target.value }))}
                        className="input-modern w-full"
                        placeholder="Enter GST number"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Discount Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-brand-black">Discount Options</h4>
                <div>
                  <label className="block text-sm font-medium text-brand-black mb-2">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'none' | 'percentage' | 'fixed')}
                    className="input-modern w-full"
                  >
                    <option value="none">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                {discountType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-brand-black mb-1">
                      Discount Value {discountType === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="input-modern w-full"
                      min="0"
                      max={discountType === 'percentage' ? "100" : undefined}
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="card-modern">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">Customer Details</h3>
                <p className="text-modern-600 text-sm">Optional customer information for invoice</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-black mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input-modern w-full"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-black mb-1">
                  Phone Number
                  {loadingCustomer && <span className="text-blue-600 text-xs ml-2">Loading...</span>}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    const phone = e.target.value;
                    setCustomerPhone(phone);
                    if (phone.length >= 10) {
                      fetchCustomerByPhone(phone);
                    } else {
                      setCustomerName('');
                      setCustomerEmail('');
                      setCustomerId(null);
                    }
                  }}
                  className={`input-modern w-full ${loadingCustomer ? 'border-blue-300' : ''}`}
                  placeholder="Enter phone number"
                />
                {customerId && (
                  <p className="text-xs text-green-600 mt-1">✓ Existing customer found</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-black mb-1">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="input-modern w-full"
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shopping Cart & Billing */}
        <div className="space-y-6">
          {/* Cart Items */}
          <div className="card-modern">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-brand-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-black">Shopping Cart</h3>
                  <p className="text-modern-600 text-sm">{getTotalItems()} items</p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {cart.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.barcode} className="flex items-center justify-between p-4 bg-modern-50 rounded-xl">
                    <div className="flex-1">
                      <h4 className="font-semibold text-brand-black">{item.category} - {item.name}</h4>
                      <p className="text-sm text-modern-600">{item.color} • {item.size} • ${item.price.toFixed(2)} each</p>
                      <p className="text-xs text-modern-500">Stock: {item.availableStock}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.barcode, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-modern-200 hover:bg-modern-300 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.barcode, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-modern-200 hover:bg-modern-300 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="font-bold text-brand-black">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.barcode)}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-modern-300 mx-auto mb-4" />
                <p className="text-modern-600 font-medium">Cart is empty</p>
                <p className="text-modern-500 text-sm">Scan products to add them to cart</p>
              </div>
            )}
          </div>

          {/* Billing Summary */}
          {cart.length > 0 && (
            <div className="card-modern">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-black">Billing Summary</h3>
                  <p className="text-modern-600 text-sm">Order total with taxes and discounts</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-modern-600">Subtotal ({getTotalItems()} items)</span>
                  <span className="font-semibold text-brand-black">${getSubtotal().toFixed(2)}</span>
                </div>

                {discountType !== 'none' && getDiscountAmount() > 0 && (
                  <div className="flex justify-between items-center py-2 text-green-600">
                    <span className="flex items-center space-x-1">
                      <Percent className="w-4 h-4" />
                      <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : `$${discountValue}`})</span>
                    </span>
                    <span className="font-semibold">-${getDiscountAmount().toFixed(2)}</span>
                  </div>
                )}

                {gstSettings.is_gst_enabled && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-modern-600">GST ({gstSettings.gst_rate}%)</span>
                    <span className="font-semibold text-brand-black">${getGSTAmount().toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-modern-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-brand-black">Total Amount</span>
                    <span className="text-2xl font-bold text-brand-yellow-dark">${getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={processPayment}
                  disabled={processingPayment}
                  className="btn-primary w-full text-lg py-4"
                >
                  {processingPayment ? 'Processing...' : `Process Payment - $${getTotalAmount().toFixed(2)}`}
                </button>
                <button
                  onClick={generateInvoice}
                  className="btn-outline w-full"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && currentInvoiceData && (
        <InvoiceGenerator
          invoiceData={currentInvoiceData}
          onClose={() => {
            setShowInvoice(false);
            setCurrentInvoiceData(null);
          }}
        />
      )}
    </div>
  );
}

export default EnhancedStorePOS;
