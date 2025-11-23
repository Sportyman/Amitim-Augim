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