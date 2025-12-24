// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvn9SpfwMhiXLqeFnlH5SSi5L1434o2Pc",
  authDomain: "siuroma-kids.firebaseapp.com",
  projectId: "siuroma-kids",
  storageBucket: "siuroma-kids.firebasestorage.app",
  messagingSenderId: "1074502236520",
  appId: "1:1074502236520:web:0e5410da16160ac5767edd",
  measurementId: "G-9DNFVDM21S"
};

const app = initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
