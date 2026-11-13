// Dados que aparecem nos termos e na política de privacidade.
// TODO antes do lançamento: preencher com o nome do aplicativo, o responsável e o e-mail de contato reais.
export const LEGAL = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Cardápio",
  company: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "[NOME DO RESPONSÁVEL OU EMPRESA]",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "[E-MAIL DE CONTATO]",
  updatedAt: "12 de novembro de 2026",
};
