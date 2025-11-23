import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { Activity, AdminUser, UserRole } from '../types';

const COLLECTION_NAME = 'activities';
const USERS_COLLECTION = 'users';

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

    // Process in chunks of 400 (Firestore batch limit is 500)
    const chunks = [];
    for (let i = 0; i < activities.length; i += 400) {
        chunks.push(activities.slice(i, i + 400));
    }

    for (const chunk of chunks) {
        const chunkBatch = writeBatch(db);
        chunk.forEach((activity) => {
            const { id, ...data } = activity;
            
            // UPSERT LOGIC:
            // If we have a specific string ID (like "act_000001"), use it as the Document ID.
            // This ensures that re-importing the same file updates existing records instead of duplicating.
            let docRef;
            if (id && String(id).trim().length > 0) {
                 docRef = doc(collectionRef, String(id));
            } else {
                 docRef = doc(collectionRef); // Generate new ID if missing
            }
            
            chunkBatch.set(docRef, {
                ...data,
                updatedAt: new Date(),
                // Preserve createdAt if existing, or set new one
                createdAt: data.createdAt || new Date() 
            }, { merge: true }); 
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