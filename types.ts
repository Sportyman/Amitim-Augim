import React from 'react';

export interface Category {
  id: string;
  name: string;
  iconKey: string; // Changed from icon component to string key for DB storage
}

export interface Activity {
  id: string | number; // Allow both for migration compatibility
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  location: string;
  price: number;
  ageGroup: string;
  schedule: string;
  instructor: string | null;
  detailsUrl: string;
  ai_summary?: string;
  ai_tags?: string[];
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