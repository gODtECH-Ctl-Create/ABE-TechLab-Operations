import type { ReactNode } from "react";

function inlineText(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      : part,
  );
}

export function GeneratedBrief({ children }: { children: string }) {
  const lines = children.split("\n");
  const content: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    content.push(<ul key={`list-${content.length}`}>{list.map((item, index) => <li key={`${item}-${index}`}>{inlineText(item)}</li>)}</ul>);
    list = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }
    const bullet = line.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) content.push(<h3 key={`heading-${content.length}`}>{inlineText(heading[1])}</h3>);
    else content.push(<p key={`paragraph-${content.length}`}>{inlineText(line)}</p>);
  });
  flushList();

  return <div className="generated-brief">{content}</div>;
}
