"use strict";

const { Pool } = require("pg");
const { buildDbOptions } = require("../config/dbOptions");

require("dotenv").config();

const pool = new Pool(buildDbOptions());

const categories = [
    ["Rações", "Alimentos secos e úmidos para cães, gatos e pets especiais."],
    ["Petiscos", "Snacks, bifinhos e recompensas para rotina de treino."],
    ["Higiene", "Produtos de banho, limpeza, tapetes e cuidados diários."],
    ["Acessórios", "Coleiras, guias, brinquedos, camas e transporte."],
    ["Farmácia Pet", "Suplementos, antipulgas e itens de saúde animal."]
];

const services = [
    ["Banho", "Banho completo com shampoo profissional.", 59.9, 60],
    ["Tosa higiênica", "Acabamento de patas, barriga e região íntima.", 49.9, 45],
    ["Tosa completa", "Tosa personalizada por porte e tipo de pelagem.", 89.9, 90],
    ["Consulta veterinária", "Avaliação clínica com veterinário.", 129.9, 40],
    ["Vacinação", "Aplicação e registro de vacina.", 99.9, 30],
    ["Hotelzinho", "Diária supervisionada para cães.", 79.9, 480]
];

const products = [
    ["Rações", "Ração Canis Prime Adultos 10kg", "Alimento premium para cães adultos.", "CANIS-PRIME-10KG", "PetFlow Prime", 189.9, 128.5, 18, "/images/products/petflow-prime-racao.jpg"],
    ["Rações", "Ração Felis Prime Gatos Castrados 7,5kg", "Alimento premium para gatos castrados.", "FELIS-CAST-75", "PetFlow Prime", 169.9, 112.3, 14, "/images/products/felis-prime-racao.jpg"],
    ["Petiscos", "Bifinho Natural Frango 500g", "Petisco macio para cães de todos os portes.", "BIF-FRANGO-500", "Fred Snacks", 34.9, 18.7, 32, "/images/products/fredbites-petiscos.jpg"],
    ["Higiene", "Shampoo Neutro Pelos Sensíveis 500ml", "Shampoo suave para banho profissional ou doméstico.", "SHA-NEUTRO-500", "FlowCare", 42.9, 21.4, 24, "/images/products/pelozen-shampoo.jpg"],
    ["Higiene", "Tapete Higiênico Ultra Absorção 30un", "Tapete higiênico com controle de odor.", "TAP-ULTRA-30", "FlowCare", 69.9, 38.2, 20, "/images/products/ultrapad-30.jpg"],
    ["Acessórios", "Coleira Ajustável Fred Azul", "Coleira confortável com regulagem reforçada.", "COL-FRED-AZUL", "Fred Design", 39.9, 16.5, 26, "/images/products/fred10-coleira.jpg"],
    ["Acessórios", "Brinquedo Mordedor Dental", "Brinquedo para estímulo e higiene oral.", "MOR-DENTAL-01", "PetJoy", 29.9, 11.8, 30, "/images/products/petjoy-dental.jpg"],
    ["Farmácia Pet", "Suplemento Ômega Pet 60 cápsulas", "Suplemento para pele e pelagem.", "OMEGA-PET-60", "VitaPet", 54.9, 29.6, 12, "/images/products/vitapet-care-kit.jpg"]
];

