import { 
  db,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  serverTimestamp
} from '../firebase/config.js';
import { encryptMessage, decryptMessage } from './encryption.js';

/**
 * Envía un nuevo comentario a la publicación
 * @param {string} postId - ID de la publicación padre
 * @param {string} commentText - Texto del comentario
 */
export async function submitComment(postId, commentText) {
  if (!commentText.trim()) {
    throw new Error("El comentario no puede estar vacío");
  }

  try {
    const postRef = doc(db, "mensajes", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error("La publicación no existe");
    }

    const encryptedComment = encryptMessage(commentText);
    
    // Transacción para agregar comentario y actualizar contador
    await Promise.all([
      addDoc(collection(db, "mensajes", postId, "comentarios"), {
        texto: encryptedComment,
        timestamp: serverTimestamp()
      }),
      updateDoc(postRef, {
        commentCount: increment(1)
      })
    ]);

  } catch (error) {
    console.error("Error al comentar:", error);
    throw error;
  }
}

/**
 * Renderiza los comentarios en el DOM
 * @param {string} postId - ID de la publicación
 * @param {Array} comments - Lista de comentarios
 */
export function renderComments(postId, comments) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (!commentsContainer) return;

  commentsContainer.innerHTML = comments
    .map(comment => createCommentElement(comment))
    .join("");
}

/**
 * Crea el HTML para un comentario individual
 * @param {Object} comment - Datos del comentario
 * @returns {string} - HTML del comentario
 */
function createCommentElement(comment) {
  const decryptedText = decryptMessage(comment.texto);
  const timestamp = comment.timestamp?.toDate() || new Date();
  
  return `
    <div class="comment">
      <div class="comment-content">${escapeHtml(decryptedText)}</div>
      <div class="comment-footer">
        <small>${formatDate(timestamp)}</small>
      </div>
    </div>
  `;
}

/**
 * Configura listeners para los comentarios de una publicación
 * @param {DocumentSnapshot} postSnapshot - Snapshots de publicaciones
 */
export function setupCommentsListeners(postSnapshot) {
  postSnapshot.forEach((docSnap) => {
    const commentsQuery = query(
      collection(db, "mensajes", docSnap.id, "comentarios"),
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderComments(docSnap.id, comments);
    });

    return unsubscribe;
  });
}

/**
 * Formatea la fecha para mostrarla
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDate(date) {
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto seguro
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Configura el formulario de comentarios para una publicación
 * @param {string} postId - ID de la publicación
 */
export function setupCommentForm(postId) {
  const form = document.querySelector(`#comment-form-${postId}`);
  const textarea = document.querySelector(`#comment-input-${postId}`);
  
  if (!form || !textarea) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await submitComment(postId, textarea.value);
      textarea.value = '';
    } catch (error) {
      alert('Error al publicar comentario: ' + error.message);
    }
  });
}
