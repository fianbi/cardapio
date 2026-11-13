// Regras dos adicionais/opções de um produto. Sem dependências: usado no servidor, no site e nos testes.

export type OptionLike = { id: string; name: string; priceCents: number; isAvailable: boolean };
export type OptionGroupLike = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: OptionLike[];
};

export type ChosenOption = { groupName: string; optionName: string; priceCents: number };

export type OptionSelection =
  | { ok: true; chosen: ChosenOption[]; extraCents: number }
  | { ok: false; error: string };

/** Texto de ajuda do grupo, ex.: "Escolha 1", "Escolha até 3", "Escolha de 1 a 2". */
export function groupHint(group: Pick<OptionGroupLike, "minSelect" | "maxSelect">) {
  const { minSelect: min, maxSelect: max } = group;
  if (min === max) return `Escolha ${min}`;
  if (min === 0) return `Escolha até ${max}`;
  return `Escolha de ${min} a ${max}`;
}

/**
 * Confere as opções escolhidas contra os grupos do produto: opção existe, está disponível,
 * e cada grupo respeita o mínimo e o máximo. Devolve as opções na ordem do cardápio.
 */
export function selectOptions(groups: OptionGroupLike[], optionIds: string[] = []): OptionSelection {
  const wanted = new Set(optionIds);
  const known = new Set(groups.flatMap((g) => g.options.map((o) => o.id)));
  for (const id of wanted) {
    if (!known.has(id)) return { ok: false, error: "Uma das opções escolhidas não existe mais." };
  }

  const chosen: ChosenOption[] = [];
  for (const group of groups) {
    const picked = group.options.filter((o) => wanted.has(o.id));
    const unavailable = picked.find((o) => !o.isAvailable);
    if (unavailable) return { ok: false, error: `"${unavailable.name}" está em falta.` };
    if (picked.length < group.minSelect) {
      return { ok: false, error: `Escolha ${group.minSelect === 1 ? "uma opção" : `${group.minSelect} opções`} em "${group.name}".` };
    }
    if (picked.length > group.maxSelect) {
      return { ok: false, error: `Escolha no máximo ${group.maxSelect} em "${group.name}".` };
    }
    for (const o of picked) chosen.push({ groupName: group.name, optionName: o.name, priceCents: o.priceCents });
  }
  return { ok: true, chosen, extraCents: chosen.reduce((s, o) => s + o.priceCents, 0) };
}

/** Um grupo obrigatório sem opção disponível suficiente deixa o produto impossível de pedir. */
export function hasUnsatisfiableGroup(groups: OptionGroupLike[]) {
  return groups.some((g) => g.options.filter((o) => o.isAvailable).length < g.minSelect);
}

/** "Ao ponto, Bacon, Ovo" */
export function optionsLabel(options: { optionName: string }[]) {
  return options.map((o) => o.optionName).join(", ");
}
