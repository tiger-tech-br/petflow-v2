"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../database/connection");
const {
    JWT_SECRET,
    JWT_EXPIRES_IN,
    APP_URL
} = require("../config/env");

const {
    sendEmail,
    emailVerificationTemplate,
    passwordResetTemplate
} = require("../services/emailService");

async function register(request, response, next) {

    try {

        const data = request.body;

        if (!hasRequiredRegistrationData(data)) {

            return response.status(400).json({
                success: false,
                message: "Informe nome, WhatsApp, e-mail, senha e endereço de entrega."
            });

        }

        const senhaHash = await bcrypt.hash(
            data.senha,
            10
        );

        const verificationToken = crypto
            .randomBytes(32)
            .toString("hex");

        const verificationExpiresAt = new Date(
            Date.now() + 1000 * 60 * 60 * 24
        );

        const empresaIdResult = await db.query(
            "SELECT get_petflow_empresa_id() AS id"
        );

        const empresaId = empresaIdResult.rows[0].id;

        const existing = await db.query(
            `
                SELECT
                    c.id,
                    uc.cliente_id AS usuario_cliente_id,
                    CASE
                        WHEN LOWER(COALESCE(c.email, uc.email)) = LOWER($1) THEN 'email'
                        WHEN $3 <> ''
                         AND REGEXP_REPLACE(COALESCE(c.cpf, ''), '\\D', '', 'g') = $3 THEN 'cpf'
                        WHEN $4 <> ''
                         AND (
                            REGEXP_REPLACE(COALESCE(c.telefone, ''), '\\D', '', 'g') = $4
                            OR REGEXP_REPLACE(COALESCE(c.whatsapp, ''), '\\D', '', 'g') = $4
                         ) THEN 'telefone'
                        WHEN $5 <> ''
                         AND (
                            REGEXP_REPLACE(COALESCE(c.telefone, ''), '\\D', '', 'g') = $5
                            OR REGEXP_REPLACE(COALESCE(c.whatsapp, ''), '\\D', '', 'g') = $5
                         ) THEN 'whatsapp'
                        ELSE NULL
                    END AS field
                FROM clientes c
                LEFT JOIN usuarios_clientes uc
                    ON uc.cliente_id = c.id
                WHERE (
                    c.empresa_id = $2
                    OR c.empresa_id IS NULL
                    OR uc.cliente_id IS NOT NULL
                )
                  AND (
                    LOWER(COALESCE(c.email, uc.email)) = LOWER($1)
                    OR (
                        $3 <> ''
                        AND REGEXP_REPLACE(COALESCE(c.cpf, ''), '\\D', '', 'g') = $3
                    )
                    OR (
                        $4 <> ''
                        AND (
                            REGEXP_REPLACE(COALESCE(c.telefone, ''), '\\D', '', 'g') = $4
                            OR REGEXP_REPLACE(COALESCE(c.whatsapp, ''), '\\D', '', 'g') = $4
                        )
                    )
                    OR (
                        $5 <> ''
                        AND (
                            REGEXP_REPLACE(COALESCE(c.telefone, ''), '\\D', '', 'g') = $5
                            OR REGEXP_REPLACE(COALESCE(c.whatsapp, ''), '\\D', '', 'g') = $5
                        )
                    )
                  )
                LIMIT 1
            `,
            [
                data.email,
                empresaId,
                onlyDigits(data.cpf),
                onlyDigits(data.telefone),
                onlyDigits(data.whatsapp)
            ]
        );

        if (existing.rows[0]) {

            return response.status(409).json({
                success: false,
                message: duplicateCustomerMessage(existing.rows[0].field)
            });

        }

        let clienteId = existing.rows[0]?.id;

        if (existing.rows[0]?.usuario_cliente_id) {

            return response.status(409).json({
                success: false,
                message: "Já existe uma conta cadastrada com esse e-mail."
            });

        }

        if (clienteId) {

            await db.query(
                `
                    UPDATE clientes
                    SET
                        nome = $1,
                        telefone = $2,
                        whatsapp = $2,
                        cep = $3,
                        endereco = $4,
                        numero = $5,
                        complemento = $6,
                        bairro = $7,
                        cidade = $8,
                        estado = $9,
                        data_nascimento = $10,
                        updated_at = NOW()
                    WHERE id = $11
                      AND empresa_id = $12
                `,
                [
                    data.nome,
                    data.telefone,
                    data.cep || null,
                    data.endereco || null,
                    data.numero || null,
                    data.complemento || null,
                    data.bairro || null,
                    data.cidade || null,
                    data.estado || null,
                    data.data_nascimento || data.dataNascimento || null,
                    clienteId,
                    empresaId
                ]
            );

        } else {

            const created = await db.query(
                `
                    INSERT INTO clientes (
                        empresa_id,
                        nome,
                        cpf,
                        email,
                        telefone,
                        whatsapp,
                        cep,
                        endereco,
                        numero,
                        complemento,
                        bairro,
                        cidade,
                        estado,
                        data_nascimento,
                        ativo
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12,
                        $13,
                        TRUE
                    )
                    RETURNING id
                `,
                [
                    empresaId,
                    data.nome,
                    data.cpf || null,
                    data.email.toLowerCase(),
                    data.telefone,
                    data.cep || null,
                    data.endereco || null,
                    data.numero || null,
                    data.complemento || null,
                    data.bairro || null,
                    data.cidade || null,
                    data.estado || null,
                    data.data_nascimento || data.dataNascimento || null
                ]
            );

            clienteId = created.rows[0].id;

        }

        await db.query(
            `
                INSERT INTO usuarios_clientes (
                    cliente_id,
                    email,
                    senha_hash,
                    email_verificado,
                    token_verificacao_email,
                    token_verificacao_expiracao,
                    ativo
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    FALSE,
                    $4,
                    $5,
                    TRUE
                )
            `,
            [
                clienteId,
                data.email.toLowerCase(),
                senhaHash,
                verificationToken,
                verificationExpiresAt
            ]
        );

        const profile = await getProfileById(
            clienteId,
            empresaId
        );

        await createCustomerNotification({
            clienteId,
            titulo: "Bem-vindo à PetFlow",
            mensagem: `${firstName(profile.nome)}, seu cadastro foi criado com sucesso. Agora você pode comprar, favoritar produtos e acompanhar seus pedidos.`,
            tipo: "SISTEMA"
        });

        const verificationUrl = `${APP_URL}/login?verificar_email=${verificationToken}`;

        const template = emailVerificationTemplate({
            name: profile.nome,
            verifyUrl: verificationUrl
        });

        await sendEmail({
            to: profile.email,
            subject: template.subject,
            html: template.html,
            text: template.text
        });

        return response.status(201).json({
            success: true,
            message: "Cadastro criado. Enviamos um link de confirmação para seu e-mail."
        });

    } catch (error) {

        return next(error);

    }

}

