# Aplicativo do cliente (Android e iPhone)

App em [Expo](https://expo.dev) (React Native) que conversa com a API do servidor (`apps/web`, rotas `/api/v1`).

Telas: lojas (busca e filtros), cardápio, produto com adicionais, carrinho e pedido, acompanhamento com
notificações, meus pedidos, perfil, endereços e login.

## Rodar no computador

1. Suba o servidor (`pnpm dev` na raiz) com `ALLOW_DEV_LOGIN="1"` no `.env` da raiz.
2. Copie `apps/mobile/.env.example` para `apps/mobile/.env`. Para testar no celular, troque
   `EXPO_PUBLIC_API_URL` pelo IP do computador na rede (ex.: `http://192.168.0.10:3001`).
3. Na pasta `apps/mobile`:

   ```bash
   pnpm start
   ```

   Aperte `w` para abrir no navegador, ou leia o QR code com o app **Expo Go** no celular.

No Expo Go e no navegador, use o **login de teste** (qualquer e-mail). O login com Google e as notificações
push só funcionam no app compilado (veja abaixo).

## Compilar e publicar (EAS)

Não precisa de Android Studio nem de Mac: a compilação roda na nuvem da Expo.

```bash
npm install -g eas-cli
eas login
eas init                     # cria o projeto e mostra o projectId (coloque em EAS_PROJECT_ID)
eas build --profile preview --platform android      # APK para instalar direto no celular
eas build --profile production --platform all       # versões para as lojas
eas submit --platform android                        # envia para a Play Store
eas submit --platform ios                            # envia para a App Store
```

Antes da primeira compilação para as lojas:

- Defina `APP_NAME` e `APP_ID` (identificador do app). **Depois de publicado, o identificador não muda.**
- Crie no Google Cloud os IDs de cliente OAuth **Android** (com o SHA-1 que o `eas credentials` mostra) e
  **iOS**, e preencha `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` e
  `GOOGLE_IOS_URL_SCHEME`. No servidor, coloque os IDs em `GOOGLE_MOBILE_CLIENT_IDS`.
- No servidor, coloque o identificador do app em `APPLE_BUNDLE_IDS` (login com Apple).
- Aponte `EXPO_PUBLIC_API_URL` para o endereço de produção (`eas.json` ou variáveis do EAS).
- Troque os ícones em `assets/images` pela logo.

## Testes

```bash
pnpm test        # carrinho, formatação e cliente da API
pnpm typecheck
```

As regras de adicionais e do carrinho ficam em `packages/shared`, usadas também pelo servidor.
