"use strict";
const { validateAddress } = require("./freteService");
const fail = (message, status = 503) => Object.assign(new Error(message), { status });
const validPoint = point => Number.isFinite(point?.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point?.longitude) && Math.abs(point.longitude) <= 180;

async function calcularRota(position, destination) {
    if (!validPoint(position)) throw fail("Compartilhe uma posição GPS válida antes de calcular a rota.", 409);
    const address = validateAddress(destination);
    const key = process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    if (!key) throw fail("A loja ainda não configurou as rotas da entrega.");
    let response, payload;
    try {
        response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
            method: "POST", signal: AbortSignal.timeout(10000),
            headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation" },
            body: JSON.stringify({ origin: { location: { latLng: { latitude: position.latitude, longitude: position.longitude } } },
                destination: { address: [address.endereco,address.numero,address.bairro,address.cidade,address.estado,address.cep,"Brasil"].join(", ") },
                travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", languageCode: "pt-BR", units: "METRIC" })
        });
        payload = await response.json();
    } catch { throw fail("Não foi possível consultar a rota. O GPS continua compartilhando a posição."); }
    const route = payload?.routes?.[0], start = route?.legs?.[0]?.startLocation?.latLng, end = route?.legs?.at(-1)?.endLocation?.latLng;
    if (!response.ok || !route?.polyline?.encodedPolyline || !validPoint(start) || !validPoint(end)) {
        throw fail("Rota indisponível. Confira o endereço da entrega e a configuração da Routes API.");
    }
    return { tipoOrigem: "GPS_ENTREGADOR", polyline: route.polyline.encodedPolyline, origem: start, destino: end, distanciaMetros: route.distanceMeters, duracao: route.duration, calculadaEm: new Date().toISOString() };
}
module.exports = { calcularRota };
