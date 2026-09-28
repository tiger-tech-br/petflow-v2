"use strict";

const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const { buildDbOptions } = require("../config/dbOptions");

require("dotenv").config();

const pool = new Pool(buildDbOptions());

const admin = {
    nome: "Admin",
    email: process.env.ADMIN_EMAIL || "admin@petflow.com.br",
    senha: process.env.ADMIN_PASSWORD || "Admin@123",
    perfil: "ADMIN"
};

async function run() {
    const senhaHash = await bcrypt.hash(admin.senha, 10);

    const { rows } = await pool.query(
        `
            INSERT INTO usuarios (
                empresa_id,
                nome,
                email,
                senha_hash,
                perfil,
                ativo
            )
            VALUES (
                get_petflow_empresa_id(),
                $1,
                $2,
                $3,
                $4,
                TRUE
            )
            ON CONFLICT (email)
            DO UPDATE SET
                nome = EXCLUDED.nome,
                senha_hash = EXCLUDED.senha_hash,
                perfil = EXCLUDED.perfil,
                ativo = TRUE,
                updated_at = NOW()
            RETURNING id, nome, email, perfil, ativo;
        `,
        [
            admin.nome,
            admin.email,
            senhaHash,
            admin.perfil
        ]
    );

    console.log("Usuario admin pronto:");
    console.log(rows[0]);
    console.log(`Email: ${admin.email}`);
    console.log(`Senha: ${admin.senha}`);
}

run()
    .catch((error) => {
        console.error("Erro ao criar usuario admin.");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
