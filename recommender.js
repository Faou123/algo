'use strict';

/**
 * ============================================================
 *  recommender.js — LE fichier à modifier pendant la formation
 * ============================================================
 *
 * recommendMovies(user, movies, users) doit retourner AU PLUS 5 recommandations :
 *
 *   [ { movieId: 1, score: 4.7, reason: "Film bien noté" }, ... ]
 *
 * Contrat (voir README.md) :
 *  - fonction synchrone et SANS effet de bord : ne jamais modifier user, movies, users ;
 *  - movieId : identifiant d'un film existant, sans doublon ;
 *  - score   : nombre fini, résultats triés du meilleur au moins bon ;
 *  - reason  : courte phrase en français affichée à l'utilisateur ;
 *  - `user`, `movies` et `users` doivent rester les trois paramètres (même ordre).
 *
 * Données disponibles :
 *  - user  : { id, name, favoriteGenres, ratings: [{ movieId, score }], watchedMovieIds }
 *  - movies: [{ id, title, genres, year, rating, popularity }]
 *            (`rating` = note moyenne FICTIVE du film, pas la note de l'utilisateur !)
 *  - users : tous les profils (dont `user` lui-même).
 *
 * Après modification : relancer `node server.js` (Ctrl+C puis à nouveau) et
 * cliquer sur « Recalculer » dans l'application.
 */

const MAX_RECOMMENDATIONS = 5;

