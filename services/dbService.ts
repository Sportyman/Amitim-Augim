import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Activity } from '../types';

const COLLECTION_NAME = 'activities';

export const dbService = {
  // Get all activities
  getAllActivities: async (): Promise<Activity[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME)); // Add orderBy if needed
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
      // Remove id from updates if present to avoid redundancy
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

  // Bulk Import (Migration Tool)
  importActivities: async (activities: Activity[]) => {
    const batchPromises = activities.map(activity => {
        // Remove numeric ID to let Firestore generate string IDs
        const { id, ...data } = activity;
        return addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: new Date()
        });
    });
    await Promise.all(batchPromises);
  }
};
