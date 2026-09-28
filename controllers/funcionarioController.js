"use strict";

/* ==================================================
   MODEL
================================================== */

const funcionarioModel = require("../models/funcionarioModel");

/* ==================================================
   LISTAR
================================================== */

async function index(request, response, next) {

    try {

        const funcionarios = await funcionarioModel.findAll(

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            data: funcionarios

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

        const funcionario = await funcionarioModel.findById(

            id,

            request.user.empresaId

        );

        if (!funcionario) {

            return response.status(404).json({

                success: false,

                message: "Funcionário não encontrado."

            });

        }

        return response.status(200).json({

            success: true,

            data: funcionario

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

        const funcionario = await funcionarioModel.create({

            ...request.body,

            empresaId: request.user.empresaId,

            foto: request.file?.path || null

        });

        return response.status(201).json({

            success: true,

            message: "Funcionário cadastrado com sucesso.",

            data: funcionario

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

        const funcionario = await funcionarioModel.update(

            id,

            {

                ...request.body,

                foto: request.file?.path || request.body.foto

            },

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Funcionário atualizado com sucesso.",

            data: funcionario

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

        await funcionarioModel.remove(

            id,

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Funcionário removido com sucesso."

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