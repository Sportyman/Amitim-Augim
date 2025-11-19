
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

export const CENTER_ADDRESSES: Record<string, string> = {
  "מרכז נחלת עדה": "וינגייט 136, הרצליה",
  "מרכז חוגים וולפסון": "צבי ש\"ץ 29, הרצליה",
  "מרכז נינא": "דוד שמעוני 3, הרצליה",
  "מרכז נוף ים": "שער הים 10, הרצליה",
  "מרכז קהילתי יבור": "ההסתדרות 22, הרצליה",
  "מרכז ל.י.ה - יד התשעה": "רביבים 1, הרצליה",
  "מרכז מטאור": "אלתרמן 6, הרצליה",
  "מרכז נווה עמל": "פוזנן 11, הרצליה",
};
