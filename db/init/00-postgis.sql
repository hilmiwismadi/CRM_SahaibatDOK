-- Runs automatically on first container start (postgres image convention:
-- anything in /docker-entrypoint-initdb.d runs once, on an empty data dir).
-- Must exist before Prisma's migration creates the `geom` geometry column.
CREATE EXTENSION IF NOT EXISTS postgis;
