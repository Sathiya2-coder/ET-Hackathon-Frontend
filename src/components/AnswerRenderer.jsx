import React from 'react';

/**
 * Renders **bold**, numbered lists, bullet lists, italic, and plain paragraphs
 * from a plain-text AI answer string.
 */

// Parse inline bold **text** → <strong>
function parseBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-white font-semibold">{part}</strong>
      : part
  );
}

// Parse inline *italic* → <em>
function parseInline(text) {
  const boldParsed = parseBold(text);
  return boldParsed;
}

function renderLine(line, idx) {
  const trimmed = line.trim();

  // Numbered list: "1. ..." or "1) ..."
  const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
  if (numMatch) {
    return (
      <div key={idx} className="flex items-start space-x-3 py-1.5">
        <span
          className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
          style={{ background: '#eab308', minWidth: '20px' }}
        >
          {numMatch[1]}
        </span>
        <span className="text-gray-300 text-sm leading-relaxed">
          {parseInline(numMatch[2])}
        </span>
      </div>
    );
  }

  // Bullet: "- ..." or "* ..."
  const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
  if (bulletMatch) {
    return (
      <div key={idx} className="flex items-start space-x-2.5 py-1">
        <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-[#eab308] opacity-80" />
        <span className="text-gray-300 text-sm leading-relaxed">
          {parseInline(bulletMatch[1])}
        </span>
      </div>
    );
  }

  // Heading: "# ..." or "## ..."
  const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const sizes = ['text-base', 'text-sm', 'text-xs'];
    return (
      <h4 key={idx} className={`${sizes[level - 1]} font-bold text-white mt-3 mb-1 tracking-wide`}>
        {parseInline(headingMatch[2])}
      </h4>
    );
  }

  // Note line: starts with "(" or "(Please"
  if (trimmed.startsWith('(') || trimmed.toLowerCase().startsWith('please note')) {
    return (
      <p key={idx} className="text-[10px] text-gray-500 italic mt-3 leading-relaxed border-l-2 border-[#eab308]/20 pl-3">
        {parseInline(trimmed)}
      </p>
    );
  }

  // Empty line → spacer
  if (trimmed === '') return <div key={idx} className="h-2" />;

  // Plain paragraph
  return (
    <p key={idx} className="text-gray-300 text-sm leading-relaxed">
      {parseInline(trimmed)}
    </p>
  );
}

export default function AnswerRenderer({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  // Group consecutive numbered items into a block for visual separation
  const blocks = [];
  let currentGroup = [];
  let inNumbered = false;

  lines.forEach((line, idx) => {
    const isNumbered = /^\d+[.)]\s+/.test(line.trim());
    if (isNumbered && !inNumbered) { if (currentGroup.length) { blocks.push({ type: 'misc', lines: currentGroup }); currentGroup = []; } inNumbered = true; }
    if (!isNumbered && inNumbered) { blocks.push({ type: 'numbered', lines: currentGroup }); currentGroup = []; inNumbered = false; }
    currentGroup.push(line);
  });
  if (currentGroup.length) blocks.push({ type: inNumbered ? 'numbered' : 'misc', lines: currentGroup });

  return (
    <div className="space-y-0.5">
      {blocks.map((block, bi) => {
        if (block.type === 'numbered') {
          return (
            <div key={bi} className="bg-white/[0.02] border border-[#eab308]/10 rounded-xl px-4 py-3 my-2 space-y-0.5">
              {block.lines.map((l, li) => renderLine(l, li))}
            </div>
          );
        }
        return block.lines.map((l, li) => renderLine(l, `${bi}-${li}`));
      })}
    </div>
  );
}
