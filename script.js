// Alternar modo oscuro y guardar preferencia
const darkModeToggle = document.getElementById('darkModeToggle');
const enableDarkMode = () => {
  document.body.classList.add('dark-mode');
  localStorage.setItem('darkMode', 'enabled');
};
const disableDarkMode = () => {
  document.body.classList.remove('dark-mode');
  localStorage.setItem('darkMode', 'disabled');
};

// Cargar preferencia guardada
if (localStorage.getItem('darkMode') === 'enabled') {
  enableDarkMode();
}

// Event listener para el botón
darkModeToggle.addEventListener('click', () => {
  document.body.classList.contains('dark-mode') ? disableDarkMode() : enableDarkMode();
});

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
const messageInput = document.getElementById('message');
const charCount = document.getElementById('char-count');
const loadingSpinner = document.getElementById('loading-spinner');

// Actualizar contador de caracteres
messageInput.addEventListener('input', updateCharCount);
function updateCharCount() {
  const remaining = 1000 - messageInput.value.length;
  charCount.textContent = `${remaining} caracteres restantes`;
  charCount.style.color = remaining < 100 ? var(--danger-color) : 'inherit';
}

// Funciones de cifrado
function encryptMessage(message) {
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
}

function decryptMessage(encryptedMessage) {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Publicar mensaje
async function submitPost() {
  const message = messageInput.value.trim();
  const duration = parseInt(document.getElementById('duration').value);
  const age = document.getElementById('age').value.trim();
  const gender = document.getElementById('gender').value;

  if (!message) {
    alert('Por favor escribe un mensaje antes de publicar.');
    return;
  }

  try {
    const submitBtn = document.getElementById('submit-button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    await addDoc(collection(db, 'mensajes'), {
      texto: encryptMessage(message),
      edad: age || null,
      sexo: gender,
      expiresAt: Date.now() + (duration * 60000),
      likes: 0,
      dislikes: 0,
      timestamp: serverTimestamp(),
      commentCount: 0
    });

    messageInput.value = '';
    updateCharCount();
    loadPosts(); // Recargar publicaciones
  } catch (error) {
    console.error('Error al publicar:', error);
    alert('Error al publicar. Intenta nuevamente.');
  } finally {
    const submitBtn = document.getElementById('submit-button');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar';
  }
}

document.getElementById('submit-button').addEventListener('click', submitPost);

// Eliminar mensajes expirados
async function cleanExpiredPosts() {
  const q = query(
    collection(db, 'mensajes'),
    where('expiresAt', '<', Date.now())
  );
  
  const snapshot = await getDocs(q);
  snapshot.forEach(async (doc) => {
    await deleteDoc(doc.ref);
  });
}

// Formatear tiempo restante
function formatTimeRemaining(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Actualizar contadores
function updateTimers() {
  document.querySelectorAll('.countdown').forEach(timer => {
    const expiration = parseInt(timer.dataset.expiration);
    const remaining = expiration - Date.now();
    
    if (remaining > 0) {
      timer.textContent = `⏳ ${formatTimeRemaining(remaining)}`;
    } else {
      timer.textContent = '🕒 Expirado';
      timer.closest('.post').style.opacity = '0.5';
    }
  });
}

// Sistema de votación
async function handleVote(postId, type) {
  const postRef = doc(db, 'mensajes', postId);
  const voteKey = `vote_${postId}`;
  
  if (localStorage.getItem(voteKey)) {
    alert('Ya has votado en esta publicación');
    return;
  }

  try {
    await updateDoc(postRef, {
      [type === 'like' ? 'likes' : 'dislikes']: increment(1)
    });
    
    localStorage.setItem(voteKey, 'true');
    document.getElementById(`like-${postId}`).disabled = true;
    document.getElementById(`dislike-${postId}`).disabled = true;
  } catch (error) {
    console.error('Error al votar:', error);
  }
}

// Cargar publicaciones
async function loadPosts(loadMore = false) {
  if (loading || !hasMore) return;
  loading = true;
  showLoader();

  try {
    const postsContainer = document.getElementById('posts');
    const q = query(
      collection(db, 'mensajes'),
      orderBy('expiresAt', 'desc'),
      loadMore && lastVisible ? startAfter(lastVisible) : null,
      limit(loadMore ? loadMoreLimit : initialLoadLimit)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty && !loadMore) {
      postsContainer.innerHTML = `
        <div class="no-posts">
          <p>¡Sé el primero en compartir tu relato!</p>
        </div>
      `;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const postElement = createPostElement(doc.id, data);
      postsContainer.appendChild(postElement);
    });

    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length >= (loadMore ? loadMoreLimit : initialLoadLimit);
    updateTimers();
    setupComments();
  } catch (error) {
    console.error('Error cargando publicaciones:', error);
  } finally {
    loading = false;
    hideLoader();
  }
}

// Crear elemento de publicación
function createPostElement(id, data) {
  const post = document.createElement('div');
  post.className = 'post';
  post.innerHTML = `
    <div class="post-header">
      <span>ID: ${id}</span>
      <span>Edad: ${data.edad || 'N/A'}</span>
      <span>Sexo: ${data.sexo}</span>
    </div>
    <div class="post-content">${decryptMessage(data.texto)}</div>
    <div class="post-footer">
      <span class="countdown" data-expiration="${data.expiresAt}"></span>
      <div class="vote-buttons">
        <button id="like-${id}" onclick="handleVote('${id}', 'like')">
          👍 ${data.likes}
        </button>
        <button id="dislike-${id}" onclick="handleVote('${id}', 'dislike')">
          👎 ${data.dislikes}
        </button>
      </div>
    </div>
    <div class="comments-section" id="comments-${id}"></div>
  `;

  // Configurar votación
  if (localStorage.getItem(`vote_${id}`)) {
    post.querySelectorAll('button').forEach(btn => btn.disabled = true);
  }

  return post;
}

// Sistema de comentarios
async function setupComments() {
  const posts = await getDocs(collection(db, 'mensajes'));
  posts.forEach(async postDoc => {
    const commentsRef = collection(db, 'mensajes', postDoc.id, 'comentarios');
    const commentsQuery = query(commentsRef, orderBy('timestamp', 'asc'));
    
    onSnapshot(commentsQuery, (snapshot) => {
      const commentsContainer = document.getElementById(`comments-${postDoc.id}`);
      commentsContainer.innerHTML = '';
      
      snapshot.forEach(commentDoc => {
        const comment = commentDoc.data();
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
          <div class="comment-content">${decryptMessage(comment.texto)}</div>
          <div class="comment-footer">
            ${comment.timestamp?.toDate().toLocaleString() || 'Ahora'}
          </div>
        `;
        commentsContainer.appendChild(commentElement);
      });
    });
  });
}

// Scroll infinito
window.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 500 && !loading && hasMore) {
    loadPosts(true);
  }
});

// Inicialización
async function initialize() {
  await cleanExpiredPosts();
  loadPosts();
  setInterval(cleanExpiredPosts, 60000); // Limpiar cada minuto
  setInterval(updateTimers, 1000);
}

initialize();

// Mostrar/ocultar spinner
function showLoader() {
  loadingSpinner.style.display = 'block';
}

function hideLoader() {
  loadingSpinner.style.display = 'none';
}
