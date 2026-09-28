"use strict";

function buildDbOptions() {
    const databaseUrl =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.DATABASE_PUBLIC_URL;

    // Esta copia nunca deve acessar o banco do PetFlow original.
    const databaseName = databaseUrl
        ? decodeURIComponent(new URL(databaseUrl).pathname.slice(1))
        : process.env.DB_NAME;
    if (databaseName !== "petflow_v2") {
        throw new Error("PetFlow v2 exige um banco separado chamado petflow_v2. Confira DB_NAME e as URLs de conexao.");
    }

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
