"use strict";
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const quoteSecret = crypto.createHmac("sha256", JWT_SECRET).update("petflow/frete/v1").digest();
const DEFAULT_ORIGIN = "Avenida Novo Horizonte, 123, Vila Sacadura Cabral, Santo André, SP, Brasil";
const addressFields = ["endereco", "numero", "complemento", "bairro", "cidade", "estado", "cep"];
const error = (message, status = 400) => Object.assign(new Error(message), { status });

function addressSnapshot(customer) {
    return Object.fromEntries(addressFields.map(key => [key, String(customer[key] || "").trim()]));
}
function origin() { return process.env.DELIVERY_ORIGIN_ADDRESS?.trim() || DEFAULT_ORIGIN; }
function fingerprint(customer) {
    return crypto.createHash("sha256").update(JSON.stringify([origin(), addressSnapshot(customer)])).digest("hex");
}
function priceForDistance(meters) {
    if (!Number.isInteger(meters) || meters < 0) throw error("Distância de entrega inválida.");
    return Math.max(0, Math.ceil((meters - 1000) / 1000)) * 3;
}
async function quote(customer) {
    const address = addressSnapshot(customer);
    if (!["endereco", "numero", "bairro", "cidade", "estado", "cep"].every(key => address[key])) {
        throw error("Complete seu endereço e CEP em Minha conta antes de calcular o frete.");
    }
    const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (!key) throw error("O cálculo de frete está temporariamente indisponível. Entre em contato com a loja.", 503);
    let response, payload;
    try {
        response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
            method: "POST", signal: AbortSignal.timeout(10000),
            headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "routes.distanceMeters" },
            body: JSON.stringify({ origin: { address: origin() }, destination: { address: [...addressFields.filter(k => k !== "complemento").map(k => address[k]), "Brasil"].filter(Boolean).join(", ") }, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", languageCode: "pt-BR", units: "METRIC" })
        });
        payload = await response.json();
    } catch {
        throw error("Não foi possível calcular o frete agora. Tente novamente.", 503);
    }
    if (!response.ok) {
        console.error("[frete] Google Routes indisponível", { status: response.status });
        throw error("Não foi possível calcular o frete agora. Tente novamente.", 503);
    }
    const meters = payload?.routes?.[0]?.distanceMeters;
    if (!Number.isInteger(meters) || meters < 0) throw error("Não encontramos uma rota. Confira o endereço e o CEP da entrega.", 422);
    const token = jwt.sign({ sub: customer.id, address: fingerprint(customer), meters }, quoteSecret, { algorithm: "HS256", audience: "frete", expiresIn: "15m" });
    return { token, distanciaMetros: meters, valor: priceForDistance(meters), expiraEm: new Date(Date.now() + 900000).toISOString() };
}
function verifyQuote(token, customer) {
    let decoded;
    try { decoded = jwt.verify(token, quoteSecret, { algorithms: ["HS256"], audience: "frete" }); }
    catch { throw error("Calcule novamente o frete antes de finalizar o pedido.", 409); }
    if (decoded.sub !== customer.id || decoded.address !== fingerprint(customer)) throw error("O endereço mudou. Calcule novamente o frete.", 409);
    return { valor: priceForDistance(decoded.meters), distanciaMetros: decoded.meters, endereco: addressSnapshot(customer) };
}
module.exports = { quote, verifyQuote, priceForDistance, addressSnapshot };
