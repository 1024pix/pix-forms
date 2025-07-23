# Étape de construction
FROM node:22-alpine AS builder

WORKDIR /app

# Copier fichiers pour les dépendances
COPY package.json package-lock.json* ./
RUN npm ci

# Copier le reste et build
COPY . .
RUN npm run build

# # Configuration utilisateur non-root
# # Installation des dépendances pour addgroup/adduser (Alpine utilise addgroup/adduser et non groupadd/useradd)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD node ./dist/server/entry.mjs


