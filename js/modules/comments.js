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
import { formatDate } from './utils.js';

// Almacén de funciones de desuscripción
let commentUnsubscribes = new Map();

export async function submitComment(postId, commentText) {
  if (!commentText.trim()) {
    throw new Error("El comentario no puede estar vacío");
  }

  if (commentText.length > 500) {
    throw new Error("El comentario no puede exceder 500 caracteres");
  }

  try {
    const postRef = doc(db, "mensajes", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error("La publicación no existe");
    }

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

  } catch (error) {
    console.error("Error al comentar:", error);
    throw error;
  }
}

export function renderComments(postId, comments) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (!commentsContainer) return;

  // Optimización: Solo actualizar si hay cambios
  if (comments.length !== commentsContainer.children.length) {
    commentsContainer.innerHTML = comments
      .map(comment => createCommentElement(comment))
      .join("");
  }
}

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

export function setupCommentsListeners(postSnapshot) {
  // Limpiar suscripciones anteriores
  cleanupComments();

  postSnapshot.forEach((docSnap) => {
    const postId = docSnap.id;
    const commentsQuery = query(
      collection(db, "mensajes", postId, "comentarios"),
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderComments(postId, comments);
    });

    commentUnsubscribes.set(postId, unsubscribe);
  });
}

export function cleanupComments() {
  commentUnsubscribes.forEach(unsub => unsub());
  commentUnsubscribes.clear();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
