"use strict";

/* ==================================================
   MIDDLEWARE DE ERRO
================================================== */

function errorMiddleware(error, request, response, next) {

    const candidate = error.status || error.statusCode;
    const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;

    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
        console.error(error);
    } else {
        console.error("[erro] Falha na requisição.", {
            status,
            code: error.code || "UNKNOWN",
            method: request.method,
            path: request.originalUrl || request.url
        });
    }

    const message = status >= 500 && process.env.NODE_ENV === "production"
        ? "Erro interno do servidor. Tente novamente em alguns minutos."
        : (error.message || "Erro interno do servidor.");

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
