// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCRTIYY_XviLB26GedZCPfgTphoy0bL9LM",
  authDomain: "my-oreo-cam.firebaseapp.com",
  projectId: "my-oreo-cam",
  storageBucket: "my-oreo-cam.firebasestorage.app",
  messagingSenderId: "26332160183",
  appId: "1:26332160183:web:548bdae10d0e88de826d32",
  measurementId: "G-X77WW7MXNS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
