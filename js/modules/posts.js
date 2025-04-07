// js/modules/posts.js

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
  increment,
  where
} from '../firebase/config.js';
import { encryptMessage, decryptMessage } from './encryption.js';
import { setupVotingButtons } from './votes.js';
import { setupCommentsListeners } from './comments.js';
import { formatSmartDate, formatFullDateTime, getElement, showAlert } from './utils.js';

// Estado global
let lastVisible = null;
let loading = false;
let hasMore = true;
let currentFilterTag = 'all';
let currentUnsubscribe = null;
const initialLoadLimit = 15;
const loadMoreLimit = 8;
const tagsSet = new Set();

/**
 * Publica un nuevo mensaje en la base de datos, incluyendo tags
 */
export async function submitPost(messageInput, age, gender, tags) {
  const message = messageInput.value.trim();
  if (message === '') throw new Error('Por favor escribe un mensaje antes de publicar.');

  const encryptedMessage = encryptMessage(message);
  try {
    const submitBtn = getElement('#submit-button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    await addDoc(collection(db, 'mensajes'), {
      texto: encryptedMessage,
      edad: age || null,
      sexo: gender,
      tags,
      likes: 0,
      dislikes: 0,
      timestamp: serverTimestamp(),
      commentCount: 0
    });
    messageInput.value = '';
    getElement('#tags').value = '';
  } finally {
    const submitBtn = getElement('#submit-button');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar';
  }
}

/**
 * Carga publicaciones, con opción de filtrado por tag
 */
export async function loadPosts(loadMore = false, filterTag = 'all') {
  // Si cambiamos filtro, desconectamos listener previo
  if (currentUnsubscribe && (!loadMore || filterTag !== currentFilterTag)) {
    currentUnsubscribe();
    lastVisible = null;
    hasMore = true;
    tagsSet.clear();
  }
  currentFilterTag = filterTag;
  if (loading || !hasMore) return;
  loading = true;

  try {
    const base = collection(db, 'mensajes');
    let q;
    if (filterTag !== 'all') {
      q = query(
        base,
        where('tags', 'array-contains', filterTag),
        orderBy('timestamp', 'desc'),
        limit(initialLoadLimit)
      );
    } else if (loadMore && lastVisible) {
      q = query(
        base,
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible),
        limit(loadMoreLimit)
      );
    } else {
      q = query(
        base,
        orderBy('timestamp', 'desc'),
        limit(initialLoadLimit)
      );
    }

    const unsubscribe = onSnapshot(q, snapshot => {
      const container = getElement('#posts');
      if (!loadMore || filterTag !== 'all') container.innerHTML = '';

      snapshot.forEach(docSnap => {
        renderPost(docSnap, container);
        // Acumular tags para el filtro
        const data = docSnap.data();
        (data.tags || []).forEach(t => tagsSet.add(t));
      });

      lastVisible = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
      setupCommentsListeners(snapshot);
      renderTagFilter();
    });

    currentUnsubscribe = unsubscribe;
  } finally {
    loading = false;
  }
}

/**
 * Dibuja la lista de tags en la barra lateral
 */
function renderTagFilter() {
  const ul = getElement('#tag-list');
  ul.innerHTML = '';

  // Opción "Todos"
  const allLi = document.createElement('li');
  allLi.textContent = 'Todos';
  allLi.classList.toggle('active', currentFilterTag === 'all');
  allLi.addEventListener('click', () => loadPosts(false, 'all'));
  ul.appendChild(allLi);

  // Tags dinámicos
  Array.from(tagsSet).sort().forEach(tag => {
    const li = document.createElement('li');
    li.textContent = tag;
    li.classList.toggle('active', currentFilterTag === tag);
    li.addEventListener('click', () => loadPosts(false, tag));
    ul.appendChild(li);
  });
}

/**
 * Renderiza un post en el DOM, incluyendo sección de comentarios
 */
function renderPost(docSnap, container) {
  const data = docSnap.data();
  const decrypted = decryptMessage(data.texto);
  const date = data.timestamp?.toDate() || new Date();

  const div = document.createElement('div');
  div.className = 'post';
  div.innerHTML = `
    <div class="post-header">
      <div class="post-id-row">
        <span class="post-id-container">ID: ${docSnap.id}</span>
      </div>
      <div class="post-meta-row">
        <div class="post-meta-items">
          <span class="post-meta-item">Edad: ${data.edad || 'N/A'}</span>
          <span class="post-meta-item">Sexo: ${data.sexo}</span>
        </div>
        <span class="post-date" title="${formatFullDateTime(date)}">
          ${formatSmartDate(date)}
        </span>
      </div>
    </div>

    <div class="post-tags">
      ${(data.tags || []).map(t => `<span class="post-tag">${t}</span>`).join('')}
    </div>

    <div class="post-content">${decrypted}</div>

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
  container.appendChild(div);

  // Animación de aparición
  setTimeout(() => div.classList.add('post-visible'), 50);

  // Configura botones de voto
  setupVotingButtons(docSnap.id);
}

/**
 * Scroll infinito (solo si no hay filtro)
 */
export function handleScroll() {
  if (currentFilterTag === 'all') {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollHeight - (scrollTop + clientHeight) < 500) {
      loadPosts(true, 'all');
    }
  }
}
