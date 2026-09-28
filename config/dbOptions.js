"use strict";

function buildDbOptions() {
    const databaseUrl =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.DATABASE_PUBLIC_URL;

    if (databaseUrl) {
        return {
            connectionString: databaseUrl,
            ...(process.env.DB_SSL === "true"
                ? { ssl: { rejectUnauthorized: false } }
                : {})
        };
    }

    return {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    };
}

module.exports = {
    buildDbOptions
};
