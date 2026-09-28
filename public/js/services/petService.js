"use strict";

/* ==================================================
   PET SERVICE
================================================== */

const PetService = {

    /* ==============================================
       LISTAR
    ============================================== */

    async getAll() {

        return await apiGet(

            "/pets"

        );

    },

    /* ==============================================
       BUSCAR POR ID
    ============================================== */

    async getById(id) {

        return await apiGet(

            `/pets/${id}`

        );

    },

    /* ==============================================
       LISTAR PETS DO CLIENTE
    ============================================== */

    async getByClient(clientId) {

        return await apiGet(

            `/clientes/${clientId}/pets`

        );

    },

    /* ==============================================
       CADASTRAR
    ============================================== */

    async create(pet) {

        return await apiPost(

            "/pets",

            pet

        );

    },

    /* ==============================================
       ATUALIZAR
    ============================================== */

    async update(id, pet) {

        return await apiPut(

            `/pets/${id}`,

            pet

        );

    },

    /* ==============================================
       EXCLUIR
    ============================================== */

    async delete(id) {

        return await apiDelete(

            `/pets/${id}`

        );

    }

};