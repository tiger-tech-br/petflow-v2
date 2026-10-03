"use strict";

const router = require("express").Router();
const db = require("../database/connection");

const REQUIRED_INTEGRATIONS = {
    email: ["RESEND_API_KEY", "EMAIL_FROM"],
    pagamento: ["PAGSEGURO_BASE_URL", "PAGSEGURO_TOKEN"],
    frete: ["GOOGLE_MAPS_API_KEY"],
    mapa: ["GOOGLE_MAPS_BROWSER_API_KEY"],
    imagens: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
};

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
    const integrations = Object.fromEntries(
        Object.entries(REQUIRED_INTEGRATIONS).map(([name, variables]) => [
            name,
            variables.every(variable => Boolean(String(process.env[variable] || "").trim()))
        ])
    );
    const configurationReady = Object.values(integrations).every(Boolean);

    try {
        const { rows } = await db.query(`
            SELECT EXISTS (
                SELECT 1 FROM schema_migrations WHERE nome = '111_lgpd.sql'
            ) AS latest_migration
        `);
        const databaseReady = rows[0]?.latest_migration === true;
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
