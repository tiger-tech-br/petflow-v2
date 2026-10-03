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
    function positionMarker(map, navigation) {
        // Ícone com tamanho fixo em pixels, ancorado às coordenadas reais recebidas.
        class PositionMarker extends google.maps.OverlayView {
            constructor() { super(); this.position = null; this.heading = null; this.setMap(map); }
            onAdd() {
                this.element = document.createElement("div");
                this.element.className = navigation ? "delivery-driver-marker" : "delivery-vehicle-marker";
                this.element.setAttribute("role", "img");
                this.element.setAttribute("aria-label", "Última posição do entregador");
                this.element.title = navigation ? "Sua posição GPS" : "Entregador";
                this.icon = document.createElement("img");
                this.icon.src = navigation ? "/images/icons/delivery-arrow.svg" : "/images/icons/delivery-car.svg";
                this.icon.alt = ""; this.icon.width = this.icon.height = navigation ? 44 : 56;
                this.element.appendChild(this.icon);
                if (navigation) this.setHeading(this.heading);
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
            setHeading(heading) {
                this.heading = heading;
                if (!navigation || !this.icon) return;
                this.icon.hidden = false;
                this.icon.style.transform = `rotate(${heading ?? 0}deg)`;
            }
            onRemove() { this.element?.remove(); this.element = null; }
        }
        return new PositionMarker();
    }
    function movementHeading(previous, current, precision) {
        if (!previous) return null;
        const radians = value => value * Math.PI / 180;
        const lat1 = radians(previous.lat), lat2 = radians(current.lat), delta = radians(current.lng - previous.lng);
        const a = Math.sin((lat2-lat1)/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(delta/2)**2;
        const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0,1-a)));
        if (distance < Math.max(5, Number(precision) || 0)) return null;
        return (Math.atan2(Math.sin(delta)*Math.cos(lat2), Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(delta)) * 180 / Math.PI + 360) % 360;
    }
    window.PetFlowDeliveryMap = function ({ mode = "tracking" } = {}) {
        const navigation = mode === "driver";
        const element = document.getElementById("deliveryMap"), message = document.getElementById("mapStatus");
        const recenter = navigation ? document.getElementById("recenterMap") : null;
        const showRoute = navigation ? document.getElementById("showFullRoute") : null;
        let map, driver, origin, destination, route, accuracy, lastPolyline, lastDestination, routeBounds, version = 0;
        let currentPosition, previousPosition, heading = null, following = false, overview = true;
        function resizeMarkers() {
            if (!map || !currentPosition) return;
            const metersPerPixel = 156543.03392 * Math.cos(currentPosition.lat * Math.PI / 180) / 2 ** map.getZoom();
            destination.setRadius(metersPerPixel * 9);
            origin?.setRadius(metersPerPixel * 7);
        }
        function followPosition() {
            if (!map || !currentPosition || element.hidden) return false;
            following = true; overview = false; map.setZoom(17); map.panTo(currentPosition); return true;
        }
        recenter?.addEventListener("click", followPosition);
        showRoute?.addEventListener("click", () => {
            if (!map || !routeBounds || element.hidden) return;
            following = false; overview = true; map.fitBounds(routeBounds, 40);
        });
        return {
            follow: followPosition,
            hide() { version++; element.hidden = true; message.textContent = ""; previousPosition = null; heading = null; following = false; overview = true; if (recenter) recenter.hidden = true; if (showRoute) showRoute.hidden = true; },
            async update(data) {
                const current = ++version, address = data.endereco_entrega;
                const originElement = document.getElementById("originAddress");
                const destinationText = address ? [address.endereco,address.numero,address.complemento,address.bairro,address.cidade,address.estado,address.cep].filter(Boolean).join(", ") : "";
                document.getElementById("destinationAddress").textContent = destinationText ? `Destino: ${destinationText}` : "Endereço da entrega não disponível.";
                const hasPosition = data.latitude != null && data.longitude != null;
                const endpoint = data.rota?.tipoOrigem === "GPS_ENTREGADOR" ? data.rota.destino : null;
                const hasDestination = Number.isFinite(endpoint?.latitude) && Number.isFinite(endpoint?.longitude);
                const startpoint = data.rota?.origem;
                const hasRoute = Boolean(navigation && hasDestination && data.rota.polyline && Number.isFinite(startpoint?.latitude) && Number.isFinite(startpoint?.longitude));
                if (originElement) originElement.textContent = hasPosition ? (navigation ? "Partida: posição GPS usada no último cálculo da rota." : "Localização do entregador: última posição GPS recebida.") : "Aguardando a localização do entregador.";
                if (!hasPosition) { element.hidden = true; if (recenter) recenter.hidden = true; if (showRoute) showRoute.hidden = true; message.textContent = "Aguardando o entregador compartilhar o GPS para mostrar o mapa."; return; }
                try {
                    message.textContent = "Carregando mapa...";
                    await loadMaps();
                    if (current !== version) return;
                    element.hidden = false;
                    const position = { lat: Number(data.latitude), lng: Number(data.longitude) };
                    currentPosition = position;
                    if (!map) {
                        map = new google.maps.Map(element, { center: currentPosition, zoom: navigation ? 17 : 16, streetViewControl: false, mapTypeControl: false,
                            ...(navigation ? { styles: [{elementType:"geometry",stylers:[{color:"#20384c"}]},{elementType:"labels.text.fill",stylers:[{color:"#bbc9d7"}]},{elementType:"labels.text.stroke",stylers:[{color:"#20384c"}]},{featureType:"road",elementType:"geometry",stylers:[{color:"#587187"}]},{featureType:"water",elementType:"geometry",stylers:[{color:"#10283b"}]}] } : {}) });
                        accuracy = new google.maps.Circle({ map, strokeOpacity: 0, fillColor: navigation ? "#2464d9" : "#00897b", fillOpacity: .1 });
                        driver = positionMarker(map, navigation);
                        destination = new google.maps.Circle({ map, radius: 14, fillColor: "#e97814", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3, zIndex: 2 });
                        if (navigation) {
                            origin = new google.maps.Circle({ map, radius: 12, fillColor: "#16834b", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3, zIndex: 2 });
                            route = new google.maps.Polyline({ map, strokeColor: "#2464d9", strokeOpacity: .8, strokeWeight: 5 });
                        }
                        map.addListener("zoom_changed", resizeMarkers);
                        if (navigation) map.addListener("dragstart", () => { following = false; overview = false; });
                    }
                    if (navigation) {
                        const nextHeading = Number.isFinite(data.heading) ? (data.heading % 360 + 360) % 360 : movementHeading(previousPosition, position, data.precisao_m);
                        if (nextHeading !== null) heading = nextHeading;
                        driver.setHeading(heading); previousPosition = position;
                        if (following) map.panTo(position);
                        if (recenter) recenter.hidden = false;
                    }
                    driver.setPosition(position); accuracy.setCenter(currentPosition); accuracy.setRadius(hasPosition ? Math.max(0, Number(data.precisao_m) || 0) : 0);
                    destination.setVisible(hasDestination);
                    const destinationPosition = hasDestination ? { lat: endpoint.latitude, lng: endpoint.longitude } : null;
                    if (hasDestination) destination.setCenter(destinationPosition);
                    if (navigation) {
                        origin.setVisible(hasRoute);
                        if (hasRoute) origin.setCenter({ lat: startpoint.latitude, lng: startpoint.longitude });
                        else { route.setPath([]); lastPolyline = null; routeBounds = null; }
                        if (showRoute) showRoute.hidden = !hasRoute;
                    }
                    resizeMarkers();
                    const routeChanged = hasRoute && lastPolyline !== data.rota.polyline;
                    if (routeChanged) {
                        const path = google.maps.geometry.encoding.decodePath(data.rota.polyline);
                        route.setPath(path);
                        lastPolyline = data.rota.polyline;
                    }
                    if (hasRoute) {
                        routeBounds = new google.maps.LatLngBounds();
                        route.getPath().forEach(point => routeBounds.extend(point));
                        routeBounds.extend({ lat: startpoint.latitude, lng: startpoint.longitude });
                        routeBounds.extend(destinationPosition); routeBounds.extend(position);
                        if (overview && (routeChanged || !map.getBounds()?.contains(position))) map.fitBounds(routeBounds, 40);
                    }
                    if (!navigation && hasDestination && lastDestination !== JSON.stringify(destinationPosition)) {
                        const bounds = new google.maps.LatLngBounds(); bounds.extend(position); bounds.extend(destinationPosition);
                        map.fitBounds(bounds, 40); lastDestination = JSON.stringify(destinationPosition);
                    }
                    message.textContent = navigation
                        ? `Seta azul: sua posição GPS · Verde: partida da rota · Laranja: destino. ${hasRoute ? "Siga a linha azul da rota." : "Aguardando a rota até o destino."} ${heading === null ? "Aguardando a primeira direção do GPS; a seta está voltada para cima." : "Sem uma nova direção, a seta mantém a última direção conhecida."}`
                        : `Carrinho: última posição recebida do entregador. ${hasDestination ? "Ponto laranja: endereço da entrega." : "Aguardando a localização do endereço da entrega."}`;
                } catch (error) { if (current === version) { element.hidden = true; if (recenter) recenter.hidden = true; if (showRoute) showRoute.hidden = true; message.textContent = error.message; } }
            }
        };
    };
})();
