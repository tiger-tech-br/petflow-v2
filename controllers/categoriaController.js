"use strict";

/* ==================================================
   MODEL
================================================== */

const categoriaModel = require("../models/categoriaModel");

/* ==================================================
   LISTAR
================================================== */

async function index(request, response, next) {

    try {

        const categorias = await categoriaModel.findAll(

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            data: categorias

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

        const categoria = await categoriaModel.findById(

            id,

            request.user.empresaId

        );

        if (!categoria) {

            return response.status(404).json({

                success: false,

                message: "Categoria não encontrada."

            });

        }

        return response.status(200).json({

            success: true,

            data: categoria

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

        const categoria = await categoriaModel.create({

            ...request.body,

            empresaId: request.user.empresaId

        });

        return response.status(201).json({

            success: true,

            message: "Categoria cadastrada com sucesso.",

            data: categoria

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

        const categoria = await categoriaModel.update(

            id,

            request.body,

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Categoria atualizada com sucesso.",

            data: categoria

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   REMOVER
================================================== */

async function destroy(request, response, next) {

    try {

        const { id } = request.params;

        await categoriaModel.remove(

            id,

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Categoria removida com sucesso."

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