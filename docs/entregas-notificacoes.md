# Entregas, Google Maps e notificações

## Configurar o mapa no Railway

O servidor calcula as rotas com `GOOGLE_MAPS_API_KEY` (Routes API, já usada pelo frete). O mapa visível no navegador usa uma chave **separada**, `GOOGLE_MAPS_BROWSER_API_KEY`.

1. No mesmo projeto do Google Cloud com faturamento habilitado, abra **APIs e serviços → Biblioteca → Maps JavaScript API → Ativar**.
2. Em **APIs e serviços → Credenciais → Criar credenciais → Chave de API**, crie a chave do navegador.
3. Edite essa chave: **Restrições de aplicativos → Sites**. Autorize `https://petflow-v2-production.up.railway.app/*` e o domínio próprio, se existir. Para testar localmente, inclua a origem/porta local utilizada.
4. Em **Restrições de API**, permita apenas **Maps JavaScript API**.
5. No Railway, serviço da **aplicação**, ambiente de produção, salve `GOOGLE_MAPS_BROWSER_API_KEY` com essa chave e aplique o deploy. Não substitua `GOOGLE_MAPS_API_KEY` pela chave do navegador.
6. Faça commit/deploy deste código. O `preDeployCommand` existente executa `npm run db:migrate`, incluindo `109_notificacoes_entregas.sql`. Não é necessário executar SQL manualmente no pgAdmin quando esse comando termina com sucesso.

Não coloque a chave privada de Routes em HTML. A chave do navegador é pública por natureza e deve ter as restrições de site/API acima. A variável foi deixada vazia no `.env` local e no exemplo; a chave real deve ser cadastrada pelo responsável no Google Cloud/Railway.

Referências oficiais: [carregar Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [restringir chaves](https://developers.google.com/maps/api-security-best-practices), [política de conteúdo](https://developers.google.com/maps/documentation/javascript/content-security-policy).

## Usar a entrega

1. Em **Administração → Pedidos**, abra o pedido pago. Atualize para **Preparando** e depois **Saiu para entrega**.
2. O cliente recebe uma notificação salva e o e-mail com **Rastrear pedido**. O e-mail depende do Resend configurado. A notificação no site independe do sucesso do e-mail.
3. Na seção **GPS da entrega**, gere o link. Use **Compartilhar com entregador** ou **Copiar link**. O link é privado do entregador, vale 12 horas e dá acesso apenas a essa entrega. Gerar outro revoga o anterior e limpa a posição/rota anterior.
4. O entregador abre o link no próprio celular e toca **Iniciar viagem**, permitindo GPS. O mapa mostra um carrinho na última posição recebida e a rota pelas ruas **da posição GPS do entregador até o endereço salvo na compra**. O acompanhamento fica dentro da PetFlow, sem botão para abrir a rota no aplicativo Google Maps. O destino não muda se o cliente editar o perfil depois. Para calcular o **frete**, a origem continua sendo **Avenida Novo Horizonte, 123, Vila Sacadura Cabral, Santo André, SP, Brasil**, configurável por `DELIVERY_ORIGIN_ADDRESS`.
5. O cliente entra na conta usada na compra e abre **Rastrear pedido** pelo e-mail, pelas notificações ou por **Meus pedidos**. O login iniciado pelo rastreamento retorna à mesma entrega.
6. Para acompanhar no painel, o administrador ou gerente abre o pedido em **Saiu para entrega** e clica em **Acompanhar entrega**, na seção **GPS da entrega**. A página mostra a mesma posição e rota compartilhadas com o cliente, sem solicitar nem transmitir o GPS do administrador. Não é preciso gerar outro link. Antes do entregador compartilhar sua posição, aparece um aviso de espera. O acompanhamento exige uma sessão administrativa da mesma loja.
7. O administrador marca **Entregue** ao concluir. O servidor revoga o link e remove a posição e a rota; o mapa de acompanhamento é ocultado. O entregador também pode encerrar antes pelo botão **Parar e encerrar compartilhamento**.

O GPS é enviado e consultado a cada 5 segundos em páginas visíveis; as notificações são consultadas a cada 15 segundos. O carrinho muda de posição conforme as coordenadas recebidas; não simula deslocamento pela linha da rota. A rota é refeita a partir da última posição do entregador a cada 5 minutos durante a viagem; ele também pode pedir **Atualizar rota** (no máximo uma consulta por minuto). Ambos veem a mesma rota. É uma referência, sem navegação guiada por voz ou promessa de horário de chegada.

O entregador precisa manter a página aberta, GPS permitido e conexão ativa. Há tentativa de manter a tela acesa quando o navegador oferece essa função. Tela bloqueada/segundo plano pode interromper a posição; o cliente recebe aviso de posição antiga após 2 minutos. Rastreamento contínuo em segundo plano exige aplicativo móvel com as permissões apropriadas.

Sem a chave do navegador, o mapa interno apresenta aviso de configuração; a transmissão de coordenadas continua funcionando. Falha ao consultar a rota não interrompe o GPS. Pedidos antigos sem endereço de entrega salvo não têm rota automática confiável.

## Notificações

Novas contas geram aviso persistente no painel. Novos pedidos mantêm seus avisos administrativos. Todas as mudanças efetivas de status geram avisos para o cliente, na mesma transação do pedido, inclusive alterações pelo pagamento. Repetir o mesmo status não duplica avisos.

No painel administrativo, as notificações ficam no sino existente do cabeçalho, sem botão extra ou flutuante. Nas páginas públicas, ficam disponíveis com sessão iniciada. Mostra até 100 avisos recentes. **Marcar exibidas como lidas** grava somente os avisos apresentados; a leitura administrativa é individual. Não são notificações push fora do site. O histórico começa após instalar a migração, sem enviar avisos retroativos de cadastros antigos.

## Verificação

Os testes de integração usam PostgreSQL local em schema descartável e Google/Resend/PagBank simulados. Cobrem cadastro revertido, avisos por empresa/cliente, leitura persistente, status concorrentes, rota no endereço salvo, limite de consultas, troca/revogação de links e reaplicação das migrações. Os testes de navegador simulam GPS, início/encerramento, permissão negada, posição antiga e atualização do mapa. A validação visual com a chave real e dois aparelhos precisa ser realizada após configurar e publicar.
