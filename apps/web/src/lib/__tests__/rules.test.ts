import { describe, expect, it } from "vitest";
import { formatAddress } from "../address";
import { centsToInput, formatPrice, parsePriceToCents, slugify } from "../format";
import { isOpenNow, todayLabel } from "../hours";
import { estimatedReadyAt, nextStatuses, statusSteps } from "../orders";
import { cartKey } from "../cart";
import { orderPushMessage } from "../server/push";
import { groupByDay } from "../server/admin-stats";

// 2026-11-13 é uma sexta-feira (weekday 5). Horários abaixo estão em UTC; Brasília = UTC-3.
const at = (hhmmBrasilia: string, day = "2026-11-13") => new Date(`${day}T${hhmmBrasilia}:00-03:00`);

describe("horário de funcionamento", () => {
  const noite = [{ weekday: 5, opensAt: "18:00", closesAt: "02:00" }];

  it("abre e fecha no mesmo dia", () => {
    const dia = [{ weekday: 5, opensAt: "08:00", closesAt: "22:00" }];
    expect(isOpenNow(dia, at("07:59"))).toBe(false);
    expect(isOpenNow(dia, at("08:00"))).toBe(true);
    expect(isOpenNow(dia, at("21:59"))).toBe(true);
    expect(isOpenNow(dia, at("22:00"))).toBe(false);
  });

  it("turno que passa da meia-noite vale na madrugada do dia seguinte", () => {
    expect(isOpenNow(noite, at("17:00"))).toBe(false);
    expect(isOpenNow(noite, at("23:30"))).toBe(true);
    expect(isOpenNow(noite, at("01:30", "2026-11-14"))).toBe(true);
    expect(isOpenNow(noite, at("02:00", "2026-11-14"))).toBe(false);
  });

  it("fechado em dia sem horário", () => {
    expect(isOpenNow(noite, at("20:00", "2026-11-11"))).toBe(false);
    expect(todayLabel(noite, at("20:00", "2026-11-11"))).toBe("Fechado hoje");
    expect(todayLabel(noite, at("20:00"))).toBe("Hoje: 18:00 – 02:00");
  });
});

describe("fluxo do pedido", () => {
  it("entrega passa por 'saiu para entrega'; retirada passa por 'pronto'", () => {
    expect(statusSteps("DELIVERY")).toContain("OUT_FOR_DELIVERY");
    expect(statusSteps("PICKUP")).toContain("READY");
    expect(nextStatuses("PREPARING", "DELIVERY")).toEqual(["OUT_FOR_DELIVERY", "CANCELED"]);
    expect(nextStatuses("PREPARING", "PICKUP")).toEqual(["READY", "CANCELED"]);
  });

  it("pedido novo só pode ser aceito ou recusado; finalizado não muda mais", () => {
    expect(nextStatuses("PENDING", "DELIVERY")).toEqual(["CONFIRMED", "CANCELED"]);
    expect(nextStatuses("COMPLETED", "DELIVERY")).toEqual([]);
    expect(nextStatuses("CANCELED", "PICKUP")).toEqual([]);
  });

  it("previsão = confirmação + tempo estimado", () => {
    const confirmedAt = new Date("2026-11-13T22:00:00Z");
    expect(estimatedReadyAt({ confirmedAt, estimatedMinutes: 40 })?.toISOString()).toBe("2026-11-13T22:40:00.000Z");
    expect(estimatedReadyAt({ confirmedAt: null, estimatedMinutes: 40 })).toBeNull();
    expect(estimatedReadyAt({ confirmedAt, estimatedMinutes: null })).toBeNull();
  });
});

describe("notificações do pedido", () => {
  const base = { type: "DELIVERY", number: 12, storeName: "Lanchonete", estimatedMinutes: null, cancelReason: null };

  it("informa a previsão ao aceitar e o motivo ao cancelar", () => {
    expect(orderPushMessage({ ...base, status: "CONFIRMED", estimatedMinutes: 30 })?.body).toContain("30 minutos");
    expect(orderPushMessage({ ...base, status: "CANCELED", cancelReason: "Item em falta" })?.body).toContain("Item em falta");
    expect(orderPushMessage({ ...base, status: "OUT_FOR_DELIVERY" })?.title).toBe("Lanchonete · pedido #12");
  });

  it("não notifica pedido que acabou de ser criado", () => {
    expect(orderPushMessage({ ...base, status: "PENDING" })).toBeNull();
  });
});

describe("formatação", () => {
  it("preços", () => {
    expect(parsePriceToCents("22,50")).toBe(2250);
    expect(parsePriceToCents("R$ 1.234,90")).toBe(123490);
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("")).toBeNull();
    expect(centsToInput(2250)).toBe("22,50");
    expect(formatPrice(2250).replace(/\s/g, " ")).toBe("R$ 22,50");
  });

  it("slug e endereço", () => {
    expect(slugify("Lanchonete do Zé!")).toBe("lanchonete-do-ze");
    expect(formatAddress({ street: "Rua A", number: "10", district: "Centro", complement: "apto 2", reference: "padaria" })).toBe(
      "Rua A, 10 - Centro (apto 2) · Ref.: padaria",
    );
  });

  it("carrinho: mesmas opções em outra ordem são a mesma linha", () => {
    expect(cartKey("p1")).toBe("p1");
    expect(cartKey("p1", ["b", "a"])).toBe(cartKey("p1", ["a", "b"]));
    expect(cartKey("p1", ["a"])).not.toBe(cartKey("p1", ["b"]));
  });
});

describe("resumo do backoffice", () => {
  it("agrupa por dia no fuso de Brasília e não soma cancelados no valor", () => {
    const now = at("12:00");
    const stats = groupByDay(
      [
        { createdAt: at("23:30", "2026-11-12"), status: "COMPLETED", totalCents: 1000 }, // 02:30 UTC do dia 13
        { createdAt: at("10:00"), status: "COMPLETED", totalCents: 2000 },
        { createdAt: at("11:00"), status: "CANCELED", totalCents: 5000 },
        { createdAt: at("10:00", "2026-10-01"), status: "COMPLETED", totalCents: 9999 }, // fora do período
      ],
      3,
      now,
    );
    expect(stats.map((s) => s.day)).toEqual(["2026-11-13", "2026-11-12", "2026-11-11"]);
    expect(stats[0]).toMatchObject({ orders: 2, canceled: 1, totalCents: 2000 });
    expect(stats[1]).toMatchObject({ orders: 1, canceled: 0, totalCents: 1000 });
    expect(stats[2]).toMatchObject({ orders: 0 });
  });
});
