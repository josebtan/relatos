// Alternar modo oscuro
const darkModeToggle = document.getElementById("dark-mode-toggle");
if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      darkModeToggle.textContent = "Modo Claro";
    } else {
      darkModeToggle.textContent = "Modo Oscuro";
    }
  });
}

// Importar funciones necesarias de Firebase
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
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
  deleteDoc, 
  getDocs, 
  getDoc, 
  limit, 
  startAfter, 
  where 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Configuración de Firebase
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
const SECRET_KEY = "claveSecreta123";

// Variables de control
let lastVisible = null;
let loading = false;
let hasMore = true;
const initialLoadLimit = 15;
const loadMoreLimit = 8;

// Elementos del DOM
const messageInput = document.getElementById("message");
const charCount = document.getElementById("char-count");
const loadingSpinner = document.getElementById("loading-spinner");

// Actualizar contador de caracteres
messageInput.addEventListener("input", updateCharCount);
function updateCharCount() {
  const remaining = 1000 - messageInput.value.length;
  charCount.textContent = `${remaining} caracteres restantes`;
  charCount.style.color = remaining < 100 ? "#ea4335" : "#666";
}

// Funciones de cifrado/descifrado
function encryptMessage(message) {
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
}

function decryptMessage(encryptedMessage) {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Enviar publicación
async function submitPost() {
  const message = messageInput.value.trim();
  const duration = parseInt(document.getElementById("duration").value);
  const age = document.getElementById("age").value.trim();
  const gender = document.getElementById("gender").value;

  if (message === "") {
    alert("Por favor escribe un mensaje antes de publicar.");
    return;
  }

  try {
    const submitBtn = document.getElementById("submit-button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Publicando...";
    
    await addDoc(collection(db, "mensajes"), {
      texto: encryptMessage(message),
      edad: age || null,
      sexo: gender,
      expiresAt: Date.now() + duration * 60000,
      likes: 0,
      dislikes: 0,
      timestamp: serverTimestamp(),
      commentCount: 0
    });
    
    messageInput.value = "";
    updateCharCount();
  } catch (error) {
    console.error("Error al guardar:", error);
    alert("Ocurrió un error al publicar. Por favor intenta nuevamente.");
  } finally {
    const submitBtn = document.getElementById("submit-button");
    submitBtn.disabled = false;
    submitBtn.textContent = "Publicar";
  }
}

document.getElementById("submit-button").addEventListener("click", submitPost);

// Eliminar mensajes expirados
async function deleteExpiredMessages() {
  const now = Date.now();
  const expiredQuery = query(collection(db, "mensajes"), where("expiresAt", "<", now));
  const snapshot = await getDocs(expiredQuery);
  snapshot.forEach(async (docSnap) => {
    await deleteDoc(doc(db, "mensajes", docSnap.id));
  });
}

// Formatear tiempo restante
function formatTimeRemaining(milliseconds) {
  const totalMinutes = Math.floor(milliseconds / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  
  if (days > 0) {
    const remainingHours = totalHours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    return `${totalHours}h ${remainingMinutes}m`;
  }
  
  const remainingSeconds = Math.floor((milliseconds % 60000) / 1000);
  return `${totalMinutes}m ${remainingSeconds}s`;
}

// Actualizar contador de tiempo
function updateCountdown() {
  document.querySelectorAll(".countdown").forEach((counter) => {
    const expiration = parseInt(counter.getAttribute("data-expiration"));
    const postId = counter.getAttribute("data-id");
    const timeLeft = expiration - Date.now();

    if (timeLeft > 0) {
      counter.textContent = `⏳ ${formatTimeRemaining(timeLeft)}`;
    } else {
      counter.textContent = "Expirado";
      const postElement = counter.closest(".post");
      if (postElement) postElement.remove();
      deleteDoc(doc(db, "mensajes", postId)).catch(console.error);
    }
  });
  setTimeout(updateCountdown, 1000);
}

// Manejo de votos
async function handleVote(type, postId) {
  const voteKey = `vote-${postId}`;
  const previousVote = localStorage.getItem(voteKey);
  if (previousVote) {
    alert("Ya has votado en esta publicación.");
    return;
  }

  const postRef = doc(db, "mensajes", postId);
  let updates = {};
  if (type === "like") {
    updates.likes = increment(1);
  } else if (type === "dislike") {
    updates.dislikes = increment(1);
  }

  try {
    await updateDoc(postRef, updates);
    localStorage.setItem(voteKey, type);
    document.getElementById(`like-${postId}`).disabled = true;
    document.getElementById(`dislike-${postId}`).disabled = true;
  } catch (error) {
    console.error("Error al actualizar voto:", error);
  }
}

// Configurar botones de votación
function setupVotingButtons(postId) {
  const voteKey = `vote-${postId}`;
  const previousVote = localStorage.getItem(voteKey);
  if (previousVote) {
    document.getElementById(`like-${postId}`).disabled = true;
    document.getElementById(`dislike-${postId}`).disabled = true;
  }
  
  document.getElementById(`like-${postId}`).addEventListener("click", () => handleVote("like", postId));
  document.getElementById(`dislike-${postId}`).addEventListener("click", () => handleVote("dislike", postId));
}

// Sistema de comentarios
window.submitComment = async function(postId) {
  const commentInput = document.getElementById(`comment-input-${postId}`);
  const commentText = commentInput.value.trim();
  
  if (commentText === "") {
    alert("No puedes enviar un comentario vacío.");
    return;
  }

  try {
    const encryptedComment = encryptMessage(commentText);
    await addDoc(collection(db, "mensajes", postId, "comentarios"), {
      texto: encryptedComment,
      timestamp: serverTimestamp()
    });
    
    const postRef = doc(db, "mensajes", postId);
    await updateDoc(postRef, {
      commentCount: increment(1)
    });
    
    commentInput.value = "";
  } catch (error) {
    console.error("Error al comentar:", error);
    alert("Ocurrió un error al publicar el comentario");
  }
};

// Cargar publicaciones
async function loadPosts(loadMore = false) {
  if (loading || !hasMore) return;
  
  showLoader();
  loading = true;
  
  try {
    let q;
    if (loadMore && lastVisible) {
      q = query(
        collection(db, "mensajes"),
        orderBy("expiresAt", "desc"),
        startAfter(lastVisible),
        limit(loadMoreLimit)
      );
    } else {
      q = query(
        collection(db, "mensajes"),
        orderBy("expiresAt", "desc"),
        limit(initialLoadLimit)
      );
    }

    const snapshot = await getDocs(q);
    const postsContainer = document.getElementById("posts");
    if (!loadMore) postsContainer.innerHTML = "";
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const timeLeft = data.expiresAt - Date.now();
      
      if (timeLeft > 0) {
        const decryptedMessage = decryptMessage(data.texto);
        const postDiv = document.createElement("div");
        postDiv.className = "post";
        postDiv.innerHTML = `
          <div class="post-header">
            <span class="post-id">ID: ${docSnap.id}</span>
            <span>Edad: ${data.edad || "N/A"}</span>
            <span>Sexo: ${data.sexo}</span>
          </div>
          <div class="post-content">${decryptedMessage}</div>
          <div class="post-footer">
            <span class="countdown" data-expiration="${data.expiresAt}" data-id="${docSnap.id}"></span>
            <div class="vote-buttons">
              <button class="like-btn" id="like-${docSnap.id}">👍 ${data.likes}</button>
              <button class="dislike-btn" id="dislike-${docSnap.id}">👎 ${data.dislikes}</button>
            </div>
          </div>
          <div class="comments-section">
            <div class="comments-header">
              <h4>Comentarios (${data.commentCount || 0})</h4>
            </div>
            <div id="comments-${docSnap.id}" class="comments-container"></div>
            <div class="comment-form">
              <textarea 
                id="comment-input-${docSnap.id}" 
                placeholder="Escribe un comentario..."
                maxlength="500"
              ></textarea>
              <button onclick="submitComment('${docSnap.id}')">Comentar</button>
            </div>
          </div>
        `;
        postsContainer.appendChild(postDiv);
        setupVotingButtons(docSnap.id);
      }
    });
    
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
    updateCountdown();
  } catch (error) {
    console.error("Error cargando publicaciones:", error);
  } finally {
    hideLoader();
    loading = false;
  }
}

// Inicialización
async function init() {
  await deleteExpiredMessages();
  updateCharCount();
  loadPosts();
  setInterval(updateCountdown, 1000);
}

init();

// Funciones auxiliares
function showLoader() {
  loadingSpinner.style.display = 'block';
}

function hideLoader() {
  loadingSpinner.style.display = 'none';
}
