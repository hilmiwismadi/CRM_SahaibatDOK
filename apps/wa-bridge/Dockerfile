FROM node:22-slim AS base
WORKDIR /repo

# Install with full workspace context so the @sahaibat/shared link resolves.
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/wa-bridge/package.json apps/wa-bridge/package.json
RUN npm install --workspace=@sahaibat/wa-bridge --workspace=@sahaibat/shared

COPY packages/shared packages/shared
COPY apps/wa-bridge apps/wa-bridge

# packages/shared's checked-in package.json points `main` at raw .ts
# source (its tsconfig.json uses moduleResolution "Bundler") — correct for
# apps/web's Turbopack build and this package's own `tsx watch` dev mode,
# both of which resolve extension-less TS imports directly. A plain `node`
# process (this production image) can do neither: it can't execute .ts,
# and NodeNext-style ESM resolution requires explicit .js extensions on
# relative imports, which this source doesn't have (correctly, for its
# other two consumers). So: compile a CommonJS copy for this image only —
# CJS emit doesn't need those extensions — and point THIS IMAGE's copy of
# packages/shared/package.json at it. Never touches the checked-in file
# apps/web and dev mode rely on. wa-bridge's own source already imports
# @sahaibat/shared via `import shared from "@sahaibat/shared"` (default
# import + destructure) specifically because it's the CJS-interop idiom —
# see apps/wa-bridge/src/whatsapp/socket.ts's doc comment — so no wa-bridge
# source changes are needed, only making the package resolve to something
# `node` can actually run. Found during the first real production build of
# this service (2026-09-09) — see Context/SahaibatExplanation/4.ChatHistoryConcern.md.
RUN npx tsc packages/shared/src/index.ts packages/shared/src/phone.ts packages/shared/src/types.ts \
      --outDir packages/shared/dist --module commonjs --target es2022 \
      --esModuleInterop --skipLibCheck --moduleResolution node --declaration false
RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' packages/shared/package.json

WORKDIR /repo/apps/wa-bridge
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001
# NOT dist/index.js: tsconfig.json's `paths` maps @sahaibat/shared to that
# package's .ts source (not node_modules) so tsc can typecheck across the
# workspace boundary directly. That makes tsc compute the emit root as the
# common ancestor of apps/wa-bridge/src AND packages/shared/src — i.e. the
# repo root — so outDir nests the real entry point under
# dist/apps/wa-bridge/src/index.js instead of flat at dist/index.js. Only
# matters for this production build (`tsc` emitting real files); `npm run
# dev`'s `tsx watch` resolves the same paths mapping directly without ever
# emitting to disk, so this never surfaces there. Confirmed by inspecting
# the built image directly during the first real VPS deploy (2026-09-09) —
# see Context/SahaibatExplanation/4.ChatHistoryConcern.md.
CMD ["node", "dist/apps/wa-bridge/src/index.js"]
