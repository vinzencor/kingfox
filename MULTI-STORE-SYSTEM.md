# Multi-Store System Documentation

## Overview

The Warehouse Pro system now supports multiple stores with separate authentication, dashboards, and inventory management. Each store operates independently while maintaining real-time synchronization with the central warehouse system.

## Features

### 🏪 Store Management
- **Independent Store Creation**: Admin can create stores with dedicated managers
- **Store-Specific Authentication**: Each store has its own login credentials
- **Isolated Inventory**: Stores can only access their own inventory and sales data
- **Real-time Synchronization**: Inventory changes are reflected immediately across all interfaces

### 🔐 Authentication System
- **Dual Access Modes**: Admin dashboard and Store-specific interfaces
- **Secure Login**: Password-based authentication with session management
- **Role-Based Access**: Different permissions for admin and store managers
- **Session Management**: Automatic session validation and cleanup

### 📊 Store Dashboard
- **Store Metrics**: Total products, stock value, daily sales, low stock alerts
- **Real-time Updates**: Live inventory and sales tracking
- **Recent Transactions**: Latest sales activity with product details
- **Store-Specific Data**: Only shows data relevant to the logged-in store

### 🛒 POS System
- **Barcode Scanning**: Scan or manually enter product barcodes
- **Real-time Inventory**: Automatic stock validation and updates
- **Cart Management**: Add, remove, and modify quantities
- **Payment Processing**: Complete sales transactions with inventory updates

## Setup Instructions

### 1. Database Setup

Run the following SQL scripts in your Supabase SQL Editor:

1. **Main Database Schema**: `supabase-setup.sql`
2. **Security Policies**: `store-security-policies.sql`
3. **Test Data** (optional): `test-multi-store-system.sql`

### 2. Application Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. Creating Your First Store

1. Access the **Admin Dashboard** from the mode selection screen
2. Navigate to **Stores** section
3. Click **Add New Store**
4. Fill in store information:
   - Store Name
   - Location
   - Contact details (optional)
   - Manager Name (required)
   - Manager Email (required)
   - Manager Password (required)
5. Click **Add Store**

## Usage Guide

### Admin Interface

1. **Mode Selection**: Choose "Admin Dashboard" from the main screen
2. **Full Access**: Manage products, stores, inventory, and view analytics
3. **Store Management**: Create stores, assign managers, distribute inventory
4. **Global Overview**: Monitor all stores and warehouse operations

### Store Interface

1. **Mode Selection**: Choose "Store Access" from the main screen
2. **Store Login**: Enter manager credentials created by admin
3. **Store Dashboard**: View store-specific metrics and recent activity
4. **POS System**: Process sales and manage inventory

### POS System Workflow

1. **Login**: Access store interface with manager credentials
2. **Navigate to POS**: Click "POS System" in the store navigation
3. **Scan Products**: Use barcode scanner or enter barcodes manually
4. **Manage Cart**: Add/remove items, adjust quantities
5. **Process Payment**: Complete transaction to update inventory
6. **Real-time Updates**: Changes reflect immediately in dashboard

## Test Credentials

After running the test data script, you can use these credentials:

### Store 1 (Downtown Store)
- **Email**: manager1@example.com
- **Password**: password123
- **Test Barcodes**: TEST001M, TEST001L

### Store 2 (Mall Store)
- **Email**: manager2@example.com
- **Password**: password123
- **Test Barcodes**: TEST001M, TEST001L

## Security Features

### Row Level Security (RLS)
- **Data Isolation**: Stores can only access their own data
- **Audit Logging**: All operations are tracked for security
- **Session Validation**: Automatic session management and cleanup

### Access Control
- **Store-Specific Access**: Users can only see their store's inventory
- **Admin Override**: Service role has full access for management
- **Secure Authentication**: Password hashing and session tokens

## Real-time Features

### Live Updates
- **Inventory Changes**: Automatic updates when stock levels change
- **Sales Tracking**: Real-time transaction monitoring
- **Dashboard Metrics**: Live calculation of store performance

### Synchronization
- **Cross-Interface Updates**: Changes in POS reflect in dashboard immediately
- **Admin Visibility**: Central monitoring of all store activities
- **Conflict Resolution**: Proper handling of concurrent operations

## API Functions

### Store Authentication
- `authenticate_store_user(email, password)`: Login function
- `validate_store_session(token)`: Session validation
- `logout_store_user(token)`: Logout function
- `create_store_user(store_id, email, password, name, role)`: User creation

### Inventory Management
- Real-time inventory tracking
- Automatic stock updates on sales
- Low stock alerts and monitoring

## Troubleshooting

### Common Issues

1. **Login Failed**: Verify credentials and ensure store user exists
2. **Inventory Not Updating**: Check real-time subscriptions and database connections
3. **Access Denied**: Verify RLS policies and user permissions
4. **Barcode Not Found**: Ensure products are distributed to the store

### Debug Steps

1. Check browser console for errors
2. Verify database connections in Supabase
3. Confirm RLS policies are properly configured
4. Test with provided sample data

## Development Notes

### Architecture
- **React Context**: State management for authentication and inventory
- **Supabase**: Backend database with real-time subscriptions
- **TypeScript**: Type-safe development with proper interfaces
- **Tailwind CSS**: Responsive and modern UI design

### Key Components
- `StoreAuthContext`: Handles store authentication
- `StoreInventoryContext`: Manages store-specific inventory
- `AppRouter`: Routes between admin and store interfaces
- `StorePOS`: Point of sale system implementation

## Future Enhancements

- **Multi-language Support**: Internationalization for different regions
- **Advanced Analytics**: Detailed reporting and insights
- **Mobile App**: Native mobile application for store managers
- **Integration APIs**: Connect with external POS systems
- **Advanced Security**: Two-factor authentication and audit trails
