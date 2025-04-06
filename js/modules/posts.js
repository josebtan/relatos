import { 
  db,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  startAfter,
  getDoc,
  doc,
  increment
} from '../firebase/config.js';

import { encryptMessage, decryptMessage } from './encryption.js';
import { setupVotingButtons } from './votes.js';
import { setupCommentsListeners } from './comments.js';
import { formatSmartDate, formatFullDateTime } from './utils.js';

// Variables de estado
let lastVisible = null;
let loading = false;
let hasMore = true;
const initialLoadLimit = 15;
const loadMoreLimit = 8;

/**
 * Publica un nuevo mensaje en la base de datos
 * @param {HTMLTextAreaElement} messageInput - Elemento del textarea
 * @param {string} age - Edad del usuario
 * @param {string} gender - Género del usuario
 */
export async function submitPost(messageInput, age, gender) {
  const message = messageInput.value.trim();

  if (message === "") {
    throw new Error("Por favor escribe un mensaje antes de publicar.");
  }

  const encryptedMessage = encryptMessage(message);

  try {
    const submitBtn = document.getElementById("submit-button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Publicando...";
    
    await addDoc(collection(db, "mensajes"), {
      texto: encryptedMessage,
      edad: age || null,
      sexo: gender,
      likes: 0,
      dislikes: 0,
      timestamp: serverTimestamp(),
      commentCount: 0
    });
    
    messageInput.value = "";
  } catch (error) {
    console.error("Error al guardar:", error);
    throw error;
  } finally {
    const submitBtn = document.getElementById("submit-button");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Publicar";
    }
  }
}

/**
 * Carga las publicaciones desde Firestore
 * @param {boolean} loadMore - Indica si es una carga adicional
 */
export async function loadPosts(loadMore = false) {
  if (loading || !hasMore) return;
  
  loading = true;
  
  try {
    let q;
    if (loadMore && lastVisible) {
      q = query(
        collection(db, "mensajes"),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(loadMoreLimit)
      );
    } else {
      q = query(
        collection(db, "mensajes"),
        orderBy("timestamp", "desc"),
        limit(initialLoadLimit)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsContainer = document.getElementById("posts");
      if (!loadMore && postsContainer) postsContainer.innerHTML = "";
      
      snapshot.forEach((docSnap) => {
        renderPost(docSnap, postsContainer);
      });

      lastVisible = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
      setupCommentsListeners(snapshot);
    });

    return unsubscribe;

  } catch (error) {
    console.error("Error cargando publicaciones:", error);
    throw error;
  } finally {
    loading = false;
  }
}

/**
 * Renderiza un post en el DOM
 * @param {DocumentSnapshot} docSnap - Snapshop del documento
 * @param {HTMLElement} container - Contenedor donde se insertará el post
 */
function renderPost(docSnap, container) {
  if (!container) return;

  const data = docSnap.data();
  const decryptedMessage = decryptMessage(data.texto);
  const postDate = data.timestamp?.toDate() || new Date();
  
  const postDiv = document.createElement("div");
  postDiv.className = "post";
  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-id-row">
        <span class="post-id-container">ID: ${docSnap.id}</span>
      </div>
      <div class="post-meta-row">
        <div class="post-meta-items">
          <span class="post-meta-item">Edad:${data.edad||"N/A"}</span>
          <span class="post-meta-item">Sexo:${data.sexo}</span>
        </div>
        <span class="post-date" title="${formatFullDateTime(postDate)}">
          ${formatSmartDate(postDate)}
        </span>
      </div>
    </div>
    <div class="post-content">${decryptedMessage}</div>
    <div class="post-footer">
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

  container.appendChild(postDiv);
  setTimeout(() => postDiv.classList.add('post-visible'), 50);
  setupVotingButtons(docSnap.id);
}

/**
 * Maneja el scroll infinito
 */
export function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollHeight - (scrollTop + clientHeight) < 500) {
    loadPosts(true);
  }
}