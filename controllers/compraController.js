"use strict";

const CompraModel = require("../models/compraModel");
const CompraService = require("../services/compraService");

const CompraController = {

    /* ==============================================
       LISTAR
    ============================================== */

    async listar(req, res) {

        try {

            const empresaId = req.user.empresaId;

            const compras = await CompraModel.listar(empresaId);

            return res.status(200).json(compras);

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: "Erro ao listar compras."

            });

        }

    },

    /* ==============================================
       BUSCAR POR ID
    ============================================== */

    async buscarPorId(req, res) {

        try {

            const empresaId = req.user.empresaId;

            const compra = await CompraModel.buscarPorId(

                req.params.id,

                empresaId

            );

            if (!compra) {

                return res.status(404).json({

                    erro: "Compra não encontrada."

                });

            }

            return res.status(200).json(compra);

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: "Erro ao buscar compra."

            });

        }

    },

    /* ==============================================
       FINALIZAR COMPRA
    ============================================== */

    async criar(req, res) {

        try {

            const empresaId = req.user.empresaId;

            const {

                fornecedor_id,
                data_compra,
                observacoes,
                itens

            } = req.body;

            if (!fornecedor_id) {

                return res.status(400).json({

                    erro: "Fornecedor obrigatório."

                });

            }

            if (!Array.isArray(itens) || itens.length === 0) {

                return res.status(400).json({

                    erro: "Informe ao menos um item."

                });

            }

            const resultado = await CompraService.finalizarCompra(

                empresaId,

                {

                    fornecedor_id,
                    data_compra,
                    observacoes

                },

                itens

            );

            return res.status(201).json(resultado);

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: error.message

            });

        }

    },

    /* ==============================================
       ATUALIZAR
    ============================================== */

    async atualizar(req, res) {

        try {

            const empresaId = req.user.empresaId;

            const compra = await CompraModel.atualizar(

                req.params.id,

                empresaId,

                req.body

            );

            if (!compra) {

                return res.status(404).json({

                    erro: "Compra não encontrada."

                });

            }

            return res.status(200).json(compra);

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: "Erro ao atualizar compra."

            });

        }

    },

    /* ==============================================
       EXCLUIR
    ============================================== */

    async excluir(req, res) {

        try {

            const empresaId = req.user.empresaId;

            const compra = await CompraModel.excluir(

                req.params.id,

                empresaId

            );

            if (!compra) {

                return res.status(404).json({

                    erro: "Compra não encontrada."

                });

            }

            return res.status(200).json({

                mensagem: "Compra excluída com sucesso."

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                erro: "Erro ao excluir compra."

            });

        }

    }

};

module.exports = CompraController;