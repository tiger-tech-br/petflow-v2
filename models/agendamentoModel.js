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

                a.id,

                c.nome AS cliente,

                p.nome AS pet,

                COALESCE(a.servico, s.nome) AS servico,

                COALESCE(a.data, a.data_agendamento) AS data,

                COALESCE(a.hora, a.horario) AS hora,

                a.status

            FROM agendamentos a

            INNER JOIN clientes c

                ON c.id = a.cliente_id

            INNER JOIN pets p

                ON p.id = a.pet_id

            LEFT JOIN servicos s

                ON s.id = a.servico_id

            WHERE a.empresa_id = $1

            ORDER BY
                COALESCE(a.data, a.data_agendamento) ASC,
                COALESCE(a.hora, a.horario) ASC
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
            SELECT
                a.*,
                COALESCE(a.servico, s.nome) AS servico,
                COALESCE(a.data, a.data_agendamento) AS data,
                COALESCE(a.hora, a.horario) AS hora

            FROM agendamentos a

            LEFT JOIN servicos s

                ON s.id = a.servico_id

            WHERE a.id = $1

            AND a.empresa_id = $2

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

async function create(agendamento) {

    const result = await db.query(

        `
            INSERT INTO agendamentos (

                empresa_id,

                cliente_id,

                pet_id,

                funcionario_id,

                servico,

                data,

                hora,

                observacoes,

                status

            )

            VALUES (

                $1,$2,$3,$4,$5,$6,$7,$8,$9

            )

            RETURNING *
        `,

        [

            agendamento.empresaId,

            agendamento.clienteId,

            agendamento.petId,

            agendamento.funcionarioId,

            agendamento.servico,

            agendamento.data,

            agendamento.hora,

            agendamento.observacoes,

            agendamento.status

        ]

    );

    return result.rows[0];

}

/* ==================================================
   ATUALIZAR
================================================== */

async function update(id, agendamento, empresaId) {

    const result = await db.query(

        `
            UPDATE agendamentos

            SET

                cliente_id = $1,

                pet_id = $2,

                funcionario_id = $3,

                servico = $4,

                data = $5,

                hora = $6,

                observacoes = $7,

                status = $8,

                updated_at = NOW()

            WHERE

                id = $9

            AND

                empresa_id = $10

            RETURNING *
        `,

        [

            agendamento.clienteId,

            agendamento.petId,

            agendamento.funcionarioId,

            agendamento.servico,

            agendamento.data,

            agendamento.hora,

            agendamento.observacoes,

            agendamento.status,

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
            DELETE FROM agendamentos

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
