"use strict";
const crypto = require("node:crypto");
const db = require("../database/connection");
const { APP_URL } = require("../config/env");
const frete = require("../services/freteService");
const fail = (message, status) => Object.assign(new Error(message), { status });
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");

async function cotar(req, res, next) {
    try {
        let address = req.body?.endereco;
        if (!address && req.customer) {
            const { rows } = await db.query("SELECT * FROM clientes WHERE id=$1 AND empresa_id=$2", [req.customer.id, req.customer.empresaId]);
            if (!rows[0]) throw fail("Cliente não encontrado.", 404);
            address = rows[0];
        }
        if (!address) throw fail("Informe o CEP e o endereço para calcular a entrega.", 400);
        const validated = frete.validateAddress(address);
        res.set("Cache-Control", "no-store").json({ success: true, data: await frete.quote({ ...validated, ...(req.customer ? { id: req.customer.id } : {}) }) });
    } catch (e) { next(e); }
}
async function consultarCep(req, res, next) {
    try {
        res.set("Cache-Control", "no-store").json({ success: true, data: await frete.consultarCep(req.params.cep) });
    } catch (e) { next(e); }
}
async function criarLink(req, res, next) {
    try {
        if (!uuid(req.params.id)) throw fail("Pedido inválido.", 400);
        const token = crypto.randomBytes(32).toString("hex");
        await db.transaction(async client => {
            const { rows } = await client.query("SELECT status FROM vendas WHERE id=$1 AND empresa_id=$2 FOR UPDATE", [req.params.id, req.user.empresaId]);
            if (!rows[0]) throw fail("Pedido não encontrado.", 404);
            if (rows[0].status !== "SAIU_PARA_ENTREGA") throw fail("Marque o pedido como Saiu para entrega antes de gerar o link.", 409);
            await client.query(`INSERT INTO entrega_rastreamento (venda_id,token_hash,expira_em) VALUES ($1,$2,NOW()+INTERVAL '12 hours')
                ON CONFLICT (venda_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expira_em=EXCLUDED.expira_em,
                latitude=NULL,longitude=NULL,precisao_m=NULL,atualizado_em=NULL`, [req.params.id, hash(token)]);
        });
        res.set("Cache-Control", "no-store").json({ success: true, data: { url: `${APP_URL}/entregador#${token}` } });
    } catch (e) { next(e); }
}
function hash(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
async function localizacao(req, res, next) {
    try {
        const token = /^Bearer ([a-f0-9]{64})$/.exec(req.get("authorization") || "")?.[1];
        if (!token) throw fail("Link de entrega inválido.", 401);
        const stop = req.method === "DELETE";
        const { latitude, longitude, precisao } = req.body || {};
        if (!stop && (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(precisao) || precisao < 0 || precisao > 10000)) throw fail("Posição GPS inválida.", 400);
        await db.transaction(async client => {
            // Lock the order first, matching the status-change trigger's lock order.
            const { rows } = await client.query(`SELECT v.id FROM vendas v JOIN entrega_rastreamento r ON r.venda_id=v.id
                WHERE r.token_hash=$1 AND r.expira_em>NOW() AND v.status='SAIU_PARA_ENTREGA' FOR UPDATE OF v`, [hash(token)]);
            if (!rows[0]) throw fail("Link expirado ou entrega encerrada.", 410);
            if (stop) await client.query("DELETE FROM entrega_rastreamento WHERE venda_id=$1 AND token_hash=$2", [rows[0].id, hash(token)]);
            else {
                const result = await client.query(`UPDATE entrega_rastreamento SET latitude=$1,longitude=$2,precisao_m=$3,atualizado_em=NOW()
                    WHERE venda_id=$4 AND token_hash=$5 AND expira_em>NOW()`, [latitude,longitude,precisao,rows[0].id,hash(token)]);
                if (!result.rowCount) throw fail("Link expirado ou substituído.", 410);
            }
        });
        res.set("Cache-Control", "no-store").json({ success: true });
    } catch (e) { next(e); }
}
async function acompanhar(req, res, next) {
    try {
        if (!uuid(req.params.id)) throw fail("Pedido inválido.", 400);
        const { rows } = await db.query(`SELECT v.status,r.latitude,r.longitude,r.precisao_m,r.atualizado_em FROM vendas v
            LEFT JOIN entrega_rastreamento r ON r.venda_id=v.id AND r.expira_em>NOW() AND v.status='SAIU_PARA_ENTREGA'
            WHERE v.id=$1 AND v.cliente_id=$2 AND v.empresa_id=$3`, [req.params.id,req.customer.id,req.customer.empresaId]);
        if (!rows[0]) throw fail("Pedido não encontrado.", 404);
        res.set("Cache-Control", "no-store").json({ success: true, data: rows[0] });
    } catch (e) { next(e); }
}
module.exports = { cotar, consultarCep, criarLink, localizacao, acompanhar };
