# Lançamento v1

Três partes sobre o mesmo servidor e banco:

| Parte | Onde | Para quem |
| --- | --- | --- |
| Aplicativo (Android e iPhone) | `apps/mobile` | Cliente faz e acompanha pedidos |
| Painel | `apps/web`, em `/painel` | Restaurante recebe pedidos e cuida do cardápio |
| Backoffice | `apps/web`, em `/admin` | Dono da plataforma aprova lojas e acompanha os números |

O cardápio pelo navegador (`/lojas/...`) continua no ar para o pedido na mesa por QR code.

## O que entrou

**Aplicativo:** busca de lojas, cardápio com adicionais, carrinho, pedido (entrega, retirada, no local),
acompanhamento com previsão e notificação push a cada etapa, histórico, endereços salvos, login com Google
e Apple, exclusão de conta.

**Painel do restaurante:** alerta sonoro e notificação do navegador a cada pedido novo, aceitar com tempo
estimado, recusar ou cancelar com motivo, pausar pedidos, imprimir o pedido (cupom de 80 mm), adicionais por
produto, upload de fotos e da logo.

**Backoffice:** aprovar, suspender e reativar lojas; pedidos por dia, cancelamentos e lojas com mais pedidos;
consulta de pedidos e usuários; acesso ao painel de qualquer loja.

**Regras novas:** loja nova só aparece para os clientes depois de **aprovada** em `/admin/lojas` e publicada
pelo dono.

## Como virar administrador

Coloque seu e-mail em `ADMIN_EMAILS` no `.env`, entre no site com essa conta e abra `/admin`.

## Publicar o servidor (Vercel + Neon)

1. Crie um banco no [Neon](https://neon.tech) e copie a URL de conexão.
2. Importe o repositório na [Vercel](https://vercel.com), com **Root Directory** `apps/web`.
3. Crie um **Blob Store** na Vercel (aba Storage) e conecte ao projeto: isso cria `BLOB_READ_WRITE_TOKEN`.
4. Configure as variáveis de ambiente (as do `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
   (o domínio final), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`, `GOOGLE_MOBILE_CLIENT_IDS`,
   `APPLE_BUNDLE_IDS` e os três `NEXT_PUBLIC_*`. **Não** defina `ALLOW_DEV_LOGIN`.
5. Aplique as migrations no banco de produção:

   ```bash
   DATABASE_URL="<url do Neon>" pnpm --filter @cardapio/db exec prisma migrate deploy
   ```

6. No Google Cloud, adicione `https://SEU-DOMINIO/api/auth/callback/google` aos redirecionamentos e
   publique a tela de consentimento (ela pede os links `/termos` e `/privacidade`).

## Publicar o aplicativo

Passo a passo em [`apps/mobile/README.md`](../apps/mobile/README.md).

- **Google Play:** conta de desenvolvedor (US$ 25, uma vez). Conta pessoal nova precisa de um teste fechado
  com 12 testadores por 14 dias antes de liberar ao público; conta de empresa não. Confira a regra vigente
  ao criar a conta.
- **App Store:** Apple Developer Program (US$ 99 por ano). O app já oferece login com Apple e exclusão de
  conta, que a Apple exige. A página `/privacidade#excluir-conta` serve de link de exclusão para a Play Store.

## Antes de abrir ao público

- [ ] Nome do app, domínio e identificador (`APP_ID`) definidos
- [ ] `NEXT_PUBLIC_LEGAL_NAME` e `NEXT_PUBLIC_CONTACT_EMAIL` preenchidos (aparecem nos termos e na privacidade)
- [ ] Termos e política de privacidade revisados por você (são um modelo inicial)
- [ ] Ícone e tela de abertura do app com a logo
- [ ] Login com Google e Apple testados no app compilado
- [ ] Notificação push testada em um aparelho real
- [ ] Impressão testada na impressora térmica de uma loja parceira
- [ ] 3 a 5 lojas com cardápio cadastrado e aprovadas

## Testes automatizados

```bash
pnpm db:up     # o Postgres do docker-compose precisa estar no ar
pnpm test      # servidor (regras de pedido e API) e aplicativo (carrinho e cliente da API)
```

Os testes do servidor usam um banco separado (`cardapio_test`), criado automaticamente no mesmo Postgres.

## Fica para depois

Pagamento online, app do restaurante para celular, login por e-mail, taxa de entrega por bairro, cupons,
avaliações, NFC-e, estoque com quantidades e vários funcionários por loja.