async function login(request, response, next) {

    try {

        const {
            email,
            senha
        } = request.body;

        const empresaIdResult = await db.query(
            "SELECT get_petflow_empresa_id() AS id"
        );

        const empresaId = empresaIdResult.rows[0].id;

        const { rows } = await db.query(
            `
                SELECT
                    c.*,
                    uc.senha_hash,
                    uc.email_verificado,
                    uc.ativo AS usuario_ativo
                FROM clientes c
                INNER JOIN usuarios_clientes uc
                    ON uc.cliente_id = c.id
                WHERE LOWER(c.email) = LOWER($1)
                  AND c.empresa_id = $2
                LIMIT 1
            `,
            [
                email,
                empresaId
            ]
        );

        const cliente = rows[0];

        if (
            !cliente ||
            !cliente.usuario_ativo ||
            !cliente.ativo
        ) {

            return response.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos."
            });

        }

        const valid = await bcrypt.compare(
            senha,
            cliente.senha_hash
        );

        if (!valid) {

            return response.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos."
            });

        }

        if (!cliente.email_verificado) {

            return response.status(403).json({
                success: false,
                message: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
            });

        }

        await db.query(
            `
                UPDATE usuarios_clientes
                SET ultimo_login = NOW()
                WHERE cliente_id = $1
            `,
            [cliente.id]
        );

        return response.status(200).json({
            success: true,
            message: "Login realizado com sucesso.",
            data: buildAuthPayload(cliente)
        });

    } catch (error) {

        return next(error);

    }

}

