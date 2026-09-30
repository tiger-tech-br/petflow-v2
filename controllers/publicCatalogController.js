"use strict";

const db = require("../database/connection");

async function produtos(request, response, next) {
    try {
        const { rows } = await db.query(`
            SELECT
                p.id,
                p.nome,
                p.descricao,
                p.preco,
                p.foto,
                p.sku,
                c.nome AS categoria
            FROM produtos p
            LEFT JOIN categorias c
                ON c.id = p.categoria_id
            WHERE COALESCE(p.status, p.ativo, TRUE) = TRUE
              AND p.empresa_id = get_petflow_empresa_id()
            ORDER BY p.nome ASC;
        `);

        return response.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
}

async function categorias(request, response, next) {
    try {
        const { rows } = await db.query(`
            SELECT
                id,
                nome,
                descricao
            FROM categorias
            WHERE COALESCE(status, ativo, TRUE) = TRUE
              AND empresa_id = get_petflow_empresa_id()
            ORDER BY nome ASC;
        `);

        return response.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    produtos,
    categorias
};
