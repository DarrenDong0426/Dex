// app/admin/editors/CardsEditor.tsx
// Pick a character (face-icon strip, mirrors the frontend's stamp filter),
// browse their cards as a grid, click one to edit owned/level/master
// rank/skill level/special training in a popup — the card can be anywhere
// in the grid, so a fixed on-screen modal is always reachable regardless.
"use client";

import { useEffect, useState } from "react";
import { charaIcon, cardArtUrl } from "@/app/profile/images";
import { gql } from "./gql";

type AdminChar = { characterId: number; name: string };

type CharacterCard = {
  cardId: number;
  name: string;
  rarity: number;
  assetbundleName: string;
  owned: boolean;
  level: number | null;
  masterRank: number | null;
  skillLevel: number | null;
  specialTraining: boolean | null;
};

// mirrors the frontend's CardBinder sort modes — "Release" = cardId asc,
// since Sekai card IDs are assigned sequentially by release date.
type SortMode = "rarity" | "owned" | "cardId";

export default function CardsEditor() {
  const [chars, setChars] = useState<AdminChar[] | null>(null);
  const [charId, setCharId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gql(`{ adminCharacters { characterId name } }`)
      .then((d) => {
        setChars(d.adminCharacters);
        if (d.adminCharacters[0]) setCharId(d.adminCharacters[0].characterId);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  if (error)
    return (
      <p className="text-sm text-[var(--accent-2)]">Couldn&apos;t load: {error}</p>
    );
  if (!chars) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      {/* character picker */}
      <div className="flex flex-wrap gap-2">
        {chars.map((c) => {
          const on = c.characterId === charId;
          return (
            <button
              key={c.characterId}
              onClick={() => setCharId(c.characterId)}
              className="flex items-center rounded-full border p-0.5 transition"
              style={{
                borderColor: on ? "var(--accent)" : "var(--line)",
                background: on ? "var(--panel-2)" : "transparent",
                boxShadow: on ? "0 0 12px -4px var(--accent)" : undefined,
              }}
              title={c.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={charaIcon(c.name)}
                alt={c.name}
                className="h-8 w-8 rounded-full object-cover"
                style={{ opacity: on ? 1 : 0.6 }}
                loading="lazy"
              />
            </button>
          );
        })}
      </div>

      {/* keyed by charId so switching characters fully remounts the pane
          (fresh cards/selected state) instead of resetting state in an effect */}
      {charId != null && <CharacterCardsPane key={charId} characterId={charId} />}
    </div>
  );
}

function CharacterCardsPane({ characterId }: { characterId: number }) {
  const [cards, setCards] = useState<CharacterCard[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("rarity");

  useEffect(() => {
    gql(
      `query($id:Int!){ characterCards(characterId:$id){
        cardId name rarity assetbundleName owned level masterRank skillLevel specialTraining
      } }`,
      { id: characterId },
    )
      .then((d) => setCards(d.characterCards))
      .catch((e) => setError(String(e.message ?? e)));
  }, [characterId]);

  async function saveCard(cardId: number, patch: Partial<CharacterCard>) {
    const current = cards?.find((c) => c.cardId === cardId);
    if (!current) return;
    const next = { ...current, ...patch };
    setCards(
      (prev) => prev?.map((c) => (c.cardId === cardId ? next : c)) ?? prev,
    );
    try {
      await gql(
        `mutation($id:Int!,$owned:Boolean!,$lvl:Int,$mr:Int,$sl:Int,$st:Boolean){
           setCardEdit(cardId:$id, owned:$owned, level:$lvl, masterRank:$mr, skillLevel:$sl, specialTraining:$st){ cardId }
         }`,
        {
          id: cardId,
          owned: next.owned,
          lvl: next.level,
          mr: next.masterRank,
          sl: next.skillLevel,
          st: next.specialTraining,
        },
      );
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }

  if (error)
    return (
      <p className="text-sm text-[var(--accent-2)]">
        Couldn&apos;t load cards: {error}
      </p>
    );
  if (!cards) return <p className="text-sm text-[var(--muted)]">Loading cards…</p>;

  const ownedCount = cards.filter((c) => c.owned).length;
  const selectedCard = cards.find((c) => c.cardId === selected) ?? null;

  const filtered = cards
    .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice()
    .sort((a, b) => {
      if (sort === "owned") {
        if (a.owned !== b.owned) return a.owned ? -1 : 1;
        return b.rarity - a.rarity || a.cardId - b.cardId;
      }
      if (sort === "cardId") return a.cardId - b.cardId;
      // default: rarity desc, then cardId
      return b.rarity - a.rarity || a.cardId - b.cardId;
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--panel)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${cards.length ? Math.round((ownedCount / cards.length) * 100) : 0}%`,
                background: "var(--accent)",
              }}
            />
          </div>
          <span className="font-bold text-[var(--text)]">
            {ownedCount}/{cards.length} owned
          </span>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards…"
          className="ml-auto w-full max-w-[200px] rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />

        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--panel)] p-0.5 text-[11px] font-semibold">
          {(
            [
              ["rarity", "Rarity"],
              ["owned", "Owned"],
              ["cardId", "Release"],
            ] as [SortMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setSort(m)}
              className="rounded-full px-2.5 py-1 transition"
              style={{
                background: sort === m ? "var(--accent)" : "transparent",
                color: sort === m ? "#0c0a1e" : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {filtered.map((c) => (
          <button
            key={c.cardId}
            onClick={() => setSelected(c.cardId)}
            title={c.name}
            className="relative aspect-[3/4] overflow-hidden rounded-xl border transition"
            style={{
              borderColor: c.owned ? "var(--line)" : "#2a2e4a",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardArtUrl(c.assetbundleName, Boolean(c.specialTraining))}
              alt={c.name}
              className="h-full w-full object-cover"
              style={{
                filter: c.owned ? undefined : "grayscale(1) brightness(0.4)",
              }}
              loading="lazy"
              onError={(e) => {
                // some cards only have one art variant (e.g. certain collab
                // cards have no untrained state) — try the other before
                // giving up
                const img = e.currentTarget;
                if (img.dataset.fallback !== "1") {
                  img.dataset.fallback = "1";
                  img.src = cardArtUrl(c.assetbundleName, !c.specialTraining);
                } else {
                  img.style.visibility = "hidden";
                }
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1 text-center text-[11px] font-bold text-[#f0d15a]">
              {"★".repeat(c.rarity)}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            No cards match &quot;{query}&quot;.
          </p>
        )}
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelected(null)}
          onSave={(patch) => saveCard(selectedCard.cardId, patch)}
        />
      )}
    </div>
  );
}

function CardModal({
  card,
  onClose,
  onSave,
}: {
  card: CharacterCard;
  onClose: () => void;
  onSave: (patch: Partial<CharacterCard>) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-lg leading-none text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
        >
          ×
        </button>

        <div className="flex flex-col gap-6 sm:flex-row">
          {/* left: full, uncropped illustration */}
          <div className="sm:w-3/5">
            <div className="relative overflow-hidden rounded-xl border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardArtUrl(card.assetbundleName, Boolean(card.specialTraining))}
                alt={card.name}
                className="w-full"
                style={{
                  filter: card.owned ? undefined : "grayscale(1) brightness(0.5)",
                }}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallback !== "1") {
                    img.dataset.fallback = "1";
                    img.src = cardArtUrl(
                      card.assetbundleName,
                      !card.specialTraining,
                    );
                  } else {
                    img.style.visibility = "hidden";
                  }
                }}
              />
              <div className="absolute bottom-3 left-3 text-2xl font-bold text-[#f0d15a] drop-shadow">
                {"★".repeat(card.rarity)}
              </div>
            </div>
          </div>

          {/* right: name + editable fields */}
          <div className="flex flex-col gap-4 sm:w-2/5">
            <div>
              <h3 className="text-lg font-bold text-[var(--text)]">{card.name}</h3>
              <button
                onClick={() => onSave({ owned: !card.owned })}
                className="mt-2 rounded-md border px-3 py-1 text-xs font-semibold transition"
                style={{
                  background: card.owned ? "var(--accent)" : "transparent",
                  borderColor: card.owned ? "var(--accent)" : "var(--line)",
                  color: card.owned ? "#0c0a1e" : "var(--muted)",
                }}
              >
                {card.owned ? "Owned" : "Not owned"}
              </button>
            </div>

            {card.owned && (
              <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4">
                <NumberField
                  label="Level"
                  value={card.level ?? 1}
                  onCommit={(v) => onSave({ level: v })}
                />
                <NumberField
                  label="Master rank"
                  value={card.masterRank ?? 0}
                  onCommit={(v) => onSave({ masterRank: v })}
                />
                <NumberField
                  label="Skill level"
                  value={card.skillLevel ?? 1}
                  onCommit={(v) => onSave({ skillLevel: v })}
                />
                {/* only 3★/4★ cards have a special-training state in-game */}
                {card.rarity >= 3 && (
                  <label className="flex items-center justify-between text-xs text-[var(--muted)]">
                    Special training
                    <input
                      type="checkbox"
                      checked={card.specialTraining ?? false}
                      onChange={(e) =>
                        onSave({ specialTraining: e.target.checked })
                      }
                      className="accent-[var(--accent)]"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
      {label}
      <input
        type="number"
        min={0}
        defaultValue={value}
        key={value}
        onBlur={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!Number.isNaN(v) && v !== value) onCommit(v);
        }}
        className="w-16 rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}
