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

                p.id,

                p.nome,

                p.descricao,

                p.preco,

                p.custo,

                p.codigo_barras,

                p.sku,

                p.foto,

                p.status,

                c.nome AS categoria,

                f.id AS fornecedor_id,

                f.nome AS fornecedor

            FROM produtos p

            INNER JOIN categorias c

                ON c.id = p.categoria_id

            LEFT JOIN fornecedores f

                ON f.id = p.fornecedor_id

            WHERE p.empresa_id = get_petflow_empresa_id()
               OR ($1::uuid IS NOT NULL AND p.empresa_id = $1)

            ORDER BY p.nome ASC
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

            FROM produtos

            WHERE

                id = $1

            AND (
                empresa_id = get_petflow_empresa_id()
                OR ($2::uuid IS NOT NULL AND empresa_id = $2)
            )

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

async function create(produto) {

    const result = await db.query(

        `
            INSERT INTO produtos (

                empresa_id,

                categoria_id,

                fornecedor_id,

                nome,

                descricao,

                sku,

                codigo_barras,

                preco,

                custo,

                foto,

                status

            )

            VALUES (

                get_petflow_empresa_id(),$1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE

            )

            RETURNING *
        `,

        [

            produto.categoriaId,

            produto.fornecedorId || produto.fornecedor_id || null,

            produto.nome,

            produto.descricao,

            produto.sku,

            produto.codigoBarras,

            produto.preco,

            produto.custo,

            produto.foto

        ]

    );

    return result.rows[0];

}

/* ==================================================
   ATUALIZAR
================================================== */

async function update(id, produto, empresaId) {

    const result = await db.query(

        `
            UPDATE produtos

            SET

                categoria_id = $1,

                fornecedor_id = $2,

                nome = $3,

                descricao = $4,

                sku = $5,

                codigo_barras = $6,

                preco = $7,

                custo = $8,

                foto = $9,

                updated_at = NOW()

            WHERE

                id = $10

            AND (
                empresa_id = get_petflow_empresa_id()
                OR ($11::uuid IS NOT NULL AND empresa_id = $11)
            )

            RETURNING *
        `,

        [

            produto.categoriaId,

            produto.fornecedorId || produto.fornecedor_id || null,

            produto.nome,

            produto.descricao,

            produto.sku,

            produto.codigoBarras,

            produto.preco,

            produto.custo,

            produto.foto,

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
            DELETE FROM produtos

            WHERE

                id = $1

            AND (
                empresa_id = get_petflow_empresa_id()
                OR ($2::uuid IS NOT NULL AND empresa_id = $2)
            )
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
