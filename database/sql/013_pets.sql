/*
==========================================================
 PETFLOW
 Arquivo: 013_pets.sql
 Descrição: Cadastro dos pets dos clientes.
==========================================================
*/

CREATE TABLE IF NOT EXISTS pets (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cliente_id UUID NOT NULL,

    nome VARCHAR(100) NOT NULL,

    especie VARCHAR(30) NOT NULL,

    raca VARCHAR(100),

    sexo VARCHAR(10)
        CHECK (
            sexo IN (
                'MACHO',
                'FEMEA'
            )
        ),

    data_nascimento DATE,

    peso DECIMAL(5,2),

    cor VARCHAR(60),

    porte VARCHAR(15)
        CHECK (
            porte IN (
                'PEQUENO',
                'MEDIO',
                'GRANDE'
            )
        ),

    castrado BOOLEAN NOT NULL DEFAULT FALSE,

    microchip VARCHAR(50),

    alergias TEXT,

    observacoes TEXT,

    foto TEXT,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pets_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_pet_nome
        CHECK (LENGTH(TRIM(nome)) > 0),

    CONSTRAINT chk_pet_especie
        CHECK (LENGTH(TRIM(especie)) > 0),

    CONSTRAINT chk_pet_peso
        CHECK (
            peso IS NULL
            OR peso >= 0
        )
);

ALTER TABLE pets ADD COLUMN IF NOT EXISTS raca VARCHAR(100);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS sexo VARCHAR(10);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS peso DECIMAL(5,2);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS cor VARCHAR(60);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS porte VARCHAR(15);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS castrado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS microchip VARCHAR(50);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS alergias TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX IF NOT EXISTS idx_pets_cliente
ON pets(cliente_id);

CREATE INDEX IF NOT EXISTS idx_pets_nome
ON pets(nome);

CREATE INDEX IF NOT EXISTS idx_pets_especie
ON pets(especie);

CREATE INDEX IF NOT EXISTS idx_pets_raca
ON pets(raca);

CREATE INDEX IF NOT EXISTS idx_pets_porte
ON pets(porte);

/* ==========================================================
   TRIGGER
========================================================== */

DROP TRIGGER IF EXISTS trg_pets_updated_at ON pets;
CREATE TRIGGER trg_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();