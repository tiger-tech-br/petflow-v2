"use strict";
(() => {
    const token = location.hash.slice(1);
    const start = document.getElementById("startGps"), stop = document.getElementById("stopGps"), status = document.getElementById("gpsStatus");
    let timer, running = false, pending = false;
    if (!/^[a-f0-9]{64}$/.test(token)) { start.disabled = true; status.textContent = "Link inválido. Peça um novo link à loja."; return; }
    async function publish() {
        if (!running || pending) return;
        pending = true;
        try {
            const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }));
            if (!running) return;
            const response = await fetch("/api/public/entregas/localizacao", {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
                body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, precisao: position.coords.accuracy })
            });
            const payload = await response.json();
            if (!response.ok) {
                if ([401,410].includes(response.status)) { running = false; clearInterval(timer); start.disabled = true; stop.disabled = true; status.textContent = payload.message || "Entrega encerrada. Peça outro link à loja."; }
                throw new Error(payload.message || "Não foi possível compartilhar a localização.");
            }
            if (running) status.textContent = `Localização enviada às ${new Date().toLocaleTimeString("pt-BR")}. Precisão aproximada: ${Math.round(position.coords.accuracy)} m.`;
        } catch (error) {
            if (!running) return;
            if (error.code === 1) { running = false; clearInterval(timer); start.disabled = false; }
            status.textContent = error.code === 1 ? "Localização não autorizada. Libere a permissão no navegador e toque em Iniciar." : error.code === 2 || error.code === 3 ? "Não foi possível obter o GPS. Confira o sinal; tentaremos novamente." : error.message;
        } finally { pending = false; }
    }
    start.addEventListener("click", () => {
        if (!navigator.geolocation || !window.isSecureContext) { status.textContent = "O GPS requer navegador compatível e acesso por HTTPS."; return; }
        running = true; start.disabled = true; stop.disabled = false;
        status.textContent = "Obtendo sua localização...";
        publish(); timer = setInterval(publish, 30000);
    });
    stop.addEventListener("click", async () => {
        running = false; clearInterval(timer); start.disabled = true;
        try {
            const response = await fetch("/api/public/entregas/localizacao", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
            if (!response.ok && response.status !== 410) throw new Error();
            stop.disabled = true; status.textContent = "Compartilhamento encerrado. A última posição foi removida. Para reiniciar, peça um novo link à loja.";
            history.replaceState(null, "", location.pathname);
        } catch { status.textContent = "GPS parado neste celular, mas não conseguimos encerrar o link no servidor. Confira a internet e toque em Parar novamente."; }
    });
})();
