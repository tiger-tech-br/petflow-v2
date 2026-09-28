"use strict";

/* ==================================================
   MODEL
================================================== */

const agendamentoModel = require("../models/agendamentoModel");

/* ==================================================
   LISTAR
================================================== */

async function index(request, response, next) {

    try {

        const agendamentos = await agendamentoModel.findAll(

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            data: agendamentos

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

        const agendamento = await agendamentoModel.findById(

            id,

            request.user.empresaId

        );

        if (!agendamento) {

            return response.status(404).json({

                success: false,

                message: "Agendamento não encontrado."

            });

        }

        return response.status(200).json({

            success: true,

            data: agendamento

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

        const agendamento = await agendamentoModel.create({

            ...request.body,

            empresaId: request.user.empresaId

        });

        return response.status(201).json({

            success: true,

            message: "Agendamento realizado com sucesso.",

            data: agendamento

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

        const agendamento = await agendamentoModel.update(

            id,

            request.body,

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Agendamento atualizado com sucesso.",

            data: agendamento

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

        await agendamentoModel.remove(

            id,

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Agendamento removido com sucesso."

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