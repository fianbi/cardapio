/** Endereço do servidor, sem barra no final. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

/** Login de teste por e-mail, só para desenvolvimento. */
export const DEV_LOGIN = __DEV__ && process.env.EXPO_PUBLIC_DEV_LOGIN === "1";

export const TERMS_URL = `${API_URL}/termos`;
export const PRIVACY_URL = `${API_URL}/privacidade`;
