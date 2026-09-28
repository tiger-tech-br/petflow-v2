"use strict";

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

function customerAuthMiddleware(request, response, next) {
    const authorization = request.headers.authorization;

    if (!authorization) {
        return response.status(401).json({
            success: false,
            message: "Faça login para continuar."
        });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return response.status(401).json({
            success: false,
            message: "Sessão inválida."
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== "customer") {
            return response.status(403).json({
                success: false,
                message: "Acesso exclusivo para clientes."
            });
        }

        request.customer = decoded;
        next();
    } catch {
        return response.status(401).json({
            success: false,
            message: "Sessão expirada. Faça login novamente."
        });
    }
}

module.exports = customerAuthMiddleware;
