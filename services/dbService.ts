
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, writeBatch, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { Activity, AdminUser, UserRole, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const COLLECTION_NAME = 'activities';
const USERS_COLLECTION = 'users';
const IMAGES_COLLECTION = 'activity_images';
const CATEGORIES_COLLECTION = 'categories';

// Helper to remove undefined values which Firestore hates
const sanitizeData = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key];
        }
    });
    return clean;
};

// --- Standalone Functions to avoid self-reference issues ---

const getSavedImagesMap = async (): Promise<Record<string, string>> => {
    try {
        const q = query(collection(db, IMAGES_COLLECTION));
        const snapshot = await getDocs(q);
        const map: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.imageUrl) {
                map[doc.id] = data.imageUrl;
            }
        });
        return map;
    } catch (error) {
        console.error("Error fetching saved images:", error);
        return {};
    }
};

const saveImageMapping = async (id: string, imageUrl: string) => {
    if (!id || !imageUrl) return;
    try {
        await setDoc(doc(db, IMAGES_COLLECTION, String(id)), { 
            imageUrl,
            updatedAt: new Date() 
        }, { merge: true });
    } catch (error) {
        console.error("Error saving image mapping:", error);
    }
};

const clearImageCache = async () => {
    const q = query(collection(db, IMAGES_COLLECTION));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

const getAllActivities = async (): Promise<Activity[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME)); 
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // SAFETY: Ensure strings are strings to prevent UI crashes
      return {
          id: doc.id,
          title: data.title || 'ללא שם',
          category: data.category || 'כללי',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          location: data.location || 'הרצליה',
          price: typeof data.price === 'number' ? data.price : 0,
          ageGroup: data.ageGroup || '',
          schedule: data.schedule || '',
          instructor: data.instructor || null,
          phone: data.phone || null,
          detailsUrl: data.detailsUrl || '#',
          isVisible: data.isVisible !== false, // Default to true
          tags: Array.isArray(data.tags) ? data.tags : [],
          ai_tags: Array.isArray(data.ai_tags) ? data.ai_tags : [],
          minAge: data.minAge,
          maxAge: data.maxAge,
          ...data
      } as Activity;
    });
  } catch (error) {
    console.error("Error getting activities: ", error);
    return [];
  }
};

const addActivity = async (activity: Omit<Activity, 'id'>) => {
  try {
    const cleanActivity = sanitizeData({
      ...activity,
      createdAt: new Date()
    });
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanActivity);
    
    // Cache image if provided
    if (activity.imageUrl) {
        await saveImageMapping(docRef.id, activity.imageUrl);
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding activity: ", error);
    throw error;
  }
};

const updateActivity = async (id: string, updates: Partial<Activity>) => {
  try {
    const activityRef = doc(db, COLLECTION_NAME, id);
    const { id: _, ...dataToUpdate } = updates as any;
    const cleanUpdates = sanitizeData(dataToUpdate);
    
    await updateDoc(activityRef, cleanUpdates);

    // Update image cache if image changed
    if (updates.imageUrl) {
        await saveImageMapping(id, updates.imageUrl);
    }

  } catch (error) {
    console.error("Error updating activity: ", error);
    throw error;
  }
};

const deleteActivity = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting activity: ", error);
    throw error;
  }
};

const importActivities = async (activities: Activity[]) => {
  const collectionRef = collection(db, COLLECTION_NAME);
  
  const savedImagesMap = await getSavedImagesMap();

  const chunks = [];
  for (let i = 0; i < activities.length; i += 400) {
      chunks.push(activities.slice(i, i + 400));
  }

  for (const chunk of chunks) {
      const chunkBatch = writeBatch(db);
      
      chunk.forEach((activity) => {
          const { id, ...data } = activity;
          
          let docRef;
          let finalId = String(id);

          if (id && String(id).trim().length > 0) {
               docRef = doc(collectionRef, finalId);
          } else {
               docRef = doc(collectionRef); 
               finalId = docRef.id;
          }
          
          let finalImageUrl = data.imageUrl;
          if (savedImagesMap[finalId]) {
              finalImageUrl = savedImagesMap[finalId];
          } else if (data.imageUrl) {
              const imgCacheRef = doc(db, IMAGES_COLLECTION, finalId);
              chunkBatch.set(imgCacheRef, { imageUrl: data.imageUrl, updatedAt: new Date() }, { merge: true });
          }

          const cleanData = sanitizeData({
              ...data,
              imageUrl: finalImageUrl,
              updatedAt: new Date(),
              createdAt: data.createdAt || new Date() 
          });

          chunkBatch.set(docRef, cleanData, { merge: true }); 
      });
      await chunkBatch.commit();
  }
};

