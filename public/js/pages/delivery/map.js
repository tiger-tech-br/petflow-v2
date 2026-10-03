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
    function vehicleMarker(map) {
        // Ícone com tamanho fixo em pixels, ancorado às coordenadas reais recebidas.
        class Vehicle extends google.maps.OverlayView {
            constructor() { super(); this.position = null; this.setMap(map); }
            onAdd() {
                this.element = document.createElement("div");
                this.element.className = "delivery-vehicle-marker";
                this.element.setAttribute("role", "img");
                this.element.setAttribute("aria-label", "Última posição do entregador");
                this.element.title = "Entregador";
                const icon = document.createElement("img");
                icon.src = "/images/icons/delivery-car.svg"; icon.alt = ""; icon.width = icon.height = 56;
                this.element.appendChild(icon);
                this.getPanes().overlayMouseTarget.appendChild(this.element);
                this.draw();
            }
            draw() {
                if (!this.element) return;
                const projection = this.getProjection();
                const point = this.position && projection?.fromLatLngToDivPixel(new google.maps.LatLng(this.position));
                this.element.hidden = !point;
                if (point) { this.element.style.left = `${point.x}px`; this.element.style.top = `${point.y}px`; }
            }
            setPosition(position) { this.position = position; this.draw(); }
            onRemove() { this.element?.remove(); this.element = null; }
        }
        return new Vehicle();
    }
    window.PetFlowDeliveryMap = function () {
        const element = document.getElementById("deliveryMap"), message = document.getElementById("mapStatus");
        let map, driver, destination, route, accuracy, lastPolyline, version = 0;
        let currentPosition;
        function resizeMarkers() {
            const metersPerPixel = 156543.03392 * Math.cos(currentPosition.lat * Math.PI / 180) / 2 ** map.getZoom();
            destination.setRadius(metersPerPixel * 9);
        }
        return {
            hide() { version++; element.hidden = true; message.textContent = ""; },
            async update(data) {
                const current = ++version, address = data.endereco_entrega;
                const originElement = document.getElementById("originAddress");
                const destinationText = address ? [address.endereco,address.numero,address.complemento,address.bairro,address.cidade,address.estado,address.cep].filter(Boolean).join(", ") : "";
                document.getElementById("destinationAddress").textContent = destinationText ? `Destino: ${destinationText}` : "Endereço da entrega não disponível.";
                const hasPosition = data.latitude != null && data.longitude != null;
                const hasRoute = Boolean(data.rota?.tipoOrigem === "GPS_ENTREGADOR" && data.rota.polyline && data.rota.origem && data.rota.destino);
                if (originElement) originElement.textContent = hasPosition ? "Saída da navegação: última posição GPS recebida do entregador." : "Aguardando a localização do entregador.";
                if (!hasPosition) { element.hidden = true; message.textContent = "Aguardando o entregador compartilhar o GPS para mostrar o mapa e a rota."; return; }
                try {
                    message.textContent = "Carregando mapa...";
                    await loadMaps();
                    if (current !== version) return;
                    element.hidden = false;
                    const position = { lat: Number(data.latitude), lng: Number(data.longitude) };
                    currentPosition = position;
                    if (!map) {
                        map = new google.maps.Map(element, { center: currentPosition, zoom: 16, streetViewControl: false, mapTypeControl: false });
                        accuracy = new google.maps.Circle({ map, strokeOpacity: 0, fillColor: "#00897b", fillOpacity: .1 });
                        driver = vehicleMarker(map);
                        destination = new google.maps.Circle({ map, radius: 14, fillColor: "#e97814", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3, zIndex: 2 });
                        route = new google.maps.Polyline({ map, strokeColor: "#2464d9", strokeOpacity: .8, strokeWeight: 5 });
                        map.addListener("zoom_changed", resizeMarkers);
                    }
                    driver.setPosition(position); accuracy.setCenter(currentPosition); accuracy.setRadius(hasPosition ? Math.max(0, Number(data.precisao_m) || 0) : 0);
                    destination.setVisible(hasRoute);
                    if (hasRoute) {
                        destination.setCenter({ lat: data.rota.destino.latitude, lng: data.rota.destino.longitude });
                    } else {
                        route.setPath([]); lastPolyline = null;
                    }
                    resizeMarkers();
                    if (hasRoute && lastPolyline !== data.rota.polyline) {
                        const path = google.maps.geometry.encoding.decodePath(data.rota.polyline);
                        route.setPath(path);
                        const bounds = new google.maps.LatLngBounds(); path.forEach(point => bounds.extend(point));
                        bounds.extend({ lat: data.rota.origem.latitude, lng: data.rota.origem.longitude });
                        bounds.extend({ lat: data.rota.destino.latitude, lng: data.rota.destino.longitude });
                        if (position) bounds.extend(position);
                        map.fitBounds(bounds, 40); lastPolyline = data.rota.polyline;
                    }
                    message.textContent = hasRoute ? "Carrinho: última posição recebida do entregador · Laranja: cliente · Azul: rota calculada a partir do GPS do entregador." : "Carrinho: última posição recebida do entregador. Aguardando a rota até o destino.";
                } catch (error) { if (current === version) { element.hidden = true; message.textContent = error.message; } }
            }
        };
    };
})();
