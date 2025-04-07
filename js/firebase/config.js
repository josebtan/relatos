import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  getDoc,  // Añadido
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXTQyWKFT_6SabS5EcSpCDrS5AchxbIxc",
  authDomain: "tempsecret-254d8.firebaseapp.com",
  projectId: "tempsecret-254d8",
  storageBucket: "tempsecret-254d8.appspot.com",
  messagingSenderId: "742119537716",
  appId: "1:742119537716:web:445fee4dc8f80e62ad5e61",
  measurementId: "G-0JW2F500KP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exporta todos los servicios de Firestore que necesites
export { 
  app, 
  db,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  getDoc,  // Exportado
  limit,
  startAfter
};
