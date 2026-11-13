import type { ConfigContext, ExpoConfig } from "expo/config";

// Identificadores do aplicativo. Troque pelo nome e domínio definitivos antes de publicar nas lojas:
// depois de publicado, o identificador (bundle/package) não pode mais mudar.
const APP_NAME = process.env.APP_NAME ?? "Cardápio";
const APP_ID = process.env.APP_ID ?? "br.com.cardapio.app";

// ID de cliente OAuth "iOS" do Google invertido (ex.: com.googleusercontent.apps.1234-abc), usado no login do iPhone.
const GOOGLE_IOS_URL_SCHEME = process.env.GOOGLE_IOS_URL_SCHEME;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: "cardapio",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "cardapio",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: APP_ID,
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: APP_ID,
    adaptiveIcon: {
      backgroundColor: "#EA580C",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  web: { output: "single", favicon: "./assets/images/favicon.png" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    ["expo-notifications", { color: "#EA580C" }],
    ["expo-splash-screen", { backgroundColor: "#EA580C", image: "./assets/images/splash-icon.png", imageWidth: 76 }],
    // O plugin do Google só entra quando o esquema do iOS está configurado (ele é obrigatório para o plugin).
    ...(GOOGLE_IOS_URL_SCHEME
      ? [["@react-native-google-signin/google-signin", { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }] as [string, object]]
      : []),
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    // Preenchido pelo `eas init` (necessário para as notificações push).
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
