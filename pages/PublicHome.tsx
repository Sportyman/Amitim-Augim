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
import { CATEGORIES as DEFAULT_CATEGORIES } from '../constants';
import { Activity, ViewMode, Category } from '../types';
import { findRelatedKeywords } from '../services/geminiService';
import { SlidersIcon, ChevronDownIcon, ChevronUpIcon } from '../components/icons';
import { dbService } from '../services/dbService';

const parseAgeGroupToRange = (ageGroup: string): [number, number] | null => {
  if (!ageGroup) return null;
  if (ageGroup.includes('רב גילאי') || ageGroup.includes('לכל המשפחה')) return [0, 120];
  const olderMatch = ageGroup.match(/(\d+)\s*ומעלה/);
  if (olderMatch) return [parseInt(olderMatch[1], 10), 120];
  const fromAgeMatch = ageGroup.match(/מגיל\s*(\d+)/);
  if (fromAgeMatch) return [parseInt(fromAgeMatch[1], 10), 120];
  const rangeMatch = ageGroup.match(/(\d+)-(\d+)/);
  if (rangeMatch) return [parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10)];
  const singleNumberMatch = ageGroup.match(/\d+/);
  if (singleNumberMatch) { const age = parseInt(singleNumberMatch[0], 10); return [age, age + 1]; }
  return null;
};

const PublicHome: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
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
  
  useEffect(() => {
    const loadData = async () => {
        try {
            const [acts, cats] = await Promise.all([
                dbService.getAllActivities(),
                dbService.getAllCategories()
            ]);
            
            // Use fetched categories, or default if DB is empty
            if (cats.length > 0) setCategories(cats);

            if (acts.length === 0) {
                 const res = await fetch('activities.json');
                 const jsonData = await res.json();
                 setActivities(jsonData);
            } else {
                setActivities(acts);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            fetch('activities.json').then(res => res.json()).then(data => setActivities(data));
        } finally {
            setIsLoadingActivities(false);
        }
    };
    loadData();
  }, []);

  const uniqueCities = useMemo(() => {
    const cities = activities.map(a => a.location.split(', ')[1]?.trim()).filter(Boolean);
    return [...new Set(cities)];
  }, [activities]);

  const uniqueLocations = useMemo(() => {
      const locations = activities.map(a => a.location.split(', ')[0]?.trim()).filter(Boolean);
      return [...new Set(locations)];
  }, [activities]);

  const handleCityToggle = (city: string) => setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  const handleLocationToggle = (location: string) => setSelectedLocations(prev => prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]);
  const handleUserAgeChange = (value: string) => setUserAge(value.replace(/[^0-9]/g, ''));
  const handleMinPriceChange = (value: string) => setPriceRange(prev => ({ ...prev, min: value.replace(/[^0-9]/g, '') }));
  const handleMaxPriceChange = (value: string) => setPriceRange(prev => ({ ...prev, max: value.replace(/[^0-9]/g, '') }));
  const handleCategoryToggle = (categoryId: string) => setSelectedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  
  const resetFilters = () => {
    setSearchTerm(''); setSelectedCategories([]); setUserAge('');
    setPriceRange({ min: '', max: '' }); setSelectedCities([]); setSelectedLocations([]); setRelatedKeywords([]);
  };

  const handleSearch = useCallback(async () => {
    if(!searchTerm) { setRelatedKeywords([]); return; }
    setIsSearching(true);
    const keywords = await findRelatedKeywords(searchTerm);
    setRelatedKeywords(keywords);
    setIsSearching(false);
  }, [searchTerm]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Dynamic category matching
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(categories.find(c => c.name === activity.category)?.id || '');

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
      
      const ageMatch = (() => {
        if (userAge === '') return true;
        const userAgeNum = parseInt(userAge, 10);
        const activityRange = parseAgeGroupToRange(activity.ageGroup);
        if (!activityRange) return true; 
        const [activityMin, activityMax] = activityRange;
        return userAgeNum >= activityMin && userAgeNum <= activityMax;
      })();
      
      const priceMatch = (() => {
        const { min: minPriceText, max: maxPriceText } = priceRange;
        if (minPriceText === '' && maxPriceText === '') return true;
        const minPrice = minPriceText !== '' ? parseInt(minPriceText, 10) : 0;
        const maxPrice = maxPriceText !== '' ? parseInt(maxPriceText, 10) : Infinity;
        return activity.price >= minPrice && activity.price <= maxPrice;
      })();

      return categoryMatch && termMatch && cityMatch && locationMatch && ageMatch && priceMatch;
    });
  }, [selectedCategories, searchTerm, relatedKeywords, activities, selectedCities, selectedLocations, userAge, priceRange, categories]);

  const renderContent = () => {
    if (isLoadingActivities) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4"></div>
            <p className="text-gray-500 text-lg">טוען פעילויות...</p>
        </div>
    );

    if (filteredActivities.length === 0) return (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100 mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">לא נמצאו תוצאות</h2>
            <p className="text-gray-500 mb-6">לא מצאנו פעילויות התואמות את החיפוש שלך.</p>
            <button onClick={resetFilters} className="px-6 py-2 bg-sky-500 text-white rounded-full font-medium shadow-sm">נקה סינונים</button>
        </div>
    );
    
    if (viewMode === 'grid') return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} onShowDetails={() => setSelectedActivity(activity)}/>
            ))}
        </div>
    );
    
    return (
      <div className="space-y-4">
        {filteredActivities.map((activity) => (
          <ActivityListItem key={activity.id} activity={activity} onShowDetails={() => setSelectedActivity(activity)}/>
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
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">אז מה בא לך?</h1>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">גלו מגוון רחב של חוגים ופעילויות שמתאימים בדיוק לכם.</p>
            </section>
            <section className="space-y-8 max-w-5xl mx-auto">
                <CategoryFilter categories={categories} selectedCategories={selectedCategories} onCategoryToggle={handleCategoryToggle}/>
                <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} onSubmit={handleSearch} isLoading={isSearching}/>
                <div className="text-center">
                    <button onClick={() => setIsAdvancedSearchOpen(prev => !prev)} className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${isAdvancedSearchOpen ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}>
                        <SlidersIcon className="w-4 h-4" /> אפשרויות חיפוש נוספות {isAdvancedSearchOpen ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                    </button>
                </div>
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAdvancedSearchOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 mt-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <AgeRangeFilter userAge={userAge} onUserAgeChange={handleUserAgeChange}/>
                             <PriceRangeFilter minPrice={priceRange.min} maxPrice={priceRange.max} onMinPriceChange={handleMinPriceChange} onMaxPriceChange={handleMaxPriceChange}/>
                        </div>
                        <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <MultiSelectFilter title="סינון לפי עיר" options={uniqueCities} selectedOptions={selectedCities} onToggle={handleCityToggle}/>
                            <MultiSelectFilter title="סינון לפי מרכז קהילתי" options={uniqueLocations} selectedOptions={selectedLocations} onToggle={handleLocationToggle}/>
                        </div>
                    </div>
                </div>
            </section>
          </div>
        </div>
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">נמצאו <span className="font-bold text-sky-600 text-lg">{filteredActivities.length}</span> תוצאות</p>
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
          </div>
          {renderContent()}
        </section>
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto py-8">
        <div className="container mx-auto px-4 text-center"><p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Amitim Activity Finder. כל הזכויות שמורות.</p></div>
      </footer>
      {selectedActivity && <ActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />}
    </div>
  );
};

export default PublicHome;