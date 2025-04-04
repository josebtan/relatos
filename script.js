// Referencias a elementos del DOM
const postInput = document.getElementById('post-input');
const postButton = document.getElementById('post-button');
const charCount = document.getElementById('char-count');
const expirationSelect = document.getElementById('expiration-time');
const postsContainer = document.getElementById('posts');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const loadMoreButton = document.getElementById('load-more');

// Contador de caracteres en tiempo real
postInput.addEventListener('input', () => {
    let remaining = 200 - postInput.value.length;
    charCount.textContent = `${remaining} caracteres restantes`;
    if (remaining < 0) {
        charCount.style.color = 'red';
        postButton.disabled = true;
    } else {
        charCount.style.color = '';
        postButton.disabled = postInput.value.trim() === '';
    }
});

// Publicar mensaje
postButton.addEventListener('click', () => {
    const message = postInput.value.trim();
    const expirationTime = parseInt(expirationSelect.value);

    if (message === '') return;

    const post = {
        id: Date.now(),
        text: message,
        expiresAt: Date.now() + expirationTime * 60 * 1000 // Convertir minutos a milisegundos
    };

    savePost(post);
    renderPost(post);

    postInput.value = '';
    charCount.textContent = '200 caracteres restantes';
    postButton.disabled = true;
});

// Guardar post en localStorage
function savePost(post) {
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    posts.push(post);
    localStorage.setItem('posts', JSON.stringify(posts));
}

// Cargar posts al iniciar
function loadPosts() {
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    let now = Date.now();

    posts = posts.filter(post => post.expiresAt > now); // Eliminar los expirados
    localStorage.setItem('posts', JSON.stringify(posts));

    postsContainer.innerHTML = '';
    posts.forEach(post => renderPost(post));
}

// Renderizar un post
function renderPost(post) {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');
    postDiv.setAttribute('data-id', post.id);
    postDiv.innerHTML = `
        <p>${post.text}</p>
        <button class="like-button">❤️ 0</button>
        <button class="delete-button">🗑 Eliminar</button>
    `;

    // Botón de like
    const likeButton = postDiv.querySelector('.like-button');
    let likes = 0;
    likeButton.addEventListener('click', () => {
        likes++;
        likeButton.textContent = `❤️ ${likes}`;
    });

    // Botón de eliminar manualmente
    postDiv.querySelector('.delete-button').addEventListener('click', () => {
        removePost(post.id);
        postDiv.remove();
    });

    // Eliminar automáticamente después del tiempo seleccionado
    setTimeout(() => {
        removePost(post.id);
        postDiv.remove();
    }, post.expiresAt - Date.now());

    postsContainer.prepend(postDiv);
}

// Eliminar post del localStorage
function removePost(id) {
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    posts = posts.filter(post => post.id !== id);
    localStorage.setItem('posts', JSON.stringify(posts));
}

// Modo oscuro
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Cargar estado del modo oscuro
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// Cargar más posts (simulación)
loadMoreButton.addEventListener('click', () => {
    alert('Cargando más posts... (función en desarrollo)');
});

// Cargar posts al iniciar
loadPosts();