function recommendMovies(user, movies, users) {
  if (!user || typeof user !== 'object') {
    throw new TypeError('recommendMovies : `user` doit être un objet');
  }
  if (!Array.isArray(movies)) {
    throw new TypeError('recommendMovies : `movies` doit être un tableau');
  }
  if (!Array.isArray(users)) {
    throw new TypeError('recommendMovies : `users` doit être un tableau');
  }

  // Algorithme volontairement simpliste : les 5 films les mieux notés, pour tout le monde.
  const sorted = [...movies].sort((a, b) => b.rating - a.rating);

 
  // TODO 1 : exclure les films déjà visionnés (user.watchedMovieIds).
  const watchedMovieIds = new Set(user.watchedMovieIds || []);
  const filtered = sorted.filter((movie) => !watchedMovieIds.has(movie.id));

  // TODO 2 : prendre en compte les genres préférés (user.favoriteGenres).
  const favoriteGenres = new Set(user.favoriteGenres || []);
  const genreFiltered = favoriteGenres.size === 0
    ? filtered
    : filtered.filter((movie) =>
        movie.genres.some((genre) => favoriteGenres.has(genre))
      );

  // TODO 3 : calculer un score de pertinence (et plus seulement la note moyenne).
  const scoreFiltered = genreFiltered.map((movie) => {
    let score = movie.rating;
    // Exemple de calcul simplifié : ajouter un bonus pour les films dans les genres préférés
    const matchingGenres = movie.genres.filter((genre) =>
      favoriteGenres.has(genre)
    ).length;
    score += matchingGenres * 0.5;
    return { ...movie, score };
  }).sort((a, b) => b.score - a.score);

  // TODO 4 : analyser les notes individuelles de l'utilisateur (user.ratings).
  const userRatings = new Map();
  if (Array.isArray(user.ratings)) {
    user.ratings.forEach((rating) => {
      userRatings.set(String(rating.movieId), rating.score);
    });
  } else if (user.ratings && typeof user.ratings === "object") {
    Object.entries(user.ratings).forEach(([movieId, rating]) => {
      userRatings.set(String(movieId), typeof rating === "object" ? rating.score : rating);
    });
  }

  const dislikedGenres = new Set();
  userRatings.forEach((rating, movieId) => {
    if (rating <= 2) {
      const dislikedMovie = movies.find((movie) => String(movie.id) === movieId);
      if (dislikedMovie) {
        dislikedMovie.genres.forEach((genre) => dislikedGenres.add(genre));
      }
    }
  });

  const genreSafeFiltered = scoreFiltered.filter((movie) =>
    !movie.genres.some((genre) => dislikedGenres.has(genre))
  );

  // TODO 5 : mesurer la similarité entre utilisateurs (paramètre `users`).
  const userSimilarity = new Map();

  const ratingsToMap = (ratings) => {
    if (Array.isArray(ratings)) {
      return new Map(ratings.map((rating) => [String(rating.movieId), rating.score]));
    }
    return new Map(
      Object.entries(ratings || {}).map(([movieId, rating]) => [
        String(movieId),
        typeof rating === "object" ? rating.score : rating
      ])
    );
  };

  const ratingsA = ratingsToMap(user.ratings);

  users.forEach((otherUser) => {
    if (otherUser.id !== user.id) {
      const ratingsB = ratingsToMap(otherUser.ratings);
      let common = 0;
      let difference = 0;

      for (const [movieId, scoreA] of ratingsA) {
        if (ratingsB.has(movieId)) {
          difference += Math.abs(scoreA - ratingsB.get(movieId));
          common++;
        }
      }

      const similarity = common === 0
        ? 0
        : Math.max(0, 1 - difference / (common * 4));

      userSimilarity.set(otherUser.id, similarity);
    }
  });

  // TODO 6 : intégrer un score collaboratif (ce qu'aiment les utilisateurs proches).
  const usersById = new Map(users.map((u) => [u.id, u]));
  const collaborativeScores = new Map();

  userSimilarity.forEach((similarity, userId) => {
    const otherUser = usersById.get(userId);

    if (otherUser && similarity > 0) {
      ratingsToMap(otherUser.ratings).forEach((rating, movieId) => {
        if (rating >= 4 && !userRatings.has(movieId)) {
          const entry = collaborativeScores.get(movieId) || { total: 0, count: 0 };
          entry.total += rating * similarity;
          entry.count += similarity;
          collaborativeScores.set(movieId, entry);
        }
      });
    }
  });

 
  // TODO 7 : gérer les cas limites (aucun historique, catalogue vide, peu de films...).
  const avgPop = movies.length === 0
    ? 0
    : movies.reduce((sum, movie) => sum + movie.popularity, 0) / movies.length;

  const isColdStart = !user.ratings || user.ratings.length === 0;

  let candidates;

  if (isColdStart) {
    candidates = filtered
      .filter((movie) => movie.popularity >= avgPop)
      .map((movie) => ({ ...movie, score: movie.popularity }))
      .sort((a, b) => b.score - a.score);
  } else {
    candidates = genreSafeFiltered.length > 0
      ? genreSafeFiltered
      : filtered
          .filter((movie) =>
            !movie.genres.some((genre) => dislikedGenres.has(genre))
          )
          .map((movie) => ({ ...movie, score: movie.rating }));

    if (candidates.length === 0) {
      candidates = filtered.map((movie) => ({ ...movie, score: movie.rating }));
    }
  }


  // TODO 8 : optimiser les performances (éviter les recherches répétées dans les tableaux).
  const moviesById = new Map(movies.map((movie) => [String(movie.id), movie]));

  const recommendations = candidates.map((movie) => {
    const collaborative = collaborativeScores.get(String(movie.id));
    const collaborativeScore = collaborative && collaborative.count > 0
      ? collaborative.total / collaborative.count
      : 0;
    return {
      movieId: movie.id,
      score: Number((movie.score + collaborativeScore * 0.2).toFixed(4)),
      reason: collaborativeScore > 0
        ? "Apprécié par des utilisateurs aux goûts similaires"
        : "Correspond aux préférences et à la note du film"
    };
  });

  return recommendations
    .filter((recommendation) => moviesById.has(String(recommendation.movieId)))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECOMMENDATIONS);

  return scoreFiltered.slice(0, MAX_RECOMMENDATIONS).map((movie) => ({
    movieId: movie.id,
    score: movie.score,
    reason: 'Film bien noté',
  }));
}

module.exports = { recommendMovies };
