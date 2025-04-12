import { 
  db,
  updateDoc,
  doc,
  increment,
  getDoc
} from '../firebase/config.js';
import { showAlert } from './utils.js';

let isUpdating = false;
const voteQueue = [];

export async function handleVote(type, postId) {
  if (isUpdating) {
    voteQueue.push({ type, postId });
    return;
  }

  isUpdating = true;

  const likeBtn = document.getElementById(`like-${postId}`);
  const dislikeBtn = document.getElementById(`dislike-${postId}`);
  if (likeBtn) likeBtn.disabled = true;
  if (dislikeBtn) dislikeBtn.disabled = true;

  try {
    if (!postId || typeof postId !== 'string') {
      throw new Error("ID de publicación inválido");
    }

    const postRef = doc(db, "mensajes", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error("La publicación no existe");
    }

    const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
    const previousVote = userVotes[postId];

    const updates = {};
    if (previousVote === type) {
      updates[`${type}s`] = increment(-1);
      delete userVotes[postId];
    } else {
      if (previousVote) {
        updates[`${previousVote}s`] = increment(-1);
      }
      updates[`${type}s`] = increment(1);
      userVotes[postId] = type;
    }

    // ✅ Interfaz optimista: actualizar inmediatamente
    updateVoteCounts(postId, type, previousVote);
    updateButtonStates(postId);

    // 🕒 Firebase en segundo plano
    await updateDoc(postRef, updates);
    localStorage.setItem('userVotes', JSON.stringify(userVotes));

    return true;
  } catch (error) {
    console.error("Error en handleVote:", {
      postId,
      error: error.message,
      stack: error.stack
    });
    showAlert(`Error al votar: ${error.message}`, "error");

    // ❗Revertir estado si es necesario
    restoreVoteStates();
    throw error;
  } finally {
    isUpdating = false;
    if (likeBtn) likeBtn.disabled = false;
    if (dislikeBtn) dislikeBtn.disabled = false;
    processVoteQueue();
  }
}

function updateVoteCounts(postId, type, previousVote) {
  const likeBtn = document.getElementById(`like-${postId}`);
  const dislikeBtn = document.getElementById(`dislike-${postId}`);

  if (!likeBtn || !dislikeBtn) return;

  const likeCount = parseInt(likeBtn.querySelector('.count').textContent) || 0;
  const dislikeCount = parseInt(dislikeBtn.querySelector('.count').textContent) || 0;

  if (previousVote === type) {
    if (type === 'like') {
      likeBtn.querySelector('.count').textContent = likeCount - 1;
    } else {
      dislikeBtn.querySelector('.count').textContent = dislikeCount - 1;
    }
  } else {
    if (previousVote) {
      if (type === 'like') {
        likeBtn.querySelector('.count').textContent = likeCount + 1;
        dislikeBtn.querySelector('.count').textContent = dislikeCount - 1;
      } else {
        dislikeBtn.querySelector('.count').textContent = dislikeCount + 1;
        likeBtn.querySelector('.count').textContent = likeCount - 1;
      }
    } else {
      if (type === 'like') {
        likeBtn.querySelector('.count').textContent = likeCount + 1;
      } else {
        dislikeBtn.querySelector('.count').textContent = dislikeCount + 1;
      }
    }
  }
}

export function updateButtonStates(postId) {
  const likeBtn = document.getElementById(`like-${postId}`);
  const dislikeBtn = document.getElementById(`dislike-${postId}`);
  const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
  const currentVote = userVotes[postId];

  if (likeBtn && dislikeBtn) {
    likeBtn.classList.remove('active-like');
    dislikeBtn.classList.remove('active-dislike');

    if (currentVote === 'like') {
      likeBtn.classList.add('active-like');
    } else if (currentVote === 'dislike') {
      dislikeBtn.classList.add('active-dislike');
    }
  }
}

function processVoteQueue() {
  if (voteQueue.length > 0 && !isUpdating) {
    const nextVote = voteQueue.shift();
    handleVote(nextVote.type, nextVote.postId);
  }
}

export function initVotingSystem() {
  if (!localStorage.getItem('userVotes')) {
    localStorage.setItem('userVotes', JSON.stringify({}));
  }
}

export function restoreVoteStates() {
  const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
  Object.keys(userVotes).forEach(postId => {
    updateButtonStates(postId);
  });
}
