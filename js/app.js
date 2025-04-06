import { app, db } from './firebase/config.js';
import { submitPost, loadPosts, handleScroll } from './modules/posts.js';
import { setupCharCounter, showAlert, getElement } from './modules/utils.js';
import { setupDarkMode } from './modules/dark-mode.js';

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Configurar contador de caracteres
    setupCharCounter(
      getElement('#message'),
      getElement('#char-count'),
      1000
    );

    // Configurar evento de publicación
    getElement('#submit-button').addEventListener('click', handleSubmit);

    // Configurar scroll infinito
    window.addEventListener('scroll', handleScroll);

    // Configurar modo oscuro
    setupDarkMode();

    // Cargar publicaciones iniciales
    await loadPosts();

  } catch (error) {
    showAlert(`Error de inicialización: ${error.message}`, 'error');
  }
});

// Manejador de envío de publicación
async function handleSubmit() {
  try {
    const messageInput = getElement('#message');
    const age = getElement('#age').value.trim();
    const gender = getElement('#gender').value;

    await submitPost(messageInput, age, gender);
    showAlert('Publicación creada exitosamente!', 'success');
    
  } catch (error) {
    showAlert(error.message, 'error');
  }
}

// Función global mejorada para manejar comentarios
window.handleSubmitComment = async (postId) => {
  try {
    const commentInput = document.getElementById(`comment-input-${postId}`);
    const commentText = commentInput.value.trim();
    
    if (!commentText) {
      showAlert("El comentario no puede estar vacío", "error");
      return;
    }

    // Mostrar estado de carga
    const submitBtn = commentInput.nextElementSibling;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Publicando...";

    await submitComment(postId, commentText);
    commentInput.value = '';
    showAlert('Comentario agregado!', 'success');

  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    const submitBtn = document.querySelector(`#comment-input-${postId} + button`);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Comentar";
    }
  }
};

// Función auxiliar para submitComment (asegúrate de importarla)
async function submitComment(postId, commentText) {
  const postRef = doc(db, "mensajes", postId);
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
}
