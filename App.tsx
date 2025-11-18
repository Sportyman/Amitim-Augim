import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header.tsx';
import CategoryFilter from './components/CategoryFilter.tsx';
import SearchBar from './components/SearchBar.tsx';
import ActivityCard from './components/ActivityCard.tsx';
import ActivityListItem from './components/ActivityListItem.tsx';
import ViewSwitcher from './components/ViewSwitcher.tsx';
import MultiSelectFilter from './components/MultiSelectFilter.tsx';
import AgeRangeFilter from './components/AgeRangeFilter.tsx';
import PriceRangeFilter from './components/PriceRangeFilter.tsx';
import { CATEGORIES } from './constants.ts';
import { Activity } from './types.ts';
import { findRelatedKeywords } from './services/geminiService.ts';
import { SlidersIcon, ChevronDownIcon, ChevronUpIcon } from './components/icons.tsx';

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
  
  useEffect(() => {
    fetch('/activities.json')
      .then(response => response.json())
      .then(data => {
        setActivities(data);
        setIsLoadingActivities(false);
      })
      .catch(error => {
        console.error("Error fetching activities:", error);
        setIsLoadingActivities(false);
      });
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
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

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setAgeRange({ min: '', max: '' });
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
    return activities.filter((activity) => {
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(CATEGORIES.find(c => c.name === activity.category)?.id || '');

      const searchKeywords = [searchTerm.toLowerCase(), ...relatedKeywords.map(k => k.toLowerCase())];
      const termMatch = searchTerm.trim() === '' || searchKeywords.some(keyword => 
            activity.title.toLowerCase().includes(keyword) ||
            activity.description.toLowerCase().includes(keyword) ||
            activity.category.toLowerCase().includes(keyword) ||
            (activity.ai_summary && activity.ai_summary.toLowerCase().includes(keyword)) ||
            (activity.ai_tags && activity.ai_tags.some(tag => tag.toLowerCase().includes(keyword)))
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
            <div className="flex flex-col items-center justify-center py-20">
                 <svg className="animate-spin h-10 w-10 text-orange-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    className="px-6 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors font-medium shadow-sm hover:shadow-md"
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
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="bg-gradient-to-br from-orange-50 to-rose-50 pb-10">
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
                <div className="text-center">
                    <button 
                        onClick={() => setIsAdvancedSearchOpen(prev => !prev)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${isAdvancedSearchOpen ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                    >
                        <SlidersIcon className="w-4 h-4" />
                        סינון מתקדם
                        {isAdvancedSearchOpen ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                    </button>
                </div>
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAdvancedSearchOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 mt-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              נמצאו <span className="font-bold text-orange-600 text-lg">{filteredActivities.length}</span> תוצאות
            </p>
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
          </div>
          {renderContent()}
        </section>
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto py-8">
        <div className="container mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} Amitim Activity Finder. כל הזכויות שמורות. <span className="text-gray-300 mx-2">|</span> v1.0.7
            </p>
        </div>
      </footer>
    </div>
  );
};

export default App;