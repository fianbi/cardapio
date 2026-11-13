import { describe, expect, it } from "vitest";
import { groupHint, hasUnsatisfiableGroup, optionsLabel, selectOptions, type OptionGroupLike } from "@cardapio/shared/options";

const groups: OptionGroupLike[] = [
  {
    id: "g1",
    name: "Ponto da carne",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "mal", name: "Mal passado", priceCents: 0, isAvailable: true },
      { id: "ponto", name: "Ao ponto", priceCents: 0, isAvailable: true },
    ],
  },
  {
    id: "g2",
    name: "Adicionais",
    minSelect: 0,
    maxSelect: 2,
    options: [
      { id: "bacon", name: "Bacon", priceCents: 400, isAvailable: true },
      { id: "ovo", name: "Ovo", priceCents: 200, isAvailable: true },
      { id: "cheddar", name: "Cheddar", priceCents: 300, isAvailable: false },
    ],
  },
];

describe("selectOptions", () => {
  it("soma o valor dos adicionais e devolve as opções na ordem do cardápio", () => {
    const result = selectOptions(groups, ["ovo", "ponto", "bacon"]);
    expect(result).toEqual({
      ok: true,
      extraCents: 600,
      chosen: [
        { groupName: "Ponto da carne", optionName: "Ao ponto", priceCents: 0 },
        { groupName: "Adicionais", optionName: "Bacon", priceCents: 400 },
        { groupName: "Adicionais", optionName: "Ovo", priceCents: 200 },
      ],
    });
  });

  it("aceita só o grupo obrigatório", () => {
    expect(selectOptions(groups, ["mal"])).toMatchObject({ ok: true, extraCents: 0 });
  });

  it("exige o grupo obrigatório", () => {
    const result = selectOptions(groups, ["bacon"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("Ponto da carne");
  });

  it("recusa mais opções que o máximo do grupo", () => {
    expect(selectOptions(groups, ["mal", "ponto"]).ok).toBe(false);
    const semLimite = { ...groups[1], options: groups[1].options.map((o) => ({ ...o, isAvailable: true })) };
    expect(selectOptions([semLimite], ["bacon", "ovo", "cheddar"]).ok).toBe(false);
  });

  it("recusa opção em falta", () => {
    const result = selectOptions(groups, ["ponto", "cheddar"]);
    expect(!result.ok && result.error).toContain("Cheddar");
  });

  it("recusa opção que não é do produto", () => {
    expect(selectOptions(groups, ["ponto", "de-outro-produto"]).ok).toBe(false);
  });

  it("ignora opção repetida", () => {
    expect(selectOptions(groups, ["ponto", "bacon", "bacon"])).toMatchObject({ ok: true, extraCents: 400 });
  });

  it("produto sem grupos aceita lista vazia e recusa qualquer opção", () => {
    expect(selectOptions([], [])).toEqual({ ok: true, chosen: [], extraCents: 0 });
    expect(selectOptions([], ["x"]).ok).toBe(false);
  });
});

describe("textos e disponibilidade", () => {
  it("groupHint", () => {
    expect(groupHint({ minSelect: 1, maxSelect: 1 })).toBe("Escolha 1");
    expect(groupHint({ minSelect: 0, maxSelect: 3 })).toBe("Escolha até 3");
    expect(groupHint({ minSelect: 1, maxSelect: 2 })).toBe("Escolha de 1 a 2");
  });

  it("optionsLabel", () => {
    expect(optionsLabel([{ optionName: "Ao ponto" }, { optionName: "Bacon" }])).toBe("Ao ponto, Bacon");
  });

  it("grupo obrigatório sem opção disponível deixa o produto impossível de pedir", () => {
    expect(hasUnsatisfiableGroup(groups)).toBe(false);
    const semEstoque = [{ ...groups[0], options: groups[0].options.map((o) => ({ ...o, isAvailable: false })) }];
    expect(hasUnsatisfiableGroup(semEstoque)).toBe(true);
  });
});
