// Importar funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  updateDoc, doc, increment, serverTimestamp, deleteDoc, getDocs,
  where, getCountFromServer
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
let isUpdating = false;
const voteQueue = [];
const messageInput = document.getElementById("message");
const charCount = document.getElementById("char-count");

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

// Manejo de votación mejorado
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
      // Eliminar voto existente
      updates[`${type}s`] = increment(-1);
      delete userVotes[postId];
    } else {
      // Cambiar o añadir voto
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

// Función para enviar comentarios
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
      timestamp: serverTimestamp(),
      expiresAt: postSnap.data().expiresAt
    });
    
    // Actualizar contador de comentarios
    await updateDoc(postRef, {
      commentCount: increment(1)
    });
    
    commentInput.value = "";
  } catch (error) {
    console.error("Error al comentar:", error);
    alert("Ocurrió un error al publicar el comentario");
  }
}

// Función para renderizar comentarios
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

// Borrar mensajes expirados
async function deleteExpiredMessages() {
  const now = Date.now();
  const querySnapshot = await getDocs(collection(db, "mensajes"));
  
  querySnapshot.forEach(async (docSnap) => {
    if (docSnap.data().expiresAt <= now) {
      await deleteDoc(doc(db, "mensajes", docSnap.id));
    }
  });
}

// Actualizar cuenta regresiva
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
      const minutes = Math.floor((expiration - Date.now()) / 60000);
      const seconds = Math.floor(((expiration - Date.now()) % 60000) / 1000);
      counter.textContent = `⏳ ${minutes}m ${seconds}s`;
    }
  });

  setTimeout(updateCountdown, 1000);
}

// Cargar y mostrar publicaciones
const q = query(collection(db, "mensajes"), orderBy("expiresAt", "desc"));
onSnapshot(q, (snapshot) => {
  const postsContainer = document.getElementById("posts");
  postsContainer.innerHTML = "";
  
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
      setupVotingButtons(docSnap.id);

      // Escuchar comentarios en tiempo real
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
    }
  });

  updateCountdown();
});

// Inicializar
deleteExpiredMessages();
updateCharCount();
