# Roadmap

## Fase 1 — Fundação ✅
- Monorepo (pnpm + Turborepo), Next.js + TypeScript, PostgreSQL + Prisma
- Login com Google (Auth.js)
- Modelo inicial: usuários, estabelecimentos, horários, categorias, produtos, pedidos

## Fase 2 — Cardápio público e pedidos (MVP) ✅
- Busca de estabelecimentos por nome, tipo de comida e "aberto agora"
- Página do cardápio com fotos, carrinho e checkout (entrega, retirada ou no local)
- Pagamento na entrega (dinheiro, Pix, cartão); todo o fluxo do pedido acontece dentro do aplicativo
- Acompanhamento do pedido pelo cliente

## Fase 3 — Painel do lojista ✅ (publicação pendente)
- Cadastro do estabelecimento, horários, taxa de entrega
- Gestão de categorias e produtos (com fotos) e marcação "em falta"
- Fila de pedidos em tempo real com mudança de status
- Deploy (Vercel + Postgres gerenciado) e domínio

## Fase 4 — Operação da lanchonete
- Comandas e mesas ✅ (QR code por mesa, pedido na mesa sem login, fechamento de conta)
- Ingredientes por produto ✅ (marcar ingrediente em falta deixa os produtos que usam ele "em falta")
- Controle de estoque com quantidades e baixa automática (adiado para depois do MVP)
- Promoções e cupons
- Emissão de NFC-e sob demanda (via API de terceiros, ex.: Focus NFe, PlugNotas)

## Fase 5 — Apps
- App mobile para clientes e lojistas (Expo / React Native)
- App desktop para as lanchonetes (Tauri ou Electron), com impressão de pedidos
- Pagamento online (Pix/cartão via Mercado Pago, Stripe ou similar)