async function forgotPassword(request, response, next) {

    try {

        const { email } = request.body;

        if (!email) {

            return response.status(400).json({
                success: false,
                message: "Informe seu e-mail."
            });

        }

        const empresaIdResult = await db.query(
            "SELECT get_petflow_empresa_id() AS id"
        );

        const empresaId = empresaIdResult.rows[0].id;

        const { rows } = await db.query(
            `
                SELECT
                    c.id,
                    c.nome,
                    c.email,
                    uc.ativo AS usuario_ativo
                FROM clientes c
                INNER JOIN usuarios_clientes uc
                    ON uc.cliente_id = c.id
                WHERE LOWER(c.email) = LOWER($1)
                  AND c.empresa_id = $2
                  AND c.ativo = TRUE
                LIMIT 1
            `,
            [
                email,
                empresaId
            ]
        );

        const cliente = rows[0];

        if (
            !cliente ||
            !cliente.usuario_ativo
        ) {

            return response.status(200).json({
                success: true,
                message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação."
            });

        }

        const token = crypto
            .randomBytes(32)
            .toString("hex");

        const expiresAt = new Date(
            Date.now() + 1000 * 60 * 30
        );

        await db.query(
            `
                UPDATE usuarios_clientes
                SET
                    token_recuperacao = $1,
                    token_expiracao = $2,
                    updated_at = NOW()
                WHERE cliente_id = $3
            `,
            [
                token,
                expiresAt,
                cliente.id
            ]
        );

        const resetUrl =
            `${APP_URL}/redefinir-senha?token=${token}`;

        const template = passwordResetTemplate({
            name: cliente.nome,
            resetUrl
        });

        await sendEmail({
            to: cliente.email,
            subject: template.subject,
            html: template.html,
            text: template.text
        });

        return response.status(200).json({
            success: true,
            message: "Enviamos as instruções de recuperação para seu e-mail."
        });

    } catch (error) {

        return next(error);

    }

}

async function verifyEmail(request, response, next) {

    try {

        const token = String(
            request.query?.token ||
            request.body?.token ||
            ""
        ).trim();

        if (!token) {

            return response.status(400).json({
                success: false,
                message: "Link de confirmação inválido."
            });

        }

        const { rowCount } = await db.query(
            `
                UPDATE usuarios_clientes
                SET
                    email_verificado = TRUE,
                    token_verificacao_email = NULL,
                    token_verificacao_expiracao = NULL,
                    updated_at = NOW()
                WHERE token_verificacao_email = $1
                  AND token_verificacao_expiracao > NOW()
                  AND ativo = TRUE
            `,
            [token]
        );

        if (!rowCount) {

            return response.status(400).json({
                success: false,
                message: "Link de confirmação inválido ou expirado."
            });

        }

        return response.status(200).json({
            success: true,
            message: "E-mail confirmado com sucesso. Você já pode entrar."
        });

    } catch (error) {

        return next(error);

    }

}

async function resetPassword(request, response, next) {

    try {

        const {
            token,
            senha
        } = request.body;

        if (
            !token ||
            !senha ||
            String(senha).length < 6
        ) {

            return response.status(400).json({
                success: false,
                message: "Informe o token e uma senha com no mínimo 6 caracteres."
            });

        }

        const { rows } = await db.query(
            `
                SELECT
                    cliente_id
                FROM usuarios_clientes
                WHERE token_recuperacao = $1
                  AND token_expiracao > NOW()
                  AND ativo = TRUE
                LIMIT 1
            `,
            [token]
        );

        const usuarioCliente = rows[0];

        if (!usuarioCliente) {

            return response.status(400).json({
                success: false,
                message: "Link inválido ou expirado."
            });

        }

        const senhaHash = await bcrypt.hash(
            senha,
            10
        );

        await db.query(
            `
                UPDATE usuarios_clientes
                SET
                    senha_hash = $1,
                    token_recuperacao = NULL,
                    token_expiracao = NULL,
                    updated_at = NOW()
                WHERE cliente_id = $2
            `,
            [
                senhaHash,
                usuarioCliente.cliente_id
            ]
        );

        return response.status(200).json({
            success: true,
            message: "Senha redefinida com sucesso."
        });

    } catch (error) {

        return next(error);

    }

}

async function me(request, response, next) {

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        const profile = await getProfileById(
            customer.id,
            customer.empresaId
        );

        if (!profile) {

            return response.status(404).json({
                success: false,
                message: "Cliente não encontrado."
            });

        }

        return response.status(200).json({
            success: true,
            data: profile
        });

    } catch (error) {

        return next(error);

    }

}

