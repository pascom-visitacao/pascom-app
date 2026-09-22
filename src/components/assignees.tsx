"use client";

// Adaptado do componente "Assignees" do Bencho (MIT, (c) 2026 Lorenzo Cabra,
// https://bencho.dev/licence) - o aviso da licença está em
// THIRD_PARTY_NOTICES.md, na raiz do projeto. Os comentários de design do
// original foram mantidos; os que descreviam só os dados de demonstração do
// Bencho (as quatro fotos e nomes do "elenco") foram trocados por notas sobre
// como o Pascom alimenta o componente.
//
// O que mudou em relação ao original:
// - `Picker` virou `Assignees`, e o pacote é `motion/react` (o mesmo do
//   BounceSidebar) em vez de `framer-motion`.
// - Quem aparece vem de `people` (users.avatar_url, com iniciais no padrão
//   .avatar do design system quando não há foto), e a seleção vem de
//   `value`/`onChange` em vez de um elenco fixo com estado interno.
// - Um responsável só (`multiple` desligado) é o padrão: cada atividade e cada
//   vaga têm um único responsável no banco. O modo com vários continua aqui.
// - `readOnly` (só leitura, pras vagas da Agenda), `disabled`, `defaultOpen`
//   (fechado por padrão) e `showNames`.
// - Fecha com clique fora e com Esc (ver a nota sobre isso mais abaixo).
// - O texto "Unassigned" virou "Sem responsável".
// - Cores e fonte vêm dos tokens do design system (assignees.css).

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import "./assignees.css";

/* ══ Assignees ════════════════════════════════════════════
   A pill that opens a list, and fills up with faces as you
   assign them. One, two, four — the pill grows to hold them
   and they overlap into a stack rather than a row.

   It was called "People picker", which named the widget
   rather than the job. What this is FOR is putting names
   against a thing — assigning a task, adding contributors —
   and the pill is the answer to "who is on this".

   THE PILL IS THE READOUT. There is no count badge and no
   "3 selected" caption: the faces themselves say who, which
   is the thing a person actually wants back. A number tells
   you how many you picked; a stack of faces tells you whether
   you picked the right ones. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* Pascom: the original drew from a fixed cast of four pictures kept in the
   Bencho repo (AVATARS, licensed not to travel) and a CAST of four names.
   Here the people come in as a prop, each with the users.avatar_url from the
   database — no picture, no problem: the initials fall back to the design
   system's .avatar look, so the stack never has a hole in it. */
export type AssigneePerson = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  /* the second line of the list row (a role, an area) — optional */
  detail?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* One face: the photo when there is one, the design system's initials
   circle when there is not. Decorative either way — the pill and the rows
   carry the names as text. */
function Portrait({ person, size, className }: { person: AssigneePerson; size: number; className?: string }) {
  if (person.avatarUrl) {
    return (
      <Image className={className} src={person.avatarUrl} alt="" width={size} height={size} draggable={false} />
    );
  }
  return (
    <span className={`avatar${className ? ` ${className}` : ""}`} aria-hidden="true">
      {initials(person.name)}
    </span>
  );
}

/* the block's own box. Reserved for the list OPEN, so closing
   it does not resize the card underneath — the same bargain
   the selection list makes, and for the same reason: a block
   that changes height when you press it makes the wall jump.

   Pascom: only the WIDTH is kept. The list is position: absolute and floats
   over whatever is under the pill (a modal's fields, a row), so there is no
   height to reserve — the wall's reason for reserving it (nothing below the
   block should jump) is already true of an overlay. */
const W = 264;

/* the faces in the pill */
const FACE = 28;
const CORNER = 22;
/* how much of each face the next one covers, px */
const LAP = 10;

