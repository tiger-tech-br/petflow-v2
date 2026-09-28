"use strict";

const DashboardModel = require("../models/dashboardModel");

class DashboardService {

    /* ==============================================
       DASHBOARD COMPLETO
    ============================================== */

    static async obterDashboard(empresaId) {

        const [

            resumo,

            ultimasVendas,

            ultimasCompras,

            estoqueBaixo,

            agendamentosHoje,

            contasVencidas,

            produtosMaisVendidos,

            servicosMaisRealizados

        ] = await Promise.all([

            DashboardModel.resumo(empresaId),

            DashboardModel.ultimasVendas(empresaId),

            DashboardModel.ultimasCompras(empresaId),

            DashboardModel.estoqueBaixo(empresaId),

            DashboardModel.agendamentosHoje(empresaId),

            DashboardModel.contasVencidas(empresaId),

            DashboardModel.produtosMaisVendidos(empresaId),

            DashboardModel.servicosMaisRealizados(empresaId)

        ]);

        return {

            resumo,

            ultimasVendas,

            ultimasCompras,

            estoqueBaixo,

            agendamentosHoje,

            contasVencidas,

            produtosMaisVendidos,

            servicosMaisRealizados

        };

    }

    /* ==============================================
       RESUMO
    ============================================== */

    static async resumo(empresaId) {

        return DashboardModel.resumo(empresaId);

    }

    /* ==============================================
       VENDAS
    ============================================== */

    static async ultimasVendas(empresaId) {

        return DashboardModel.ultimasVendas(empresaId);

    }

    /* ==============================================
       COMPRAS
    ============================================== */

    static async ultimasCompras(empresaId) {

        return DashboardModel.ultimasCompras(empresaId);

    }

    /* ==============================================
       ESTOQUE BAIXO
    ============================================== */

    static async estoqueBaixo(empresaId) {

        return DashboardModel.estoqueBaixo(empresaId);

    }

    /* ==============================================
       AGENDAMENTOS
    ============================================== */

    static async agendamentosHoje(empresaId) {

        return DashboardModel.agendamentosHoje(empresaId);

    }

    /* ==============================================
       CONTAS VENCIDAS
    ============================================== */

    static async contasVencidas(empresaId) {

        return DashboardModel.contasVencidas(empresaId);

    }

    /* ==============================================
       PRODUTOS MAIS VENDIDOS
    ============================================== */

    static async produtosMaisVendidos(empresaId) {

        return DashboardModel.produtosMaisVendidos(empresaId);

    }

    /* ==============================================
       SERVIÇOS MAIS REALIZADOS
    ============================================== */

    static async servicosMaisRealizados(empresaId) {

        return DashboardModel.servicosMaisRealizados(empresaId);

    }

}

module.exports = DashboardService;