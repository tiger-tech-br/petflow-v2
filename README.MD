# PetFlow v2 — loja de produtos

Versão voltada a um petshop com venda de produtos. Mantém catálogo, sacola,
conta do cliente, pedidos, pagamentos, clientes, produtos, estoque, fornecedores,
compras, funcionários e financeiro. Serviços, agenda e cadastro de pets não
estão disponíveis nas páginas ou APIs desta versão. O lembrete de atendimentos
também não é iniciado.

## Banco separado no PostgreSQL local

1. No pgAdmin, conecte-se ao PostgreSQL local.
2. Clique com o botão direito em **Databases → Create → Database** e use
   **petflow_v2**. Alternativamente, execute `database/create-petflow-v2.sql`
   no Query Tool conectado ao banco de manutenção `postgres`.
3. Preencha `DB_PASSWORD` no `.env` com a senha do seu PostgreSQL. Se necessário,
   ajuste `DB_USER`, `DB_HOST` e `DB_PORT`. O `.env` não é versionado.
4. Mantenha `DATABASE_URL`, `POSTGRES_URL` e `DATABASE_PUBLIC_URL` vazias para
   usar a conexão local. Essas URLs têm precedência sobre `DB_NAME`.
5. Execute:

   ```sh
   npm run db:migrate
   npm run db:seed-admin
   npm start
   ```

Configure `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` antes de criar o administrador.
Para carregar produtos de demonstração, execute opcionalmente
`npm run db:seed-catalog`. Não é necessário copiar dados do banco original.

A loja abre em **http://localhost:4501** e o painel em
**http://localhost:4501/admin/**. A porta distinta também separa as sessões do
navegador da instalação original na porta 4500.

Todas as conexões da aplicação e dos scripts exigem o nome `petflow_v2`;
outros bancos são recusados antes da conexão. Nunca aponte esta cópia para
o banco original. As migrações do banco novo não criam tabelas de pets, serviços, agendamentos,
consultas, prontuários ou vacinas. Nenhuma tabela de bancos existentes é apagada.

## Railway

Crie um projeto novo para o PetFlow v2 e adicione um serviço PostgreSQL nele.
No serviço da aplicação, configure `DATABASE_URL` com a referência privada
`${{Postgres.DATABASE_URL}}` e `DB_EXPECTED_NAME` com
`${{Postgres.PGDATABASE}}`. Assim a aplicação confirma que a URL aponta para
o banco criado naquele projeto, mesmo que o Railway use o nome padrão
`railway` em vez de `petflow_v2`.

Não use `DATABASE_PUBLIC_URL` entre a aplicação e o PostgreSQL. O arquivo
`railway.json` executa `npm run db:migrate` antes de cada deploy. Ainda é
necessário definir no Railway `JWT_SECRET`, `JWT_EXPIRES_IN`, `APP_URL` e
`FRONTEND_URL`. Cloudinary é necessário apenas para upload de imagens; Resend
e PagBank são necessários quando e-mail e pagamentos forem ativados.

## Verificação

```sh
npm test
```

Os testes verificam isolamento do banco, dados comerciais do painel e rotas
públicas/administrativas. A validação de compras e pagamentos com dados reais
depende de configurar o novo banco e as integrações próprias desta loja.
