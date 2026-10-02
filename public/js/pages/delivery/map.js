"use strict";
(() => {
    let loading;
    function loadMaps() {
        if (!loading) loading = (async () => {
            const response = await fetch("/api/public/entregas/mapa-config", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload.data?.browserKey) throw new Error("O mapa ainda não foi configurado pela loja. O GPS pode continuar compartilhando a posição.");
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error("O Google Maps demorou para carregar. Atualize a página para tentar novamente.")), 20000);
                window.petflowMapsReady = () => { clearTimeout(timer); resolve(); };
                window.gm_authFailure = () => {
                    clearTimeout(timer);
                    document.getElementById("mapStatus").textContent = "O Google recusou o mapa. A loja precisa conferir a chave do navegador, o domínio e a Maps JavaScript API.";
                    reject(new Error("A configuração do Google Maps precisa ser revisada pela loja."));
                };
                const script = document.createElement("script");
                const params = new URLSearchParams({ key: payload.data.browserKey, loading: "async", libraries: "geometry", callback: "petflowMapsReady", language: "pt-BR", v: "weekly" });
                script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
                script.referrerPolicy = "strict-origin-when-cross-origin";
                script.onerror = () => { clearTimeout(timer); reject(new Error("Não foi possível carregar o Google Maps. Confira sua conexão.")); };
                document.head.appendChild(script);
            });
        })();
        return loading;
    }
    window.PetFlowDeliveryMap = function () {
        const element = document.getElementById("deliveryMap"), message = document.getElementById("mapStatus"), link = document.getElementById("mapsLink");
        let map, driver, destination, route, accuracy, lastPolyline, version = 0;
        let currentPosition;
        function resizeMarkers() {
            const metersPerPixel = 156543.03392 * Math.cos(currentPosition.lat * Math.PI / 180) / 2 ** map.getZoom();
            driver.setRadius(metersPerPixel * 8); destination.setRadius(metersPerPixel * 9);
        }
        return {
            hide() { version++; element.hidden = true; link.hidden = true; message.textContent = ""; },
            async update(data) {
                const current = ++version, address = data.endereco_entrega;
                const destinationText = address ? [address.endereco,address.numero,address.complemento,address.bairro,address.cidade,address.estado,address.cep].filter(Boolean).join(", ") : "";
                document.getElementById("destinationAddress").textContent = destinationText ? `Destino: ${destinationText}` : "Endereço da entrega não disponível.";
                const hasPosition = data.latitude != null && data.longitude != null;
                if (destinationText) {
                    const params = new URLSearchParams({ api: "1", destination: destinationText, travelmode: "driving" });
                    if (hasPosition) params.set("origin", `${data.latitude},${data.longitude}`);
                    link.href = `https://www.google.com/maps/dir/?${params}`; link.hidden = false;
                }
                if (!hasPosition) { element.hidden = true; return; }
                try {
                    message.textContent = "Carregando mapa...";
                    await loadMaps();
                    if (current !== version) return;
                    element.hidden = false;
                    const position = { lat: Number(data.latitude), lng: Number(data.longitude) };
                    currentPosition = position;
                    if (!map) {
                        map = new google.maps.Map(element, { center: position, zoom: 16, streetViewControl: false, mapTypeControl: false });
                        accuracy = new google.maps.Circle({ map, strokeOpacity: 0, fillColor: "#00897b", fillOpacity: .1 });
                        driver = new google.maps.Circle({ map, radius: 12, fillColor: "#00897b", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3, zIndex: 3 });
                        destination = new google.maps.Circle({ map, radius: 14, fillColor: "#e97814", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3, zIndex: 2 });
                        route = new google.maps.Polyline({ map, strokeColor: "#2464d9", strokeOpacity: .8, strokeWeight: 5 });
                        map.addListener("zoom_changed", resizeMarkers);
                    }
                    driver.setCenter(position); accuracy.setCenter(position); accuracy.setRadius(Math.max(0, Number(data.precisao_m) || 0));
                    resizeMarkers();
                    if (data.rota?.polyline && lastPolyline !== data.rota.polyline) {
                        const path = google.maps.geometry.encoding.decodePath(data.rota.polyline);
                        route.setPath(path); destination.setCenter({ lat: data.rota.destino.latitude, lng: data.rota.destino.longitude });
                        const bounds = new google.maps.LatLngBounds(); path.forEach(point => bounds.extend(point)); bounds.extend(position);
                        map.fitBounds(bounds, 40); lastPolyline = data.rota.polyline;
                    }
                    message.textContent = data.rota ? "Verde: entregador · Laranja: destino · Azul: rota pelas ruas. A rota é uma referência e pode mudar durante a viagem." : "Posição do entregador. Aguardando a rota até o destino.";
                } catch (error) { if (current === version) { element.hidden = true; message.textContent = error.message; } }
            }
        };
    };
})();
