import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, writeBatch, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { Activity, AdminUser, UserRole, Category } from '../types';
import { CATEGORIES } from '../constants';

const COLLECTION_NAME = 'activities';
const USERS_COLLECTION = 'users';
const CATEGORIES_COLLECTION = 'categories';

export const dbService = {
  // --- Activity Management ---
  
  getAllActivities: async (): Promise<Activity[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME)); 
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Activity));
    } catch (error) {
      console.error("Error getting activities: ", error);
      return [];
    }
  },

  addActivity: async (activity: Omit<Activity, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...activity,
        createdAt: new Date()
      });
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
      await updateDoc(activityRef, dataToUpdate);
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
    const chunks = [];
    for (let i = 0; i < activities.length; i += 400) {
        chunks.push(activities.slice(i, i + 400));
    }

    for (const chunk of chunks) {
        const chunkBatch = writeBatch(db);
        chunk.forEach((activity) => {
            const { id, ...data } = activity;
            const newDocRef = doc(collectionRef);
            chunkBatch.set(newDocRef, {
                ...data,
                createdAt: new Date()
            });
        });
        await chunkBatch.commit();
    }
  },

  updateActivitiesBatch: async (activityIds: string[], updates: Partial<Activity>) => {
      const chunkedIds = [];
      for (let i = 0; i < activityIds.length; i += 400) {
          chunkedIds.push(activityIds.slice(i, i + 400));
      }

      for (const chunk of chunkedIds) {
          const chunkBatch = writeBatch(db);
          chunk.forEach((id) => {
              const docRef = doc(db, COLLECTION_NAME, id);
              chunkBatch.update(docRef, updates);
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

  // --- Category Management ---

  getAllCategories: async (): Promise<Category[]> => {
    try {
        const q = query(collection(db, CATEGORIES_COLLECTION));
        const snapshot = await getDocs(q);
        
        // If DB is empty, return default constants (and optionally seed them)
        if (snapshot.empty) {
            return CATEGORIES; 
        }

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    } catch (error) {
        console.error("Error getting categories:", error);
        return CATEGORIES; // Fallback
    }
  },

  addCategory: async (category: Omit<Category, 'id'>) => {
      try {
          await addDoc(collection(db, CATEGORIES_COLLECTION), category);
      } catch (error) {
          console.error("Error adding category:", error);
          throw error;
      }
  },

  updateCategory: async (id: string, updates: Partial<Category>) => {
      try {
          const catRef = doc(db, CATEGORIES_COLLECTION, id);
          await updateDoc(catRef, updates);
      } catch (error) {
          console.error("Error updating category:", error);
          throw error;
      }
  },

  deleteCategory: async (id: string) => {
      try {
          await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
      } catch (error) {
          console.error("Error deleting category:", error);
          throw error;
      }
  },

  // Seed default categories if table is empty (Helper)
  seedCategories: async () => {
      const q = query(collection(db, CATEGORIES_COLLECTION));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return;

      const batch = writeBatch(db);
      CATEGORIES.forEach(cat => {
          const docRef = doc(collection(db, CATEGORIES_COLLECTION), cat.id); // Use fixed ID for initial seed
          batch.set(docRef, { name: cat.name, iconKey: cat.iconKey });
      });
      await batch.commit();
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