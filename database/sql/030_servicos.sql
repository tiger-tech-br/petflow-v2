/*
==========================================================
 PETFLOW
 Arquivo: 030_servicos.sql
 Descrição: Serviços oferecidos pelo PetFlow.
==========================================================
*/

CREATE TABLE IF NOT EXISTS servicos (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nome VARCHAR(100) NOT NULL UNIQUE,

    descricao TEXT,

    duracao_minutos INTEGER NOT NULL,

    preco NUMERIC(10,2) NOT NULL,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_servico_nome
        CHECK (LENGTH(TRIM(nome)) > 0),

    CONSTRAINT chk_servico_duracao
        CHECK (duracao_minutos > 0),

    CONSTRAINT chk_servico_preco
        CHECK (preco >= 0)
);

/* ==========================================================
   TRIGGER
========================================================== */

DROP TRIGGER IF EXISTS trg_servicos_updated_at ON servicos;
CREATE TRIGGER trg_servicos_updated_at BEFORE UPDATE ON servicos FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();