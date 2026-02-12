import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// You'll need to replace these with your actual Firebase project credentials

const firebaseConfig = {
  apiKey: "AIzaSyBBxsaPyoKu1yQwQoq1Hl82sa5gRbgK7eI",
  authDomain: "workbook-application.firebaseapp.com",
  projectId: "workbook-application",
  storageBucket: "workbook-application.firebasestorage.app",
  messagingSenderId: "646171677385",
  appId: "1:646171677385:web:a9717ed613d16a1ce03318",
  measurementId: "G-6ZBTRXB7EK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;