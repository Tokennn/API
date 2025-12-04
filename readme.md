# Marketplace API (Node.js)

<a name="readme-top"></a>


## Project Overview

API REST « niveau production » pour un mini‑marketplace : catalogue produits avec pagination/tri/filtres/projection/inclusion de relations, plus authentification moderne (access token court JWT + refresh token persistant avec rotation) pour sécuriser l’accès aux données.

## Technologies and tools used

For this project we worked on these technologies
 

* [![Git][Git]][Git-url]
* [![Node][Node]][Node-url]
* [![Express][Express]][Express-url]
* [![SQLite][SQLite]][SQLite-url]

**Role of each technology**

- **Git** : versioning et collaboration.
- **Node.js** : runtime JavaScript pour le backend.
- **Express** : framework HTTP minimal pour structurer les routes/middlewares.
- **SQLite (better-sqlite3)** : base embarquée, persistance des users/produits/refresh tokens.
- **bcryptjs** : hash/verification des mots de passe.
- **jsonwebtoken** : signature/vérification des access tokens (JWT HS256).

  <p align="right">(<a href="#readme-top"><strong>Back to top</strong></a>)</p>

## Architecture and Design

**Components**

***DB layer*** : SQLite (better-sqlite3) avec migrations/seed pour users, categories, products, refresh tokens.

***Auth*** : JWT HS256 pour access tokens courts + refresh tokens hashés persistants, rotation et révocation.

***Catalogue*** : Pagination, tri, filtres validés, projection (`fields`) et inclusion conditionnelle de la relation `category`.

***Middleware*** : Protection des routes via access token vérifié (signature + expiration).

***Config*** : Variables d’env (`PORT`, `JWT_SECRET`).

<p align="right">(<a href="#readme-top"><strong>Back to top</strong></a>)</p>



<p align="right">(<a href="#readme-top"><strong>Back to top</strong></a>)</p>

## Project initialization


> [!IMPORTANT]
> To get started with this project, you'll need :

- [Node.js](https://nodejs.org/en/download)  
- [Git](https://git-scm.com/downloads)  

  <p align="right">(<a href="#readme-top"><strong>Back to top</strong></a>)</p>

## Installation

Clone the repository from GitHub:

```bash
git clone <https://github.com/Tokennn/API.git>
cd TP-API
```

Install dependencies :

```bash
npm install
```

## How to Run the API

Run the main script :

```bash
JWT_SECRET="ma magnifique clef" PORT=3000 npm start
```

## API Highlights (Partie 1)

- Catalogue : `GET /products` avec `page/limit`, `sort` (ex: `-price`), filtres (`category`, `minPrice`, `maxPrice`), projection (`fields=name,price`), inclusion relation (`include=category`).
- Pagination : réponse inclut `pagination` (`page`, `limit`, `totalItems`, `totalPages`).
- Données seed : 3 catégories, ~20 produits variés, dates de création différentes.

## API Highlights (Partie 2)

- Auth : `POST /auth/login` (access token court + refresh token persistant).
- Refresh & rotation : `POST /auth/refresh` (invalide l’ancien refresh, émet un nouveau).
- Déconnexion : `POST /auth/logout` révoque le refresh fourni.
- Profil : `GET /me` protégé (access token requis).
- Catalogue protégé : `GET /products` nécessite un access token valide.

<p align="right">(<a href="#readme-top"><strong>Back to top</strong></a>)</p>

## Contact 

- [@Tokennn](https://github.com/Tokennn)
- [@TerminaTorr45](https://github.com/TerminaTorr45)
- [@M4xxes](https://github.com/M4xxes)

<!-- (Markdown img link) : -->
 

[Git]: https://img.shields.io/badge/Git-grey?style=for-the-badge&logo=git
[Git-url]: https://git-scm.com

[Node]: https://img.shields.io/badge/Node.js-4cbb17?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node-url]: https://nodejs.org

[Express]: https://img.shields.io/badge/Express-black?style=for-the-badge&logo=express&logoColor=white
[Express-url]: https://expressjs.com/

[SQLite]: https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white
[SQLite-url]: https://www.sqlite.org
