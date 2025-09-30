import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9GswbxQKHMEA5m0UGaIgfWg73da8OHBY",
  authDomain: "match-app-f4cf9.firebaseapp.com",
  projectId: "match-app-f4cf9",
  storageBucket: "match-app-f4cf9.appspot.com",
  messagingSenderId: "834802568976",
  appId: "1:834802568976:web:532b75d569a29b40f31f95",
  measurementId: "G-MYDYT2RCRD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalAutoDetectLongPolling: false,
});

export const COLLECTIONS = {
  MATCHES: 'matches'
};

export default app;
