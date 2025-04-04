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
    loadPosts(); // Recargar publicaciones después de enviar una nueva
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
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

// Formatear tiempo restante
function formatTimeRemaining(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours}h ${minutes}m ${seconds}s`;
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
  
  try {
    await updateDoc(postRef, {
      [type === "like" ? "likes" : "dislikes"]: increment(1)
    });
    
    localStorage.setItem(voteKey, "voted");
    document.getElementById(`like-${postId}`).disabled = true;
    document.getElementById(`dislike-${postId}`).disabled = true;
  } catch (error) {
    console.error("Error al actualizar voto:", error);
  }
}

// Cargar publicaciones (versión corregida)
async function loadPosts(loadMore = false) {
  if (loading || !hasMore) return;
  
  showLoader();
  loading = true;
  
  try {
    const postsContainer = document.getElementById("posts");
    if (!postsContainer) {
      console.error("No se encontró el contenedor de publicaciones");
      return;
    }

    // Construir la consulta
    const queryConstraints = [
      orderBy("expiresAt", "desc"),
      limit(loadMore ? loadMoreLimit : initialLoadLimit)
    ];
    
    if (loadMore && lastVisible) {
      queryConstraints.push(startAfter(lastVisible));
    }

    const q = query(collection(db, "mensajes"), ...queryConstraints);
    const snapshot = await getDocs(q);

    if (!loadMore) {
      postsContainer.innerHTML = "";
    }

    if (snapshot.empty) {
      if (!loadMore) {
        postsContainer.innerHTML = `
          <div class="no-posts-message">
            No hay relatos para mostrar, ¡compártenos el tuyo!
          </div>
        `;
      }
      hasMore = false;
      return;
    }

    // Procesar cada documento
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const timeLeft = data.expiresAt - Date.now();
      
      if (timeLeft > 0) {
        try {
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
          `;
          
          postsContainer.appendChild(postDiv);
          
          // Configurar eventos de votación
          document.getElementById(`like-${docSnap.id}`).addEventListener("click", () => handleVote("like", docSnap.id));
          document.getElementById(`dislike-${docSnap.id}`).addEventListener("click", () => handleVote("dislike", docSnap.id));
          
          // Verificar si ya se votó
          if (localStorage.getItem(`vote-${docSnap.id}`)) {
            document.getElementById(`like-${docSnap.id}`).disabled = true;
            document.getElementById(`dislike-${docSnap.id}`).disabled = true;
          }
        } catch (error) {
          console.error("Error al procesar publicación:", error);
        }
      }
    });

    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
    
  } catch (error) {
    console.error("Error cargando publicaciones:", error);
    const postsContainer = document.getElementById("posts");
    if (postsContainer) {
      postsContainer.innerHTML = `
        <div class="error-message">
          Error al cargar publicaciones. Intenta recargar la página.
        </div>
      `;
    }
  } finally {
    hideLoader();
    loading = false;
    updateCountdown();
  }
}

// Configurar scroll infinito
function setupScrollListener() {
  window.addEventListener("scroll", () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight > scrollHeight - 500 && !loading && hasMore) {
      loadPosts(true);
    }
  });
}

// Inicialización
async function init() {
  try {
    await deleteExpiredMessages();
    updateCharCount();
    setupScrollListener();
    loadPosts();
    setInterval(updateCountdown, 1000);
    setInterval(deleteExpiredMessages, 60000); // Limpiar cada minuto
  } catch (error) {
    console.error("Error en inicialización:", error);
  }
}

// Funciones auxiliares
function showLoader() {
  if (loadingSpinner) loadingSpinner.style.display = "block";
}

function hideLoader() {
  if (loadingSpinner) loadingSpinner.style.display = "none";
}

// Iniciar la aplicación
init();
