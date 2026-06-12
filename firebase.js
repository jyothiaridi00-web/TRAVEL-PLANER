import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCe9oa72VdOphuFs6C7wqmWTBOVg6ZeIMc',
  authDomain: 'travel-planner-44f3c.firebaseapp.com',
  projectId: 'travel-planner-44f3c',
  storageBucket: 'travel-planner-44f3c.firebasestorage.app',
  messagingSenderId: '707970029255',
  appId: '1:707970029255:web:642584863d625442eb50e2',
  measurementId: 'G-GE6CB9CQPQ'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function getAuthErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
    'auth/invalid-login-credentials': 'Incorrect email or password. New here? Use Sign Up first.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/operation-not-allowed': 'Email sign-in is not enabled. Enable it in Firebase Console.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.'
  };
  return messages[code] || error?.message?.replace(/^Firebase:\s*/i, '') || 'Something went wrong. Please try again.';
}

export async function loginOrRegister(email, password) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const retryable = [
      'auth/invalid-login-credentials',
      'auth/user-not-found',
      'auth/invalid-credential'
    ];

    if (!retryable.includes(error.code)) {
      throw error;
    }

    try {
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (signUpError) {
      if (signUpError.code === 'auth/email-already-in-use') {
        const wrongPassword = new Error('Incorrect password. Please try again.');
        wrongPassword.code = 'auth/wrong-password';
        throw wrongPassword;
      }
      throw signUpError;
    }
  }
}

export function signOutUser() {
  return signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export { auth };
