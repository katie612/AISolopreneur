"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import type { Partner } from "@/lib/types";
import { TONE } from "@/lib/tone";

const EMOJIS = ["👑", "🧢", "💅", "🧔", "👩", "👨", "🦄", "🐻", "🌸", "🔥", "🍕", "🦖"];

export default function SetupSheet({
  open,
  partners,
  firstTime,
  onClose,
  onSave,
}: {
  open: boolean;
  partners: Record<"a" | "b", Partner>;
  firstTime: boolean;
  onClose?: () => void;
  onSave: (v: { a: { name: string; emoji: string }; b: { name: string; emoji: string } }) => void;
}) {
  const [a, setA] = useState({ name: partners.a.name, emoji: partners.a.emoji });
  const [b, setB] = useState({ name: partners.b.name, emoji: partners.b.emoji });

  return (
    <Sheet open={open} onClose={firstTime ? undefined : onClose} title={firstTime ? "Who's who?" : "Edit names"}>
      {firstTime && (
        <p className="mb-4 text-ink-soft">
          Both of you live in this one demo. Swap between you with the toggle up top. Names are
          totally editable, no judgement.
        </p>
      )}
      <PartnerRow label="Partner one" tone={partners.a.tone} value={a} onChange={setA} />
      <PartnerRow label="Partner two" tone={partners.b.tone} value={b} onChange={setB} />
      <button
        className="pop-btn mt-2 w-full bg-pink py-3 text-lg text-white"
        onClick={() => onSave({ a, b })}
      >
        {firstTime ? "Let's go 🚀" : "Save"}
      </button>
    </Sheet>
  );
}

function PartnerRow({
  label,
  tone,
  value,
  onChange,
}: {
  label: string;
  tone: Partner["tone"];
  value: { name: string; emoji: string };
  onChange: (v: { name: string; emoji: string }) => void;
}) {
  return (
    <div className={`pop-sm mb-4 p-3 ${TONE[tone].bgSoft}`}>
      <div className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </div>
      <input
        className="w-full rounded-xl border-[2.5px] border-ink bg-white px-3 py-2 font-display text-lg font-semibold outline-none focus:ring-4 focus:ring-sunshine"
        value={value.name}
        maxLength={18}
        placeholder="Name"
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto py-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange({ ...value, emoji: e })}
            className={`chip h-10 w-10 shrink-0 text-xl ${value.emoji === e ? "bg-sunshine" : "bg-white"}`}
            aria-label={`Use ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
