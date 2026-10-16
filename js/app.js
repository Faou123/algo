'use strict';

// Interface CinéMatch : affichage et appels API uniquement.
// Toute la logique de recommandation est côté serveur (recommender.js).

const state = {
  movies: [],
  users: [],
  user: null,          // profil actif (à jour après chaque action)
  search: '',
  genre: '',
  sort: 'rating',
};

const $ = (id) => document.getElementById(id);

// ---------- Utilitaires ----------

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'style') node.setAttribute('style', value);
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

async function api(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error('Impossible de joindre le serveur. Est-il bien démarré (node server.js) ?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Erreur HTTP ${res.status}`);
    err.details = data.details;
    throw err;
  }
  return data;
}

function post(path, body) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function showGlobalError(err) {
  const box = $('global-error');
  box.textContent = err.message;
  box.hidden = false;
  clearTimeout(showGlobalError.timer);
  showGlobalError.timer = setTimeout(() => { box.hidden = true; }, 6000);
}

const userRating = (movieId) =>
  (state.user.ratings.find((r) => r.movieId === movieId) || {}).score || 0;
const isWatched = (movieId) => state.user.watchedMovieIds.includes(movieId);
const movieById = (id) => state.movies.find((m) => m.id === id);

// ---------- Composants ----------

function poster(movie, extra) {
  return el('div', { class: 'poster', style: `--hue:${(movie.id * 47) % 360}` },
    el('span', { class: 'poster-year', text: String(movie.year) }),
    el('span', { class: 'poster-title', text: movie.title }),
    extra,
  );
}

function genreChips(genres) {
  return el('div', { class: 'chips' }, ...genres.map((g) => el('span', { class: 'chip genre', text: g })));
}

function actions(movie) {
  const watched = isWatched(movie.id);
  const current = userRating(movie.id);
  const stars = el('div', { class: 'stars', role: 'group', 'aria-label': `Noter ${movie.title}` },
    ...[1, 2, 3, 4, 5].map((n) =>
      el('button', {
        class: `star${n <= current ? ' on' : ''}`, type: 'button',
        'aria-label': `${n} sur 5`, title: `Noter ${n}/5`,
        onclick: () => rate(movie.id, n),
      }, '★')),
  );
  const watchBtn = el('button', {
    class: `btn small${watched ? ' done' : ''}`, type: 'button',
    text: watched ? '✓ Vu' : 'Marquer comme vu',
    onclick: () => { if (!watched) markWatched(movie.id); },
  });
  return el('div', { class: 'card-actions' }, stars, watchBtn);
}

function catalogCard(movie) {
  return el('article', { class: 'card' },
    poster(movie, isWatched(movie.id) ? el('span', { class: 'badge', text: 'Vu' }) : null),
    el('div', { class: 'card-body' },
      genreChips(movie.genres),
      el('div', { class: 'metrics' },
        el('span', { title: 'Note moyenne fictive', text: `★ ${movie.rating.toFixed(1)}` }),
        el('span', { title: 'Popularité fictive', text: `🔥 ${movie.popularity}` }),
      ),
      actions(movie),
    ),
  );
}

function recommendationCard(rec) {
  const { movie } = rec;
  return el('article', { class: 'card featured' },
    poster(movie, el('span', { class: 'badge score', text: rec.score.toFixed(2) })),
    el('div', { class: 'card-body' },
      el('strong', { text: movie.title }),
      genreChips(movie.genres),
      el('p', { class: 'reason', text: rec.reason }),
      actions(movie),
    ),
  );
}

// ---------- Rendus ----------