async function update(request, response, next) {

    try {

        const data = request.body;

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        if (!hasRequiredProfileData(data)) {

            return response.status(400).json({
                success: false,
                message: "Informe nome, WhatsApp e endereço de entrega."
            });

        }

        const duplicate = await findDuplicateCustomer({
            cpf: data.cpf,
            telefone: data.telefone,
            whatsapp: data.whatsapp,
            excludeId: customer.id,
            empresaId: customer.empresaId
        });

        if (duplicate) {

            return response.status(409).json({
                success: false,
                message: duplicateCustomerMessage(duplicate.field)
            });

        }

        await db.query(
            `
                UPDATE clientes
                SET
                    nome = $1,
                    cpf = $2,
                    telefone = $3,
                    whatsapp = $3,
                    cep = $4,
                    endereco = $5,
                    numero = $6,
                    complemento = $7,
                    bairro = $8,
                    cidade = $9,
                    estado = $10,
                    data_nascimento = $11,
                    updated_at = NOW()
                WHERE id = $12
                  AND empresa_id = $13
            `,
            [
                data.nome,
                formatCpf(data.cpf),
                data.telefone,
                data.cep || null,
                data.endereco || null,
                data.numero || null,
                data.complemento || null,
                data.bairro || null,
                data.cidade || null,
                data.estado || null,
                data.data_nascimento || data.dataNascimento || null,
                customer.id,
                customer.empresaId
            ]
        );

        const profile = await getProfileById(
            customer.id,
            customer.empresaId
        );

        return response.status(200).json({
            success: true,
            message: "Dados atualizados com sucesso.",
            data: profile
        });

    } catch (error) {

        return next(error);

    }

}

async function remove(request, response, next) {

    const client = await db.connect();

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        await client.query("BEGIN");

        const profile = await getProfileById(
            customer.id,
            customer.empresaId
        );

        await client.query(
            `
                DELETE FROM newsletter_inscritos
                WHERE empresa_id = $1
                  AND LOWER(email) = LOWER($2)
            `,
            [
                customer.empresaId,
                profile?.email || customer.email || ""
            ]
        );

        await client.query(
            `
                DELETE FROM agendamentos
                WHERE empresa_id = $1
                  AND cliente_id = $2
            `,
            [
                customer.empresaId,
                customer.id
            ]
        );

        await client.query(
            `
                DELETE FROM pets
                WHERE empresa_id = $1
                  AND cliente_id = $2
            `,
            [
                customer.empresaId,
                customer.id
            ]
        );

        await client.query(
            `
                UPDATE vendas
                SET
                    cliente_id = NULL,
                    updated_at = NOW()
                WHERE empresa_id = $1
                  AND cliente_id = $2
            `,
            [
                customer.empresaId,
                customer.id
            ]
        );

        await client.query(
            `
                DELETE FROM usuarios_clientes
                WHERE cliente_id = $1
            `,
            [
                customer.id
            ]
        );

        await client.query(
            `
                DELETE FROM clientes
                WHERE id = $1
                  AND empresa_id = $2
            `,
            [
                customer.id,
                customer.empresaId
            ]
        );

        await client.query("COMMIT");

        return response.status(200).json({
            success: true,
            message: "Cadastro excluído com sucesso."
        });

    } catch (error) {

        await client.query("ROLLBACK");
        return next(error);

    } finally {

        client.release();

    }

}

