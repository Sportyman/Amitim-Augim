import { Category } from './types';
import { SportIcon, ArtIcon, MusicIcon, CookingIcon, TechIcon, OutdoorIcon, GoldenAgeIcon, EnrichmentIcon, CommunityIcon } from './components/icons';

export const CATEGORIES: Category[] = [
  { id: 'sport', name: 'ספורט', icon: SportIcon },
  { id: 'art', name: 'אומנות', icon: ArtIcon },
  { id: 'music', name: 'מוזיקה', icon: MusicIcon },
  { id: 'golden_age', name: 'גיל הזהב', icon: GoldenAgeIcon },
  { id: 'enrichment', name: 'העשרה ולימוד', icon: EnrichmentIcon },
  { id: 'community', name: 'קהילה', icon: CommunityIcon },
  { id: 'tech', name: 'טכנולוגיה', icon: TechIcon },
  // { id: 'cooking', name: 'בישול', icon: CookingIcon },
  // { id: 'outdoor', name: 'טיולים', icon: OutdoorIcon },
];
