"use strict";

const FinanceiroModel = require("../models/financeiroModel");

async function listar(req, res, next) {
    try {
        const lancamentos = await FinanceiroModel.listar(req.user.empresaId);

        return res.status(200).json({
            success: true,
            data: lancamentos
        });
    } catch (error) {
        next(error);
    }
}

async function buscarPorId(req, res, next) {
    try {
        const lancamento = await FinanceiroModel.buscarPorId(
            req.params.id,
            req.user.empresaId
        );

        if (!lancamento) {
            return res.status(404).json({
                success: false,
                message: "Lançamento financeiro não encontrado."
            });
        }

        return res.status(200).json({
            success: true,
            data: lancamento
        });
    } catch (error) {
        next(error);
    }
}

async function criar(req, res, next) {
    try {
        const lancamento = await FinanceiroModel.criar({
            ...req.body,
            empresa_id: req.user.empresaId
        });

        return res.status(201).json({
            success: true,
            message: "Lançamento financeiro cadastrado com sucesso.",
            data: lancamento
        });
    } catch (error) {
        next(error);
    }
}

async function atualizar(req, res, next) {
    try {
        const lancamento = await FinanceiroModel.atualizar(
            req.params.id,
            req.user.empresaId,
            req.body
        );

        if (!lancamento) {
            return res.status(404).json({
                success: false,
                message: "Lançamento financeiro não encontrado."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Lançamento financeiro atualizado com sucesso.",
            data: lancamento
        });
    } catch (error) {
        next(error);
    }
}

async function excluir(req, res, next) {
    try {
        const lancamento = await FinanceiroModel.excluir(
            req.params.id,
            req.user.empresaId
        );

        if (!lancamento) {
            return res.status(404).json({
                success: false,
                message: "Lançamento financeiro não encontrado."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Lançamento financeiro removido com sucesso."
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    excluir
};
