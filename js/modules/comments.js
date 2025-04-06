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
import { escapeHtml, formatDate } from './utils.js';

// Variable para controlar listeners activos
const activeListeners = new Map();

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
    
    await addDoc(collection(db, "mensajes", postId, "comentarios"), {
      texto: encryptedComment,
      timestamp: serverTimestamp()
    });

    // Actualizar contador de comentarios
    await updateDoc(postRef, {
      commentCount: increment(1)
    });

  } catch (error) {
    console.error("Error al comentar:", error);
    throw error;
  }
}

export function renderComments(postId, comments) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (!commentsContainer) return;

  commentsContainer.innerHTML = comments
    .map(comment => createCommentElement(comment))
    .join("");
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
  // Limpiar listeners anteriores
  activeListeners.forEach((unsubscribe, postId) => {
    unsubscribe();
    activeListeners.delete(postId);
  });

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

    activeListeners.set(docSnap.id, unsubscribe);
  });
}
