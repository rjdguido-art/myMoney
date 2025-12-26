import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBWZi-qt-xlWWfNW45UYkgmkamycPmzBbQ",
  authDomain: "mymoney-e1620.firebaseapp.com",
  projectId: "mymoney-e1620",
  storageBucket: "mymoney-e1620.firebasestorage.app",
  messagingSenderId: "1012342000356",
  appId: "1:1012342000356:web:ba36b01099c8b5fe623af1",
  measurementId: "G-QHBKFYYWPF",
};

export function initFirebase() {
  if (typeof window === "undefined") return;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}
