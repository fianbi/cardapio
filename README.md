# Cardápio

Todos os cardápios das lanchonetes e restaurantes da cidade em um só lugar. O cliente escolhe, faz o pedido e acompanha; o estabelecimento gerencia cardápio e pedidos.

## Estrutura

```
apps/
  web/          Servidor (Next.js + TypeScript + Tailwind): painel do restaurante, backoffice, API do app e cardápio web
  mobile/       Aplicativo do cliente para Android e iPhone (Expo / React Native)
packages/
  db/           Banco de dados (Prisma + PostgreSQL): schema, migrations e seed
  shared/       Regras usadas pelo servidor e pelo app (adicionais, carrinho, textos de pedido)
docs/
  LANCAMENTO.md O que entrou no primeiro lançamento e como publicar
  ROADMAP.md    Fases do projeto
```

O monorepo usa **pnpm workspaces** + **Turborepo**.

| Endereço | Para quem |
| --- | --- |
| `/painel` | Restaurante: pedidos, cardápio, adicionais, mesas |
| `/admin` | Dono da plataforma: aprovar lojas e acompanhar os números (e-mails em `ADMIN_EMAILS`) |
| `/api/v1` | API usada pelo aplicativo |
| `/lojas/...` | Cardápio pelo navegador (pedido na mesa por QR code) |

## Pré-requisitos

- Node.js 22 (ou 20+)
- pnpm: `corepack enable` (ou `npm i -g pnpm`)
- Docker Desktop, para o PostgreSQL local (ou um Postgres próprio / Supabase / Neon)

## Primeiros passos

```bash
pnpm install
cp .env.example .env        # no Windows: copy .env.example .env
pnpm db:up                  # sobe o Postgres no Docker
pnpm db:migrate             # cria as tabelas
pnpm db:seed                # cria duas lojas de exemplo
pnpm dev                    # http://localhost:3000
```

### Login com Google

1. Acesse https://console.cloud.google.com/apis/credentials e crie um **ID do cliente OAuth** do tipo "Aplicativo da Web".
2. Em **URIs de redirecionamento autorizados**, adicione `http://localhost:3000/api/auth/callback/google`.
3. Copie o ID e o segredo para `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` no `.env`.
4. Gere o `AUTH_SECRET` com `npx auth secret` (ou qualquer texto aleatório longo).

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Roda o app web em modo desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm typecheck` | Verificação de tipos |
| `pnpm test` | Testes automatizados (precisa do Postgres no ar; usa o banco `cardapio_test`) |
| `pnpm --filter @cardapio/mobile start` | Abre o aplicativo no Expo (veja `apps/mobile/README.md`) |
| `pnpm db:migrate` | Cria/aplica migrations a partir do `schema.prisma` |
| `pnpm db:seed` | Popula dados de exemplo |
| `pnpm db:studio` | Abre o Prisma Studio para ver/editar dados |

## Convenções

- Valores em dinheiro ficam em **centavos** (`Int`) no banco.
- Código (nomes de tabelas, variáveis) em inglês; textos da interface em português.
