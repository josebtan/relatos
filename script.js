// Alternar modo oscuro
document.getElementById("dark-mode-toggle")?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  document.getElementById("dark-mode-toggle").textContent =
    document.body.classList.contains("dark-mode") ? "Modo Claro" : "Modo Oscuro";
});

// Importar Firebase
import { 
  initializeApp, getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  updateDoc, doc, increment, serverTimestamp, deleteDoc, getDocs, getDoc,
  limit, startAfter, where 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = { /* Configuración de Firebase */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const SECRET_KEY = "claveSecreta123";

// Variables globales
let lastVisible = null;
let loading = false;
let hasMore = true;
const initialLoadLimit = 15;
const loadMoreLimit = 8;
const voteQueue = [];

// Referencias al DOM
const messageInput = document.getElementById("message");
const charCount = document.getElementById("char-count");
const loadingSpinner = document.getElementById("loading-spinner");

// Actualizar contador de caracteres
messageInput.addEventListener("input", () => {
  const remaining = 1000 - messageInput.value.length;
  charCount.textContent = `${remaining} caracteres restantes`;
  charCount.style.color = remaining < 100 ? "#ea4335" : "#666";
});

// Cifrado y descifrado con CryptoJS
function encryptMessage(message) {
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
}
function decryptMessage(encryptedMessage) {
  return CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY).toString(CryptoJS.enc.Utf8);
}

// Enviar publicación
async function submitPost() {
  const message = messageInput.value.trim();
  if (!message) return alert("Escribe un mensaje antes de publicar.");

  try {
    await addDoc(collection(db, "mensajes"), {
      texto: encryptMessage(message),
      expiresAt: Date.now() + parseInt(document.getElementById("duration").value) * 60000,
      likes: 0,
      dislikes: 0,
      timestamp: serverTimestamp(),
      commentCount: 0
    });
    messageInput.value = "";
    charCount.textContent = "1000 caracteres restantes";
  } catch (error) {
    console.error("Error al publicar:", error);
  }
}

document.getElementById("submit-button").addEventListener("click", submitPost);

// Eliminar mensajes expirados
async function deleteExpiredMessages() {
  const snapshot = await getDocs(query(collection(db, "mensajes"), where("expiresAt", "<", Date.now())));
  snapshot.forEach(async docSnap => await deleteDoc(doc(db, "mensajes", docSnap.id)));
}

// Actualizar cuenta regresiva
function updateCountdown() {
  document.querySelectorAll(".countdown").forEach(counter => {
    const expiration = parseInt(counter.dataset.expiration);
    const timeLeft = expiration - Date.now();
    counter.textContent = timeLeft > 0 ? `⏳ ${Math.floor(timeLeft / 60000)}m` : "Expirado";
  });
  setTimeout(updateCountdown, 1000);
}

// Manejo de votos
async function handleVote(type, postId) {
  if (localStorage.getItem(`vote-${postId}`)) return alert("Ya has votado.");
  try {
    await updateDoc(doc(db, "mensajes", postId), { [type]: increment(1) });
    localStorage.setItem(`vote-${postId}`, type);
    document.getElementById(`like-${postId}`).disabled = true;
    document.getElementById(`dislike-${postId}`).disabled = true;
  } catch (error) {
    console.error("Error al votar:", error);
  }
}

// Cargar publicaciones
async function loadPosts(loadMore = false) {
  if (loading || !hasMore) return;
  loading = true;
  
  try {
    const q = query(
      collection(db, "mensajes"),
      orderBy("expiresAt", "desc"),
      loadMore && lastVisible ? startAfter(lastVisible) : limit(initialLoadLimit)
    );
    
    const snapshot = await getDocs(q);
    if (!loadMore) document.getElementById("posts").innerHTML = "";
    snapshot.forEach(docSnap => renderPost(docSnap));
    
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
  } catch (error) {
    console.error("Error cargando publicaciones:", error);
  } finally {
    loading = false;
  }
}

// Renderizar publicación
function renderPost(docSnap) {
  const data = docSnap.data();
  const postContainer = document.getElementById("posts");
  
  const postElement = document.createElement("div");
  postElement.className = "post";
  postElement.innerHTML = `
    <div class="post-content">${decryptMessage(data.texto)}</div>
    <div class="post-footer">
      <span class="countdown" data-expiration="${data.expiresAt}"></span>
      <button id="like-${docSnap.id}" onclick="handleVote('likes', '${docSnap.id}')">👍 ${data.likes}</button>
      <button id="dislike-${docSnap.id}" onclick="handleVote('dislikes', '${docSnap.id}')">👎 ${data.dislikes}</button>
    </div>
  `;
  
  postContainer.appendChild(postElement);
}

// Inicializar
async function init() {
  await deleteExpiredMessages();
  loadPosts();
  window.addEventListener("scroll", () => {
    if (document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 500) {
      loadPosts(true);
    }
  });
  updateCountdown();
}

init();
