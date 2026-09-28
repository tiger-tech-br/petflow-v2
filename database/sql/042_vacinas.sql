/*
==========================================================
 PETFLOW
 Arquivo: 042_vacinas.sql
 Descrição: Cadastro das vacinas disponíveis no sistema.
==========================================================
*/

CREATE TABLE IF NOT EXISTS vacinas (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nome VARCHAR(150) NOT NULL UNIQUE,

    fabricante VARCHAR(150),

    descricao TEXT,

    intervalo_dias INTEGER,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_vacina_nome
        CHECK (
            LENGTH(TRIM(nome)) > 0
        ),

    CONSTRAINT chk_vacina_intervalo
        CHECK (
            intervalo_dias IS NULL
            OR intervalo_dias > 0
        )
);

/* ==========================================================
   TRIGGER
========================================================== */

DROP TRIGGER IF EXISTS trg_vacinas_updated_at ON vacinas;
CREATE TRIGGER trg_vacinas_updated_at BEFORE UPDATE ON vacinas FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();