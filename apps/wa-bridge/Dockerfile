FROM node:22-slim AS base
WORKDIR /repo

# Install with full workspace context so the @sahaibat/shared link resolves.
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/wa-bridge/package.json apps/wa-bridge/package.json
RUN npm install --workspace=@sahaibat/wa-bridge --workspace=@sahaibat/shared

COPY packages/shared packages/shared
COPY apps/wa-bridge apps/wa-bridge

WORKDIR /repo/apps/wa-bridge
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
