"use strict";

const express = require("express");

const publicCatalogController = require("../controllers/publicCatalogController");
const publicOrderController = require("../controllers/publicOrderController");
const publicCustomerController = require("../controllers/publicCustomerController");
const newsletterController = require("../controllers/newsletterController");
const customerAuthMiddleware = require("../middlewares/customerAuthMiddleware");

const router = express.Router();
const entregaController = require("../controllers/entregaController");
const freteLimiter = require("express-rate-limit")({ windowMs: 60000, limit: 6, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Aguarde um minuto antes de calcular novamente." } });
router.post("/frete/cotar", customerAuthMiddleware, freteLimiter, entregaController.cotar);
router.get("/pedidos/:id/rastreamento", customerAuthMiddleware, entregaController.acompanhar);
router.post("/entregas/localizacao", entregaController.localizacao);
router.delete("/entregas/localizacao", entregaController.localizacao);
const verificationLimiter = require("express-rate-limit")({
    windowMs: 15 * 60 * 1000, limit: 5,
    standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Aguarde alguns minutos antes de solicitar outro e-mail." }
});

router.get("/produtos", publicCatalogController.produtos);
router.get("/categorias", publicCatalogController.categorias);
router.post("/newsletter", newsletterController.subscribe);
router.get("/newsletter/cancelar", newsletterController.unsubscribe);
router.post("/clientes/cadastro", publicCustomerController.register);
router.post("/clientes/reenviar-confirmacao", verificationLimiter, publicCustomerController.resendVerification);
router.post("/clientes/login", publicCustomerController.login);
router.get("/clientes/verificar-email", publicCustomerController.verifyEmail);
router.post("/clientes/verificar-email", publicCustomerController.verifyEmail);
router.post("/clientes/esqueci-senha", publicCustomerController.forgotPassword);
router.post("/clientes/redefinir-senha", publicCustomerController.resetPassword);
router.get("/clientes/me", customerAuthMiddleware, publicCustomerController.me);
router.put("/clientes/me", customerAuthMiddleware, publicCustomerController.update);
router.delete("/clientes/me", customerAuthMiddleware, publicCustomerController.remove);
router.get("/clientes/pedidos", customerAuthMiddleware, publicCustomerController.orders);
router.get("/clientes/notificacoes", customerAuthMiddleware, publicCustomerController.notifications);
router.patch("/clientes/notificacoes/lidas", customerAuthMiddleware, publicCustomerController.markNotificationRead);
router.patch("/clientes/notificacoes/:id/lida", customerAuthMiddleware, publicCustomerController.markNotificationRead);
router.post("/pedidos", customerAuthMiddleware, publicOrderController.criarPedido);

module.exports = router;
