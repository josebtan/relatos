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

// Exponer funciones globales necesarias
window.submitComment = async (postId) => {
  try {
    const commentInput = getElement(`#comment-input-${postId}`);
    await submitComment(postId, commentInput.value);
    commentInput.value = '';
    showAlert('Comentario agregado!', 'success');
  } catch (error) {
    showAlert(error.message, 'error');
  }
};
