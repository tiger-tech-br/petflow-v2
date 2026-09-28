"use strict";

const db = require("../database/connection");

const CompraModel = require("../models/compraModel");
const ItemCompraModel = require("../models/itemCompraModel");

const MovimentacaoEstoqueService = require("./movimentacaoEstoqueService");
const FinanceiroService = require("./financeiroService");

const CompraService = {

    /* ==============================================
       FINALIZAR COMPRA
    ============================================== */

    async finalizarCompra(empresaId, compra, itens) {

        if (!Array.isArray(itens) || itens.length === 0) {

            throw new Error("A compra deve possuir pelo menos um item.");

        }

        const client = await db.connect();

        try {

            await client.query("BEGIN");

            const novaCompra = await CompraModel.criar({

                empresa_id: empresaId,
                fornecedor_id: compra.fornecedor_id,
                data_compra: compra.data_compra,
                valor_total: 0,
                observacoes: compra.observacoes

            }, client);

            let valorTotal = 0;

            const itensCriados = [];

            for (const item of itens) {

                const quantidade = Number(item.quantidade);
                const valorUnitario = Number(item.valor_unitario);

                if (quantidade <= 0) {

                    throw new Error("Quantidade inválida.");

                }

                if (valorUnitario < 0) {

                    throw new Error("Valor unitário inválido.");

                }

                const subtotal = quantidade * valorUnitario;

                const novoItem = await ItemCompraModel.criar({

                    compra_id: novaCompra.id,
                    empresa_id: empresaId,
                    produto_id: item.produto_id,
                    quantidade,
                    valor_unitario: valorUnitario,
                    subtotal

                }, client);

                itensCriados.push(novoItem);

                await MovimentacaoEstoqueService.entrada(

                    empresaId,
                    item.produto_id,
                    quantidade,
                    client

                );

                valorTotal += subtotal;

            }

            const compraAtualizada = await CompraModel.atualizarValorTotal(

                novaCompra.id,
                valorTotal,
                client

            );

            /* ==========================================
               GERA CONTA A PAGAR
            ========================================== */

            await FinanceiroService.gerarContaPagar(

                empresaId,

                {

                    id: compraAtualizada.id,

                    valor_total: valorTotal,

                    data_compra: compra.data_compra,

                    observacoes: compra.observacoes

                },

                client

            );

            await client.query("COMMIT");

            return {

                success: true,

                message: "Compra finalizada com sucesso.",

                compra: compraAtualizada,

                itens: itensCriados

            };

        } catch (error) {

            await client.query("ROLLBACK");

            throw error;

        } finally {

            client.release();

        }

    }

};

module.exports = CompraService;