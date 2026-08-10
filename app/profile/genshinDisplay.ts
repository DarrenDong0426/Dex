// Shared Akasha-style display helpers for the Genshin surfaces (frontend
// Characters tab, Summary favorites, admin editor) — kept in one place so
// the three stay visually consistent.

export const ELEMENT_COLOR: Record<string, string> = {
  Pyro: "#e0602f",
  Hydro: "#3c8ee0",
  Anemo: "#5ec8b8",
  Electro: "#a35ad0",
  Dendro: "#8bc24a",
  Cryo: "#7ed6e0",
  Geo: "#d4a02a",
};

// icon-labeled stat list — glyph per stat name, elemental/physical DMG% gets
// a flame colored to the character's own element.
export function statIcon(name: string, elColor: string): { glyph: string; color?: string } {
  if (name === "Max HP") return { glyph: "♥" };
  if (name === "ATK") return { glyph: "⚔" };
  if (name === "DEF") return { glyph: "🛡" };
  if (name === "Elemental Mastery") return { glyph: "✦" };
  if (name === "Crit Rate") return { glyph: "◎" };
  if (name === "Crit DMG") return { glyph: "✷" };
  if (name === "Energy Recharge") return { glyph: "↻" };
  if (name.endsWith("DMG%")) return { glyph: "🔥", color: elColor };
  return { glyph: "●" };
}

export const HIDDEN_STATS = new Set(["Healing Bonus", "Incoming Healing Bonus"]);
