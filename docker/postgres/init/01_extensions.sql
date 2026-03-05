-- ============================================================
-- BuildMart — PostgreSQL Initialization
-- Runs once when the container is first created.
-- Extensions required by schema.prisma previewFeatures.
-- ============================================================

\c buildmart_dev;

-- Geo-spatial queries (50 km vendor matching)
CREATE EXTENSION IF NOT EXISTS postgis;

-- gen_random_uuid() used in all @id defaults
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Full-text / trigram search on material names, business names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Useful for btree_gist indexes (range overlap queries)
CREATE EXTENSION IF NOT EXISTS btree_gist;

\echo 'BuildMart PostgreSQL extensions loaded successfully.'
