
import React, { useState, useEffect } from 'react';
import { Category } from '../../types';
import { dbService } from '../../services/dbService';
import { ICON_MAP } from '../../constants';
import { Eye, EyeOff, ArrowUp, ArrowDown, Plus, Trash2, GripVertical, Save, Check } from 'lucide-react';

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIconType, setNewCatIconType] = useState('icon'); // 'icon' or 'emoji'
    const [newCatIconId, setNewCatIconId] = useState('sport');
    const [newCatEmoji, setNewCatEmoji] = useState('🌟');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        const data = await dbService.getCategories();
        setCategories(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
        setLoading(false);
    };

    const handleToggleVisibility = async (category: Category) => {
        const updated = { ...category, isVisible: !category.isVisible };
        // Optimistic update
        setCategories(prev => prev.map(c => c.id === category.id ? updated : c));
        await dbService.saveCategory(updated);
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categories.length - 1) return;

        const newCategories = [...categories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Swap
        [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
        
        // Update orders
        newCategories.forEach((cat, idx) => cat.order = idx + 1);
        
        setCategories(newCategories);
        // Debounce/Save
        await dbService.updateCategoriesOrder(newCategories);
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        
        const id = `cat_${Date.now()}`;
        const iconId = newCatIconType === 'icon' ? newCatIconId : `emoji:${newCatEmoji}`;
        
        const newCategory: Category = {
            id,
            name: newCatName,
            iconId,
            order: categories.length + 1,
            isVisible: true
        };

        await dbService.saveCategory(newCategory);
        setCategories([...categories, newCategory]);
        setIsAdding(false);
        setNewCatName('');
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('האם למחוק קטגוריה זו? שים לב: חוגים המשויכים אליה לא ימחקו אך לא יופיעו בסינון.')) {
            await dbService.deleteCategory(id);
            setCategories(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">ניהול קטגוריות</h3>
                    <p className="text-sm text-gray-500">קבע אילו קטגוריות יוצגו ובאיזה סדר</p>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-lg font-bold hover:bg-sky-200 transition-colors"
                >
                    {isAdding ? 'ביטול הוספה' : <><Plus className="w-4 h-4" /> הוסף קטגוריה</>}
                </button>
            </div>

            {/* Add New Category Form */}
            {isAdding && (
                <div className="bg-gray-50 p-4 rounded-xl border border-sky-100 mb-6 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold text-gray-700 mb-3">פרטי קטגוריה חדשה</h4>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-gray-500 block mb-1">שם הקטגוריה</label>
                            <input 
                                type="text" 
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                                placeholder="למשל: סדנאות קיץ"
                            />
                        </div>
                        
                        <div className="w-full md:w-auto">
                            <label className="text-xs text-gray-500 block mb-1">סוג אייקון</label>
                            <div className="flex bg-white rounded-lg border border-gray-300 p-1">
                                <button 
                                    onClick={() => setNewCatIconType('icon')}
                                    className={`px-3 py-1 rounded-md text-sm ${newCatIconType === 'icon' ? 'bg-sky-100 text-sky-700 font-bold' : 'text-gray-600'}`}
                                >
                                    אייקון
                                </button>
                                <button 
                                    onClick={() => setNewCatIconType('emoji')}
                                    className={`px-3 py-1 rounded-md text-sm ${newCatIconType === 'emoji' ? 'bg-sky-100 text-sky-700 font-bold' : 'text-gray-600'}`}
                                >
                                    אימוג'י
                                </button>
                            </div>
                        </div>

                        <div className="w-full md:w-auto">
                            <label className="text-xs text-gray-500 block mb-1">בחירה</label>
                            {newCatIconType === 'icon' ? (
                                <select 
                                    value={newCatIconId} 
                                    onChange={e => setNewCatIconId(e.target.value)}
                                    className="w-full p-2 rounded-lg border border-gray-300 bg-white outline-none"
                                >
                                    {Object.keys(ICON_MAP).map(key => (
                                        <option key={key} value={key}>{key}</option>
                                    ))}
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    value={newCatEmoji}
                                    onChange={e => setNewCatEmoji(e.target.value)}
                                    className="w-20 p-2 rounded-lg border border-gray-300 text-center text-xl outline-none"
                                    placeholder="🌟"
                                />
                            )}
                        </div>

                        <button 
                            onClick={handleAddCategory}
                            disabled={!newCatName}
                            className="bg-sky-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> שמור
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="text-center py-10 text-gray-500">טוען קטגוריות...</div>
            ) : (
                <div className="space-y-2">
                    {categories.map((cat, index) => {
                        const IconCmp = ICON_MAP[cat.iconId || ''];
                        const isEmoji = cat.iconId?.startsWith('emoji:');
                        const emoji = isEmoji ? cat.iconId?.split(':')[1] : null;

                        return (
                            <div key={cat.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${cat.isVisible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl border border-gray-200">
                                        {IconCmp ? <IconCmp className="w-5 h-5 text-gray-600" /> : (emoji || '?')}
                                    </div>
                                    
                                    <span className={`font-medium ${cat.isVisible ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
                                        {cat.name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-1 mr-2">
                                        <button 
                                            onClick={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            className="text-gray-400 hover:text-sky-600 disabled:opacity-30"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleMove(index, 'down')}
                                            disabled={index === categories.length - 1}
                                            className="text-gray-400 hover:text-sky-600 disabled:opacity-30"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => handleToggleVisibility(cat)}
                                        className={`p-2 rounded-lg transition-colors ${cat.isVisible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                        title={cat.isVisible ? "הסתר" : "הצג"}
                                    >
                                        {cat.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>

                                    <button 
                                        onClick={() => handleDelete(cat.id)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="מחק"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;