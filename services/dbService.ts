import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { Activity, AdminUser, UserRole } from '../types';

const COLLECTION_NAME = 'activities';
const USERS_COLLECTION = 'users';

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

export const dbService = {
  // --- Activity Management ---
  
  getAllActivities: async (): Promise<Activity[]> => {
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
  },

  addActivity: async (activity: Omit<Activity, 'id'>) => {
    try {
      const cleanActivity = sanitizeData({
        ...activity,
        createdAt: new Date()
      });
      const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanActivity);
      return docRef.id;
    } catch (error) {
      console.error("Error adding activity: ", error);
      throw error;
    }
  },

  updateActivity: async (id: string, updates: Partial<Activity>) => {
    try {
      const activityRef = doc(db, COLLECTION_NAME, id);
      const { id: _, ...dataToUpdate } = updates as any;
      const cleanUpdates = sanitizeData(dataToUpdate);
      await updateDoc(activityRef, cleanUpdates);
    } catch (error) {
      console.error("Error updating activity: ", error);
      throw error;
    }
  },

  deleteActivity: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Error deleting activity: ", error);
      throw error;
    }
  },

  importActivities: async (activities: Activity[]) => {
    const collectionRef = collection(db, COLLECTION_NAME);

    // Process in chunks of 400 (Firestore batch limit is 500)
    const chunks = [];
    for (let i = 0; i < activities.length; i += 400) {
        chunks.push(activities.slice(i, i + 400));
    }

    for (const chunk of chunks) {
        const chunkBatch = writeBatch(db);
        chunk.forEach((activity) => {
            const { id, ...data } = activity;
            
            // UPSERT LOGIC: Use ID from CSV as doc ID if available
            let docRef;
            if (id && String(id).trim().length > 0) {
                 docRef = doc(collectionRef, String(id));
            } else {
                 docRef = doc(collectionRef); 
            }
            
            const cleanData = sanitizeData({
                ...data,
                updatedAt: new Date(),
                createdAt: data.createdAt || new Date() 
            });

            chunkBatch.set(docRef, cleanData, { merge: true }); 
        });
        await chunkBatch.commit();
    }
  },

  updateActivitiesBatch: async (activityIds: string[], updates: Partial<Activity>) => {
      const batch = writeBatch(db);
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
          });
          await chunkBatch.commit();
      }
  },
  
  deleteAllActivities: async () => {
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
  },

  // --- User/Role Management ---

  getUserRole: async (email: string): Promise<UserRole | null> => {
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
  },

  getAllAdmins: async (): Promise<AdminUser[]> => {
      try {
          const q = query(collection(db, USERS_COLLECTION));
          const snapshot = await getDocs(q);
          return snapshot.docs.map(d => ({ email: d.id, ...d.data() } as AdminUser));
      } catch (error) {
          console.error("Error fetching admins:", error);
          return [];
      }
  },

  addAdminUser: async (email: string, role: UserRole) => {
      try {
          await setDoc(doc(db, USERS_COLLECTION, email), {
              role,
              addedAt: new Date()
          });
      } catch (error) {
          console.error("Error adding admin:", error);
          throw error;
      }
  },

  removeAdminUser: async (email: string) => {
      try {
          await deleteDoc(doc(db, USERS_COLLECTION, email));
      } catch (error) {
          console.error("Error removing admin:", error);
          throw error;
      }
  }
};