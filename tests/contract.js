'use strict';

// Tests de contrat partagés : applicables à TOUTE implémentation de recommendMovies().
// Ce fichier n'est pas exécuté seul (il ne se termine pas par .test.js).

const { describe, test } = require('node:test');
const assert = require('node:assert');
const movies = require('../data/movies.json');
const users = require('../data/users.json');

const clone = (x) => structuredClone(x);
const movieIds = new Set(movies.map((m) => m.id));
const coldUser = users.find((u) => u.watchedMovieIds.length === 0);

function defineContractTests(title, recommendMovies) {
  const run = (user) => recommendMovies(clone(user), clone(movies), clone(users));

  describe(title, () => {
    test('retourne un tableau', () => {
      for (const u of users) assert.ok(Array.isArray(run(u)));
    });

    test('retourne au maximum 5 résultats', () => {
      for (const u of users) assert.ok(run(u).length <= 5);
    });

    test('chaque résultat a la forme { movieId, score, reason }', () => {
      for (const rec of run(users[0])) {
        assert.strictEqual(typeof rec.reason, 'string');
        assert.ok(rec.reason.length > 0);
        assert.strictEqual(typeof rec.score, 'number');
        assert.ok(Number.isInteger(rec.movieId));
      }
    });

    test('les identifiants correspondent à des films existants', () => {
      for (const u of users) for (const r of run(u)) assert.ok(movieIds.has(r.movieId), `film ${r.movieId} inconnu`);
    });

    test('aucun doublon', () => {
      for (const u of users) {
        const ids = run(u).map((r) => r.movieId);
        assert.strictEqual(new Set(ids).size, ids.length);
      }
    });

    test('les scores sont des nombres finis', () => {
      for (const u of users) for (const r of run(u)) assert.ok(Number.isFinite(r.score));
    });

    test('le classement est décroissant', () => {
      for (const u of users) {
        const scores = run(u).map((r) => r.score);
        for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i]);
      }
    });

    test('ne modifie pas les données d’entrée', () => {
      const u = clone(users[0]); const m = clone(movies); const all = clone(users);
      recommendMovies(u, m, all);
      assert.deepStrictEqual(u, users[0]);
      assert.deepStrictEqual(m, movies);
      assert.deepStrictEqual(all, users);
    });

    test('catalogue vide : retourne un tableau vide', () => {
      assert.deepStrictEqual(recommendMovies(clone(users[0]), [], clone(users)), []);
    });

    test('utilisateur sans historique : retourne des recommandations valides', () => {
      const result = run(coldUser);
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0 && result.length <= 5);
    });

    test('catalogue de moins de 5 films : pas de résultat inventé', () => {
      const few = clone(movies.slice(0, 3));
      const result = recommendMovies(clone(users[0]), few, clone(users));
      assert.ok(result.length <= 3);
      for (const r of result) assert.ok(few.some((m) => m.id === r.movieId));
    });

    test('données invalides : rejetées avec une TypeError', () => {
      assert.throws(() => recommendMovies(null, clone(movies), clone(users)), TypeError);
      assert.throws(() => recommendMovies(clone(users[0]), 'pas un tableau', clone(users)), TypeError);
      assert.throws(() => recommendMovies(clone(users[0]), clone(movies), undefined), TypeError);
    });
  });
}

module.exports = { defineContractTests };
