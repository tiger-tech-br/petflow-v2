"use strict";

/* ==================================================
   MODEL
================================================== */

const empresaModel = require("../models/empresaModel");

/* ==================================================
   BUSCAR EMPRESA
================================================== */

async function show(request, response, next) {

    try {

        const empresa = await empresaModel.findById(

            request.user.empresaId

        );

        if (!empresa) {

            return response.status(404).json({

                success: false,

                message: "Empresa não encontrada."

            });

        }

        return response.status(200).json({

            success: true,

            data: empresa

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

        const empresa = await empresaModel.update(

            request.user.empresaId,

            {

                ...request.body,

                logo: request.file?.path || request.body.logo

            }

        );

        return response.status(200).json({

            success: true,

            message: "Empresa atualizada com sucesso.",

            data: empresa

        });

    } catch (error) {

        next(error);

    }

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    show,

    update

};