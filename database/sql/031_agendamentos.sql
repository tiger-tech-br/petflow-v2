/*
==========================================================
 PETFLOW
 Arquivo: 031_agendamentos.sql
 Descrição: Agendamento de serviços do PetFlow.
==========================================================
*/

CREATE TABLE IF NOT EXISTS agendamentos (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cliente_id UUID NOT NULL,

    pet_id UUID NOT NULL,

    servico_id UUID NOT NULL,

    usuario_id UUID,

    data_agendamento DATE NOT NULL,

    horario TIME NOT NULL,

    valor NUMERIC(10,2) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'AGENDADO'
        CHECK (
            status IN (
                'AGENDADO',
                'CONFIRMADO',
                'EM_ANDAMENTO',
                'CONCLUIDO',
                'CANCELADO',
                'FALTOU'
            )
        ),

    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agendamentos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_agendamentos_pet
        FOREIGN KEY (pet_id)
        REFERENCES pets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_agendamentos_servico
        FOREIGN KEY (servico_id)
        REFERENCES servicos(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_agendamentos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_agendamento_valor
        CHECK (valor >= 0),

    CONSTRAINT chk_agendamento_observacoes
        CHECK (
            observacoes IS NULL
            OR LENGTH(TRIM(observacoes)) > 0
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente
ON agendamentos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_pet
ON agendamentos(pet_id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_servico
ON agendamentos(servico_id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario
ON agendamentos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data
ON agendamentos(data_agendamento);

CREATE INDEX IF NOT EXISTS idx_agendamentos_status
ON agendamentos(status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data_horario
ON agendamentos(data_agendamento, horario);

/* ==========================================================
   TRIGGER
========================================================== */

DROP TRIGGER IF EXISTS trg_agendamentos_updated_at ON agendamentos;
CREATE TRIGGER trg_agendamentos_updated_at BEFORE UPDATE ON agendamentos FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();