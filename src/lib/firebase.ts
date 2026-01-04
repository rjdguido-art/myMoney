import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBRW5Oa0V6VVPQHV5cVdE2JrZi93HKPs_M",
  authDomain: "argo-4cc6b.firebaseapp.com",
  projectId: "argo-4cc6b",
  storageBucket: "argo-4cc6b.firebasestorage.app",
  messagingSenderId: "798062548748",
  appId: "1:798062548748:web:0a6bea808aaaa93b529b29",
  measurementId: "G-F2D4G46E5G",
};

export const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
