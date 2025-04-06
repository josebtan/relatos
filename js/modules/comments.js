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
 */
export async function submitComment(postId, commentText) {
  if (!commentText.trim()) {
    showAlert("El comentario no puede estar vacío", "error");
    return;
  }

  try {
    const postRef = doc(db, "mensajes", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      showAlert("La publicación no existe", "error");
      return;
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

    showAlert("Comentario publicado con éxito", "success");

  } catch (error) {
    console.error("Error al publicar comentario:", error);
    showAlert(`Error al publicar: ${error.message}`, "error");
  }
}

/**
 * Renderiza los comentarios de una publicación
 */
export function renderComments(postId, comments) {
  const container = document.getElementById(`comments-${postId}`);
  if (!container) {
    console.error(`No se encontró el contenedor de comentarios para ${postId}`);
    return;
  }

  container.innerHTML = "";

  comments.forEach(comment => {
    const commentEl = createCommentElement(comment);
    if (commentEl) container.appendChild(commentEl);
  });

  container.scrollTop = container.scrollHeight;
}

/**
 * Crea el elemento visual para un comentario
 */
function createCommentElement(comment) {
  let decryptedText;
  try {
    decryptedText = decryptMessage(comment.texto);
  } catch (err) {
    console.error("Error desencriptando comentario:", err);
    decryptedText = "Comentario ilegible";
  }

  const timestamp = comment.timestamp?.toDate() || new Date();

  const wrapper = document.createElement("div");
  wrapper.className = "comment";
  wrapper.dataset.id = comment.id;

  wrapper.innerHTML = `
    <div class="comment-content">${escapeHtml(decryptedText)}</div>
    <div class="comment-footer">
      <small>${formatDate(timestamp)}</small>
    </div>
  `;

  return wrapper;
}

/**
 * Listener de comentarios por publicación
 */
export function setupCommentsListeners(postSnapshot) {
  const unsubscribes = [];

  postSnapshot.forEach((docSnap) => {
    const q = query(
      collection(db, "mensajes", docSnap.id, "comentarios"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderComments(docSnap.id, comments);
    }, (error) => {
      console.error(`Error en listener de comentarios para ${docSnap.id}:`, error);
    });

    unsubscribes.push(unsubscribe);
  });

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}

/**
 * Formatea fecha legible
 */
function formatDate(date) {
  try {
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (err) {
    console.error("Error al formatear fecha:", err);
    return "Fecha inválida";
  }
}

/**
 * Configura el formulario de comentarios
 */
export function setupCommentForm(postId) {
  const form = document.querySelector(`#comment-form-${postId}`);
  const input = document.querySelector(`#comment-input-${postId}`);

  if (!form || !input) {
    console.warn(`Formulario de comentarios no encontrado para post ${postId}`);
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitComment(postId, input.value);
    input.value = "";
  });
}
