// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDP02ItCr0jqTwn0_Vwa-HwdTOtJDVTEsU",
  authDomain: "my-cam-8ea82.firebaseapp.com",
  projectId: "my-cam-8ea82",
  storageBucket: "my-cam-8ea82.firebasestorage.app",
  messagingSenderId: "275678200241",
  appId: "1:275678200241:web:9356a20f7597bc1d487d90",
  measurementId: "G-G59FHCDBL1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export {
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
};
