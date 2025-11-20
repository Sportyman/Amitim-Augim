
import { Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'sport', name: 'ספורט', iconKey: 'sport' },
  { id: 'pool', name: 'בריכה', iconKey: 'pool' },
  { id: 'art', name: 'אומנות', iconKey: 'art' },
  { id: 'music', name: 'מוזיקה', iconKey: 'music' },
  { id: 'enrichment', name: 'העשרה ולימוד', iconKey: 'enrichment' },
  { id: 'community', name: 'קהילה', iconKey: 'community' },
  { id: 'tech', name: 'טכנולוגיה', iconKey: 'tech' },
];

// Leaving this object empty forces the navigation buttons to search by the "Center Name + City"
// (e.g. "מרכז נינא, הרצליה") which is handled natively by Waze/Google Maps and is usually more accurate.
export const CENTER_ADDRESSES: Record<string, string> = {
  // Add specific verified addresses here only if necessary. 
  // Format: "Center Name": "Street Address, City"
};