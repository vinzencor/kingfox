import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thycdwdlanlgcvtedyvl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeWNkd2RsYW5sZ2N2dGVkeXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTY2MTUsImV4cCI6MjA3Mjk5MjYxNX0.Ncv9Dg4WdB0bf7FR8os8AfydL9kitqY_7lph9CaEBYM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Store Authentication Types
export interface StoreUser {
  id: string;
  store_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface StoreSession {
  user_id: string;
  store_id: string;
  store_name: string;
  user_name: string;
  user_role: string;
  session_token?: string;
}

export interface StoreAuthResponse {
  user_id: string;
  store_id: string;
  store_name: string;
  user_name: string;
  user_role: string;
  session_token: string;
}

// Database Types
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      variants: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      colors: {
        Row: {
          id: string;
          variant_id: string;
          name: string;
          hex: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          name: string;
          hex: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          name?: string;
          hex?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      sizes: {
        Row: {
          id: string;
          name: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          order?: number;
          created_at?: string;
        };
      };
      barcode_groups: {
        Row: {
          id: string;
          variant_id: string;
          name: string;
          size_ids: string[];
          price: number;
          barcode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          name: string;
          size_ids: string[];
          price: number;
          barcode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          name?: string;
          size_ids?: string[];
          price?: number;
          barcode?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          name: string;
          location: string;
          is_active: boolean;
          store_code: string;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          is_active?: boolean;
          store_code?: string;
          phone?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          is_active?: boolean;
          store_code?: string;
          phone?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_users: {
        Row: {
          id: string;
          store_id: string;
          email: string;
          password_hash: string;
          name: string;
          role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          email: string;
          password_hash: string;
          name: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login?: string;
        };
      };
      store_sessions: {
        Row: {
          id: string;
          store_user_id: string;
          session_token: string;
          expires_at: string;
          created_at: string;
          last_accessed: string;
        };
        Insert: {
          id?: string;
          store_user_id: string;
          session_token: string;
          expires_at: string;
          created_at?: string;
          last_accessed?: string;
        };
        Update: {
          id?: string;
          store_user_id?: string;
          session_token?: string;
          expires_at?: string;
          created_at?: string;
          last_accessed?: string;
        };
      };
      warehouse_inventory: {
        Row: {
          id: string;
          variant_id: string;
          color_id: string;
          size_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          color_id: string;
          size_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          color_id?: string;
          size_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_inventory: {
        Row: {
          id: string;
          store_id: string;
          variant_id: string;
          color_id: string;
          size_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          variant_id: string;
          color_id: string;
          size_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          variant_id?: string;
          color_id?: string;
          size_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_photos: {
        Row: {
          id: string;
          variant_id: string;
          color_id: string;
          photo_url: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          color_id: string;
          photo_url: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          color_id?: string;
          photo_url?: string;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      size_stock: {
        Row: {
          id: string;
          variant_id: string;
          color_id: string;
          size_id: string;
          barcode: string;
          price: number;
          warehouse_stock: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          color_id: string;
          size_id: string;
          barcode: string;
          price: number;
          warehouse_stock?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          color_id?: string;
          size_id?: string;
          barcode?: string;
          price?: number;
          warehouse_stock?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales_transactions: {
        Row: {
          id: string;
          store_id: string;
          size_stock_id: string;
          barcode: string;
          quantity: number;
          price: number;
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          size_stock_id: string;
          barcode: string;
          quantity: number;
          price: number;
          total_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          size_stock_id?: string;
          barcode?: string;
          quantity?: number;
          price?: number;
          total_amount?: number;
          created_at?: string;
        };
      };
    };
  };
}

// TypeScript interfaces for application use
export interface SizeStock {
  id: string;
  variant_id: string;
  color_id: string;
  size_id: string;
  barcode: string;
  price: number;
  warehouse_stock: number;
  created_at: string;
  updated_at: string;
}

export interface BarcodeGroup {
  id: string;
  variant_id: string;
  name: string;
  size_ids: string[];
  price: number;
  barcode: string;
  created_at: string;
  updated_at: string;
}