async function orders(request, response, next) {

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        const { rows } = await db.query(
            `
                SELECT
                    v.id,
                    v.status,
                    CASE
                        WHEN v.pagseguro_response #>> '{charges,0,payment_method,type}' = 'CREDIT_CARD'
                            THEN 'CARTAO_CREDITO'
                        WHEN v.pagseguro_response #>> '{charges,0,payment_method,type}' = 'DEBIT_CARD'
                            THEN 'CARTAO_DEBITO'
                        WHEN v.pagseguro_response #>> '{charges,0,payment_method,type}' = 'PIX'
                            THEN 'PIX'
                        ELSE v.forma_pagamento
                    END AS forma_pagamento,
                    v.pagseguro_checkout_id,
                    v.pagseguro_checkout_url,
                    v.pagseguro_status,
                    v.pagamento_atualizado_em,
                    v.valor_total,
                    v.valor_final,
                    v.data_venda,
                    v.observacoes,
                    c.endereco,
                    c.numero,
                    c.complemento,
                    c.bairro,
                    c.cidade,
                    c.estado,
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'produto', COALESCE(
                                    p.nome,
                                    'Produto'
                                ),
                                'quantidade', iv.quantidade,
                                'preco_unitario', COALESCE(
                                    iv.preco_unitario,
                                    0
                                ),
                                'subtotal', iv.subtotal
                            )
                            ORDER BY p.nome
                        ) FILTER (
                            WHERE iv.id IS NOT NULL
                        ),
                        '[]'::JSON
                    ) AS itens
                FROM vendas v
                LEFT JOIN clientes c
                    ON c.id = v.cliente_id
                   AND c.empresa_id = v.empresa_id
                LEFT JOIN itens_venda iv
                    ON iv.venda_id = v.id
                   AND iv.empresa_id = v.empresa_id
                LEFT JOIN produtos p
                    ON p.id = iv.produto_id
                   AND p.empresa_id = v.empresa_id
                WHERE v.cliente_id = $1
                  AND v.empresa_id = $2
                GROUP BY
                    v.id,
                    c.id
                ORDER BY v.data_venda DESC
                LIMIT 50
            `,
            [
                customer.id,
                customer.empresaId
            ]
        );

        return response.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {

        return next(error);

    }

}

async function notifications(request, response, next) {

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        const { rows } = await db.query(
            `
                SELECT
                    id,
                    titulo,
                    mensagem,
                    tipo,
                    lida,
                    enviada_em
                FROM notificacoes
                WHERE cliente_id = $1
                  AND EXISTS (
                      SELECT 1
                      FROM clientes c
                      WHERE c.id = notificacoes.cliente_id
                        AND c.empresa_id = $2
                  )
                ORDER BY enviada_em DESC
                LIMIT 20
            `,
            [
                customer.id,
                customer.empresaId
            ]
        );

        return response.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {

        return next(error);

    }

}

async function markNotificationRead(request, response, next) {

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        await db.query(
            `
                UPDATE notificacoes
                SET
                    lida = TRUE,
                    data_leitura = COALESCE(data_leitura, NOW()),
                    updated_at = NOW()
                WHERE cliente_id = $1
                  AND EXISTS (
                      SELECT 1
                      FROM clientes c
                      WHERE c.id = notificacoes.cliente_id
                        AND c.empresa_id = $3
                  )
                  AND (
                      $2::uuid IS NULL
                      OR id = $2
                  )
            `,
            [
                customer.id,
                request.params.id || null,
                customer.empresaId
            ]
        );

        return response.status(200).json({
            success: true,
            message: "Notificação marcada como lida."
        });

    } catch (error) {

        return next(error);

    }

}

async function getProfileById(id, empresaId) {

    const { rows } = await db.query(
        `
            SELECT
                id,
                empresa_id,
                nome,
                cpf,
                email,
                telefone,
                whatsapp,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                data_nascimento
            FROM clientes
            WHERE id = $1
              AND empresa_id = $2
            LIMIT 1
        `,
        [
            id,
            empresaId
        ]
    );

    return rows[0] || null;

}

function buildAuthPayload(cliente) {

    const user = {
        id: cliente.id,
        empresaId: cliente.empresa_id,
        nome: cliente.nome,
        cpf: cliente.cpf,
        email: cliente.email,
        telefone: cliente.telefone,
        cep: cliente.cep,
        endereco: cliente.endereco,
        numero: cliente.numero,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        data_nascimento: cliente.data_nascimento
    };

    const token = jwt.sign(
        {
            type: "customer",
            id: cliente.id,
            empresaId: cliente.empresa_id,
            email: cliente.email,
            nome: cliente.nome
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN
        }
    );

    return {
        token,
        user
    };

}

function getAuthenticatedCustomer(request, response) {

    const id = request.customer?.id;
    const empresaId = request.customer?.empresaId;

    if (
        !id ||
        !empresaId
    ) {

        response.status(401).json({
            success: false,
            message: "Sessão inválida. Faça login novamente."
        });

        return null;

    }

    return {
        id,
        empresaId
    };

}

/* ==================================================
   VALIDAÇÕES
================================================== */

function hasRequiredRegistrationData(data) {

    return Boolean(
        hasRequiredProfileData(data) &&
        hasText(data.email) &&
        hasText(data.senha) &&
        String(data.senha).length >= 6
    );

}

