import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, writeBatch, where } from 'firebase/firestore';
import { Activity } from '../types';

const COLLECTION_NAME = 'activities';

export const dbService = {
  // Get all activities
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

  // Add new activity
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

  // Update activity
  updateActivity: async (id: string, updates: Partial<Activity>) => {
    try {
      const activityRef = doc(db, COLLECTION_NAME, id);
      // Remove id from updates if present to avoid redundancy and type conflicts
      const { id: _, ...dataToUpdate } = updates as any;
      await updateDoc(activityRef, dataToUpdate);
    } catch (error) {
      console.error("Error updating activity: ", error);
      throw error;
    }
  },

  // Delete activity
  deleteActivity: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Error deleting activity: ", error);
      throw error;
    }
  },

  // Bulk Import (Migration Tool) - Optimized with Batch
  importActivities: async (activities: Activity[]) => {
    const batch = writeBatch(db);
    const collectionRef = collection(db, COLLECTION_NAME);

    // Process in chunks of 400 (Firestore batch limit is 500)
    const chunks = [];
    for (let i = 0; i < activities.length; i += 400) {
        chunks.push(activities.slice(i, i + 400));
    }

    for (const chunk of chunks) {
        const chunkBatch = writeBatch(db);
        chunk.forEach((activity) => {
            // IMPORTANT: Remove the old numeric ID and let Firestore generate a new string ID
            // This prevents conflicts and ensures consistency.
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

  // Update Batch (For Bulk Image/Category updates)
  updateActivitiesBatch: async (activityIds: string[], updates: Partial<Activity>) => {
      const batch = writeBatch(db);
      
      // Process in chunks of 400
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
  
  // Delete All (Use with caution - for resetting DB)
  deleteAllActivities: async () => {
     const q = query(collection(db, COLLECTION_NAME));
     const snapshot = await getDocs(q);
     const batch = writeBatch(db);
     
     // Handle large deletions in chunks if necessary, but strictly speaking batch limit applies to writes.
     // For huge collections, this should be recursive, but for <500 items simple batch is fine.
     // If >500, we need multiple batches.
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
  }
};