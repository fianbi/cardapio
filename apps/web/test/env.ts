/** Banco usado pelos testes de integração. Pode ser trocado com a variável DATABASE_URL_TEST. */
export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://cardapio:cardapio@localhost:5433/cardapio_test?schema=public";
