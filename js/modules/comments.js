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
import { showAlert, escapeHtml, formatSmartDate } from './utils.js';

export async function submitComment(postId) {
  const commentInput = document.getElementById(`comment-input-${postId}`);
  const commentText = commentInput.value.trim();

  if (!commentText) {
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

    commentInput.value = '';
    
  } catch (error) {
    console.error("Error al publicar comentario:", error);
    showAlert(`Error al publicar: ${error.message}`, "error");
    throw error;
  }
}

export function renderComments(postId, comments) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (!commentsContainer) return;

  commentsContainer.innerHTML = comments
    .map(comment => createCommentElement(comment))
    .join("");

  if (comments.length > 0) {
    commentsContainer.scrollTop = commentsContainer.scrollHeight;
  }
}

function createCommentElement(comment) {
  try {
    const decryptedText = decryptMessage(comment.texto);
    const timestamp = comment.timestamp?.toDate() || new Date();
    
    return `
      <div class="comment" data-id="${comment.id}">
        <div class="comment-content">${escapeHtml(decryptedText)}</div>
        <div class="comment-footer">
          <small>${formatSmartDate(timestamp)}</small>
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
        const comments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        renderComments(docSnap.id, comments);
      },
      (error) => {
        console.error("Error en listener de comentarios:", error);
      }
    );

    unsubscribes.push(unsubscribe);
  });

  return () => unsubscribes.forEach(unsub => unsub());
}

export function setupCommentForm(postId) {
  const form = document.querySelector(`#comment-form-${postId}`);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await submitComment(postId);
    } catch (error) {
      console.error("Error en submit del formulario:", error);
    }
  });
}