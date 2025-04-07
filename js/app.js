import { app, db } from './firebase/config.js';
import { submitPost, loadPosts, handleScroll } from './modules/posts.js';
import { setupCharCounter, showAlert, getElement } from './modules/utils.js';
import { setupDarkMode } from './modules/dark-mode.js';
import { submitComment } from './modules/comments.js';

// Iniciar aplicación
window.addEventListener('DOMContentLoaded', async () => {
  try {
    setupCharCounter(
      getElement('#message'),
      getElement('#char-count'),
      1000
    );

    getElement('#submit-button').addEventListener('click', handleSubmit);
    window.addEventListener('scroll', handleScroll);
    setupDarkMode();

    // Carga inicial sin filtro
    await loadPosts(false, 'all');
  } catch (err) {
    showAlert(`Error de inicialización: ${err.message}`, 'error');
  }
});

async function handleSubmit() {
  try {
    const messageInput = getElement('#message');
    const age = getElement('#age').value.trim();
    const gender = getElement('#gender').value;
    const tags = getElement('#tags').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t);

    await submitPost(messageInput, age, gender, tags);
    showAlert('Publicación creada exitosamente!', 'success');
  } catch (err) {
    showAlert(err.message, 'error');
  }
}