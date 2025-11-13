import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header.tsx';
import CategoryFilter from './components/CategoryFilter.tsx';
import SearchBar from './components/SearchBar.tsx';
import ActivityCard from './components/ActivityCard.tsx';
import ActivityListItem from './components/ActivityListItem.tsx';
import ViewSwitcher from './components/ViewSwitcher.tsx';
import MultiSelectFilter from './components/MultiSelectFilter.tsx';
import AgeRangeFilter from './components/AgeRangeFilter.tsx';
import PriceRangeFilter from './components/PriceRangeFilter.tsx'; // Import new component
import { CATEGORIES } from './constants.ts';
import { Activity } from './types.ts';
import { findRelatedKeywords } from './services/geminiService.ts';
import { SlidersIcon, ChevronDownIcon, ChevronUpIcon } from './components/icons.tsx'; // Import new icons

type ViewMode = 'grid' | 'list';

const parseAgeGroupToRange = (ageGroup: string): [number, number] | null => {
  if (!ageGroup) return null;
  
  if (ageGroup.includes('רב גילאי')) {
    return [0, 999];
  }
  
  const olderMatch = ageGroup.match(/(\d+)\s*ומעלה/);
  if (olderMatch) {
    return [parseInt(olderMatch[1], 10), 999];
  }
  
  const rangeMatch = ageGroup.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    return [parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10)];
  }

  const singleNumberMatch = ageGroup.match(/\d+/);
  if (singleNumberMatch) {
    const age = parseInt(singleNumberMatch[0], 10);
    return [age, age];
  }

  return null;
};

