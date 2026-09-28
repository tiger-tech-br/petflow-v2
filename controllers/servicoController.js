"use strict";

/**
 * ==========================================================
 * PetFlow
 * Controller de Serviços
 * ==========================================================
 */

const servicoModel = require("../models/servicoModel");

/**
 * Lista todos os serviços.
 */
async function listar(req, res) {
    try {
        const empresaId = req.user.empresaId;

        const servicos = await servicoModel.listar(empresaId);

        return res.status(200).json(servicos);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Erro ao listar serviços."
        });
    }
}

/**
 * Busca um serviço pelo ID.
 */
async function buscarPorId(req, res) {
    try {

        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const servico = await servicoModel.buscarPorId(id, empresaId);

        if (!servico) {
            return res.status(404).json({
                erro: "Serviço não encontrado."
            });
        }

        return res.status(200).json(servico);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            erro: "Erro ao buscar serviço."
        });
    }
}

/**
 * Cadastra um novo serviço.
 */
async function criar(req, res) {
    try {

        const empresaId = req.user.empresaId;

        const {
            nome,
            descricao,
            preco,
            duracao,
            ativo
        } = req.body;

        if (!nome || preco == null || duracao == null) {
            return res.status(400).json({
                erro: "Nome, preço e duração são obrigatórios."
            });
        }

        const servico = await servicoModel.criar({
            empresaId,
            nome,
            descricao,
            preco,
            duracao,
            ativo
        });

        return res.status(201).json(servico);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            erro: "Erro ao cadastrar serviço."
        });
    }
}

/**
 * Atualiza um serviço.
 */
async function atualizar(req, res) {
    try {

        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const {
            nome,
            descricao,
            preco,
            duracao,
            ativo
        } = req.body;

        const existente = await servicoModel.buscarPorId(id, empresaId);

        if (!existente) {
            return res.status(404).json({
                erro: "Serviço não encontrado."
            });
        }

        const servicoAtualizado = await servicoModel.atualizar(
            id,
            empresaId,
            {
                nome,
                descricao,
                preco,
                duracao,
                ativo
            }
        );

        return res.status(200).json(servicoAtualizado);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            erro: "Erro ao atualizar serviço."
        });
    }
}

/**
 * Remove um serviço.
 */
async function excluir(req, res) {
    try {

        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const existente = await servicoModel.buscarPorId(id, empresaId);

        if (!existente) {
            return res.status(404).json({
                erro: "Serviço não encontrado."
            });
        }

        await servicoModel.excluir(id, empresaId);

        return res.status(200).json({
            mensagem: "Serviço removido com sucesso."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            erro: "Erro ao remover serviço."
        });
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    excluir
};