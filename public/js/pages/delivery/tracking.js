"use strict";
(() => {
    const id = new URLSearchParams(location.search).get("pedido"), map = window.PetFlowDeliveryMap();
    const status = document.getElementById("trackingStatus"), updated = document.getElementById("trackingUpdated"), login = document.getElementById("trackingLogin");
    login.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
    let pending = false, ended = false;
    async function refresh() {
        if (pending || ended || document.hidden) return;
        const token = sessionStorage.getItem("petflow_customer_token");
        if (!token) { status.textContent = "Entre na conta usada na compra para rastrear seu pedido."; login.hidden = false; map.hide(); updated.textContent = ""; return; }
        if (!id) { status.textContent = "Pedido não informado."; return; }
        pending = true;
        try {
            const response = await fetch(`/api/public/pedidos/${encodeURIComponent(id)}/rastreamento`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
            const payload = await response.json();
            if (!response.ok) { login.hidden = response.status !== 401; throw new Error(payload.message || "Não foi possível consultar a entrega."); }
            login.hidden = true;
            const data = payload.data;
            if (data.status !== "SAIU_PARA_ENTREGA") {
                status.textContent = ["ENTREGUE","FINALIZADA"].includes(data.status) ? "Pedido entregue. Obrigado por comprar com a PetFlow!" : "Este pedido não está em rota de entrega. Consulte o status em Meus pedidos.";
                map.hide(); updated.textContent = ""; ended = ["ENTREGUE","FINALIZADA","CANCELADA"].includes(data.status); return;
            }
            if (data.latitude === null || data.longitude === null || !data.atualizado_em) {
                map.hide(); status.textContent = "Seu pedido saiu para entrega. Aguardando o entregador iniciar o GPS."; updated.textContent = ""; return;
            }
            const stale = Date.now() - new Date(data.atualizado_em).getTime() > 120000;
            status.textContent = stale ? "Sem atualização recente. O mapa mostra a última posição conhecida, não a posição atual." : "Entregador a caminho! Acompanhe o mapa e prepare-se para receber seu pedido.";
            updated.textContent = `${new Date(data.atualizado_em).toLocaleString("pt-BR")} · Precisão aproximada: ${Math.round(data.precisao_m)} m`;
            map.update(data);
        } catch (error) { status.textContent = `${error.message} A posição atual não pôde ser confirmada.`; map.hide(); updated.textContent = ""; }
        finally { pending = false; }
    }
    refresh(); setInterval(refresh,15000); document.addEventListener("visibilitychange",refresh);
})();
