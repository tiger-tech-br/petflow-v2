"use strict";

require("dotenv").config({ quiet: true });
const db = require("../database/connection");

const checks = [];
function check(name, passed, detail) {
    checks.push({ name, passed: Boolean(passed), detail });
}

async function main() {
    const required = [
        "JWT_SECRET", "APP_URL", "RESEND_API_KEY", "EMAIL_FROM",
        "PAGSEGURO_BASE_URL", "PAGSEGURO_TOKEN", "GOOGLE_MAPS_API_KEY",
        "GOOGLE_MAPS_BROWSER_API_KEY", "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"
    ];
    required.forEach(name => check(`Variavel ${name}`, Boolean(String(process.env[name] || "").trim()), "configurada"));
    check("JWT forte", String(process.env.JWT_SECRET || "").length >= 32, "minimo de 32 caracteres");
    if (process.env.NODE_ENV === "production") {
        check("APP_URL HTTPS", /^https:\/\//i.test(process.env.APP_URL || ""), "obrigatorio em producao");
        check("PagBank producao", !/sandbox/i.test(process.env.PAGSEGURO_BASE_URL || ""), "URL nao pode ser sandbox");
    }

    try {
        const { rows: tables } = await db.query(`
            SELECT to_regclass('public.schema_migrations') IS NOT NULL AS migrations,
                   to_regclass('public.auditoria_admin') IS NOT NULL AS auditoria,
                   to_regclass('public.reservas_estoque') IS NOT NULL AS reservas,
                   to_regclass('public.lgpd_solicitacoes') IS NOT NULL AS lgpd
        `);
        check("Conexao PostgreSQL", true, "conectado");
        check("Controle de migracoes", tables[0].migrations, "schema_migrations");
        check("Auditoria administrativa", tables[0].auditoria, "auditoria_admin");
        check("Reserva de estoque", tables[0].reservas, "reservas_estoque");
        check("Estrutura LGPD", tables[0].lgpd, "lgpd_solicitacoes");

        if (tables[0].migrations) {
            const { rows } = await db.query("SELECT nome FROM schema_migrations WHERE nome IN ('110_admin_profissional.sql','111_lgpd.sql')");
            const applied = new Set(rows.map(row => row.nome));
            check("Migracao administrativa", applied.has("110_admin_profissional.sql"), "110_admin_profissional.sql");
            check("Migracao LGPD", applied.has("111_lgpd.sql"), "111_lgpd.sql");
        }
        const { rows: catalog } = await db.query(`
            SELECT
              (SELECT COUNT(*)::int FROM empresas) AS empresas,
              (SELECT COUNT(*)::int FROM usuarios WHERE ativo=TRUE) AS admins,
              (SELECT COUNT(*)::int FROM produtos WHERE ativo=TRUE) AS produtos,
              (SELECT COUNT(*)::int FROM estoque e JOIN produtos p ON p.id=e.produto_id WHERE p.ativo=TRUE) AS estoques,
              (SELECT COUNT(*)::int FROM empresas
               WHERE NULLIF(TRIM(nome),'') IS NOT NULL AND NULLIF(TRIM(cnpj),'') IS NOT NULL
                 AND NULLIF(TRIM(telefone),'') IS NOT NULL AND NULLIF(TRIM(email),'') IS NOT NULL
                 AND NULLIF(TRIM(endereco),'') IS NOT NULL AND NULLIF(TRIM(numero),'') IS NOT NULL) AS empresas_completas
        `);
        check("Empresa cadastrada", catalog[0].empresas > 0, `${catalog[0].empresas} registro(s)`);
        check("Administrador ativo", catalog[0].admins > 0, `${catalog[0].admins} registro(s)`);
        check("Catalogo ativo", catalog[0].produtos > 0, `${catalog[0].produtos} produto(s)`);
        check("Estoque cadastrado", catalog[0].estoques >= catalog[0].produtos, `${catalog[0].estoques} estoque(s)`);
        let legalDetail = "nome, CNPJ, telefone, e-mail e endereço";
        if (!catalog[0].empresas_completas) {
            const { rows: legal } = await db.query(`
                SELECT ARRAY_REMOVE(ARRAY[
                    CASE WHEN NULLIF(TRIM(nome),'') IS NULL THEN 'nome' END,
                    CASE WHEN NULLIF(TRIM(cnpj),'') IS NULL THEN 'CNPJ' END,
                    CASE WHEN NULLIF(TRIM(telefone),'') IS NULL THEN 'telefone' END,
                    CASE WHEN NULLIF(TRIM(email),'') IS NULL THEN 'e-mail' END,
                    CASE WHEN NULLIF(TRIM(endereco),'') IS NULL THEN 'endereço' END,
                    CASE WHEN NULLIF(TRIM(numero),'') IS NULL THEN 'número' END
                ], NULL) AS pendentes FROM empresas LIMIT 1
            `);
            legalDetail = `pendente: ${(legal[0]?.pendentes || []).join(", ")}`;
        }
        check("Dados legais da loja", catalog[0].empresas_completas > 0, legalDetail);
    } catch (error) {
        check("Conexao PostgreSQL", false, error.code || error.message);
    }

    for (const item of checks) {
        console.log(`${item.passed ? "OK" : "FALHA"} - ${item.name}: ${item.detail}`);
    }
    const failed = checks.filter(item => !item.passed);
    console.log(`\n${checks.length - failed.length}/${checks.length} verificacoes aprovadas.`);
    if (failed.length) process.exitCode = 1;
}

main().finally(async () => {
    const { pool } = require("../config/db");
    await pool.end();
});
