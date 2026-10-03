"use strict";

/* ==================================================
   MODEL
================================================== */

const clienteModel = require("../models/clienteModel");
const audit = require("../services/auditService");

/* ==================================================
   LISTAR
================================================== */

async function index(request, response, next) {

    try {

        const clientes = await clienteModel.findAll(

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            data: clientes

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   BUSCAR POR ID
================================================== */

async function show(request, response, next) {

    try {

        const { id } = request.params;

        const cliente = await clienteModel.findById(

            id,

            request.user.empresaId

        );

        if (!cliente) {

            return response.status(404).json({

                success: false,

                message: "Cliente não encontrado."

            });

        }

        return response.status(200).json({

            success: true,

            data: cliente

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

        const cliente = await clienteModel.create({

            ...request.body,

            empresaId: request.user.empresaId

        });

        await audit.registrar({ ...audit.requestMeta(request), acao: "CRIAR", entidade: "CLIENTE",
            entidadeId: cliente.id, descricao: `Cliente ${cliente.nome} cadastrado pelo painel.` });

        return response.status(201).json({

            success: true,

            message: "Cliente cadastrado com sucesso.",

            data: cliente

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

        const { id } = request.params;

        const anterior = await clienteModel.findById(id, request.user.empresaId);
        if (!anterior) return response.status(404).json({ success: false, message: "Cliente não encontrado." });

        const cliente = await clienteModel.update(

            id,

            request.body,

            request.user.empresaId

        );

        await audit.registrar({ ...audit.requestMeta(request), acao: "EDITAR", entidade: "CLIENTE",
            entidadeId: id, descricao: `Cadastro de ${cliente.nome} atualizado pelo painel.` });

        return response.status(200).json({

            success: true,

            message: "Cliente atualizado com sucesso.",

            data: cliente

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   EXCLUIR
================================================== */

async function destroy(request, response, next) {

    try {

        const { id } = request.params;

        const anterior = await clienteModel.findById(id, request.user.empresaId);
        if (!anterior) return response.status(404).json({ success: false, message: "Cliente não encontrado." });

        await clienteModel.remove(

            id,

            request.user.empresaId

        );

        await audit.registrar({ ...audit.requestMeta(request), acao: "DESATIVAR", entidade: "CLIENTE",
            entidadeId: id, descricao: `Cadastro de ${anterior.nome} desativado pelo painel.` });

        return response.status(200).json({

            success: true,

            message: "Cliente removido com sucesso."

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
