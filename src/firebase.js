// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUZZSe3RYIqIni5CFHRIniKcKb5vKUJ4A",
  authDomain: "lastchance-716c3.firebaseapp.com",
  projectId: "lastchance-716c3",
  storageBucket: "lastchance-716c3.appspot.com",
  messagingSenderId: "502545743284",
  appId: "1:502545743284:web:a679ecab5a4d58c1f606e1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();

export default firebase;