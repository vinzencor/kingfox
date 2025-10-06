import React, { useState, useEffect, useRef } from 'react';
import { Scan, ShoppingCart, Trash2, Plus, Minus, CreditCard, Receipt, AlertCircle } from 'lucide-react';
import { useStoreAuth } from '../context/StoreAuthContext';
import { supabase } from '../lib/supabase';

interface CartItem {
  id: string;
  barcode: string;
  name: string;
  color: string;
  category: string;
  price: number;
  quantity: number;
  availableStock: number;
}

function StorePOS() {
  const { user } = useStoreAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus on barcode input when component mounts
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

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
            colors!inner(name)
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
          price: productData.size_stock.price,
          quantity: 1,
          availableStock: productData.quantity
        };
        
        setCart(prev => [...prev, newItem]);
      }

      setBarcodeInput('');
      setSuccess('Item added to cart');
      setTimeout(() => setSuccess(null), 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const processPayment = async () => {
    if (cart.length === 0 || !user?.store_id) return;

    try {
      setProcessingPayment(true);
      setError(null);

      // Process each item in the cart
      for (const item of cart) {
        // Record sale transaction
        const { error: saleError } = await supabase
          .from('sales_transactions')
          .insert({
            store_id: user.store_id,
            size_stock_id: item.id,
            quantity: item.quantity,
            price: item.price
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

      setSuccess(`Payment processed successfully! Total: $${getTotalAmount().toFixed(2)}`);
      setCart([]);
      
      // Focus back on barcode input
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 100);

    } catch (err: any) {
      setError(`Payment failed: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-brand-black mb-3">
            POS <span className="text-gradient-yellow">System</span>
          </h2>
          <p className="text-modern-600 text-lg font-medium">
            {user?.store_name} • Scan items to add to cart
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-yellow-glow">
            <Scan className="w-6 h-6 text-brand-black" />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
          <Receipt className="w-5 h-5 text-green-500" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Barcode Scanner */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-modern">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                <Scan className="w-5 h-5 text-brand-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-black">Barcode Scanner</h3>
                <p className="text-modern-600 text-sm">Scan or enter barcode manually</p>
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex space-x-3">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode or enter manually"
                className="input-modern flex-1"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !barcodeInput.trim()}
                className="btn-primary px-6"
              >
                {loading ? 'Scanning...' : 'Add'}
              </button>
            </form>
          </div>

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
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.barcode} className="flex items-center justify-between p-4 bg-modern-50 rounded-xl">
                    <div className="flex-1">
                      <h4 className="font-semibold text-brand-black">{item.category} - {item.name}</h4>
                      <p className="text-sm text-modern-600">{item.color} • ${item.price.toFixed(2)} each</p>
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
                      <div className="text-right min-w-20">
                        <p className="font-bold text-brand-black">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.barcode)}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-modern-300 mx-auto mb-4" />
                <p className="text-modern-600 font-medium">Cart is empty</p>
                <p className="text-modern-500 text-sm">Scan barcodes to add items</p>
              </div>
            )}
          </div>
        </div>

        {/* Checkout Panel */}
        <div className="card-modern h-fit">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-black" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-black">Checkout</h3>
              <p className="text-modern-600 text-sm">Process payment</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-modern-100">
              <span className="text-modern-600">Items:</span>
              <span className="font-semibold">{getTotalItems()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-modern-100">
              <span className="text-modern-600">Subtotal:</span>
              <span className="font-semibold">${getTotalAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b-2 border-modern-200">
              <span className="text-lg font-bold text-brand-black">Total:</span>
              <span className="text-2xl font-bold text-brand-black">${getTotalAmount().toFixed(2)}</span>
            </div>

            <button
              onClick={processPayment}
              disabled={cart.length === 0 || processingPayment}
              className="w-full btn-primary flex items-center justify-center space-x-2 mt-6"
            >
              {processingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Process Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StorePOS;
