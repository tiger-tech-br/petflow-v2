"use strict";

/* ==================================================
   FUNCIONÁRIO SERVICE
================================================== */

const FuncionarioService = {

    /* ==============================================
       LISTAR
    ============================================== */

    async getAll() {

        return await apiGet(

            "/funcionarios"

        );

    },

    /* ==============================================
       BUSCAR POR ID
    ============================================== */

    async getById(id) {

        return await apiGet(

            `/funcionarios/${id}`

        );

    },

    /* ==============================================
       CADASTRAR
    ============================================== */

    async create(funcionario) {

        return await apiPost(

            "/funcionarios",

            funcionario

        );

    },

    /* ==============================================
       ATUALIZAR
    ============================================== */

    async update(id, funcionario) {

        return await apiPut(

            `/funcionarios/${id}`,

            funcionario

        );

    },

    /* ==============================================
       ALTERAR STATUS
    ============================================== */

    async changeStatus(id, status) {

        return await apiPut(

            `/funcionarios/${id}/status`,

            {

                status

            }

        );

    },

    /* ==============================================
       LISTAR ATIVOS
    ============================================== */

    async getActive() {

        return await apiGet(

            "/funcionarios/ativos"

        );

    },

    /* ==============================================
       EXCLUIR
    ============================================== */

    async delete(id) {

        return await apiDelete(

            `/funcionarios/${id}`

        );

    }

};