/* ── the other way to stack ────────────────────────────────
   A row of overlapping faces is the honest default: it says
   who, in order, and it grows sideways as you add people. But
   it grows sideways, and a pill in a dense toolbar cannot
   always afford that.

   So the second arrangement packs the same four into the
   footprint of ONE. Nothing overlaps — that is the whole point
   of it, and the reason it is not simply "a tighter row". A
   row hides parts of faces behind other faces; the quad shows
   all of every face and pays for it in size.

   The box is FACE across whatever the count, so the pill in
   this mode does not grow at all. That is the trade the mode
   exists to make, and drawing one face big and four faces
   small is what makes it visible: the box does not fill up,
   it SUBDIVIDES.

   Three is the awkward count. It fills reading order and
   leaves the last cell empty, which looks like a gap and is
   actually the point: the quad is a fixed set of four slots,
   and three people occupy three of them. Centring the odd one
   balances the picture but breaks the grid — the face lands
   where no cell is, and adding the fourth person then shunts
   it sideways for no reason the eye can name. */
const quad = (n: number, gut: number) => {
  const cell = (FACE - gut) / 2;
  const s = cell / FACE;
  const a = cell / 2;          /* centre of the near cell */
  const b = FACE - cell / 2;   /* centre of the far one */
  const m = FACE / 2;
  if (n <= 1) return [{ cx: m, cy: m, s: 1 }];
  if (n === 2) return [{ cx: a, cy: m, s }, { cx: b, cy: m, s }];
  if (n === 3) return [{ cx: a, cy: a, s }, { cx: b, cy: a, s }, { cx: a, cy: b, s }];
  return [
    { cx: a, cy: a, s }, { cx: b, cy: a, s },
    { cx: a, cy: b, s }, { cx: b, cy: b, s },
  ];
};

