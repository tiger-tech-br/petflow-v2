"use strict";

/* ==================================================
   DEPENDÊNCIAS
================================================== */

const db = require("../database/connection");

const VendaModel = require("../models/vendaModel");
const ItemVendaModel = require("../models/itemVendaModel");

const MovimentacaoEstoqueService = require(
    "./movimentacaoEstoqueService"
);

const FinanceiroService = require("./financeiroService");
const CupomService = require("./cupomService");

const {
    sendOptionalEmail,
    paymentApprovedTemplate,
    orderOutForDeliveryTemplate,
    orderDeliveredTemplate,
    orderCanceledTemplate
} = require("./emailService");

/* ==================================================
   FORMAS DE PAGAMENTO ACEITAS
================================================== */

const FORMAS_PAGAMENTO = [
    "PIX",
    "CARTAO_CREDITO",
    "CARTAO_DEBITO",
    "PAGBANK"
];

/* ==================================================
   SERVICE
================================================== */

const VendaService = {

    /* ==============================================
       FINALIZAR VENDA
    ============================================== */

    async finalizarVenda(empresaId, venda, itens) {

        if (!empresaId) {
            throw new Error("Empresa não informada.");
        }

        if (!venda || typeof venda !== "object") {
            throw new Error("Dados da venda não informados.");
        }

        if (!Array.isArray(itens) || itens.length === 0) {
            throw new Error(
                "A venda deve possuir pelo menos um item."
            );
        }

        const formaPagamento =
            venda.forma_pagamento ??
            venda.formaPagamento ??
            "PIX";

        if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        let desconto = Number(venda.desconto ?? 0);
        const acrescimo = Number(venda.acrescimo ?? 0);
        const valorFrete = Number(venda.valor_frete ?? 0);
        if (!Number.isFinite(valorFrete) || valorFrete < 0) throw new Error("Frete inválido.");

        if (
            !Number.isFinite(desconto) ||
            desconto < 0
        ) {
            throw new Error("Desconto inválido.");
        }

        if (
            !Number.isFinite(acrescimo) ||
            acrescimo < 0
        ) {
            throw new Error("Acréscimo inválido.");
        }

        const client = await db.connect();

        try {

            await client.query("BEGIN");

            const novaVenda = await VendaModel.criar(
                {
                    empresa_id: empresaId,

                    cliente_id:
                        venda.cliente_id ??
                        venda.clienteId ??
                        null,

                    usuario_id:
                        venda.usuario_id ??
                        venda.usuarioId ??
                        null,

                    data_venda:
                        venda.data_venda ??
                        venda.dataVenda ??
                        new Date(),

                    forma_pagamento: formaPagamento,

                    status:
                        venda.status ??
                        "AGUARDANDO_PAGAMENTO",

                    desconto: 0,

                    acrescimo,
                    valor_frete: valorFrete,
                    distancia_entrega_m: venda.distancia_entrega_m,
                    endereco_entrega: venda.endereco_entrega,

                    observacoes:
                        venda.observacoes ?? null,

                    valor_total: 0
                },
                client
            );

            let valorTotalBruto = 0;

            const itensCriados = [];

            for (const item of itens) {

                const produtoId =
                    item.produto_id ??
                    item.produtoId;

                const quantidade = Number(
                    item.quantidade
                );

                if (!produtoId) {
                    throw new Error(
                        "Produto não informado."
                    );
                }

                if (
                    !Number.isInteger(quantidade) ||
                    quantidade <= 0
                ) {
                    throw new Error(
                        "A quantidade do produto deve ser um número inteiro maior que zero."
                    );
                }

                /*
                ==========================================
                 BUSCA O PREÇO VERDADEIRO NO BANCO

                 O valor enviado pelo navegador é ignorado.
                ==========================================
                */

                const { rows } = await client.query(
                    `
                        SELECT
                            id,
                            nome,
                            preco
                        FROM produtos
                        WHERE id = $1
                          AND empresa_id = $2
                          AND ativo = TRUE
                        LIMIT 1
                        FOR UPDATE;
                    `,
                    [
                        produtoId,
                        empresaId
                    ]
                );

                const produto = rows[0];

                if (!produto) {
                    throw new Error(
                        "Produto não encontrado ou indisponível."
                    );
                }

                const precoUnitario = Number(
                    produto.preco
                );

                if (
                    !Number.isFinite(precoUnitario) ||
                    precoUnitario < 0
                ) {
                    throw new Error(
                        `O produto ${produto.nome} possui um preço inválido.`
                    );
                }

                const disponivel =
                    await MovimentacaoEstoqueService
                        .verificarDisponibilidade(
                            empresaId,
                            produtoId,
                            quantidade,
                            client
                        );

                if (!disponivel) {
                    throw new Error(
                        `Estoque insuficiente para o produto ${produto.nome}.`
                    );
                }

                const descontoItem = 0;

                const subtotal =
                    quantidade * precoUnitario -
                    descontoItem;

                const novoItem =
                    await ItemVendaModel.criar(
                        {
                            venda_id: novaVenda.id,
                            produto_id: produtoId,
                            quantidade,
                            preco_unitario:
                                precoUnitario,
                            desconto: descontoItem,
                            subtotal
                        },
                        client
                    );

                itensCriados.push(novoItem);

                valorTotalBruto += subtotal;

            }

            valorTotalBruto = Math.round(valorTotalBruto * 100) / 100;
            let cupomCodigo = null;
            if (venda.cupomCodigo != null && venda.cupomCodigo !== "") {
                const cupom = await CupomService.validar(client, empresaId, venda.cupomCodigo, Math.round(valorTotalBruto * 100), true);
                desconto = cupom.desconto;
                cupomCodigo = cupom.codigo;
            }

            const valorFinal =
                valorTotalBruto -
                desconto +
                acrescimo + valorFrete;

            if (valorFinal < 0) {
                throw new Error(
                    "O desconto não pode ser maior que o valor da venda somado ao acréscimo."
                );
            }

            /*
            ==========================================
             ATUALIZA OS TOTAIS

             O model recebe o total bruto.
             Ele calcula:
             valor_final = valor_total - desconto
                           + acréscimo
            ==========================================
            */

            if (cupomCodigo && Math.round(valorFinal * 100) === 0) {
                throw Object.assign(new Error("O total para pagamento deve ser maior que zero. Adicione outro produto ou remova o cupom."), { status: 400 });
            }

            const { rows: [vendaAtualizada] } = await client.query(
                `UPDATE vendas SET valor_total=$1, desconto=$2, cupom_codigo=$3,
                 valor_final=$1::numeric-$2::numeric+acrescimo+valor_frete, updated_at=NOW()
                 WHERE id=$4 AND empresa_id=$5 RETURNING *`,
                [valorTotalBruto, desconto, cupomCodigo, novaVenda.id, empresaId]
            );

            await client.query("COMMIT");

            return {
                success: true,

                message:
                    "Venda finalizada com sucesso.",

                venda: vendaAtualizada,

                itens: itensCriados
            };

        } catch (error) {

            await client.query("ROLLBACK");

            throw error;

        } finally {

            client.release();

        }

    },

    /* ==============================================
       CONFIRMAR PAGAMENTO
    ============================================== */

    async confirmarPagamento(empresaId, referencia, dadosPagamento = {}) {

        const client = await db.connect();

        try {

            await client.query("BEGIN");

            const venda = await buscarVendaPagamento(
                referencia,
                empresaId,
                client
            );

            if (!venda) {
                await client.query("COMMIT");
                return null;
            }

            let shouldNotifyPayment = false;

            if (venda.estoque_baixado_em || ["PAGAMENTO_APROVADO", "EM_SEPARACAO", "SAIU_PARA_ENTREGA", "ENTREGUE", "FINALIZADA"].includes(venda.status)) {
                await VendaModel.atualizarPagamentoPorReferencia(
                    referencia,
                    {
                        ...dadosPagamento,
                        status: venda.status
                    },
                    client
                );

                await client.query("COMMIT");
                return venda;
            }

            shouldNotifyPayment = true;

            const itens = await listarItensVenda(
                venda.id,
                venda.empresa_id,
                client
            );

            for (const item of itens) {
                await MovimentacaoEstoqueService.saida(
                    venda.empresa_id,
                    item.produto_id,
                    item.quantidade,
                    client
                );
            }

            const vendaAtualizada =
                await VendaModel.atualizarPagamentoPorReferencia(
                    referencia,
                    {
                        status: "PAGAMENTO_APROVADO",
                        ...dadosPagamento
                    },
                    client
                );

            await client.query("UPDATE vendas SET estoque_baixado_em = NOW() WHERE id = $1", [venda.id]);
            await gerarFinanceiroSeNaoExistir(
                venda.empresa_id,
                vendaAtualizada || venda,
                client
            );

            await client.query("COMMIT");

            if (shouldNotifyPayment) {
                await enviarEmailStatusPedido(
                    vendaAtualizada || venda,
                    "PAGAMENTO_APROVADO"
                );
            }

            return vendaAtualizada || venda;

        } catch (error) {

            await client.query("ROLLBACK");
            throw error;

        } finally {

            client.release();

        }

    },

    /* ==============================================
       ATUALIZAR STATUS DO PEDIDO
    ============================================== */

    async atualizarStatusPedido(empresaId, vendaId, status) {

        if (status === "PAGAMENTO_APROVADO") {
            return this.confirmarPagamento(
                empresaId,
                vendaId
            );
        }

        const result = await db.transaction(async client => {
            const { rows } = await client.query("SELECT * FROM vendas WHERE id=$1 AND empresa_id=$2 FOR UPDATE", [vendaId,empresaId]);
            const current = rows[0];
            if (!current) return null;
            if (current.status === status) return { sale: current, changed: false };
            const allowed = {
                AGUARDANDO_PAGAMENTO: ["CANCELADA"],
                PAGAMENTO_APROVADO: ["EM_SEPARACAO","SAIU_PARA_ENTREGA","CANCELADA"],
                EM_SEPARACAO: ["SAIU_PARA_ENTREGA","CANCELADA"],
                SAIU_PARA_ENTREGA: ["ENTREGUE","CANCELADA"],
                ENTREGUE: ["FINALIZADA"], FINALIZADA: [], CANCELADA: []
            };
            if (!allowed[current.status]?.includes(status)) throw Object.assign(new Error("Esta mudança de status não é permitida. Confira a etapa atual e a confirmação do pagamento."), { status: 409 });
            return { sale: await VendaModel.atualizarStatus(vendaId,empresaId,status,client), changed: true };
        });
        if (!result) return null;
        if (result.changed) await enviarEmailStatusPedido(result.sale,status);
        return result.sale;

    },

    /* ==============================================
       ATUALIZAR STATUS DO PAGAMENTO
    ============================================== */

    async atualizarStatusPagamento(
        empresaId,
        referencia,
        status,
        dadosPagamento = {}
    ) {

        const result = await db.transaction(async client => {
            const vendaAtual = await buscarVendaPagamento(referencia, empresaId, client);
            if (!vendaAtual) return null;
            const vendaAtualizada = await VendaModel.atualizarPagamentoPorReferencia(
                referencia, { ...dadosPagamento, status }, client
            );
            return { vendaAtual, vendaAtualizada: vendaAtualizada || vendaAtual };
        });
        if (!result) return null;
        const { vendaAtual, vendaAtualizada } = result;
        if (vendaAtual.status !== vendaAtualizada.status) {
            await enviarEmailStatusPedido(
                vendaAtualizada,
                vendaAtualizada.status
            );
        }

        return vendaAtualizada;

    }

};

