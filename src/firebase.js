import firebase from "firebase";

const firebaseConfig = {
  apiKey: "AIzaSyDA9uZ_Lx5Fe6L9xoEXPQA6Tr0d5vLJViI",
  authDomain: "discord-mern-live.firebaseapp.com",
  projectId: "discord-mern-live",
  storageBucket: "discord-mern-live.firebasestorage.app",
  messagingSenderId: "151200259490",
  appId: "1:151200259490:web:6a4f49d391500062db66fb",
};

const firebaseApp = firebase.initializeApp(firebaseConfig);

const db = firebaseApp.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

export { auth, provider };
export default db;