const App: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  
  useEffect(() => {
    fetch('/activities.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setActivities(data);
        setIsLoadingActivities(false);
      })
      .catch(error => {
        console.error("Error fetching activities:", error);
        setIsLoadingActivities(false);
      });
  }, []);

  const uniqueCities = useMemo(() => {
    const cities = activities.map(a => a.location.split(', ')[1]?.trim()).filter(Boolean);
    return [...new Set(cities)];
  }, [activities]);

  const uniqueLocations = useMemo(() => {
      const locations = activities.map(a => a.location.split(', ')[0]?.trim()).filter(Boolean);
      return [...new Set(locations)];
  }, [activities]);

  const handleCityToggle = (city: string) => {
      setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  const handleLocationToggle = (location: string) => {
      setSelectedLocations(prev => prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]);
  };

  const handleMinAgeChange = (value: string) => {
    setAgeRange(prev => ({ ...prev, min: value.replace(/[^0-9]/g, '') }));
  };

  const handleMaxAgeChange = (value: string) => {
    setAgeRange(prev => ({ ...prev, max: value.replace(/[^0-9]/g, '') }));
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

  const handleSearch = useCallback(async () => {
    if(!searchTerm) {
        setRelatedKeywords([]);
        return;
    }
    setIsSearching(true);
    setApiKeyError(null); // Reset error on new search
    try {
      const keywords = await findRelatedKeywords(searchTerm);
      setRelatedKeywords(keywords);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API_KEY")) {
          setApiKeyError("שגיאת תצורה: מפתח ה-API של Gemini אינו זמין. תכונות החיפוש החכם מבוססות AI מושבתות.");
      } else {
          console.error("An unexpected error occurred during search:", error);
          setApiKeyError("אירעה שגיאה בלתי צפויה בעת החיפוש.");
      }
      setRelatedKeywords([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(CATEGORIES.find(c => c.name === activity.category)?.id || '');

      const searchKeywords = [searchTerm.toLowerCase(), ...relatedKeywords.map(k => k.toLowerCase())];
      const termMatch = searchTerm.trim() === '' || searchKeywords.some(keyword => 
            activity.title.toLowerCase().includes(keyword) ||
            activity.description.toLowerCase().includes(keyword) ||
            activity.category.toLowerCase().includes(keyword)
      );

      const [locationName = '', cityName = ''] = activity.location.split(', ').map(s => s.trim());
      const cityMatch = selectedCities.length === 0 || selectedCities.includes(cityName);
      const locationMatch = selectedLocations.length === 0 || selectedLocations.includes(locationName);
      
      const ageGroupMatch = (() => {
        const { min: userMinText, max: userMaxText } = ageRange;
        if (userMinText === '' && userMaxText === '') return true;

        const userMin = userMinText !== '' ? parseInt(userMinText, 10) : 0;
        const userMax = userMaxText !== '' ? parseInt(userMaxText, 10) : 999;
        
        if (userMinText !== '' && userMaxText !== '' && userMin > userMax) return true;

        const activityRange = parseAgeGroupToRange(activity.ageGroup);
        if (!activityRange) return false;

        const [activityMin, activityMax] = activityRange;
        return activityMax >= userMin && activityMin <= userMax;
      })();
      
      const priceMatch = (() => {
        const { min: minPriceText, max: maxPriceText } = priceRange;
        if (minPriceText === '' && maxPriceText === '') return true;

        const minPrice = minPriceText !== '' ? parseInt(minPriceText, 10) : 0;
        const maxPrice = maxPriceText !== '' ? parseInt(maxPriceText, 10) : Infinity;
        
        return activity.price >= minPrice && activity.price <= maxPrice;
      })();


      return categoryMatch && termMatch && cityMatch && locationMatch && ageGroupMatch && priceMatch;
    });
  }, [selectedCategories, searchTerm, relatedKeywords, activities, selectedCities, selectedLocations, ageRange, priceRange]);

  const renderContent = () => {
    if (isLoadingActivities) {
        return (
            <div className="text-center py-16">
                 <svg className="animate-spin h-8 w-8 text-orange-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-gray-500">טוען פעילויות...</p>
            </div>
        );
    }

    if (filteredActivities.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold text-gray-700">לא נמצאו תוצאות</h2>
                <p className="mt-2 text-gray-500">נסו לשנות את בחירת הקטגוריות או את מונח החיפוש.</p>
            </div>
        );
    }
    
    if (viewMode === 'grid') {
      return (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredActivities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
              ))}
          </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredActivities.map((activity) => (
          <ActivityListItem key={activity.id} activity={activity} />
        ))}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header />
      <main>
        <div className="bg-gradient-to-br from-orange-50 to-rose-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <section className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
                אז מה בא לך?
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                גלו מגוון רחב של חוגים ופעילויות שמתאימים בדיוק לכם.
              </p>
            </section>

            <section className="mb-12 space-y-8">
                <CategoryFilter
                    categories={CATEGORIES}
                    selectedCategories={selectedCategories}
                    onCategoryToggle={handleCategoryToggle}
                />
                <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSubmit={handleSearch}
                    isLoading={isSearching}
                />
                {apiKeyError && (
                    <div className="text-center max-w-lg mx-auto p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
                        <p className="font-semibold">שגיאה בתכונת החיפוש החכם</p>
                        <p className="text-sm">{apiKeyError}</p>
                    </div>
                )}
                <div className="text-center">
                    <button 
                        onClick={() => setIsAdvancedSearchOpen(prev => !prev)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
                    >
                        <SlidersIcon className="w-4 h-4" />
                        סינון מתקדם
                        {isAdvancedSearchOpen ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                    </button>
                </div>
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAdvancedSearchOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-white p-6 rounded-lg shadow-sm mt-4 space-y-6">
                        <AgeRangeFilter 
                            minAge={ageRange.min}
                            maxAge={ageRange.max}
                            onMinAgeChange={handleMinAgeChange}
                            onMaxAgeChange={handleMaxAgeChange}
                        />
                         <PriceRangeFilter 
                            minPrice={priceRange.min}
                            maxPrice={priceRange.max}
                            onMinPriceChange={handleMinPriceChange}
                            onMaxPriceChange={handleMaxPriceChange}
                        />
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
            </section>
          </div>
        </div>

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              נמצאו <span className="font-bold text-orange-500">{filteredActivities.length}</span> תוצאות
            </p>
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
          </div>
          {renderContent()}
        </section>
      </main>
      <footer className="bg-white mt-16 py-6">
        <div className="text-center text-gray-500">
            &copy; {new Date().getFullYear()} Amitim Activity Finder. כל הזכויות שמורות.
        </div>
      </footer>
    </div>
  );
};

export default App;