function renderProfile() {
  const u = state.user;
  const rated = u.ratings.filter((r) => movieById(r.movieId));
  const avg = rated.length
    ? (rated.reduce((s, r) => s + r.score, 0) / rated.length).toFixed(1) : '–';

  const genreCount = {};
  for (const id of u.watchedMovieIds) {
    const m = movieById(id);
    if (m) for (const g of m.genres) genreCount[g] = (genreCount[g] || 0) + 1;
  }
  const top = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0];

  const history = u.watchedMovieIds.map((id) => {
    const m = movieById(id);
    const score = userRating(id);
    return el('li', { class: 'chip', text: `${m ? m.title : `#${id}`} ${score ? '· ' + '★'.repeat(score) : '· non noté'}` });
  });

  const box = $('profile-content');
  box.replaceChildren(
    el('div', { class: 'profile-head' },
      el('div', { class: 'avatar', text: u.name[0] }),
      el('div', {},
        el('h3', { text: u.name }),
        u.favoriteGenres.length
          ? genreChips(u.favoriteGenres)
          : el('span', { class: 'chip', text: 'Aucun genre favori renseigné' }),
      ),
    ),
    el('div', { class: 'stats' },
      el('div', { class: 'stat' }, el('strong', { text: String(u.watchedMovieIds.length) }), el('span', { text: 'films vus' })),
      el('div', { class: 'stat' }, el('strong', { text: avg }), el('span', { text: 'note moyenne donnée' })),
      el('div', { class: 'stat' }, el('strong', { text: top ? top[0] : '–' }), el('span', { text: 'genre le plus vu' })),
    ),
    el('details', {},
      el('summary', { text: `Films vus et notes (${history.length})` }),
      history.length
        ? el('ul', { class: 'history' }, ...history)
        : el('p', { class: 'message', text: 'Aucun historique : ce profil démarre à froid.' }),
    ),
  );
}

function renderCatalog() {
  const query = state.search.trim().toLowerCase();
  const list = state.movies
    .filter((m) => !query || m.title.toLowerCase().includes(query))
    .filter((m) => !state.genre || m.genres.includes(state.genre))
    .sort((a, b) => b[state.sort] - a[state.sort] || a.title.localeCompare(b.title, 'fr'));

  $('catalog-list').replaceChildren(
    ...(list.length
      ? list.map(catalogCard)
      : [el('p', { class: 'message', text: 'Aucun film ne correspond à votre recherche.' })]),
  );
}

async function loadRecommendations() {
  const box = $('reco-list');
  box.replaceChildren(el('p', { class: 'message', text: 'Calcul des recommandations…' }));
  $('reco-hint').hidden = true;
  try {
    const data = await api(`/api/recommendations/${state.user.id}`);
    box.replaceChildren(
      ...(data.recommendations.length
        ? data.recommendations.map(recommendationCard)
        : [el('p', { class: 'message', text: 'Aucune recommandation disponible pour ce profil.' })]),
    );
  } catch (err) {
    const items = Array.isArray(err.details) ? err.details : err.details ? [err.details] : [];
    box.replaceChildren(
      el('div', { class: 'message error', role: 'alert' },
        el('strong', { text: err.message }),
        items.length ? el('ul', {}, ...items.map((d) => el('li', { text: d }))) : null,
      ),
    );
  }
}

// ---------- Actions ----------

async function updateUser(request) {
  try {
    state.user = await request();
    const i = state.users.findIndex((u) => u.id === state.user.id);
    if (i >= 0) state.users[i] = state.user;
    renderProfile();
    renderCatalog();
    renderRecoCards();
    $('reco-hint').hidden = false;
  } catch (err) {
    showGlobalError(err);
  }
}

const rate = (movieId, score) =>
  updateUser(() => post(`/api/users/${state.user.id}/ratings`, { movieId, score }));
const markWatched = (movieId) =>
  updateUser(() => post(`/api/users/${state.user.id}/watched`, { movieId }));

// Les cartes de recommandation affichent l'état vu/noté : on les redessine sans recalculer.
function renderRecoCards() {
  document.querySelectorAll('#reco-list .card').forEach((card) => {
    const title = card.querySelector('strong')?.textContent;
    const movie = state.movies.find((m) => m.title === title);
    if (movie) card.querySelector('.card-actions').replaceWith(actions(movie));
  });
}

async function selectUser(id) {
  try {
    state.user = await api(`/api/users/${id}`);
  } catch (err) {
    showGlobalError(err);
    return;
  }
  renderProfile();
  renderCatalog();
  loadRecommendations();
}

// ---------- Initialisation ----------

async function init() {
  try {
    [state.movies, state.users] = await Promise.all([api('/api/movies'), api('/api/users')]);
  } catch (err) {
    $('catalog-list').replaceChildren(el('p', { class: 'message error', text: err.message }));
    $('profile-content').replaceChildren(el('p', { class: 'message error', text: err.message }));
    $('reco-list').replaceChildren();
    return;
  }

  $('user-select').replaceChildren(
    ...state.users.map((u) => el('option', { value: String(u.id), text: u.name })),
  );
  const genres = [...new Set(state.movies.flatMap((m) => m.genres))].sort((a, b) => a.localeCompare(b, 'fr'));
  $('genre-filter').replaceChildren(
    el('option', { value: '', text: 'Tous les genres' }),
    ...genres.map((g) => el('option', { value: g, text: g })),
  );

  $('user-select').addEventListener('change', (e) => selectUser(e.target.value));
  $('search').addEventListener('input', (e) => { state.search = e.target.value; renderCatalog(); });
  $('genre-filter').addEventListener('change', (e) => { state.genre = e.target.value; renderCatalog(); });
  $('sort-select').addEventListener('change', (e) => { state.sort = e.target.value; renderCatalog(); });
  $('reco-refresh').addEventListener('click', loadRecommendations);

  await selectUser(state.users[0].id);
}

init();
