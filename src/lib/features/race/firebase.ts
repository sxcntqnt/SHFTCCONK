import { initializeApp, deleteApp } from 'firebase/app';
import {
  getDatabase as getFirebaseDatabase,
  ref,
  onValue,
  set,
  push,
} from 'firebase/database';
import { get as getOnce } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { SERVER_LIST } from '$lib/features/race/constants';

let database: ReturnType<typeof getFirebaseDatabase> | null = null;
let connectedApp: ReturnType<typeof initializeApp> | null = null;

export async function connectToFirebase() {
  for (let i = 0; i < SERVER_LIST.length; i++) {
    const config = SERVER_LIST[i];
    const app = initializeApp(config, `server${i}`);
    const auth = getAuth(app);
    try {
      await signInAnonymously(auth);
      const db = getFirebaseDatabase(app);

      // Test connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
        const testRef = ref(db, '/testServer');
        getOnce(testRef)
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch(reject);
      });

      if (connectedApp) deleteApp(connectedApp);
      connectedApp = app;
      database = db;
      return db;
    } catch {
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
  ref: (path: string) => ref(getDatabase(), path),
  push: (parentRef: ReturnType<typeof ref>, value: unknown) => push(parentRef, value),
  set,
  onValue,
  once: getOnce,
};