
import { db, auth } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, writeBatch, setDoc, getDoc, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { Activity, AdminUser, UserRole, Category, AuditLog, AppSettings } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const COLLECTION_NAME = 'activities';
const USERS_COLLECTION = 'users';
const IMAGES_COLLECTION = 'activity_images';
const CATEGORIES_COLLECTION = 'categories';
const AUDIT_COLLECTION = 'audit_logs';
const SETTINGS_COLLECTION = 'settings';
const APP_SETTINGS_DOC = 'app_config';

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

// --- Internal Logging Helper ---
const logAction = async (
    action: AuditLog['action'], 
    documentId: string, 
    prevData: any = null, 
    newData: any = null,
    desc: string = ''
) => {
    try {
        const userEmail = auth.currentUser?.email || 'unknown';
        // Don't log heavy bulk operations individually to save writes, 
        // handled by bulk wrapper usually, but essential for single edits.
        
        await addDoc(collection(db, AUDIT_COLLECTION), {
            action,
            collection: COLLECTION_NAME,
            documentId: String(documentId),
            userEmail,
            timestamp: new Date(),
            previousData: prevData ? JSON.stringify(prevData) : null, // Stringify to ensure deep copy/safety
            newData: newData ? JSON.stringify(newData) : null,
            description: desc
        });
    } catch (e) {
        console.error("Failed to log action", e);
        // We don't throw here to avoid blocking the actual operation if logging fails
    }
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
      return {
          id: doc.id,
          title: data.title || 'ללא שם',
          category: data.category || 'כללי',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          location: data.location || 'הרצליה',
          city: data.city || 'הרצליה', // Default to Herzliya if missing
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
    
    // Log
    await logAction('create', docRef.id, null, cleanActivity, `Created activity: ${activity.title}`);

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
    
    // Get current data for log
    const snapshot = await getDoc(activityRef);
    const prevData = snapshot.exists() ? snapshot.data() : null;

    const { id: _, ...dataToUpdate } = updates as any;
    const cleanUpdates = sanitizeData(dataToUpdate);
    
    await updateDoc(activityRef, cleanUpdates);

    // Log
    await logAction('update', id, prevData, cleanUpdates, `Updated activity: ${prevData?.title || id}`);

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
    // Get current data for log
    const activityRef = doc(db, COLLECTION_NAME, id);
    const snapshot = await getDoc(activityRef);
    const prevData = snapshot.exists() ? snapshot.data() : null;

    await deleteDoc(activityRef);

    // Log
    if (prevData) {
        await logAction('delete', id, prevData, null, `Deleted activity: ${prevData.title}`);
    }

  } catch (error) {
    console.error("Error deleting activity: ", error);
    throw error;
  }
};

const importActivities = async (activities: Activity[]) => {
  const collectionRef = collection(db, COLLECTION_NAME);
  
  // Get existing images to avoid overwriting with blank/broken URLs if user manually set them
  const savedImagesMap = await getSavedImagesMap();

  // Log specific bulk event
  await addDoc(collection(db, AUDIT_COLLECTION), {
      action: 'bulk_import',
      collection: COLLECTION_NAME,
      userEmail: auth.currentUser?.email || 'unknown',
      timestamp: new Date(),
      description: `Bulk import of ${activities.length} items via CSV`,
      count: activities.length
  });

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
          } else if (data.imageUrl && data.imageUrl.length > 5) {
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

    // Log bulk update generic
    await addDoc(collection(db, AUDIT_COLLECTION), {
        action: 'update',
        collection: COLLECTION_NAME,
        userEmail: auth.currentUser?.email || 'unknown',
        timestamp: new Date(),
        description: `Bulk update of ${activityIds.length} items`,
        newData: JSON.stringify(cleanUpdates)
    });

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

   // Log
   await addDoc(collection(db, AUDIT_COLLECTION), {
        action: 'delete',
        collection: COLLECTION_NAME,
        userEmail: auth.currentUser?.email || 'unknown',
        timestamp: new Date(),
        description: `Hard reset: Deleted all ${snapshot.size} activities`,
   });

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

// --- Audit & Maintenance ---

const getAuditLogs = async (limitCount = 50): Promise<AuditLog[]> => {
    try {
        const q = query(collection(db, AUDIT_COLLECTION), orderBy('timestamp', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    } catch (e) {
        console.error("Error fetching logs", e);
        return [];
    }
};

const restoreVersion = async (log: AuditLog) => {
    try {
        if (log.action === 'update' || log.action === 'delete') {
            if (log.previousData) {
                const data = JSON.parse(log.previousData);
                await setDoc(doc(db, COLLECTION_NAME, log.documentId), data);
                await logAction('restore', log.documentId, null, null, `Restored version from ${new Date(log.timestamp.seconds * 1000).toLocaleString()}`);
            }
        } else if (log.action === 'create') {
            await deleteDoc(doc(db, COLLECTION_NAME, log.documentId));
            await logAction('restore', log.documentId, null, null, `Undid creation from ${new Date(log.timestamp.seconds * 1000).toLocaleString()}`);
        }
    } catch (e) {
        console.error("Restore failed", e);
        throw e;
    }
};

const deleteOldLogs = async (daysToKeep: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const q = query(collection(db, AUDIT_COLLECTION), where('timestamp', '<', Timestamp.fromDate(cutoffDate)));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let counter = 0;
    
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        counter++;
    });
    
    if (counter > 0) await batch.commit();
    return counter;
};

// --- App Settings ---

const getAppSettings = async (): Promise<AppSettings> => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as AppSettings;
        }
        return { enableColorfulCategories: false }; // Default
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { enableColorfulCategories: false };
    }
};

const updateAppSettings = async (settings: Partial<AppSettings>) => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error("Error saving settings:", error);
        throw error;
    }
};

const getCollectionStats = async () => {
    // Rough estimation for Spark plan monitoring
    const actSnap = await getDocs(collection(db, COLLECTION_NAME));
    const imgSnap = await getDocs(collection(db, IMAGES_COLLECTION));
    const logSnap = await getDocs(collection(db, AUDIT_COLLECTION));
    
    const activities = actSnap.size;
    const images = imgSnap.size;
    const logs = logSnap.size;
    
    // Estimation: 1KB per activity, 0.5KB per image ref, 2KB per log (history is heavier)
    const estimatedSizeKB = (activities * 1) + (images * 0.5) + (logs * 2);
    
    return {
        activities,
        images,
        logs,
        estimatedSizeMB: (estimatedSizeKB / 1024).toFixed(2)
    };
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
  updateCategoriesOrder,
  getAuditLogs,
  restoreVersion,
  deleteOldLogs,
  getCollectionStats,
  getAppSettings,
  updateAppSettings
};
