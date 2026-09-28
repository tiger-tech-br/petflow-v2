"use strict";

/**
 * ==========================================================
 * PetFlow
 * Rotas de Serviços
 * ==========================================================
 */

const express = require("express");
const router = express.Router();

const servicoController = require("../controllers/servicoController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

/**
 * Listar serviços
 */
router.get(
    "/",
    authMiddleware,
    roleMiddleware("ADMIN", "FUNCIONARIO"),
    servicoController.listar
);

/**
 * Buscar serviço por ID
 */
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("ADMIN", "FUNCIONARIO"),
    servicoController.buscarPorId
);

/**
 * Cadastrar serviço
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware("ADMIN"),
    servicoController.criar
);

/**
 * Atualizar serviço
 */
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("ADMIN"),
    servicoController.atualizar
);

/**
 * Excluir serviço
 */
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("ADMIN"),
    servicoController.excluir
);

module.exports = router;
