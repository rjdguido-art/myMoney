import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBWZi-qt-xlWWfNW45UYkgmkamycPmzBbQ',
  authDomain: 'mymoney-e1620.firebaseapp.com',
  projectId: 'mymoney-e1620',
  storageBucket: 'mymoney-e1620.firebasestorage.app',
  messagingSenderId: '1012342000356',
  appId: '1:1012342000356:web:ba36b01099c8b5fe623af1',
  measurementId: 'G-QHBKFYYWPF',
}

const app = initializeApp(firebaseConfig)

// getAnalytics needs a browser environment, so guard for SSR/build tools.
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const logOut = () => signOut(auth)
export const signInWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const registerWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password)

