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
  serverTimestamp,
  getDoc
} from '../firebase/config.js';
import { encryptMessage, decryptMessage } from './encryption.js';
import { showAlert, escapeHtml } from './utils.js';

/**
 * Envía un nuevo comentario a la publicación
 * @param {string} postId - ID de la publicación padre
 * @param {string} commentText - Texto del comentario
 */
export async function submitComment(postId, commentText) {
  if (!commentText.trim()) {
    showAlert("El comentario no puede estar vacío", "error");
    throw new Error("El comentario no puede estar vacío");
  }

  try {
    const postRef = doc(db, "mensajes", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      showAlert("La publicación no existe", "error");
      throw new Error("La publicación no existe");
    }

    console.log("Publicando comentario para post:", postId);
    const encryptedComment = encryptMessage(commentText);
    
    await Promise.all([
      addDoc(collection(db, "mensajes", postId, "comentarios"), {
        texto: encryptedComment,
        timestamp: serverTimestamp()
      }),
      updateDoc(postRef, {
        commentCount: increment(1)
      })
    ]);

    console.log("Comentario publicado exitosamente");
    showAlert("Comentario publicado con éxito", "success");
    
  } catch (error) {
    console.error("Error al publicar comentario:", {
      postId,
      error: error.message,
      stack: error.stack
    });
    showAlert(`Error al publicar: ${error.message}`, "error");
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
  if (!commentsContainer) {
    console.error(`Contenedor de comentarios no encontrado para post ${postId}`);
    return;
  }

  console.log(`Renderizando ${comments.length} comentarios para post ${postId}`);
  
  commentsContainer.innerHTML = comments
    .map(comment => createCommentElement(comment))
    .join("");

  // Scroll al último comentario
  if (comments.length > 0) {
    commentsContainer.scrollTop = commentsContainer.scrollHeight;
  }
}

/**
 * Crea el HTML para un comentario individual
 * @param {Object} comment - Datos del comentario
 * @returns {string} - HTML del comentario
 */
function createCommentElement(comment) {
  try {
    const decryptedText = decryptMessage(comment.texto);
    const timestamp = comment.timestamp?.toDate() || new Date();
    
    return `
      <div class="comment" data-id="${comment.id}">
        <div class="comment-content">${escapeHtml(decryptedText)}</div>
        <div class="comment-footer">
          <small>${formatDate(timestamp)}</small>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error al crear elemento de comentario:", error);
    return `
      <div class="comment error">
        <div class="comment-content">Error al cargar este comentario</div>
      </div>
    `;
  }
}

/**
 * Configura listeners para los comentarios de una publicación
 * @param {DocumentSnapshot} postSnapshot - Snapshots de publicaciones
 */
export function setupCommentsListeners(postSnapshot) {
  const unsubscribes = [];
  
  postSnapshot.forEach((docSnap) => {
    const commentsQuery = query(
      collection(db, "mensajes", docSnap.id, "comentarios"),
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(
      commentsQuery, 
      (snapshot) => {
        console.log(`Actualización de comentarios para post ${docSnap.id}`);
        const comments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        renderComments(docSnap.id, comments);
      },
      (error) => {
        console.error("Error en listener de comentarios:", {
          postId: docSnap.id,
          error: error.message
        });
      }
    );

    unsubscribes.push(unsubscribe);
  });

  // Devuelve función para limpiar todos los listeners
  return () => {
    console.log("Limpiando listeners de comentarios");
    unsubscribes.forEach(unsub => unsub());
  };
}

/**
 * Formatea la fecha para mostrarla
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDate(date) {
  try {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return "Fecha desconocida";
  }
}

/**
 * Configura el formulario de comentarios para una publicación
 * @param {string} postId - ID de la publicación
 */
export function setupCommentForm(postId) {
  const form = document.querySelector(`#comment-form-${postId}`);
  const textarea = document.querySelector(`#comment-input-${postId}`);
  
  if (!form || !textarea) {
    console.error(`Formulario no encontrado para post ${postId}`);
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await submitComment(postId, textarea.value);
      textarea.value = '';
    } catch (error) {
      console.error("Error en submit del formulario:", error);
    }
  });
}
