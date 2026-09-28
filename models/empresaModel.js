"use strict";

/* ==================================================
   DATABASE
================================================== */

const db = require("../database/connection");

/* ==================================================
   BUSCAR EMPRESA
================================================== */

async function findById(id) {

    const result = await db.query(

        `
            SELECT *

            FROM empresas

            WHERE id = $1

            LIMIT 1
        `,

        [id]

    );

    return result.rows[0] || null;

}

/* ==================================================
   ATUALIZAR
================================================== */

async function update(id, empresa) {

    const result = await db.query(

        `
            UPDATE empresas

            SET

                nome = $1,

                razao_social = $2,

                cnpj = $3,

                telefone = $4,

                email = $5,

                endereco = $6,

                numero = $7,

                complemento = $8,

                bairro = $9,

                cidade = $10,

                estado = $11,

                cep = $12,

                logo = $13,

                horario_abertura = $14,

                horario_fechamento = $15,

                updated_at = NOW()

            WHERE id = $16

            RETURNING *
        `,

        [

            empresa.nome,

            empresa.razaoSocial,

            empresa.cnpj,

            empresa.telefone,

            empresa.email,

            empresa.endereco,

            empresa.numero,

            empresa.complemento,

            empresa.bairro,

            empresa.cidade,

            empresa.estado,

            empresa.cep,

            empresa.logo,

            empresa.horarioAbertura,

            empresa.horarioFechamento,

            id

        ]

    );

    return result.rows[0];

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    findById,

    update

};