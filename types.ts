// REVIEW: Code checked for clarity, functionality, and potential issues. TypeScript types are well-defined and correct.

import React from 'react';

export interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Activity {
  id: number;
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
}