async function buscarVendaPagamento(referencia, empresaId, client) {

    const { rows } = await client.query(
        `
            SELECT *
            FROM vendas
            WHERE
                (
                    id::TEXT = $1
                    OR pagseguro_checkout_id = $1
                    OR pagseguro_order_id = $1
                    OR pagseguro_charge_id = $1
                )
                AND (
                    $2::uuid IS NULL
                    OR empresa_id = $2
                )
            LIMIT 1
            FOR UPDATE;
        `,
        [
            String(referencia || ""),
            empresaId || null
        ]
    );

    return rows[0] || null;

}

async function listarItensVenda(vendaId, empresaId, client) {

    const { rows } = await client.query(
        `
            SELECT
                iv.produto_id,
                iv.quantidade
            FROM itens_venda iv
            INNER JOIN vendas v
                ON v.id = iv.venda_id
            WHERE iv.venda_id = $1
              AND v.empresa_id = $2;
        `,
        [
            vendaId,
            empresaId
        ]
    );

    return rows;

}

async function gerarFinanceiroSeNaoExistir(empresaId, venda, client) {

    const { rows } = await client.query(
        `
            SELECT id
            FROM financeiro
            WHERE empresa_id = $1
              AND origem = 'VENDA'
              AND referencia_id = $2
            LIMIT 1;
        `,
        [
            empresaId,
            venda.id
        ]
    );

    if (rows[0]) {
        return rows[0];
    }

    return FinanceiroService.gerarContaReceber(
        empresaId,
        {
            id: venda.id,
            valor_total: venda.valor_final,
            data_venda: venda.data_venda,
            observacoes: venda.observacoes
        },
        client
    );

}

async function enviarEmailStatusPedido(venda, status) {

    const templateFactory = {
        PAGAMENTO_APROVADO: paymentApprovedTemplate,
        SAIU_PARA_ENTREGA: orderOutForDeliveryTemplate,
        ENTREGUE: orderDeliveredTemplate,
        CANCELADA: orderCanceledTemplate
    }[status];

    if (!templateFactory || !venda?.id || !venda?.empresa_id) {
        return null;
    }

    const pedido = await VendaModel.buscarPorId(
        venda.id,
        venda.empresa_id
    );

    const cliente = pedido?.cliente;

    if (!cliente?.email) {
        return null;
    }

    const template = templateFactory({
        name: cliente.nome,
        orderId: pedido.id,
        total: pedido.valor_final ?? pedido.valor_total
    });

    return sendOptionalEmail({
        to: cliente.email,
        subject: template.subject,
        html: template.html,
        text: template.text
    });

}

module.exports = VendaService;
