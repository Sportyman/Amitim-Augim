
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import CategoryFilter from '../components/CategoryFilter';
import SearchBar from '../components/SearchBar';
import ActivityCard from '../components/ActivityCard';
import ActivityListItem from '../components/ActivityListItem';
import ViewSwitcher from '../components/ViewSwitcher';
import MultiSelectFilter from '../components/MultiSelectFilter';
import AgeRangeFilter from '../components/AgeRangeFilter';
import PriceRangeFilter from '../components/PriceRangeFilter';
import ActivityModal from '../components/ActivityModal';
import { CATEGORIES as DEFAULT_CATS } from '../constants'; // Fallback
import { Activity, ViewMode, Category, AppSettings } from '../types';
import { findRelatedKeywords } from '../services/geminiService';
import { SlidersIcon, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { dbService } from '../services/dbService';
import { parseAgeGroupToRange } from '../utils/helpers';

type SortOption = 'popularity' | 'price-asc' | 'price-desc' | 'alphabetical' | 'alphabetical-desc';

const PublicHome: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATS);
  const [settings, setSettings] = useState<AppSettings>({ enableColorfulCategories: false });
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [userAge, setUserAge] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('popularity');
  
  useEffect(() => {
    const loadData = async () => {
        try {
            // Analytics: Track Unique Visit (Local Storage check -> DB increment)
            const lastVisit = localStorage.getItem('amitim_last_visit');
            const now = Date.now();
            // If never visited or visited more than 24 hours ago
            if (!lastVisit || (now - parseInt(lastVisit)) > 24 * 60 * 60 * 1000) {
                await dbService.trackUniqueVisit();
                localStorage.setItem('amitim_last_visit', now.toString());
            }

            // Load Settings
            const appSettings = await dbService.getAppSettings();
            setSettings(appSettings);

            // Load Categories
            const fetchedCategories = await dbService.getCategories();
            setCategories(fetchedCategories);

            // Load Activities
            const data = await dbService.getAllActivities();
            if (data.length === 0) {
                 const res = await fetch('activities.json');
                 const jsonData = await res.json();
                 setActivities(jsonData);
            } else {
                setActivities(data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            fetch('activities.json')
                .then(res => res.json())
                .then(data => setActivities(data))
                .catch(e => console.error("Fatal fallback error", e));
        } finally {
            setIsLoadingActivities(false);
        }
    };
    loadData();
  }, []);

  const handleActivityClick = (activity: Activity) => {
      setSelectedActivity(activity);
      // Analytics: Increment view count
      dbService.incrementActivityView(activity.id);
  };

  const uniqueCities = useMemo(() => {
    // Use explicit city field if available, fallback to legacy parse
    const cities = activities.map(a => a.city || (a.location || '').split(', ')[1]?.trim()).filter(Boolean);
    return [...new Set(cities)];
  }, [activities]);

  const uniqueLocations = useMemo(() => {
      const locations = activities.map(a => (a.location || '').split(', ')[0]?.trim()).filter(Boolean);
      return [...new Set(locations)];
  }, [activities]);

  const handleCityToggle = (city: string) => {
      setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  const handleLocationToggle = (location: string) => {
      setSelectedLocations(prev => prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]);
  };

  const handleUserAgeChange = (value: string) => {
    setUserAge(value.replace(/[^0-9]/g, ''));
  };
  
  const handleMinPriceChange = (value: string) => {
    setPriceRange(prev => ({ ...prev, min: value.replace(/[^0-9]/g, '') }));
  };

  const handleMaxPriceChange = (value: string) => {
    setPriceRange(prev => ({ ...prev, max: value.replace(/[^0-9]/g, '') }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setUserAge('');
    setPriceRange({ min: '', max: '' });
    setSelectedCities([]);
    setSelectedLocations([]);
    setRelatedKeywords([]);
  };

  const handleSearch = useCallback(async () => {
    if(!searchTerm) {
        setRelatedKeywords([]);
        return;
    }
    setIsSearching(true);
    const keywords = await findRelatedKeywords(searchTerm);
    setRelatedKeywords(keywords);
    setIsSearching(false);
  }, [searchTerm]);

  const filteredActivities = useMemo(() => {
    const filtered = activities.filter((activity) => {
      // 1. Visibility Filter
      if (activity.isVisible === false) return false;

      // SAFETY: Ensure strings are valid
      const title = (activity.title || '').toLowerCase();
      const description = (activity.description || '').toLowerCase();
      const category = (activity.category || '').toLowerCase();
      const location = (activity.location || '');
      const aiSummary = (activity.ai_summary || '').toLowerCase();
      const instructor = (activity.instructor || '').toLowerCase();

      // Category Filter Logic - Fuzzy Matching
      const selectedCategoryNames = selectedCategories.map(id => 
          categories.find(c => c.id === id)?.name.toLowerCase()
      ).filter(Boolean);

      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategoryNames.some(name => 
            category.includes(name) || name.includes(category)
        );

      const searchKeywords = [searchTerm.toLowerCase(), ...relatedKeywords.map(k => k.toLowerCase())];
      const termMatch = searchTerm.trim() === '' || searchKeywords.some(keyword => 
            title.includes(keyword) ||
            description.includes(keyword) ||
            category.includes(keyword) ||
            aiSummary.includes(keyword) ||
            instructor.includes(keyword) ||
            (activity.tags && activity.tags.some(tag => tag.toLowerCase().includes(keyword))) ||
            (activity.ai_tags && activity.ai_tags.some(tag => tag.toLowerCase().includes(keyword)))
      );

      const [locationName = '', cityNameLegacy = ''] = location.split(', ').map(s => s.trim());
      
      // Match against explicit city field OR legacy parsed city
      const activityCity = activity.city || cityNameLegacy;
      const cityMatch = selectedCities.length === 0 || selectedCities.includes(activityCity);
      
      const locationMatch = selectedLocations.length === 0 || selectedLocations.includes(locationName);
      
      const ageMatch = (() => {
        if (userAge === '') return true;
        const userAgeNum = parseInt(userAge, 10);
        
        if (activity.minAge !== undefined && activity.maxAge !== undefined) {
            return userAgeNum >= activity.minAge && userAgeNum <= activity.maxAge;
        }

        const activityRange = parseAgeGroupToRange(activity.ageGroup || '');
        if (!activityRange) return true; 
        const [activityMin, activityMax] = activityRange;
        return userAgeNum >= activityMin && userAgeNum <= activityMax;
      })();
      
      const priceMatch = (() => {
        const { min: minPriceText, max: maxPriceText } = priceRange;
        if (minPriceText === '' && maxPriceText === '') return true;
        const minPrice = minPriceText !== '' ? parseInt(minPriceText, 10) : 0;
        const maxPrice = maxPriceText !== '' ? parseInt(maxPriceText, 10) : Infinity;
        return (activity.price || 0) >= minPrice && (activity.price || 0) <= maxPrice;
      })();

      return categoryMatch && termMatch && cityMatch && locationMatch && ageMatch && priceMatch;
    });

    // Sort Logic
    return filtered.sort((a, b) => {
        switch (sortOption) {
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'alphabetical':
                return a.title.localeCompare(b.title);
            case 'alphabetical-desc':
                return b.title.localeCompare(a.title);
            case 'popularity':
            default:
                // Default to views descending, fallback to ID/creation
                return (b.views || 0) - (a.views || 0);
        }
    });

  }, [selectedCategories, searchTerm, relatedKeywords, activities, selectedCities, selectedLocations, userAge, priceRange, categories, sortOption]);

  const renderContent = () => {
    if (isLoadingActivities) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                 <svg className="animate-spin h-10 w-10 text-sky-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 text-lg">טוען פעילויות...</p>
            </div>
        );
    }

    if (filteredActivities.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100 mx-4">
                <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">לא נמצאו תוצאות</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    לא מצאנו פעילויות התואמות את החיפוש שלך. נסה לשנות את מילות החיפוש או להסיר חלק מהסינונים.
                </p>
                <button 
                    onClick={resetFilters}
                    className="px-6 py-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                    נקה את כל הסינונים
                </button>
            </div>
        );
    }
    
    if (viewMode === 'grid') {
      return (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredActivities.map((activity) => (
                  <ActivityCard 
                    key={activity.id} 
                    activity={activity} 
                    onShowDetails={() => handleActivityClick(activity)}
                  />
              ))}
          </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredActivities.map((activity) => (
          <ActivityListItem 
            key={activity.id} 
            activity={activity} 
            onShowDetails={() => handleActivityClick(activity)}
          />
        ))}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 pb-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <section className="text-center mb-10">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
                אז מה בא לך?
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                גלו מגוון רחב של חוגים ופעילויות שמתאימים בדיוק לכם.
              </p>
            </section>

            <section className="space-y-8 max-w-5xl mx-auto">
                <CategoryFilter
                    categories={categories}
                    selectedCategories={selectedCategories}
                    onCategoryToggle={handleCategoryToggle}
                    useGradientDesign={settings.enableColorfulCategories}
                />
                <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSubmit={handleSearch}
                    isLoading={isSearching}
                />
                <div className="text-center">
                    <button 
                        onClick={() => setIsAdvancedSearchOpen(prev => !prev)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${isAdvancedSearchOpen ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                    >
                        <SlidersIcon className="w-4 h-4" />
                        אפשרויות חיפוש נוספות
                        {isAdvancedSearchOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </button>
                </div>
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAdvancedSearchOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 mt-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <AgeRangeFilter 
                                userAge={userAge}
                                onUserAgeChange={handleUserAgeChange}
                            />
                             <PriceRangeFilter 
                                minPrice={priceRange.min}
                                maxPrice={priceRange.max}
                                onMinPriceChange={handleMinPriceChange}
                                onMaxPriceChange={handleMaxPriceChange}
                            />
                        </div>
                        <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <MultiSelectFilter 
                                title="סינון לפי עיר"
                                options={uniqueCities}
                                selectedOptions={selectedCities}
                                onToggle={handleCityToggle}
                            />
                            <MultiSelectFilter 
                                title="סינון לפי מרכז קהילתי"
                                options={uniqueLocations}
                                selectedOptions={selectedLocations}
                                onToggle={handleLocationToggle}
                            />
                        </div>
                    </div>
                </div>
            </section>
          </div>
        </div>

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <p className="text-gray-600">
              נמצאו <span className="font-bold text-sky-600 text-lg">{filteredActivities.length}</span> תוצאות
            </p>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Sorting Dropdown */}
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm w-full sm:w-auto">
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 whitespace-nowrap">סידור לפי:</span>
                    <select 
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="bg-transparent text-sm font-semibold text-gray-700 outline-none flex-1 cursor-pointer"
                    >
                        <option value="popularity">פופולריות</option>
                        <option value="price-asc">מחיר (מהנמוך לגבוה)</option>
                        <option value="price-desc">מחיר (מהגבוה לנמוך)</option>
                        <option value="alphabetical">שם (א-ת)</option>
                        <option value="alphabetical-desc">שם (ת-א)</option>
                    </select>
                </div>

                <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
            </div>
          </div>
          {renderContent()}
        </section>
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto py-8">
        <div className="container mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} Amitim Activity Finder. כל הזכויות שמורות. <span className="text-gray-300 mx-2">|</span> v1.2.0
            </p>
        </div>
      </footer>

      {/* Activity Modal */}
      {selectedActivity && (
        <ActivityModal 
            activity={selectedActivity} 
            onClose={() => setSelectedActivity(null)} 
        />
      )}
    </div>
  );
};

export default PublicHome;