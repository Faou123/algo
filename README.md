<<<<<<< HEAD
# CinéMatch — projet pédagogique de recommandation de films

Application de streaming miniature (HTML/CSS/JS vanilla + serveur Node.js natif, **zéro dépendance**).
Tout est fourni et fonctionnel, sauf **l'algorithme de recommandation, volontairement médiocre** : c'est votre travail.

## 1. Prérequis

- Node.js LTS récent (20, 22 ou 24). Aucun `npm install` nécessaire.

## 2. Démarrer le serveur

```bash
node server.js
```

Le port peut être changé avec la variable `PORT` (ex. `PORT=4000 node server.js`).

## 3. Ouvrir l'application

http://localhost:3000

> **Données en mémoire.** Les notes et films « vus » sont conservés uniquement en mémoire côté serveur :
> ils sont **réinitialisés à chaque redémarrage**. Les fichiers `data/*.json` ne sont jamais modifiés.
> Les notes moyennes (`rating`) et popularités des films sont **fictives**.

## 4. Lancer les tests

```bash
node --test
```

Les tests de contrat et de cohérence des données doivent toujours passer.
Les tests « Exercices » sont marqués `todo` : ils échouent au départ (affichés ⚠, sans faire échouer la commande).
Quand vous avez terminé un exercice, retirez l'option `{ todo: ... }` du test correspondant pour le rendre obligatoire.

## 5. Architecture

```text
cinematch/
├── index.html               Structure de l'interface
├── css/style.css            Thème sombre, responsive
├── js/app.js                Interactions et appels API (ne connaît pas l'algorithme)
├── server.js                Serveur HTTP, API, validation du résultat de recommendMovies()
├── recommender.js           ⭐ L'algorithme à améliorer
├── data/movies.json         146 films (notes moyennes et popularités fictives)
├── data/users.json          12 profils (dont Nina, sans historique)
└── tests/recommender.test.js
```

API : `GET /api/movies`, `GET /api/users`, `GET /api/users/:id`, `GET /api/recommendations/:userId`,
`POST /api/users/:id/ratings` (`{movieId, score}`), `POST /api/users/:id/watched` (`{movieId}`).
Noter un film le marque aussi comme vu. Seuls `index.html`, `style.css` et `app.js` sont servis en statique.

## 6. Où modifier le code

**Uniquement dans `recommender.js`**, puis redémarrer le serveur (Ctrl+C, `node server.js`) et cliquer sur « Recalculer ».
Vous pouvez ajouter des fonctions utilitaires dans ce fichier. Ne touchez pas au frontend ni à l'API.

## 7. Contrat de `recommendMovies(user, movies, users)`

```js
recommendMovies(user, movies, users) // -> [{ movieId, score, reason }, ...]
```

| Entrée | Description |
|---|---|
| `user` | `{ id, name, favoriteGenres, ratings: [{movieId, score}], watchedMovieIds }` — `score` = note **de l'utilisateur** (1-5) |
| `movies` | `[{ id, title, genres, year, rating, popularity }]` — `rating` = note moyenne **fictive du film** |
| `users` | tous les profils, y compris `user` |

Sortie : tableau d'**au plus 5** objets, **sans doublon**, `movieId` d'un film existant, `score` nombre fini,
`reason` texte non vide, **trié par score décroissant**.
La fonction est **synchrone**, **sans effet de bord** (ne modifiez jamais les entrées) et lève une `TypeError`
si `user` n'est pas un objet ou si `movies`/`users` ne sont pas des tableaux.
Si le résultat est invalide, le serveur répond par une erreur 500 expliquant le problème, affichée dans l'interface.

## 8. Exercices

Ils correspondent aux `TODO` de `recommender.js` et aux tests « Exercices » :

1. Exclure les films déjà visionnés.
2. Prendre en compte les genres préférés.
3. Calculer un score de pertinence (combiner note moyenne, popularité, genres…).
4. Analyser les notes individuelles (genres aimés / détestés).
5. Mesurer la similarité entre utilisateurs (ex. cosinus, distance sur les notes communes).
6. Intégrer un score collaboratif (films aimés par les utilisateurs proches).
7. Gérer les cas limites (Nina sans historique, catalogue vide ou petit).
8. Optimiser les performances (index par `Map`/`Set`, éviter les recherches répétées).

Indices sur les données : Alice et Gaëlle ont des goûts proches, ainsi que Bob/Jules et Chloé/Inès ;
David (horreur) et Chloé (romance) ont des goûts opposés.
=======
# algo
TP de algo
>>>>>>> c732b7d698eed7dfe6c65df15a35d414a361ad62
