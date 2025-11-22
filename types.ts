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
  groupName?: string; // New field: Actual name of the group (e.g. "Women's Gymnastics")
  ageGroup: string; // Display string (e.g. "Golden Age 66+")
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