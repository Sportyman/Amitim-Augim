
import { Category } from './types';
import { SportIcon, ArtIcon, MusicIcon, CookingIcon, TechIcon, OutdoorIcon, GoldenAgeIcon, EnrichmentIcon, CommunityIcon } from './components/icons';

// Map string IDs to actual components for dynamic rendering
export const ICON_MAP: Record<string, any> = {
    'sport': SportIcon,
    'art': ArtIcon,
    'music': MusicIcon,
    'golden_age': GoldenAgeIcon,
    'enrichment': EnrichmentIcon,
    'community': CommunityIcon,
    'tech': TechIcon,
    'cooking': CookingIcon,
    'outdoor': OutdoorIcon
};

// Default initial state for DB seeding
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'sport', name: 'ספורט', iconId: 'sport', order: 1, isVisible: true },
  { id: 'art', name: 'אומנות', iconId: 'art', order: 2, isVisible: true },
  { id: 'music', name: 'מוזיקה', iconId: 'music', order: 3, isVisible: true },
  { id: 'golden_age', name: 'גיל הזהב', iconId: 'golden_age', order: 4, isVisible: true },
  { id: 'enrichment', name: 'העשרה ולימוד', iconId: 'enrichment', order: 5, isVisible: true },
  { id: 'community', name: 'קהילה', iconId: 'community', order: 6, isVisible: true },
  { id: 'tech', name: 'טכנולוגיה', iconId: 'tech', order: 7, isVisible: true },
];

export const CATEGORIES = DEFAULT_CATEGORIES; // Backwards compatibility for imports not yet updated

// Leaving this object empty forces the navigation buttons to search by the "Center Name + City"
export const CENTER_ADDRESSES: Record<string, string> = {
  // Add specific verified addresses here only if necessary. 
  // Format: "Center Name": "Street Address, City"
};