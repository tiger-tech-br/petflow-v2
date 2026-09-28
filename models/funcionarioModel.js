"use strict";

/* ==================================================
   DATABASE
================================================== */

const db = require("../database/connection");

/* ==================================================
   LISTAR
================================================== */

async function findAll(empresaId) {

    const result = await db.query(

        `
            SELECT

                id,

                nome,

                email,

                telefone,

                cargo,

                status,

                created_at,

                updated_at

            FROM funcionarios

            WHERE empresa_id = $1

            ORDER BY nome ASC
        `,

        [empresaId]

    );

    return result.rows;

}

/* ==================================================
   BUSCAR POR ID
================================================== */

async function findById(id, empresaId) {

    const result = await db.query(

        `
            SELECT *

            FROM funcionarios

            WHERE

                id = $1

            AND

                empresa_id = $2

            LIMIT 1
        `,

        [

            id,

            empresaId

        ]

    );

    return result.rows[0] || null;

}

/* ==================================================
   CADASTRAR
================================================== */

async function create(funcionario) {

    const result = await db.query(

        `
            INSERT INTO funcionarios (

                empresa_id,

                nome,

                email,

                telefone,

                cargo,

                foto,

                status

            )

            VALUES (

                $1,$2,$3,$4,$5,$6,TRUE

            )

            RETURNING *
        `,

        [

            funcionario.empresaId,

            funcionario.nome,

            funcionario.email,

            funcionario.telefone,

            funcionario.cargo,

            funcionario.foto

        ]

    );

    return result.rows[0];

}

/* ==================================================
   ATUALIZAR
================================================== */

async function update(id, funcionario, empresaId) {

    const result = await db.query(

        `
            UPDATE funcionarios

            SET

                nome = $1,

                email = $2,

                telefone = $3,

                cargo = $4,

                foto = $5,

                updated_at = NOW()

            WHERE

                id = $6

            AND

                empresa_id = $7

            RETURNING *
        `,

        [

            funcionario.nome,

            funcionario.email,

            funcionario.telefone,

            funcionario.cargo,

            funcionario.foto,

            id,

            empresaId

        ]

    );

    return result.rows[0];

}

/* ==================================================
   REMOVER
================================================== */

async function remove(id, empresaId) {

    await db.query(

        `
            DELETE FROM funcionarios

            WHERE

                id = $1

            AND

                empresa_id = $2
        `,

        [

            id,

            empresaId

        ]

    );

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    findAll,

    findById,

    create,

    update,

    remove

};