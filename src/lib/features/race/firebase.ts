import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, once } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { SERVER_LIST } from '$lib/features/race/constants';

let database = null;
let connectedApp = null;

export async function connectToFirebase() {
  for (let i = 0; i < SERVER_LIST.length; i++) {
    const config = SERVER_LIST[i];
    const app = initializeApp(config, `server${i}`);
    const auth = getAuth(app);
    try {
      await signInAnonymously(auth);
      const db = getDatabase(app);
      // Test connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
        const testRef = ref(db, '/testServer');
        once(testRef, 'value')
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch(reject);
      });
      // If we reach here, connection succeeded
      if (connectedApp) {
        deleteApp(connectedApp);
      }
      connectedApp = app;
      database = db;
      return db;
    } catch (e) {
      deleteApp(app);
    }
  }
  throw new Error('No Firebase server available');
}

export function getDatabase() {
  if (!database) throw new Error('Firebase not connected');
  return database;
}

export const firebaseRef = {
  ref: (path) => ref(getDatabase(), path),
  push: (parentRef, value) => push(parentRef, value),
  set,
  onValue,
  once
};