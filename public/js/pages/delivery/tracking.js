"use strict";
(() => {
    const id = new URLSearchParams(location.search).get("pedido"), map = window.PetFlowDeliveryMap();
    const status = document.getElementById("trackingStatus"), updated = document.getElementById("trackingUpdated"), login = document.getElementById("trackingLogin");
    const admin = location.pathname === "/admin/acompanhar-entrega";
    const endpoint = admin ? "/api/vendas" : "/api/public/pedidos";
    login.href = admin ? "/admin/index.html" : `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
    if (admin) {
        document.title = "PetFlow | Acompanhar entrega";
        document.getElementById("trackingTitle").textContent = "Acompanhar entrega";
        const back = document.getElementById("trackingBack");
        back.href = `/admin/pages/vendas/vendas.html${id ? `?pedido=${encodeURIComponent(id)}` : ""}`;
        back.textContent = "← Voltar ao pedido";
        document.getElementById("trackingDescription").textContent = "Veja o GPS do entregador e a rota até o cliente. Atualizamos a posição a cada 15 segundos enquanto esta página estiver visível. Esta tela apenas acompanha a entrega.";
        login.textContent = "Entrar no painel administrativo";
    }
    let pending = false, ended = false;
    async function refresh() {
        if (pending || ended || document.hidden) return;
        const token = sessionStorage.getItem(admin ? "token" : "petflow_customer_token");
        if (!token) { status.textContent = admin ? "Entre no painel administrativo para acompanhar a entrega." : "Entre na conta usada na compra para rastrear seu pedido."; login.hidden = false; map.hide(); updated.textContent = ""; return; }
        if (!id) { status.textContent = "Pedido não informado."; return; }
        pending = true;
        try {
            const response = await fetch(`${endpoint}/${encodeURIComponent(id)}/rastreamento`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
            const payload = await response.json();
            if (!response.ok) { login.hidden = response.status !== 401; throw new Error(payload.message || "Não foi possível consultar a entrega."); }
            login.hidden = true;
            const data = payload.data;
            if (data.status !== "SAIU_PARA_ENTREGA") {
                status.textContent = ["ENTREGUE","FINALIZADA"].includes(data.status) ? (admin ? "Pedido entregue. Rastreamento encerrado." : "Pedido entregue. Obrigado por comprar com a PetFlow!") : `Este pedido não está em rota de entrega. Consulte o status ${admin ? "no painel de pedidos" : "em Meus pedidos"}.`;
                map.hide(); updated.textContent = ""; ended = ["ENTREGUE","FINALIZADA","CANCELADA"].includes(data.status); return;
            }
            if (data.latitude === null || data.longitude === null || !data.atualizado_em) {
                map.hide(); status.textContent = "Pedido saiu para entrega. Aguardando o entregador compartilhar o GPS."; updated.textContent = ""; return;
            }
            const stale = Date.now() - new Date(data.atualizado_em).getTime() > 120000;
            status.textContent = stale ? "Sem atualização recente. O mapa mostra a última posição conhecida, não a posição atual." : (admin ? "Entregador a caminho. Acompanhe a posição e a rota até o cliente no mapa." : "Entregador a caminho! Acompanhe o mapa e prepare-se para receber seu pedido.");
            updated.textContent = `${new Date(data.atualizado_em).toLocaleString("pt-BR")} · Precisão aproximada: ${Math.round(data.precisao_m)} m`;
            map.update(data);
        } catch (error) { status.textContent = `${error.message} A posição atual não pôde ser confirmada.`; map.hide(); updated.textContent = ""; }
        finally { pending = false; }
    }
    refresh(); setInterval(refresh,15000); document.addEventListener("visibilitychange",refresh);
})();
