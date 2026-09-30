"use strict";
const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const envPath = require.resolve("../config/env");
require.cache[envPath] = { exports: { RESEND_API_KEY: "re_test", EMAIL_FROM: "PetFlow <sender@example.com>", APP_URL: "https://example.com" } };
const email = require("../services/emailService");
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test("Resend recebe remetente, conteúdo e chave de idempotência", async () => {
    global.fetch = async (url, options) => {
        assert.equal(url, "https://api.resend.com/emails");
        assert.equal(options.headers["Idempotency-Key"], "verification/test");
        assert.equal(JSON.parse(options.body).from, "PetFlow <sender@example.com>");
        assert.equal(JSON.parse(options.body).to, "customer@example.com");
        assert.ok(options.signal);
        return { ok: true, json: async () => ({ id: "email-test" }) };
    };
    assert.deepEqual(await email.sendEmail({ to: "customer@example.com", subject: "Teste", text: "Teste", idempotencyKey: "verification/test" }), { id: "email-test" });
});

test("falhas do provedor retornam 503 e diagnóstico sem conteúdo sensível", async () => {
    for (const [status, message, code] of [
        [401, "API key is invalid", "invalid_api_key"],
        [403, "The domain is not verified", "domain_not_verified"],
        [403, "You can only send testing emails to your own email address", "test_sender_restricted"],
        [429, "Too many requests", "rate_or_quota_limit"],
        [500, "Internal error", "http_500"]
    ]) {
        global.fetch = async () => ({ ok: false, status, json: async () => ({ message }) });
        await assert.rejects(email.sendEmail({}), error => error.status === 503 && error.code === code && !error.message.includes(message));
    }
});

test("timeout, rede e respostas inválidas não viram sucesso", async () => {
    for (const name of ["TimeoutError", "TypeError"]) {
        global.fetch = async () => { throw Object.assign(new Error("private data"), { name }); };
        await assert.rejects(email.sendEmail({}), { status: 503, code: name === "TimeoutError" ? "timeout" : "network_error" });
    }
    global.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new Error("HTML"); } });
    await assert.rejects(email.sendEmail({}), { status: 503, code: "http_502" });
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
    await assert.rejects(email.sendEmail({}), { status: 503, code: "invalid_provider_response" });
});

test("email opcional não desfaz pedido quando o provedor falha", async () => {
    global.fetch = async () => { throw new Error("offline"); };
    assert.equal(await email.sendOptionalEmail({}), null);
});

test("middleware respeita statusCode dos erros de validação de pedidos", () => {
    const middleware = require("../middlewares/errorMiddleware");
    let status;
    const response = { status(value) { status = value; return this; }, json(value) { return value; } };
    middleware({ statusCode: 400, message: "Quantidade inválida" }, {}, response);
    assert.equal(status, 400);
    middleware({ statusCode: 999, message: "Erro" }, {}, response);
    assert.equal(status, 500);
});
