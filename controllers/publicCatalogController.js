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
            ORDER BY p.nome ASC
            LIMIT 12;
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

async function servicos(request, response, next) {
    try {
        const { rows } = await db.query(`
            SELECT
                id,
                nome,
                descricao,
                preco,
                duracao
            FROM servicos
            WHERE ativo = TRUE
            ORDER BY nome ASC
            LIMIT 8;
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
    categorias,
    servicos
};