function hasRequiredProfileData(data) {

    return Boolean(
        hasText(data?.nome) &&
        isValidCpf(data?.cpf) &&
        hasText(data?.telefone) &&
        hasRequiredAddressData(data)
    );

}

function hasRequiredAddressData(data) {

    return Boolean(
        hasText(data?.cep) &&
        hasText(data?.endereco) &&
        hasText(data?.numero) &&
        hasText(data?.bairro) &&
        hasText(data?.cidade) &&
        hasText(data?.estado)
    );

}

function hasText(value) {

    return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );

}

function onlyDigits(value) {

    return String(value || "")
        .replace(/\D/g, "");

}

function isValidCpf(value) {

    return /^\d{11}$/.test(onlyDigits(value));

}

function formatCpf(value) {

    const digits = onlyDigits(value);

    if (!isValidCpf(digits)) {

        return null;

    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;

}

async function findDuplicateCustomer({
    cpf,
    telefone,
    whatsapp,
    excludeId,
    empresaId
}) {

    const normalizedCpf = onlyDigits(cpf);
    const normalizedTelefone = onlyDigits(telefone);
    const normalizedWhatsapp = onlyDigits(whatsapp);

    const { rows } = await db.query(
        `
            SELECT
                id,
                CASE
                    WHEN $1 <> ''
                     AND REGEXP_REPLACE(COALESCE(cpf, ''), '\\D', '', 'g') = $1 THEN 'cpf'
                    WHEN $4 <> ''
                     AND (
                        REGEXP_REPLACE(COALESCE(telefone, ''), '\\D', '', 'g') = $4
                        OR REGEXP_REPLACE(COALESCE(whatsapp, ''), '\\D', '', 'g') = $4
                     ) THEN 'telefone'
                    WHEN $5 <> ''
                     AND (
                        REGEXP_REPLACE(COALESCE(telefone, ''), '\\D', '', 'g') = $5
                        OR REGEXP_REPLACE(COALESCE(whatsapp, ''), '\\D', '', 'g') = $5
                     ) THEN 'whatsapp'
                    ELSE NULL
                END AS field
            FROM clientes
            WHERE id <> $2
              AND (
                  empresa_id = $3
                  OR empresa_id = get_petflow_empresa_id()
                  OR empresa_id IS NULL
              )
              AND (
                  (
                      $1 <> ''
                      AND REGEXP_REPLACE(COALESCE(cpf, ''), '\\D', '', 'g') = $1
                  )
                  OR (
                      $4 <> ''
                      AND (
                          REGEXP_REPLACE(COALESCE(telefone, ''), '\\D', '', 'g') = $4
                          OR REGEXP_REPLACE(COALESCE(whatsapp, ''), '\\D', '', 'g') = $4
                      )
                  )
                  OR (
                      $5 <> ''
                      AND (
                          REGEXP_REPLACE(COALESCE(telefone, ''), '\\D', '', 'g') = $5
                          OR REGEXP_REPLACE(COALESCE(whatsapp, ''), '\\D', '', 'g') = $5
                      )
                  )
              )
            LIMIT 1
        `,
        [
            normalizedCpf,
            excludeId,
            empresaId,
            normalizedTelefone,
            normalizedWhatsapp
        ]
    );

    return rows[0] || null;

}

function duplicateCustomerMessage(field) {

    const messages = {
        cpf: "Esse CPF já está cadastrado.",
        telefone: "Esse telefone já está cadastrado.",
        whatsapp: "Esse celular já está cadastrado.",
        email: "Esse e-mail já está cadastrado."
    };

    return messages[field] || messages.email;

}

async function createCustomerNotification({ clienteId, titulo, mensagem, tipo }) {

    await db.query(
        `
            INSERT INTO notificacoes (
                cliente_id,
                titulo,
                mensagem,
                tipo
            )
            VALUES ($1, $2, $3, $4)
        `,
        [
            clienteId,
            titulo,
            mensagem,
            tipo || "SISTEMA"
        ]
    );

}

function firstName(name) {

    return String(name || "Cliente").trim().split(/\s+/)[0] || "Cliente";

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {
    register,
    login,
    forgotPassword,
    verifyEmail,
    resetPassword,
    me,
    update,
    remove,
    orders,
    notifications,
    markNotificationRead
};
