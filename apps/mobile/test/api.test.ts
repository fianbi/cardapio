import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("__DEV__", true);

const { api, ApiError, errorMessage, setAuthToken, setUnauthorizedHandler } = await import("../src/lib/api");

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  setAuthToken(null);
  setUnauthorizedHandler(null);
});

describe("cliente da API", () => {
  it("chama /api/v1 com o token da sessão", async () => {
    const fetchImpl = vi.fn(async () => json(200, { ok: true }));
    setAuthToken("abc");
    await api("/orders", { method: "POST", body: { a: 1 }, fetchImpl: fetchImpl as unknown as typeof fetch });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:3001/api/v1/orders");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
    expect(init.body).toBe('{"a":1}');
  });

  it("sem token não manda Authorization", async () => {
    const fetchImpl = vi.fn(async () => json(200, {}));
    await api("/stores", { fetchImpl: fetchImpl as unknown as typeof fetch });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("erro do servidor vira ApiError com a mensagem para o cliente", async () => {
    const fetchImpl = (async () => json(422, { error: "A loja fechou." })) as unknown as typeof fetch;
    const error = (await api("/orders", { fetchImpl }).catch((e) => e)) as InstanceType<typeof ApiError>;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(errorMessage(error)).toBe("A loja fechou.");
  });

  it("sessão recusada (401) avisa o app para deslogar", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAuthToken("vencido");
    await api("/me", { fetchImpl: (async () => json(401, { error: "Entre com sua conta." })) as unknown as typeof fetch }).catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("falha de rede vira mensagem de 'sem conexão'", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    const error = await api("/stores", { fetchImpl }).catch((e) => e);
    expect(errorMessage(error)).toContain("Sem conexão");
  });

  it("resposta que não é JSON não quebra o app", async () => {
    const fetchImpl = (async () => new Response("<html>502</html>", { status: 502 })) as unknown as typeof fetch;
    const error = await api("/stores", { fetchImpl }).catch((e) => e);
    expect(errorMessage(error)).toBe("Algo deu errado. Tente novamente.");
  });
});
