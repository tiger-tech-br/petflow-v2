"use strict";

/* ==================================================
   JWT
================================================== */

const jwt = require("jsonwebtoken");

/* ==================================================
   ENV
================================================== */

const { JWT_SECRET } = require("../config/env");

/* ==================================================
   AUTENTICAÇÃO
================================================== */

function authMiddleware(request, response, next) {

    const authorization = request.headers.authorization;

    if (!authorization) {

        return response.status(401).json({

            success: false,

            message: "Token não informado."

        });

    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {

        return response.status(401).json({

            success: false,

            message: "Token inválido."

        });

    }

    try {

        const decoded = jwt.verify(

            token,

            JWT_SECRET

        );

        request.user = {
            ...decoded,
            empresaId: decoded.empresaId || decoded.empresa_id,
            empresa_id: decoded.empresa_id || decoded.empresaId,
            cargo: decoded.cargo || decoded.perfil,
            perfil: decoded.perfil || decoded.cargo
        };

        request.usuario = request.user;

        next();

    } catch (error) {

        return response.status(401).json({

            success: false,

            message: "Token expirado ou inválido."

        });

    }

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = authMiddleware;
