import React from 'react';

export interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Activity {
  id: string | number; // Allow both for migration compatibility
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  location: string;
  price: number;
  ageGroup: string; // Display string (e.g. "Golden Age")
  schedule: string;
  instructor: string | null;
  detailsUrl: string;
  ai_summary?: string;
  ai_tags?: string[];
  
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