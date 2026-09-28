"use strict";

/* ==================================================
   MODEL
================================================== */

const estoqueModel = require("../models/estoqueModel");

/* ==================================================
   LISTAR
================================================== */

async function index(request, response, next) {

    try {

        const estoque = await estoqueModel.findAll(

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            data: estoque

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   BUSCAR POR PRODUTO
================================================== */

async function show(request, response, next) {

    try {

        const { produtoId } = request.params;

        const estoque = await estoqueModel.findByProduct(

            produtoId,

            request.user.empresaId

        );

        if (!estoque) {

            return response.status(404).json({

                success: false,

                message: "Estoque não encontrado."

            });

        }

        return response.status(200).json({

            success: true,

            data: estoque

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

        const estoque = await estoqueModel.create({

            ...request.body,

            empresaId: request.user.empresaId

        });

        return response.status(201).json({

            success: true,

            message: "Estoque cadastrado com sucesso.",

            data: estoque

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

        const { produtoId } = request.params;

        const estoque = await estoqueModel.update(

            produtoId,

            request.body,

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Estoque atualizado com sucesso.",

            data: estoque

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

        const { produtoId } = request.params;

        await estoqueModel.remove(

            produtoId,

            request.user.empresaId

        );

        return response.status(200).json({

            success: true,

            message: "Registro de estoque removido com sucesso."

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