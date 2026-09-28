"use strict";

/* ==================================================
   AGENDAMENTO SERVICE
================================================== */

const AgendamentoService = {

    /* ==============================================
       LISTAR
    ============================================== */

    async getAll() {

        return await apiGet(

            "/agendamentos"

        );

    },

    /* ==============================================
       BUSCAR POR ID
    ============================================== */

    async getById(id) {

        return await apiGet(

            `/agendamentos/${id}`

        );

    },

    /* ==============================================
       LISTAR POR CLIENTE
    ============================================== */

    async getByClient(clienteId) {

        return await apiGet(

            `/agendamentos/cliente/${clienteId}`

        );

    },

    /* ==============================================
       LISTAR POR PET
    ============================================== */

    async getByPet(petId) {

        return await apiGet(

            `/agendamentos/pet/${petId}`

        );

    },

    /* ==============================================
       CADASTRAR
    ============================================== */

    async create(agendamento) {

        return await apiPost(

            "/agendamentos",

            agendamento

        );

    },

    /* ==============================================
       ATUALIZAR
    ============================================== */

    async update(id, agendamento) {

        return await apiPut(

            `/agendamentos/${id}`,

            agendamento

        );

    },

    /* ==============================================
       CANCELAR
    ============================================== */

    async cancel(id) {

        return await apiPut(

            `/agendamentos/${id}/cancelar`,

            {}

        );

    },

    /* ==============================================
       CONCLUIR
    ============================================== */

    async finish(id) {

        return await apiPut(

            `/agendamentos/${id}/concluir`,

            {}

        );

    },

    /* ==============================================
       EXCLUIR
    ============================================== */

    async delete(id) {

        return await apiDelete(

            `/agendamentos/${id}`

        );

    }

};