async function run() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { rows: [{ id: empresaId }] } = await client.query(
            "SELECT get_petflow_empresa_id() AS id"
        );

        const categoryIds = new Map();

        for (const [nome, descricao] of categories) {
            const { rows } = await client.query(
                `
                    INSERT INTO categorias (empresa_id, nome, descricao, status, ativo)
                    VALUES ($1, $2, $3, TRUE, TRUE)
                    ON CONFLICT (nome)
                    DO UPDATE SET
                        descricao = EXCLUDED.descricao,
                        status = TRUE,
                        ativo = TRUE,
                        updated_at = NOW()
                    RETURNING id;
                `,
                [empresaId, nome, descricao]
            );

            categoryIds.set(nome, rows[0].id);
        }

        await client.query(
            `
                INSERT INTO fornecedores (
                    empresa_id,
                    nome,
                    razao_social,
                    nome_fantasia,
                    cnpj,
                    telefone,
                    email,
                    endereco,
                    ativo
                )
                VALUES (
                    $1,
                    'PetNutri Distribuidora',
                    'PetNutri Distribuidora LTDA',
                    'PetNutri',
                    '12.345.678/0001-90',
                    '(11) 4002-2020',
                    'comercial@petnutri.example',
                    'Rua dos Fornecedores, 120',
                    TRUE
                )
                ON CONFLICT (cnpj)
                DO UPDATE SET
                    nome = EXCLUDED.nome,
                    razao_social = EXCLUDED.razao_social,
                    telefone = EXCLUDED.telefone,
                    email = EXCLUDED.email,
                    updated_at = NOW();
            `,
            [empresaId]
        );

        for (const [nome, descricao, preco, duracao] of services) {
            await client.query(
                `
                    INSERT INTO servicos (empresa_id, nome, descricao, preco, duracao, duracao_minutos, ativo)
                    VALUES ($1, $2, $3, $4, $5, $5, TRUE)
                    ON CONFLICT (nome)
                    DO UPDATE SET
                        descricao = EXCLUDED.descricao,
                        preco = EXCLUDED.preco,
                        duracao = EXCLUDED.duracao,
                        duracao_minutos = EXCLUDED.duracao_minutos,
                        ativo = TRUE,
                        updated_at = NOW();
                `,
                [empresaId, nome, descricao, preco, duracao]
            );
        }

        for (const [categoria, nome, descricao, sku, marca, preco, custo, quantidade, foto] of products) {
            const categoriaId = categoryIds.get(categoria);
            const { rows } = await client.query(
                `
                    INSERT INTO produtos (
                        empresa_id,
                        categoria_id,
                        nome,
                        descricao,
                        sku,
                        marca,
                        preco,
                        custo,
                        preco_venda,
                        preco_custo,
                        foto,
                        status,
                        ativo
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8, $9, TRUE, TRUE)
                    ON CONFLICT (sku)
                    DO UPDATE SET
                        categoria_id = EXCLUDED.categoria_id,
                        nome = EXCLUDED.nome,
                        descricao = EXCLUDED.descricao,
                        marca = EXCLUDED.marca,
                        preco = EXCLUDED.preco,
                        custo = EXCLUDED.custo,
                        preco_venda = EXCLUDED.preco_venda,
                        preco_custo = EXCLUDED.preco_custo,
                        foto = EXCLUDED.foto,
                        status = TRUE,
                        ativo = TRUE,
                        updated_at = NOW()
                    RETURNING id;
                `,
                [empresaId, categoriaId, nome, descricao, sku, marca, preco, custo, foto]
            );

            await client.query(
                `
                    INSERT INTO estoque (
                        empresa_id,
                        produto_id,
                        quantidade,
                        estoque_minimo,
                        estoque_maximo,
                        localizacao
                    )
                    VALUES ($1, $2, $3, 5, 60, 'Prateleira principal')
                    ON CONFLICT (empresa_id, produto_id)
                    DO UPDATE SET
                        quantidade = EXCLUDED.quantidade,
                        estoque_minimo = EXCLUDED.estoque_minimo,
                        estoque_maximo = EXCLUDED.estoque_maximo,
                        localizacao = EXCLUDED.localizacao,
                        updated_at = NOW();
                `,
                [empresaId, rows[0].id, quantidade]
            );
        }

        await client.query("COMMIT");
        console.log("Catalogo inicial criado com sucesso.");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((error) => {
    console.error("Erro ao criar catalogo inicial.");
    console.error(error);
    process.exit(1);
});
