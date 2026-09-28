/*
==========================================================
 PETFLOW
 Arquivo: 043_historico_vacinas.sql
 Descrição: Histórico de vacinação dos pets.
==========================================================
*/

CREATE TABLE IF NOT EXISTS historico_vacinas (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pet_id UUID NOT NULL,

    vacina_id UUID NOT NULL,

    consulta_id UUID,

    usuario_id UUID,

    data_aplicacao DATE NOT NULL,

    proxima_dose DATE,

    lote VARCHAR(50),

    fabricante VARCHAR(100),

    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_historico_vacinas_pet
        FOREIGN KEY (pet_id)
        REFERENCES pets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_historico_vacinas_vacina
        FOREIGN KEY (vacina_id)
        REFERENCES vacinas(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historico_vacinas_consulta
        FOREIGN KEY (consulta_id)
        REFERENCES consultas(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_historico_vacinas_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_historico_vacinas_lote
        CHECK (
            lote IS NULL
            OR LENGTH(TRIM(lote)) > 0
        ),

    CONSTRAINT chk_historico_vacinas_fabricante
        CHECK (
            fabricante IS NULL
            OR LENGTH(TRIM(fabricante)) > 0
        ),

    CONSTRAINT chk_historico_vacinas_observacoes
        CHECK (
            observacoes IS NULL
            OR LENGTH(TRIM(observacoes)) > 0
        ),

    CONSTRAINT chk_historico_vacinas_proxima_dose
        CHECK (
            proxima_dose IS NULL
            OR proxima_dose >= data_aplicacao
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX IF NOT EXISTS idx_historico_vacinas_pet
ON historico_vacinas(pet_id);

CREATE INDEX IF NOT EXISTS idx_historico_vacinas_vacina
ON historico_vacinas(vacina_id);

CREATE INDEX IF NOT EXISTS idx_historico_vacinas_consulta
ON historico_vacinas(consulta_id);

CREATE INDEX IF NOT EXISTS idx_historico_vacinas_usuario
ON historico_vacinas(usuario_id);

CREATE INDEX IF NOT EXISTS idx_historico_vacinas_data
ON historico_vacinas(data_aplicacao);

CREATE INDEX IF NOT EXISTS idx_historico_vacinas_proxima_dose
ON historico_vacinas(proxima_dose);

/* ==========================================================
   TRIGGER
========================================================== */

DROP TRIGGER IF EXISTS trg_historico_vacinas_updated_at ON historico_vacinas;
CREATE TRIGGER trg_historico_vacinas_updated_at BEFORE UPDATE ON historico_vacinas FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();