"use strict";

const router = require("express").Router();
const db = require("../database/connection");
const { isCloudinaryConfigured } = require("../config/cloudinary");
const { REQUIRED_MIGRATIONS, productionConfigurationChecks, configurationStatus } = require("../config/productionReadiness");

router.get("/health", async (_request, response) => {
    try {
        const { rows } = await db.query(`
            SELECT NOW() AS database_time,
                   to_regclass('public.schema_migrations') IS NOT NULL AS migrations_ready
        `);
        const migrationsReady = rows[0]?.migrations_ready === true;
        return response.status(migrationsReady ? 200 : 503).json({
            success: migrationsReady,
            status: migrationsReady ? "ok" : "migrations_pending",
            database: "connected",
            timestamp: new Date().toISOString()
        });
    } catch (_error) {
        return response.status(503).json({
            success: false,
            status: "database_unavailable",
            timestamp: new Date().toISOString()
        });
    }
});

router.get("/readiness", async (_request, response) => {
    const checks = productionConfigurationChecks(process.env, { cloudinaryConfigured: isCloudinaryConfigured() });
    const integrations = configurationStatus(checks);
    const configurationReady = Object.values(integrations).every(Boolean);
    try {
        const { rows } = await db.query("SELECT nome FROM schema_migrations WHERE nome = ANY($1::text[])", [REQUIRED_MIGRATIONS]);
        const applied = new Set(rows.map(row => row.nome));
        const databaseReady = REQUIRED_MIGRATIONS.every(name => applied.has(name));
        const ready = configurationReady && databaseReady;
        return response.status(ready ? 200 : 503).json({
            success: ready,
            status: ready ? "ready" : "attention_required",
            database: databaseReady,
            integrations,
            timestamp: new Date().toISOString()
        });
    } catch (_error) {
        return response.status(503).json({
            success: false,
            status: "database_unavailable",
            database: false,
            integrations,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
