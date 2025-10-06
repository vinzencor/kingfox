import React from 'react';
import { Download, Printer, Mail } from 'lucide-react';

interface InvoiceItem {
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceData {
  company: string;
  invoice_number: string;
  date: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: {
    type: string;
    value: number;
    amount: number;
  };
  gst: {
    rate: number;
    amount: number;
  };
  total: number;
  store_name?: string;
  store_location?: string;
}

interface InvoiceGeneratorProps {
  invoiceData: InvoiceData;
  onClose: () => void;
}

function InvoiceGenerator({ invoiceData, onClose }: InvoiceGeneratorProps) {
  const printInvoice = () => {
    window.print();
  };

  const downloadPDF = () => {
    // TODO: Implement PDF generation using jsPDF or similar
    alert('PDF download will be implemented with jsPDF library');
  };

  const emailInvoice = () => {
    // TODO: Implement email functionality
    alert('Email functionality will be implemented');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-6 border-b border-modern-200 print:hidden">
          <h2 className="text-2xl font-bold text-brand-black">Invoice Preview</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={printInvoice}
              className="btn-outline flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={downloadPDF}
              className="btn-outline flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={emailInvoice}
              className="btn-outline flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-8 bg-white" id="invoice-content">
          {/* Company Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-brand-black mb-2">KingFox</h1>
              <p className="text-modern-600 text-lg">Premium Fashion & Lifestyle</p>
              <div className="mt-4 text-sm text-modern-600">
                <p>Email: info@kingfox.com</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Website: www.kingfox.com</p>
              </div>
            </div>
            <div className="text-right">
              <div className="w-24 h-24 bg-brand-yellow rounded-2xl flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-brand-black">KF</span>
              </div>
              <p className="text-sm text-modern-600">
                {invoiceData.store_name && (
                  <>
                    <strong>{invoiceData.store_name}</strong><br />
                    {invoiceData.store_location}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold text-brand-black mb-4">Bill To:</h3>
              <div className="bg-modern-50 p-4 rounded-xl">
                <p className="font-semibold text-brand-black">{invoiceData.customer.name}</p>
                {invoiceData.customer.phone && (
                  <p className="text-modern-600">Phone: {invoiceData.customer.phone}</p>
                )}
                {invoiceData.customer.email && (
                  <p className="text-modern-600">Email: {invoiceData.customer.email}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-black mb-4">Invoice Details:</h3>
              <div className="bg-modern-50 p-4 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-modern-600">Invoice Number:</span>
                  <span className="font-semibold text-brand-black">{invoiceData.invoice_number}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-modern-600">Date:</span>
                  <span className="font-semibold text-brand-black">{invoiceData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-modern-600">Payment Method:</span>
                  <span className="font-semibold text-brand-black">Cash</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-brand-black mb-4">Items:</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-modern-100">
                    <th className="text-left p-3 font-semibold text-brand-black border border-modern-200">Item</th>
                    <th className="text-left p-3 font-semibold text-brand-black border border-modern-200">Color</th>
                    <th className="text-left p-3 font-semibold text-brand-black border border-modern-200">Size</th>
                    <th className="text-center p-3 font-semibold text-brand-black border border-modern-200">Qty</th>
                    <th className="text-right p-3 font-semibold text-brand-black border border-modern-200">Price</th>
                    <th className="text-right p-3 font-semibold text-brand-black border border-modern-200">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-modern-50">
                      <td className="p-3 border border-modern-200">{item.name}</td>
                      <td className="p-3 border border-modern-200">{item.color}</td>
                      <td className="p-3 border border-modern-200">{item.size}</td>
                      <td className="p-3 text-center border border-modern-200">{item.quantity}</td>
                      <td className="p-3 text-right border border-modern-200">${item.price.toFixed(2)}</td>
                      <td className="p-3 text-right border border-modern-200">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-md">
              <div className="bg-modern-50 p-6 rounded-xl">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-modern-600">Subtotal:</span>
                    <span className="font-semibold text-brand-black">${invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {invoiceData.discount.amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount ({invoiceData.discount.type === 'percentage' ? `${invoiceData.discount.value}%` : `$${invoiceData.discount.value}`}):
                      </span>
                      <span className="font-semibold">-${invoiceData.discount.amount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {invoiceData.gst.amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-modern-600">GST ({invoiceData.gst.rate}%):</span>
                      <span className="font-semibold text-brand-black">${invoiceData.gst.amount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-modern-200 pt-3">
                    <div className="flex justify-between text-xl">
                      <span className="font-bold text-brand-black">Total:</span>
                      <span className="font-bold text-brand-yellow-dark">${invoiceData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-modern-200 text-center">
            <p className="text-modern-600 text-sm mb-2">Thank you for shopping with KingFox!</p>
            <p className="text-modern-500 text-xs">
              This is a computer-generated invoice. For any queries, please contact us at info@kingfox.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceGenerator;