const updateActivitiesBatch = async (activityIds: string[], updates: Partial<Activity>) => {
    const chunkedIds = [];
    for (let i = 0; i < activityIds.length; i += 400) {
        chunkedIds.push(activityIds.slice(i, i + 400));
    }

    const cleanUpdates = sanitizeData(updates);

    for (const chunk of chunkedIds) {
        const chunkBatch = writeBatch(db);
        
        chunk.forEach((id) => {
            const docRef = doc(db, COLLECTION_NAME, id);
            chunkBatch.update(docRef, cleanUpdates);
            
            if (updates.imageUrl) {
                const imgCacheRef = doc(db, IMAGES_COLLECTION, id);
                chunkBatch.set(imgCacheRef, { imageUrl: updates.imageUrl, updatedAt: new Date() }, { merge: true });
            }
        });
        
        await chunkBatch.commit();
    }
};

const deleteAllActivities = async () => {
   const q = query(collection(db, COLLECTION_NAME));
   const snapshot = await getDocs(q);
   let operationCounter = 0;
   let currentBatch = writeBatch(db);

   for (const doc of snapshot.docs) {
       currentBatch.delete(doc.ref);
       operationCounter++;

       if (operationCounter >= 400) {
           await currentBatch.commit();
           currentBatch = writeBatch(db);
           operationCounter = 0;
       }
   }
   if (operationCounter > 0) {
       await currentBatch.commit();
   }
};

const getUserRole = async (email: string): Promise<UserRole | null> => {
  try {
      const docRef = doc(db, USERS_COLLECTION, email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          return docSnap.data().role as UserRole;
      }
      return null;
  } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
  }
};

const getAllAdmins = async (): Promise<AdminUser[]> => {
    try {
        const q = query(collection(db, USERS_COLLECTION));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ email: d.id, ...d.data() } as AdminUser));
    } catch (error) {
        console.error("Error fetching admins:", error);
        return [];
    }
};

const addAdminUser = async (email: string, role: UserRole) => {
    try {
        await setDoc(doc(db, USERS_COLLECTION, email), {
            role,
            addedAt: new Date()
        });
    } catch (error) {
        console.error("Error adding admin:", error);
        throw error;
    }
};

const removeAdminUser = async (email: string) => {
    try {
        await deleteDoc(doc(db, USERS_COLLECTION, email));
    } catch (error) {
        console.error("Error removing admin:", error);
        throw error;
    }
};

// --- Category Management ---

const getCategories = async (): Promise<Category[]> => {
    try {
        const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('order'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            // Seed default categories if empty
            const batch = writeBatch(db);
            DEFAULT_CATEGORIES.forEach(cat => {
                const ref = doc(db, CATEGORIES_COLLECTION, cat.id);
                batch.set(ref, cat);
            });
            await batch.commit();
            return DEFAULT_CATEGORIES;
        }

        return snapshot.docs.map(d => d.data() as Category);
    } catch (error) {
        console.error("Error getting categories:", error);
        return DEFAULT_CATEGORIES;
    }
};

const saveCategory = async (category: Category) => {
    try {
        await setDoc(doc(db, CATEGORIES_COLLECTION, category.id), category, { merge: true });
    } catch (error) {
        console.error("Error saving category:", error);
        throw error;
    }
};

const deleteCategory = async (id: string) => {
    try {
        await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};

const updateCategoriesOrder = async (categories: Category[]) => {
    const batch = writeBatch(db);
    categories.forEach((cat, index) => {
        const ref = doc(db, CATEGORIES_COLLECTION, cat.id);
        batch.update(ref, { order: index + 1 });
    });
    await batch.commit();
};

export const dbService = {
  getSavedImagesMap,
  saveImageMapping,
  clearImageCache,
  getAllActivities,
  addActivity,
  updateActivity,
  deleteActivity,
  importActivities,
  updateActivitiesBatch,
  deleteAllActivities,
  getUserRole,
  getAllAdmins,
  addAdminUser,
  removeAdminUser,
  getCategories,
  saveCategory,
  deleteCategory,
  updateCategoriesOrder
};