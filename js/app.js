import { app, db } from './firebase/config.js';
import { submitPost, loadPosts, handleScroll } from './modules/posts.js';
import { setupCharCounter, showAlert, getElement, toggleElement } from './modules/utils.js';
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

    // Configurar botones para mostrar/ocultar sidebars
    setupSidebarToggles();

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

/**
 * Configura los botones para mostrar/ocultar los sidebars en móvil
 */
function setupSidebarToggles() {
  const leftToggle = document.createElement('button');
  leftToggle.className = 'sidebar-toggle left-sidebar-toggle';
  leftToggle.innerHTML = '🔍';
  leftToggle.title = 'Mostrar filtros';
  document.body.appendChild(leftToggle);

  const rightToggle = document.createElement('button');
  rightToggle.className = 'sidebar-toggle right-sidebar-toggle';
  rightToggle.innerHTML = '⚙️';
  rightToggle.title = 'Mostrar opciones';
  document.body.appendChild(rightToggle);

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // Mostrar/ocultar sidebars
  leftToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('.left-sidebar').classList.toggle('active');
    overlay.classList.toggle('active');
  });

  rightToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('.right-sidebar').classList.toggle('active');
    overlay.classList.toggle('active');
  });

  // Cerrar sidebars al hacer clic en el overlay
  overlay.addEventListener('click', () => {
    document.querySelector('.left-sidebar').classList.remove('active');
    document.querySelector('.right-sidebar').classList.remove('active');
    overlay.classList.remove('active');
  });

  // Cerrar sidebars al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) {
      document.querySelector('.left-sidebar').classList.remove('active');
      document.querySelector('.right-sidebar').classList.remove('active');
      overlay.classList.remove('active');
    }
  });
}

// Hacer submitComment accesible globalmente para los botones en los posts
window.submitComment = submitComment;