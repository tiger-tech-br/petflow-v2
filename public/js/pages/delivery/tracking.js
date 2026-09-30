"use strict";
(() => {
    const id = new URLSearchParams(location.search).get("pedido");
    const status = document.getElementById("trackingStatus"), updated = document.getElementById("trackingUpdated"), map = document.getElementById("deliveryMap"), link = document.getElementById("mapsLink");
    let pending = false, ended = false;
    async function refresh() {
        if (pending || ended || document.hidden) return;
        const token = sessionStorage.getItem("petflow_customer_token");
        if (!token) { status.textContent = "Entre na sua conta para acompanhar este pedido."; map.hidden = link.hidden = true; updated.textContent = ""; return; }
        if (!id) { status.textContent = "Pedido não informado."; return; }
        pending = true;
        try {
            const response = await fetch(`/api/public/pedidos/${encodeURIComponent(id)}/rastreamento`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "Não foi possível consultar a entrega.");
            const data = payload.data;
            if (data.status !== "SAIU_PARA_ENTREGA") { status.textContent = "Este pedido não está em rota de entrega. Consulte Meus pedidos para ver o status."; map.hidden = link.hidden = true; updated.textContent = ""; ended = true; return; }
            if (data.latitude === null || data.longitude === null || !data.atualizado_em) { status.textContent = "Aguardando o entregador compartilhar a localização."; map.hidden = link.hidden = true; updated.textContent = ""; return; }
            const stale = Date.now() - new Date(data.atualizado_em).getTime() > 120000;
            status.textContent = stale ? "Sem atualização recente. Esta é a última posição conhecida, não a posição atual." : "Entregador em rota. Última posição recebida:";
            updated.textContent = `${new Date(data.atualizado_em).toLocaleString("pt-BR")} · Precisão aproximada: ${Math.round(data.precisao_m)} m`;
            const lat = Number(data.latitude), lon = Number(data.longitude);
            const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent([lon-.005,lat-.005,lon+.005,lat+.005].join(","))}&layer=mapnik&marker=${lat},${lon}`;
            if (map.getAttribute("src") !== src) map.src = src;
            link.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            map.hidden = link.hidden = false;
        } catch (error) { status.textContent = `${error.message} A posição atual não pôde ser confirmada.`; map.hidden = link.hidden = true; updated.textContent = ""; }
        finally { pending = false; }
    }
    refresh(); setInterval(refresh,30000); document.addEventListener("visibilitychange",refresh);
})();
