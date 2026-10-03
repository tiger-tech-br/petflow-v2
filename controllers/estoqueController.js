"use strict";

/* ==================================================
   MODEL
================================================== */

const estoqueModel = require("../models/estoqueModel");
const db = require("../database/connection");
const audit = require("../services/auditService");

/* ==================================================
   LISTAR
================================================== */

async function index(request, response, next) {

    try {

        const estoque = await estoqueModel.findAll(

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            data: estoque

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   BUSCAR POR PRODUTO
================================================== */

async function show(request, response, next) {

    try {

        const { produtoId } = request.params;

        const estoque = await estoqueModel.findByProduct(

            produtoId,

            request.user.empresaId

        );

        if (!estoque) {

            return response.status(404).json({

                success: false,

                message: "Estoque não encontrado."

            });

        }

        return response.status(200).json({

            success: true,

            data: estoque

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   CADASTRAR
================================================== */

async function store(request, response, next) {

    try {

        const estoque = await estoqueModel.create({

            ...request.body,

            empresaId: request.user.empresaId

        });

        return response.status(201).json({

            success: true,

            message: "Estoque cadastrado com sucesso.",

            data: estoque

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   ATUALIZAR
================================================== */

async function update(request, response, next) {

    try {

        const { produtoId } = request.params;

        const estoque = await db.transaction(async client => {
            const anterior = await client.query(
                "SELECT * FROM estoque WHERE produto_id=$1 AND empresa_id=$2 FOR UPDATE",
                [produtoId, request.user.empresaId]
            );
            if (!anterior.rows[0]) return null;
            const atualizado = await client.query(
                `UPDATE estoque SET quantidade=$1,estoque_minimo=$2,estoque_maximo=$3,
                 localizacao=$4,updated_at=NOW() WHERE produto_id=$5 AND empresa_id=$6 RETURNING *`,
                [request.body.quantidade, request.body.estoqueMinimo, request.body.estoqueMaximo || null,
                    request.body.localizacao || null, produtoId, request.user.empresaId]
            );
            const novo = atualizado.rows[0];
            if (Number(novo.quantidade) !== Number(anterior.rows[0].quantidade)) {
                await client.query(
                    `INSERT INTO movimentacoes_estoque
                     (empresa_id,produto_id,tipo,quantidade,observacao,usuario_id,saldo_anterior,saldo_novo)
                     VALUES ($1,$2,'AJUSTE',$3,$4,$5,$6,$7)`,
                    [request.user.empresaId, produtoId,
                        Math.abs(Number(novo.quantidade) - Number(anterior.rows[0].quantidade)),
                        request.body.motivo || "Ajuste manual pelo painel", request.user.id,
                        anterior.rows[0].quantidade, novo.quantidade]
                );
            }
            await audit.registrar({ ...audit.requestMeta(request), acao: "AJUSTAR", entidade: "ESTOQUE",
                entidadeId: produtoId, descricao: request.body.motivo || "Estoque ajustado pelo painel.",
                anterior: anterior.rows[0], novo }, client);
            return novo;
        });

        if (!estoque) return response.status(404).json({ success: false, message: "Estoque não encontrado." });

        return response.status(200).json({

            success: true,

            message: "Estoque atualizado com sucesso.",

            data: estoque

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   REMOVER
================================================== */

async function destroy(request, response, next) {

    try {

        const { produtoId } = request.params;

        return response.status(405).json({
            success: false,
            message: "Registros de estoque não podem ser excluídos. Ajuste a quantidade e informe o motivo."
        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    index,

    show,

    store,

    update,

    destroy

};
