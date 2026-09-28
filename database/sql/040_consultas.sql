/*
==========================================================
 PETFLOW
 Arquivo: 040_consultas.sql
 Descrição: Consultas veterinárias dos pets.
==========================================================
*/

CREATE TABLE IF NOT EXISTS consultas (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pet_id UUID NOT NULL,

    cliente_id UUID NOT NULL,

    usuario_id UUID,

    data_consulta DATE NOT NULL,

    horario TIME NOT NULL,

    peso NUMERIC(5,2),

    temperatura NUMERIC(4,1),

    motivo_consulta TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'AGENDADA'
        CHECK (
            status IN (
                'AGENDADA',
                'EM_ANDAMENTO',
                'CONCLUIDA',
                'CANCELADA'
            )
        ),

    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_consultas_pet
        FOREIGN KEY (pet_id)
        REFERENCES pets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_consultas_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_consultas_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_consulta_peso
        CHECK (
            peso IS NULL
            OR peso >= 0
        ),

    CONSTRAINT chk_consulta_temperatura
        CHECK (
            temperatura IS NULL
            OR (
                temperatura >= 20
                AND temperatura <= 50
            )
        ),

    CONSTRAINT chk_consulta_motivo
        CHECK (
            LENGTH(TRIM(motivo_consulta)) > 0
        ),

    CONSTRAINT chk_consulta_observacoes
        CHECK (
            observacoes IS NULL
            OR LENGTH(TRIM(observacoes)) > 0
        )
);

ALTER TABLE consultas ADD COLUMN IF NOT EXISTS pet_id UUID;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS data_consulta DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS horario TIME NOT NULL DEFAULT CURRENT_TIME;
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS peso NUMERIC(5,2);
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS temperatura NUMERIC(4,1);
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS motivo_consulta TEXT NOT NULL DEFAULT 'Consulta veterinaria';
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'AGENDADA';
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS observacoes TEXT;

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX IF NOT EXISTS idx_consultas_pet
ON consultas(pet_id);

CREATE INDEX IF NOT EXISTS idx_consultas_cliente
ON consultas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_consultas_usuario
ON consultas(usuario_id);

CREATE INDEX IF NOT EXISTS idx_consultas_data
ON consultas(data_consulta);

CREATE INDEX IF NOT EXISTS idx_consultas_status
ON consultas(status);

CREATE INDEX IF NOT EXISTS idx_consultas_data_horario
ON consultas(data_consulta, horario);

/* ==========================================================
   TRIGGER
========================================================== */

DROP TRIGGER IF EXISTS trg_consultas_updated_at ON consultas;
CREATE TRIGGER trg_consultas_updated_at BEFORE UPDATE ON consultas FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();