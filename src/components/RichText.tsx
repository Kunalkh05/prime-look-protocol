import { Fragment, type ReactNode } from "react";

/**
 * Renders the light `<b>…</b>` markup used throughout the recommendation copy.
 *
 * This replaces dangerouslySetInnerHTML. The strings are all our own, so the
 * old approach was not exploitable — but it meant every future edit to the copy
 * was one stray interpolation away from being an injection point, for a feature
 * that only ever needed bold text.
 */

const PATTERN = /<b>(.*?)<\/b>/gs;

function parseRich(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(<Fragment key={key++}>{text.slice(last, start)}</Fragment>);
    nodes.push(<b key={key++}>{match[1]}</b>);
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);

  return nodes;
}

export function RichText({ text }: { text: string }) {
  return <>{parseRich(text)}</>;
}

/** A <li> whose content may contain our bold markers. */
export function RichItem({ text, className }: { text: string; className?: string }) {
  return (
    <li className={className}>
      <RichText text={text} />
    </li>
  );
}

/** Map a list of marked-up strings into list items. */
export function RichList({ items, avoid }: { items: string[]; avoid?: boolean }) {
  return (
    <>
      {items.map((t, i) => (
        <RichItem key={i} text={t} className={avoid ? "avoid" : undefined} />
      ))}
    </>
  );
}
