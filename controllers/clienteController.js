"use strict";

/* ==================================================
   MODEL
================================================== */

const clienteModel = require("../models/clienteModel");

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

        const cliente = await clienteModel.update(

            id,

            request.body,

            request.user.empresaId

        );

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

        await clienteModel.remove(

            id,

            request.user.empresaId

        );

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