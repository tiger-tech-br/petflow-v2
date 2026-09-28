"use strict";

/* ==================================================
   MIDDLEWARE DE ERRO
================================================== */

function errorMiddleware(error, request, response, next) {

    console.error(error);

    const status = error.status || 500;

    const message = error.message || "Erro interno do servidor.";

    return response.status(status).json({

        success: false,

        message,

        ...(process.env.NODE_ENV === "development" && {

            stack: error.stack

        })

    });

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = errorMiddleware;