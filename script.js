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
  deleteDoc, 
  getDocs,
  getDoc,
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
const SECRET_KEY = "claveSecreta123";

// Variables de control
let isUpdating = false;
let lastVisible = null;
let loading = false;
let hasMore = true;
const initialLoadLimit = 15;
const loadMoreLimit = 8;
const voteQueue = [];
const messageInput = document.getElementById("message");
const charCount = document.getElementById("char-count");
const loadingSpinner = document.getElementById('loading-spinner');

// Configurar contador de caracteres
messageInput.addEventListener("input", updateCharCount);
function updateCharCount() {
  const remaining = 1000 - messageInput.value.length;
  charCount.textContent = `${remaining} caracteres restantes`;
  charCount.style.color = remaining < 100 ? "#ea4335" : "#666";
}

// Funciones de cifrado
function encryptMessage(message) {
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
}

function decryptMessage(encryptedMessage) {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Enviar mensaje
async function submitPost() {
  const message = messageInput.value.trim();
  const duration = parseInt(document.getElementById("duration").value);
  const age = document.getElementById("age").value.trim();
  const gender = document.getElementById("gender").value;

  if (message === "") {
    alert("Por favor escribe un mensaje antes de publicar.");
    return;
  }

  const encryptedMessage = encryptMessage(message);
  const expirationTime = Date.now() + duration * 60000;

  try {
    const submitBtn = document.getElementById("submit-button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Publicando...";
    
    await addDoc(collection(db, "mensajes"), {
      texto: encryptedMessage,
      edad: age || null,
      sexo: gender,
      expiresAt: expirationTime,
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

// Manejo de votación
async function handleVote(type, postId) {
  if (isUpdating) {
    voteQueue.push({ type, postId });
    return;
  }

  isUpdating = true;
  
  try {
    const userVotes = JSON.parse(localStorage.getItem("userVotes")) || {};
    const previousVote = userVotes[postId];
    const postRef = doc(db, "mensajes", postId);
    
    const updates = {};
    if (previousVote === type) {
      updates[`${type}s`] = increment(-1);
      delete userVotes[postId];
    } else {
      if (previousVote) {
        updates[`${previousVote}s`] = increment(-1);
      }
      updates[`${type}s`] = increment(1);
      userVotes[postId] = type;
    }

    await updateDoc(postRef, updates);
    localStorage.setItem("userVotes", JSON.stringify(userVotes));
    updateButtonStates(postId, userVotes[postId]);
  } catch (error) {
    console.error("Error al votar:", error);
  } finally {
    isUpdating = false;
    if (voteQueue.length > 0) {
      const nextVote = voteQueue.shift();
      handleVote(nextVote.type, nextVote.postId);
    }
  }
}

function updateButtonStates(postId, currentVote) {
  const likeBtn = document.getElementById(`like-${postId}`);
  const dislikeBtn = document.getElementById(`dislike-${postId}`);

  if (likeBtn && dislikeBtn) {
    likeBtn.classList.toggle("active-like", currentVote === "like");
    dislikeBtn.classList.toggle("active-dislike", currentVote === "dislike");
  }
}

function setupVotingButtons(postId) {
  const userVotes = JSON.parse(localStorage.getItem("userVotes")) || {};
  const currentVote = userVotes[postId];
  updateButtonStates(postId, currentVote);

  const likeButton = document.getElementById(`like-${postId}`);
  const dislikeButton = document.getElementById(`dislike-${postId}`);

  likeButton?.addEventListener("click", () => handleVote("like", postId));
  dislikeButton?.addEventListener("click", () => handleVote("dislike", postId));
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
    const postRef = doc(db, "mensajes", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error("El post no existe");
    }
    
    await addDoc(collection(db, "mensajes", postId, "comentarios"), {
      texto: encryptedComment,
      timestamp: serverTimestamp()
    });
    
    await updateDoc(postRef, {
      commentCount: increment(1)
    });
    
    commentInput.value = "";
  } catch (error) {
    console.error("Error al comentar:", error);
    alert("Ocurrió un error al publicar el comentario");
  }
}

function renderComments(postId, comments) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (!commentsContainer) return;
  
  commentsContainer.innerHTML = comments.map(comment => `
    <div class="comment">
      <div class="comment-content">${decryptMessage(comment.texto)}</div>
      <div class="comment-footer">
        <small>${comment.timestamp?.toDate().toLocaleString() || 'Ahora'}</small>
      </div>
    </div>
  `).join("");
}

// Gestión de publicaciones
async function deleteExpiredMessages() {
  const now = Date.now();
  const querySnapshot = await getDocs(collection(db, "mensajes"));
  
  querySnapshot.forEach(async (docSnap) => {
    if (docSnap.data().expiresAt <= now) {
      await deleteDoc(doc(db, "mensajes", docSnap.id));
    }
  });
}

// Función mejorada para mostrar el tiempo restante
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

function updateCountdown() {
  document.querySelectorAll(".countdown").forEach((counter) => {
    const expiration = parseInt(counter.getAttribute("data-expiration"));
    const postId = counter.getAttribute("data-id");

    if (expiration - Date.now() <= 0) {
      deleteDoc(doc(db, "mensajes", postId)).catch(console.error);
      const postElement = counter.closest(".post");
      if (postElement) {
        postElement.remove();
      }
    } else {
      const timeRemaining = expiration - Date.now();
      counter.textContent = `⏳ ${formatTimeRemaining(timeRemaining)}`;
    }
  });

  setTimeout(updateCountdown, 1000);
}

// Manejo de carga de publicaciones
function showLoader() { loadingSpinner.style.display = 'block'; }
function hideLoader() { loadingSpinner.style.display = 'none'; }

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

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
              <span>Edad: ${data.edad || "N/A"}</span>
              <span>Sexo: ${data.sexo}</span>
            </div>
            <div class="post-content">${decryptedMessage}</div>
            <div class="post-footer">
              <span class="countdown" data-expiration="${data.expiresAt}" data-id="${docSnap.id}"></span>
              <div class="vote-buttons">
                <button class="like-btn" id="like-${docSnap.id}">
                  👍 ${data.likes}
                </button>
                <button class="dislike-btn" id="dislike-${docSnap.id}">
                  👎 ${data.dislikes}
                </button>
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
          setTimeout(() => postDiv.classList.add('post-visible'), 50);
          setupVotingButtons(docSnap.id);
        }
      });

      lastVisible = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
      setupCommentsListeners(snapshot);
      updateCountdown();
    });

  } catch (error) {
    console.error("Error cargando publicaciones:", error);
  } finally {
    hideLoader();
    loading = false;
  }
}

function setupCommentsListeners(snapshot) {
  snapshot.forEach((docSnap) => {
    const commentsQuery = query(
      collection(db, "mensajes", docSnap.id, "comentarios"),
      orderBy("timestamp", "asc")
    );
    
    onSnapshot(commentsQuery, (commentSnapshot) => {
      const comments = commentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderComments(docSnap.id, comments);
    });
  });
}

// Manejo de scroll
function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollHeight - (scrollTop + clientHeight) < 500) {
    loadPosts(true);
  }
}

// Inicialización
async function init() {
  await deleteExpiredMessages();
  updateCharCount();
  loadPosts();
  window.addEventListener('scroll', handleScroll);
}

init();
