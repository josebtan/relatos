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
import { handleVote, updateButtonStates } from './votes.js';
import { setupCommentsListeners, setupCommentForm } from './comments.js';
import { formatSmartDate, formatFullDateTime, getElement, showAlert } from './utils.js';

let lastVisible = null;
let loading = false;
let hasMore = true;
let currentFilterTag = 'all';
let currentUnsubscribe = null;
let postsListener = null;
const initialLoadLimit = 15;
const loadMoreLimit = 8;
const tagsSet = new Set();
const loadedPostIds = new Set();

function cleanup() {
  if (currentUnsubscribe) currentUnsubscribe();
  if (postsListener) postsListener();
  loadedPostIds.clear();
  tagsSet.clear();
  lastVisible = null;
}

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
  } catch (error) {
    showAlert(`Error al publicar: ${error.message}`, 'error');
    throw error;
  } finally {
    const submitBtn = getElement('#submit-button');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar';
  }
}

export async function loadPosts(loadMore = false, filterTag = 'all') {
  if (filterTag !== currentFilterTag) {
    cleanup();
    currentFilterTag = filterTag;
  }

  if (loading || !hasMore) return;
  loading = true;

  try {
    const base = collection(db, 'mensajes');
    let q;

    if (filterTag !== 'all') {
      if (loadMore && lastVisible) {
        q = query(
          base,
          where('tags', 'array-contains', filterTag),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisible),
          limit(loadMoreLimit)
        );
      } else {
        q = query(
          base,
          where('tags', 'array-contains', filterTag),
          orderBy('timestamp', 'desc'),
          limit(initialLoadLimit)
        );
      }
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

    if (!loadMore) {
      getElement('#posts').innerHTML = '';
      loadedPostIds.clear();
    }

    if (postsListener) postsListener();

    postsListener = onSnapshot(q, (snapshot) => {
      const container = getElement('#posts');
      let newPostsAdded = false;

      snapshot.forEach((docSnap) => {
        if (!loadedPostIds.has(docSnap.id)) {
          renderPost(docSnap, container);
          loadedPostIds.add(docSnap.id);
          newPostsAdded = true;

          const data = docSnap.data();
          (data.tags || []).forEach(t => tagsSet.add(t));
        }
      });

      if (newPostsAdded) {
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
        setupCommentsListeners(snapshot);
        renderTagFilter();
      }
    }, (error) => {
      console.error("Error en listener de posts:", error);
      showAlert("Error al cargar publicaciones", "error");
    });

  } catch (error) {
    console.error("Error al cargar posts:", error);
    showAlert("Error al cargar publicaciones", "error");
  } finally {
    loading = false;
  }
}

function renderTagFilter() {
  const ul = getElement('#tag-list');
  ul.innerHTML = '';

  const allLi = document.createElement('li');
  allLi.textContent = 'Todos';
  allLi.classList.toggle('active', currentFilterTag === 'all');
  allLi.addEventListener('click', () => loadPosts(false, 'all'));
  ul.appendChild(allLi);

  Array.from(tagsSet).sort().forEach(tag => {
    const li = document.createElement('li');
    li.textContent = tag;
    li.classList.toggle('active', currentFilterTag === tag);
    li.addEventListener('click', () => loadPosts(false, tag));
    ul.appendChild(li);
  });
}

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
        <button class="like-btn" id="like-${docSnap.id}">
          <span class="icon">👍</span>
          <span class="count">${data.likes}</span>
        </button>
        <button class="dislike-btn" id="dislike-${docSnap.id}">
          <span class="icon">👎</span>
          <span class="count">${data.dislikes}</span>
        </button>
      </div>
    </div>

    <div class="comments-section">
      <div class="comments-header">
        <h4>Comentarios (${data.commentCount || 0})</h4>
      </div>
      <div id="comments-${docSnap.id}" class="comments-container"></div>
      <form id="comment-form-${docSnap.id}" class="comment-form">
        <textarea
          id="comment-input-${docSnap.id}"
          placeholder="Escribe un comentario..."
          maxlength="500"
        ></textarea>
        <button type="submit">Comentar</button>
      </form>
    </div>
  `;

  container.appendChild(div);

  setTimeout(() => {
    div.classList.add('post-visible');

    const likeBtn = div.querySelector(`#like-${docSnap.id}`);
    const dislikeBtn = div.querySelector(`#dislike-${docSnap.id}`);

    likeBtn.addEventListener('click', async () => {
      try {
        await handleVote('like', docSnap.id);
        updateButtonStates(docSnap.id);
      } catch (error) {
        console.error("Error al votar:", error);
        showAlert("Error al registrar tu voto", "error");
      }
    });

    dislikeBtn.addEventListener('click', async () => {
      try {
        await handleVote('dislike', docSnap.id);
        updateButtonStates(docSnap.id);
      } catch (error) {
        console.error("Error al votar:", error);
        showAlert("Error al registrar tu voto", "error");
      }
    });

    updateButtonStates(docSnap.id);
    setupCommentForm(docSnap.id);
  }, 50);
}

export function handleScroll() {
  if (currentFilterTag === 'all') {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollHeight - (scrollTop + clientHeight) < 500) {
      loadPosts(true, 'all');
    }
  } else {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollHeight - (scrollTop + clientHeight) < 500) {
      loadPosts(true, currentFilterTag);
    }
  }
}
