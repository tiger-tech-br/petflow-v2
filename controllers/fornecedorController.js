"use strict";

const fornecedorModel = require("../models/fornecedorModel");

async function listar(req, res) {
    try {
        const empresaId = req.user.empresaId;

        const fornecedores = await fornecedorModel.listar(empresaId);

        return res.status(200).json(fornecedores);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Erro ao listar fornecedores."
        });
    }
}

async function buscarPorId(req, res) {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const fornecedor = await fornecedorModel.buscarPorId(id, empresaId);

        if (!fornecedor) {
            return res.status(404).json({
                erro: "Fornecedor não encontrado."
            });
        }

        return res.status(200).json(fornecedor);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Erro ao buscar fornecedor."
        });
    }
}

async function criar(req, res) {
    try {
        const empresaId = req.user.empresaId;

        const {
            nome,
            cnpj,
            telefone,
            email,
            endereco
        } = req.body;

        if (!nome) {
            return res.status(400).json({
                erro: "Nome é obrigatório."
            });
        }

        const fornecedor = await fornecedorModel.criar({
            empresa_id: empresaId,
            nome,
            cnpj,
            telefone,
            email,
            endereco
        });

        return res.status(201).json(fornecedor);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Erro ao cadastrar fornecedor."
        });
    }
}

async function atualizar(req, res) {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const {
            nome,
            cnpj,
            telefone,
            email,
            endereco
        } = req.body;

        const fornecedor = await fornecedorModel.atualizar(
            id,
            empresaId,
            {
                nome,
                cnpj,
                telefone,
                email,
                endereco
            }
        );

        if (!fornecedor) {
            return res.status(404).json({
                erro: "Fornecedor não encontrado."
            });
        }

        return res.status(200).json(fornecedor);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Erro ao atualizar fornecedor."
        });
    }
}

async function excluir(req, res) {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const fornecedor = await fornecedorModel.excluir(id, empresaId);

        if (!fornecedor) {
            return res.status(404).json({
                erro: "Fornecedor não encontrado."
            });
        }

        return res.status(200).json({
            mensagem: "Fornecedor excluído com sucesso."
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Erro ao excluir fornecedor."
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