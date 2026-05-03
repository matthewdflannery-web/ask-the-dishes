import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDpXdzv9LwGOd68XMKXiezFhIJkqDG8-V8",
  authDomain: "ask-the-dishes.firebaseapp.com",
  projectId: "ask-the-dishes",
  storageBucket: "ask-the-dishes.firebasestorage.app",
  messagingSenderId: "626047477123",
  appId: "1:626047477123:web:7de35c3682a216310c82b6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);