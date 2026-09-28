"use strict";

/* ==================================================
   EXPRESS
================================================== */

const express = require("express");

const router = express.Router();

/* ==================================================
   CONTROLLER
================================================== */

const funcionarioController = require("../controllers/funcionarioController");

/* ==================================================
   MIDDLEWARES
================================================== */

const authMiddleware = require("../middlewares/authMiddleware");

const roleMiddleware = require("../middlewares/roleMiddleware");

const validationMiddleware = require("../middlewares/validationMiddleware");

const upload = require("../middlewares/uploadMiddleware");

/* ==================================================
   EXPRESS VALIDATOR
================================================== */

const {

    body,

    param

} = require("express-validator");

/* ==================================================
   VALIDAÇÃO
================================================== */

const funcionarioValidation = [

    body("nome")

        .trim()

        .notEmpty()

        .withMessage("O nome é obrigatório.")

        .isLength({

            min: 3,

            max: 100

        })

        .withMessage("O nome deve possuir entre 3 e 100 caracteres."),

    body("email")

        .trim()

        .isEmail()

        .withMessage("Informe um e-mail válido."),

    body("telefone")

        .trim()

        .notEmpty()

        .withMessage("Informe o telefone."),

    body("cargo")

        .trim()

        .notEmpty()

        .withMessage("Informe o cargo.")

];

/* ==================================================
   ID
================================================== */

const idValidation = [

    param("id")

        .isUUID()

        .withMessage("ID inválido.")

];

/* ==================================================
   LISTAR
================================================== */

router.get(

    "/",

    authMiddleware,

    roleMiddleware(

        "ADMIN"

    ),

    funcionarioController.index

);

/* ==================================================
   BUSCAR
================================================== */

router.get(

    "/:id",

    authMiddleware,

    roleMiddleware(

        "ADMIN"

    ),

    idValidation,

    validationMiddleware,

    funcionarioController.show

);

/* ==================================================
   CADASTRAR
================================================== */

router.post(

    "/",

    authMiddleware,

    roleMiddleware(

        "ADMIN"

    ),

    upload.single("foto"),

    funcionarioValidation,

    validationMiddleware,

    funcionarioController.store

);

/* ==================================================
   ATUALIZAR
================================================== */

router.put(

    "/:id",

    authMiddleware,

    roleMiddleware(

        "ADMIN"

    ),

    upload.single("foto"),

    idValidation,

    funcionarioValidation,

    validationMiddleware,

    funcionarioController.update

);

/* ==================================================
   REMOVER
================================================== */

router.delete(

    "/:id",

    authMiddleware,

    roleMiddleware(

        "ADMIN"

    ),

    idValidation,

    validationMiddleware,

    funcionarioController.destroy

);

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = router;
