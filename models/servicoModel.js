"use strict";

/**
 * ==========================================================
 * PetFlow
 * Model de Serviços
 * ==========================================================
 */

const db = require("../database/connection");

/**
 * Lista todos os serviços da empresa.
 */
async function listar(empresaId) {
    const query = `
        SELECT
            id,
            empresa_id,
            nome,
            descricao,
            preco,
            duracao,
            ativo,
            created_at,
            updated_at
        FROM servicos
        WHERE empresa_id = $1
        ORDER BY nome ASC;
    `;

    const { rows } = await db.query(query, [empresaId]);

    return rows;
}

/**
 * Busca um serviço pelo ID.
 */
async function buscarPorId(id, empresaId) {
    const query = `
        SELECT
            id,
            empresa_id,
            nome,
            descricao,
            preco,
            duracao,
            ativo,
            created_at,
            updated_at
        FROM servicos
        WHERE id = $1
          AND empresa_id = $2
        LIMIT 1;
    `;

    const { rows } = await db.query(query, [id, empresaId]);

    return rows[0];
}

/**
 * Cadastra um novo serviço.
 */
async function criar(dados) {

    const {
        empresaId,
        nome,
        descricao,
        preco,
        duracao,
        ativo = true
    } = dados;

    const query = `
        INSERT INTO servicos
        (
            empresa_id,
            nome,
            descricao,
            preco,
            duracao,
            ativo
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
        )
        RETURNING *;
    `;

    const values = [
        empresaId,
        nome,
        descricao,
        preco,
        duracao,
        ativo
    ];

    const { rows } = await db.query(query, values);

    return rows[0];
}

/**
 * Atualiza um serviço.
 */
async function atualizar(id, empresaId, dados) {

    const {
        nome,
        descricao,
        preco,
        duracao,
        ativo
    } = dados;

    const query = `
        UPDATE servicos
        SET
            nome = $1,
            descricao = $2,
            preco = $3,
            duracao = $4,
            ativo = $5,
            updated_at = NOW()
        WHERE
            id = $6
            AND empresa_id = $7
        RETURNING *;
    `;

    const values = [
        nome,
        descricao,
        preco,
        duracao,
        ativo,
        id,
        empresaId
    ];

    const { rows } = await db.query(query, values);

    return rows[0];
}

/**
 * Remove um serviço.
 */
async function excluir(id, empresaId) {

    const query = `
        DELETE FROM servicos
        WHERE
            id = $1
            AND empresa_id = $2
        RETURNING *;
    `;

    const { rows } = await db.query(query, [id, empresaId]);

    return rows[0];
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    excluir
};