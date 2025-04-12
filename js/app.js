import { app, db } from './firebase/config.js';
import { submitPost, loadPosts, handleScroll } from './modules/posts.js';
import { setupCharCounter, showAlert, getElement } from './modules/utils.js';
import { setupDarkMode } from './modules/dark-mode.js';
import { submitComment } from './modules/comments.js';
import { initVotingSystem, restoreVoteStates } from './modules/votes.js';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    initVotingSystem();
    setupDarkMode();
    setupCharCounter(
      getElement('#message'),
      getElement('#char-count'),
      1000
    );

    getElement('#submit-button').addEventListener('click', handleSubmit);
    window.addEventListener('scroll', handleScroll);
    setupSidebarToggles();

    await loadPosts(false, 'all');
    restoreVoteStates();

  } catch (err) {
    console.error("Error en inicialización:", err);
    showAlert(`Error al iniciar la aplicación: ${err.message}`, 'error');
  }
});

async function handleSubmit() {
  const submitBtn = getElement('#submit-button');
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    const messageInput = getElement('#message');
    const age = getElement('#age').value.trim();
    const gender = getElement('#gender').value;
    const tags = getElement('#tags').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t);

    await submitPost(messageInput, age, gender, tags);
    showAlert('Publicación creada exitosamente!', 'success');
    messageInput.value = '';
    getElement('#tags').value = '';
  } catch (err) {
    console.error("Error al publicar:", err);
    showAlert(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar';
  }
}

function setupSidebarToggles() {
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', () => {
    closeSidebars();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar')) {
      closeSidebars();
    }
  });

  setupSwipeGestures();
}

function setupSwipeGestures() {
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  });

  function handleSwipeGesture() {
  const deltaX = touchEndX - touchStartX;
  const threshold = 80;

  const leftSidebar = document.querySelector('.left-sidebar');
  const rightSidebar = document.querySelector('.right-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  const leftOpen = leftSidebar.classList.contains('active');
  const rightOpen = rightSidebar.classList.contains('active');

  if (deltaX > threshold) {
    // ↔️ Deslizó a la derecha

    if (rightOpen) {
      // Si el derecho está abierto, lo cerramos
      rightSidebar.classList.remove('active');
      overlay.classList.remove('active');
    } else if (!leftOpen && !rightOpen) {
      // Solo abrimos el izquierdo si ambos están cerrados
      leftSidebar.classList.add('active');
      overlay.classList.add('active');
    }

  } else if (deltaX < -threshold) {
    // ↔️ Deslizó a la izquierda

    if (leftOpen) {
      // Si el izquierdo está abierto, lo cerramos
      leftSidebar.classList.remove('active');
      overlay.classList.remove('active');
    } else if (!leftOpen && !rightOpen) {
      // Solo abrimos el derecho si ambos están cerrados
      rightSidebar.classList.add('active');
      overlay.classList.add('active');
    }
  }
}

}

function closeSidebars() {
  document.querySelector('.left-sidebar').classList.remove('active');
  document.querySelector('.right-sidebar').classList.remove('active');
  document.querySelector('.sidebar-overlay').classList.remove('active');
}

window.submitComment = submitComment;
