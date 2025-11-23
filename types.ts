
import React from 'react';

export interface Category {
  id: string;
  name: string;
  // icon is now optional because we store iconId in DB, map it in UI
  icon?: React.ComponentType<{ className?: string }>; 
  iconId?: string; // "sport", "art", "emoji:⚽", etc.
  isVisible?: boolean;
  order?: number;
}

export interface Activity {
  id: string | number; // Allow both for migration compatibility
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  location: string;
  city?: string; // New explicit city field
  price: number;
  
  // Display fields
  ageGroup: string; // e.g. "Children 6-9"
  groupName?: string; // e.g. "Women's Gymnastics", "Beginners Group"
  
  schedule: string;
  instructor: string | null;
  phone?: string | null; // Explicit clean phone number from DB
  detailsUrl: string;
  
  // Visibility Control
  isVisible?: boolean; // Default should be true

  // AI & Search Metadata
  ai_summary?: string;
  ai_tags?: string[]; // Legacy AI tags
  tags?: string[]; // Explicit tags from the new DB 'tags' column
  
  // New structured fields for better search/filtering
  minAge?: number;
  maxAge?: number;
  gender?: 'male' | 'female' | 'mixed';
  level?: 'beginner' | 'advanced' | 'all';
  
  createdAt?: any; // For DB sorting
}

export type ViewMode = 'grid' | 'list';

// --- RBAC Types ---
export type UserRole = 'super_admin' | 'admin' | 'editor';

export interface AdminUser {
  email: string;
  role: UserRole;
  addedAt: any;
}

// --- Audit / History Types ---
export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'bulk_import' | 'restore';
  collection: string;
  documentId: string;
  userEmail: string;
  timestamp: any; // Firestore Timestamp
  previousData?: any; // Snapshot before change
  newData?: any; // Snapshot after change
  description?: string; // Human readable summary
}