export function Assignees({
  people,
  /* the ids picked now (controlled from outside; a new value from the server
     replaces whatever was picked here) */
  value = [],
  onChange,
  /* one person, or several. One is what a task or a slot has */
  multiple = false,
  /* in one-person mode, may the picked person be un-picked by pressing them
     again? Off: a task cannot be left without an owner from here */
  clearable = false,
  /* only shows who — no list, no chevron (the slots on the agenda) */
  readOnly = false,
  /* beside the faces, in the read-only pill: the names, as text */
  showNames = false,
  disabled = false,
  /* what the list and the pill are called to a screen reader */
  label = "Responsável",
  defaultOpen = false,
  /* the pill's corner and the card's, px */
  corner = CORNER,
  /* how far the faces overlap, px — 0 is a row of separate
     circles, which is a real answer and not a broken one */
  overlap = LAP,
  /* "Row" or "Grid" — see quad() above */
  stack = "Row",
}: {
  people: AssigneePerson[];
  value?: string[];
  onChange?: (ids: string[]) => void;
  multiple?: boolean;
  clearable?: boolean;
  readOnly?: boolean;
  showNames?: boolean;
  disabled?: boolean;
  label?: string;
  defaultOpen?: boolean;
  corner?: number;
  overlap?: number;
  stack?: string;
}) {
  /* open, and with two already chosen. A picker drawn shut is
     a pill with a word in it: true of the component and
     useless as a picture of it. This is the state worth
     landing on — the pill doing its job and the list showing
     why.

     Pascom: that was the picture for the bench. In a form the pill starts
     shut (`defaultOpen`), and what is chosen comes from `value`. */
  const [open, setOpen] = useState(defaultOpen);
  /* Pascom: the list floats over what is next to the pill, so while it is
     open (and while it is still leaving) the whole block is lifted above its
     siblings — see `data-raised` in the stylesheet. Stays up until the exit
     animation ends, or the list would drop behind the next field mid-fade. */
  const [raised, setRaised] = useState(defaultOpen);
  const [picked, setPicked] = useState<string[]>(value);

  /* A new `value` from outside (the server answered) wins over what was
     picked here — adjusted while rendering, keyed by content, because the
     parent builds a fresh array on every render. */
  const valueKey = value.join("|");
  const [seenValueKey, setSeenValueKey] = useState(valueKey);
  if (valueKey !== seenValueKey) {
    setSeenValueKey(valueKey);
    setPicked(value);
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  /* Pascom: inside a modal that scrolls, the floating list runs past the
     bottom of what is visible and its last rows are out of sight (found in
     the real task modal: 4 of 5 people showing). When the list has finished
     unfolding, bring it into view — "nearest", so nothing moves when it
     already fits. It waits for the end of the animation on purpose: while the
     card is still scaled down its box is shorter than it will be, and a
     scroll worked out from that came up short or not at all. Instant rather
     than smooth: a smooth one was cancelled by the click that opened it. */
  const revealList = () => {
    rootRef.current?.querySelector(".pik-card")?.scrollIntoView({ block: "nearest", behavior: "instant" });
  };

  const r = clamp(corner, 0, 26);
  const lap = clamp(overlap, 0, 22);
  const grid = stack === "Grid";

  /* the people picked, in the order they were picked — an id nobody has
     (a deleted account, a person from another area) is not drawn */
  const chosen = picked
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is AssigneePerson => p !== undefined);
  const names = chosen.map((p) => p.name).join(", ");

  /* Overlap still means something in the quad, because a knob
     that goes dead in half the modes is a knob you have to
     explain. It reads as PACKING there rather than as covering:
     4px of air at nought, 2px at full. It never reaches zero —
     "they never touch" is the arrangement's one promise, and a
     slider is not allowed to break it. */
  const spots = quad(chosen.length, 4 - (lap / 22) * 2);

  /* ── the width is COMPUTED, not measured ─────────────────
     Framer's `layout` would animate this by measuring screen
     rectangles, and every block on this bench is drawn at a
     fraction of its own size — see Gooey.tsx. A width worked
     out from the count is the same number at any zoom, and CSS
     can transition it without knowing where the block is. */
  const rail = !chosen.length
    ? 0
    : grid
      /* one face wide at every count — the quad's whole bargain */
      ? FACE
      : FACE + (chosen.length - 1) * (FACE - lap);

  /* ── IT DOES NOT CLOSE ON AN OUTSIDE PRESS ───────────────
     It did, and that is the right behaviour for a dropdown in
     an application — the note that used to be here called it
     the one thing every dropdown has to do. It is the wrong
     behaviour for a block on this wall.

     Measured: one real click anywhere on the page collapsed
     the list, and nothing brought it back — so the card spent
     the rest of the session showing a pill and nothing else,
     which is a demonstration of a third of the component. The
     same class of fault as a demo that leaves a toggle on.

     The pill is still the toggle, so it is still dismissible
     by the person actually using it. What is gone is the case
     where something you did to a DIFFERENT block put this one
     away.

     Anyone lifting this into a real interface wants the
     listener back; it is four lines and the reason it is not
     here is the wall, not the pattern.

     Pascom: this is a real interface, so the listener is back — plus Esc,
     which puts the focus back on the pill. The keydown goes in the capture
     phase so that, inside a modal, Esc closes the list before anything
     else. */
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      pillRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  const toggle = (id: string) => {
    let next: string[];
    if (multiple) {
      next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    } else if (picked.includes(id)) {
      next = clearable ? [] : picked;
    } else {
      next = [id];
    }

    if (next.join("|") !== picked.join("|")) {
      setPicked(next);
      onChange?.(next);
    }
    /* one person is one choice: the list has done its job */
    if (!multiple) {
      setOpen(false);
      pillRef.current?.focus();
    }
  };

  /* ── the faces ─────────────────────────────────────────────
     Absolutely placed inside a rail whose width is the
     arithmetic above, so the pill grows and shrinks by
     one CSS transition rather than by anything watching
     the DOM.

     Reversed z-order: the first face sits on top of the
     second, so the stack reads left to right the way the
     list does. Painted the other way the newest arrival
     covers everyone before it, and adding a fourth
     person looks like losing the first three. */
  const rails = (
    <span className="pik-rail" style={{ width: rail }}>
      <AnimatePresence initial={false}>
        {chosen.map((person, i) => {
          /* ── EVERY face is placed by its transform ─────
             It used to ride on `left`, which cannot carry
             the quad: that one needs a size and two axes,
             and a face swapping arrangements has to travel
             rather than teleport. One vector and one scale
             describe both layouts, so switching modes is
             the same animation as arriving. */
          const spot = grid ? spots[Math.min(i, spots.length - 1)] : null;
          const tx = spot ? spot.cx - FACE / 2 : i * (FACE - lap);
          const ty = spot ? spot.cy - FACE / 2 : 0;
          const sc = spot ? spot.s : 1;
          return (
            <motion.span
              key={person.id}
              className="pik-face"
              style={{ zIndex: people.length - i }}
              /* ── a face lands, it does not fade in ──────
                 It drops from slightly above with a turn on
                 it and overshoots on the way to rest, so
                 adding somebody reads as a token being put
                 down. Leaving is the same move backwards and
                 quicker — you are removing a name, not
                 watching an animation.

                 The rotation is small and it is the reason
                 this feels different from a scale: a circle
                 scaling is a circle, and a circle scaling
                 while it turns is an object.

                 The drop lands at `ty`, not at nought, and
                 the pop lands at `sc`, not at one: in the
                 quad a face's rest is wherever its cell is
                 and however big its cell is. */
              initial={{ scale: 0.2 * sc, opacity: 0, x: tx, y: ty - 10, rotate: -22 }}
              animate={{ scale: sc, opacity: 1, x: tx, y: ty, rotate: 0 }}
              exit={{ scale: 0.2 * sc, opacity: 0, x: tx, y: ty - 6, rotate: 14 }}
              /* ── two springs, and the reason is the knob ──
                 Position and size are also what the Overlap
                 slider moves, and a slider wants a follower,
                 not a bouncer: dragged to an end, a 0.48-zeta
                 spring wobbles for a third of a second after
                 the thumb has stopped. So x, y and scale get
                 a tight one that tracks.

                 Rotate keeps the loose spring, and it is the
                 half that was carrying the character anyway —
                 the face still rocks past level as it sets
                 down. Nothing drags the rotation, so nothing
                 is waiting on it. */
              transition={{
                type: "spring", stiffness: 600, damping: 21, mass: 0.8,
                x: { type: "spring", stiffness: 660, damping: 34, mass: 0.7 },
                y: { type: "spring", stiffness: 660, damping: 34, mass: 0.7 },
                scale: { type: "spring", stiffness: 660, damping: 34, mass: 0.7 },
                opacity: { duration: 0.12 },
              }}
            >
              <Portrait person={person} size={FACE} />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );

  /* Só leitura: sem lista, sem seta, sem botão — quem está nisso e mais nada. */
  if (readOnly) {
    return (
      <div
        ref={rootRef}
        className="pik"
        data-readonly
        role={showNames ? undefined : "img"}
        aria-label={showNames ? undefined : names ? `${label}: ${names}` : `${label}: ninguém`}
      >
        <div className="pik-pill">
          {rails}
          {showNames && <span className="pik-say">{names}</span>}
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        className="pik"
        data-raised={raised || undefined}
        data-multiple={multiple || undefined}
        style={{
          width: W,
          maxWidth: "100%",
          /* ── concentric, and it follows the knob ───────────
             The row's hover pad was a flat 12 against a card cut
             at 22, which reads squarer than the box holding it.
             The rule the rest of this bench uses is the radius
             of a thing inside another, LESS the gap between them
             — the card's 6px padding here — so 22 gives 16.

             Published from here rather than written in the
             stylesheet because the card's corner is a knob: at 0
             the pair is square together and at 26 both are as
             round as they go, instead of the pad being right at
             one setting and wrong at the rest. */
          "--pik-row-r": `${Math.max(0, r - 6)}px`,
        } as CSSProperties}
      >
        {/* Pascom: era aria-haspopup="listbox" - a lista abaixo não tem mais
            role nenhum (ver o comentário perto de .pik-card), então prometer
            um widget específico não descreve nada de verdade. aria-expanded
            sozinho já é o padrão ARIA APG de "disclosure" pra um botão que
            mostra/esconde conteúdo. */}
        <button
          ref={pillRef}
          type="button"
          className="pik-pill"
          style={{ borderRadius: r }}
          disabled={disabled}
          onClick={() => {
            if (!open) setRaised(true);
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-label={names ? `${label}: ${names}` : undefined}
        >
          {/* ── the faces ─────────────────────────────────────
              (see `rails` above) */}
          {rails}

          {/* ── what the pill says with nothing in it ────────
              It said "Assign", which is an instruction — and the
              pill is a READOUT: with faces in it, it reports who
              is on this, so with none in it, it should report
              that nobody is. One word, the state rather than the
              verb, and it goes the moment there is a face,
              because a label beside three pictures is the control
              describing itself instead of answering. */}
          {chosen.length === 0 && <span className="pik-say">Sem responsável</span>}

          <ChevronDown className="pik-chev" size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>

        <AnimatePresence onExitComplete={() => setRaised(false)}>
          {open && (
            <motion.div
              className="pik-card"
              style={{ borderRadius: r }}
              aria-label={label}
              /* Pascom: era role="listbox" com role="option"/aria-selected nas
                 linhas abaixo, prometendo a navegação por setas da ARIA APG
                 pra listbox - o componente nunca implementou isso (achado
                 confirmado com teclado real: ArrowDown não move nada, só
                 Tab). Como os <button> de baixo já funcionam via Tab sozinhos,
                 tirar o ARIA errado é melhor que consertá-lo. */
              /* ── it unfolds OUT OF the pill ──────────────────
                 The origin is the card's top-left, which is the
                 pill's own left edge, so it opens down and out
                 from the corner it belongs to rather than growing
                 from its middle like a box appearing.

                 NOT a goo morph, and that was considered first:
                 the reorder list took the metaball out from
                 between its card and its button for the reason
                 that applies here too — two separate objects
                 joined by a bridge read as welded, not as one
                 opening. A metaball is for a single body changing
                 shape, which is also why the faces do not get one:
                 they are photographs, and the filter thresholds
                 alpha.

                 The scale starts high — 0.86 across, 0.72 down —
                 because a card is a rounded rectangle and a scale
                 drags its corner radius with it. From a third of
                 its height the corners arrive visibly squashed;
                 from three quarters, with the spring doing the
                 work, they do not. The BOUNCE is where the
                 character is, not the distance. */
              initial={{ opacity: 0, y: -10, scaleX: 0.86, scaleY: 0.72 }}
              animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleX: 0.92, scaleY: 0.86 }}
              transition={{
                type: "spring", stiffness: 460, damping: 23, mass: 0.9,
                opacity: { duration: 0.12 },
              }}
              onAnimationComplete={(definition) => {
                /* the exit animation completes too, and must not scroll: only
                   the one that ended at full opacity is the list opening */
                if ((definition as { opacity?: number }).opacity === 1) revealList();
              }}
            >
              {people.map((p, index) => {
                const on = picked.includes(p.id);
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    className="pik-row"
                    data-on={on || undefined}
                    onClick={() => toggle(p.id)}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring", stiffness: 620, damping: 34, mass: 0.7,
                      delay: 0.04 * Math.min(index, 8) + 0.03,
                    }}
                  >
                    <Portrait person={p} size={32} className="pik-av" />
                    <span className="pik-who">
                      {/* title nativo: o nome pode passar dos ~166px da linha
                          (ellipsis em assignees.css) e não sobrava nenhuma
                          forma de ver o valor inteiro. */}
                      <span className="pik-name" title={p.name}>{p.name}</span>
                      {p.detail && <span className="pik-role">{p.detail}</span>}
                    </span>
                    <span className="pik-mark">
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.span
                            className="pik-tick"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 600, damping: 28, mass: 0.6 }}
                          >
                            <Check size={12} strokeWidth={3} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
