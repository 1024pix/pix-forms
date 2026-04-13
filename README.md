# Pix-forms

Pix-forms est une application Astro qui permet de créer et d'éditer des formulaires en utilisant la librairie SurveyJS.

## Installation

### Prérequis

Vous devez au préalable avoir correctement installé les logiciels suivants :

- [Node.js](https://nodejs.org/fr) (version utilisée disponible dans les fichiers .nvmrc) il est recommandé d'utiliser un gestionnaire de versions tel que nvm
- [Docker](https://docs.docker.com/get-started/)

Assurez-vous aussi de ne pas avoir de processus écoutant sur les ports

- 4321 (Astro App)
- 1025 (serveur SMPT)
- 8025 (interface web Mailpit pour le serveur SMPT)

### Commandes

Les commandes à lancer depuis un terminal, à la racine du projet:

| Command                   | Action                                                              |
| :------------------------ | :------------------------------------------------------------------ |
| `npm install`             | Installer les dépendances                                           |
| `docker compose up -d`    | Installer l'image et lancer le conteneur Docker                     |
| `npm run dev`             | Lancer le serveur de développement local `localhost:4321`           |
| `npm run test`            | Lancer les tests                                                    |
| `npm run lint`            | Lancer la vérification du linter biome                              |
| `npm run lint:fix`        | Lancer la vérification du linter biome et la correction automatique |
| `npm run build`           | Construire le build de production dans `./dist/`                    |
| `npm run preview`         | Visionner le build localement avant de déployer                     |
| `npm run astro ...`       | Lancer des commandes CLI comme `astro add`, `astro check`           |
| `npm run astro -- --help` | Obetnir de l'aide sur Astro CLI                                     |

### Serveur de mail

Un serveur SMPT est mis en place avec Mailpit sur le port 1025. Une interface web pour visualiser les mails envoyés est disponible sur le port 8025: http://localhost:8025/ (nécessite d'avoir lancé le conteneur Docker)
