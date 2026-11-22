"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";

// Tinggi baris tetap 22px; di layar sentuh teks 16px supaya iOS tidak memperbesar
// halaman saat textarea difokus (field di bawah 16px memicu zoom).
const LINE_HEIGHT = 22;
const PADDING_TOP = 10;
const PADDING_LEFT = 14;
const KEYWORDS = new Set(["if", "else", "for", "to", "by", "in", "while", "switch", "var", "varip", "break", "continue", "type", "method", "and", "or", "not", "true", "false", "na"]);
const TOP_LEVEL = new Set(["indicator", "plot", "plotshape", "plotchar", "hline", "fill", "bgcolor", "barcolor", "alertcondition", "input"]);
const INDENT_OPENERS = /(=>\s*$)|^\s*(if|else|for|while|switch|type)\b/;

// Pewarnaan sederhana per baris; cukup untuk keterbacaan, bukan parser penuh.
function highlightLine(line) {
    const parts = [];
    const pattern = /(\/\/.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(#[0-9A-Fa-f]{6,8}\b)|(\b\d+\.?\d*(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)(\s*=(?!=))?|(\s+)|(.)/g;
    let match;
    while ((match = pattern.exec(line))) {
        const [text, comment, string, color, number, ident, namedArg, space] = match;
        if (comment) parts.push({ text, className: "text-[#64748b] italic" });
        else if (string) parts.push({ text, className: "text-[#e2e8f0]" });
        else if (color) parts.push({ text, className: "text-[#fbbf24]" });
        else if (number) parts.push({ text, className: "text-[#fbbf24]" });
        else if (ident) {
            const className = KEYWORDS.has(ident) || TOP_LEVEL.has(ident) || namedArg
                ? "text-[#f472b6]"
                : ident.includes(".") ? "text-[#60a5fa]" : "text-[#e2e8f0]";
            parts.push({ text: ident, className });
            if (namedArg) parts.push({ text: namedArg, className: "text-[#e2e8f0]" });
        } else if (space) parts.push({ text, className: "" });
        else parts.push({ text, className: "text-[#cbd5e1]" });
    }
    return parts;
}

function caretInfo(value, position) {
    const before = value.slice(0, position);
    const lines = before.split("\n");
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function wordBefore(value, position) {
    const match = /[A-Za-z_][\w.]*$/.exec(value.slice(0, position));
    return match ? match[0] : "";
}

export function wordAt(value, position) {
    const left = /[A-Za-z_][\w.]*$/.exec(value.slice(0, position))?.[0] || "";
    const right = /^[\w.]*/.exec(value.slice(position))?.[0] || "";
    return left + right;
}

export default function CodeEditor({ value, onChange, errors = [], showErrorTooltip, onApplyFix, onDismissError, onCursor, catalog, label = "Kode indikator" }) {
    const textareaRef = useRef(null);
    const measureRef = useRef(null);
    const scrollRef = useRef(null);
    const [charWidth, setCharWidth] = useState(7.8);
    const [caret, setCaret] = useState({ line: 1, column: 1, offset: 0 });
    const [completion, setCompletion] = useState(null);
    const lines = useMemo(() => value.split("\n"), [value]);
    const longest = useMemo(() => lines.reduce((max, line) => Math.max(max, line.length), 0), [lines]);
    const firstError = errors[0] || null;
    const errorLines = useMemo(() => new Set(errors.map((error) => error.line)), [errors]);

    useLayoutEffect(() => {
        const width = measureRef.current?.getBoundingClientRect().width;
        if (width) setCharWidth(width / 10);
    }, []);

    useEffect(() => {
        onCursor?.({ line: caret.line, column: caret.column, word: wordAt(value, caret.offset) });
    }, [caret, value, onCursor]);

    function updateCaret(target) {
        const position = target.selectionStart;
        setCaret({ ...caretInfo(target.value, position), offset: position });
        return position;
    }

    function refreshCompletion(nextValue, position) {
        const prefix = wordBefore(nextValue, position);
        if (prefix.length < 2) {
            setCompletion(null);
            return;
        }
        const lower = prefix.toLowerCase();
        const items = catalog
            .filter((entry) => entry.name.toLowerCase().startsWith(lower) && entry.name !== prefix)
            .slice(0, 8);
        setCompletion(items.length ? { prefix, items, active: 0 } : null);
    }

    function replaceRange(start, end, text, caretOffset = text.length) {
        const next = value.slice(0, start) + text + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.selectionStart = start + caretOffset;
            textarea.selectionEnd = start + caretOffset;
            updateCaret(textarea);
        });
    }

    function accept(item) {
        const textarea = textareaRef.current;
        const position = textarea.selectionStart;
        const start = position - completion.prefix.length;
        const insert = item.kind === "fungsi" ? `${item.name}(` : item.name;
        setCompletion(null);
        replaceRange(start, position, insert);
    }

    function handleKeyDown(event) {
        const textarea = event.currentTarget;
        if (completion) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setCompletion((current) => ({ ...current, active: (current.active + step + current.items.length) % current.items.length }));
                return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                accept(completion.items[completion.active]);
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setCompletion(null);
                return;
            }
        }
        if (event.key === "Tab" && !event.shiftKey) {
            event.preventDefault();
            replaceRange(textarea.selectionStart, textarea.selectionEnd, "    ");
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            const position = textarea.selectionStart;
            const currentLine = value.slice(0, position).split("\n").pop();
            const indent = /^\s*/.exec(currentLine)[0];
            const extra = INDENT_OPENERS.test(currentLine) ? "    " : "";
            replaceRange(position, textarea.selectionEnd, `\n${indent}${extra}`);
        }
    }

    const gutterWidth = Math.max(2, String(lines.length).length) * charWidth + 20;
    const contentHeight = lines.length * LINE_HEIGHT + PADDING_TOP * 2;
    const contentWidth = `max(100%, ${longest * charWidth + PADDING_LEFT * 2 + 40}px)`;
    const caretTop = PADDING_TOP + (caret.line - 1) * LINE_HEIGHT;
    const caretLeft = PADDING_LEFT + (caret.column - 1) * charWidth;
    const activeItem = completion?.items[completion.active];

    return (
        <div ref={scrollRef} className="relative h-full overflow-auto bg-[#0b0d0f] font-mono text-[13px] pointer-coarse:text-[16px]" style={{ lineHeight: `${LINE_HEIGHT}px` }}>
            <span ref={measureRef} className="invisible absolute whitespace-pre font-mono text-[13px] pointer-coarse:text-[16px]" aria-hidden>MMMMMMMMMM</span>
            <div className="relative flex" style={{ minHeight: contentHeight }}>
                <div className="sticky left-0 z-10 shrink-0 select-none border-r border-[#1e293b] bg-[#0b0d0f] text-right text-[#475569]" style={{ width: gutterWidth, paddingTop: PADDING_TOP }} aria-hidden>
                    {lines.map((_, index) => (
                        <div key={index} className={`pr-3 ${errorLines.has(index + 1) ? "bg-[#f87171]/10 text-[#f87171]" : index + 1 === caret.line ? "text-[#cbd5e1]" : ""}`}>
                            {index + 1}
                        </div>
                    ))}
                </div>
                <div className="relative min-w-0 flex-1" style={{ width: contentWidth }}>
                    {lines.map((_, index) => {
                        const lineNumber = index + 1;
                        if (!errorLines.has(lineNumber) && lineNumber !== caret.line) return null;
                        return (
                            <div
                                key={`bg-${lineNumber}`}
                                className={`absolute inset-x-0 ${errorLines.has(lineNumber) ? "border-l-2 border-[#f87171] bg-[#f87171]/[0.08]" : "bg-white/[0.03]"}`}
                                style={{ top: PADDING_TOP + index * LINE_HEIGHT, height: LINE_HEIGHT }}
                                aria-hidden
                            />
                        );
                    })}
                    {/* font-mono wajib di sini: preflight Tailwind memberi <pre> font ui-monospace,
                        sedangkan textarea di atasnya mewarisi Geist Mono, sehingga kursor meleset. */}
                    <pre className="pointer-events-none relative m-0 whitespace-pre font-mono text-[#e2e8f0]" style={{ padding: `${PADDING_TOP}px ${PADDING_LEFT}px` }} aria-hidden>
                        {lines.map((line, index) => {
                            const lineNumber = index + 1;
                            const lineErrors = errors.filter((error) => error.line === lineNumber && error.column);
                            if (!lineErrors.length) {
                                return (
                                    <div key={index}>
                                        {highlightLine(line).map((part, partIndex) => <span key={partIndex} className={part.className}>{part.text}</span>)}
                                        {"\n"}
                                    </div>
                                );
                            }
                            const error = lineErrors[0];
                            const start = Math.max(0, error.column - 1);
                            const end = Math.min(line.length, start + (error.length || 1));
                            return (
                                <div key={index}>
                                    {highlightLine(line.slice(0, start)).map((part, partIndex) => <span key={`a${partIndex}`} className={part.className}>{part.text}</span>)}
                                    <span className="text-[#f87171] underline decoration-[#f87171] decoration-wavy underline-offset-4">{line.slice(start, end) || " "}</span>
                                    {highlightLine(line.slice(end)).map((part, partIndex) => <span key={`b${partIndex}`} className={part.className}>{part.text}</span>)}
                                    {"\n"}
                                </div>
                            );
                        })}
                    </pre>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        aria-label={label}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        wrap="off"
                        onChange={(event) => {
                            onChange(event.target.value);
                            const position = updateCaret(event.target);
                            refreshCompletion(event.target.value, position);
                        }}
                        onKeyDown={handleKeyDown}
                        onKeyUp={(event) => {
                            if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key) || !completion) updateCaret(event.currentTarget);
                        }}
                        onClick={(event) => {
                            updateCaret(event.currentTarget);
                            setCompletion(null);
                        }}
                        onBlur={() => setCompletion(null)}
                        className="absolute inset-0 resize-none overflow-hidden whitespace-pre bg-transparent text-transparent caret-[#b8fb5c] outline-none selection:bg-[#334155]"
                        style={{ padding: `${PADDING_TOP}px ${PADDING_LEFT}px`, lineHeight: `${LINE_HEIGHT}px`, height: contentHeight }}
                    />

                    {completion && (
                        <div
                            className="absolute z-30 flex overflow-hidden rounded-lg bg-[#161a1e] font-mono text-xs shadow-[var(--shadow-menu)]"
                            style={{ top: caretTop + LINE_HEIGHT + 2, left: Math.max(0, caretLeft - completion.prefix.length * charWidth) }}
                            onMouseDown={(event) => event.preventDefault()}
                        >
                            <ul role="listbox" aria-label="Saran fungsi" className="w-[300px] p-1">
                                {completion.items.map((item, index) => (
                                    <li
                                        key={item.name}
                                        role="option"
                                        aria-selected={index === completion.active}
                                        onClick={() => accept(item)}
                                        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 ${index === completion.active ? "bg-[#b8fb5c]/10 text-[#f8fafc]" : "text-[#cbd5e1] hover:bg-white/[0.04]"}`}
                                    >
                                        <span className="grid size-4 place-items-center rounded bg-[#1e3a8a]/50 text-[9px] text-[#93c5fd]">{item.kind === "fungsi" ? "f" : "v"}</span>
                                        <span className="min-w-0 flex-1 truncate text-[#60a5fa]">{item.signature}</span>
                                        <span className="text-[10px] text-[#64748b]">{item.kind}</span>
                                    </li>
                                ))}
                            </ul>
                            {activeItem && (
                                <div className="w-[220px] border-l border-[#232a30] p-3 font-chakra text-xs text-[#cbd5e1]">
                                    <p>{activeItem.doc}</p>
                                    <p className="mt-2 font-mono text-[10px] text-[#64748b]">Enter pilih · Esc tutup</p>
                                </div>
                            )}
                        </div>
                    )}

                    {showErrorTooltip && firstError && firstError.line > 0 && (
                        <div
                            role="alert"
                            className="absolute z-20 w-[300px] rounded-lg border border-[#f87171]/40 bg-[#161a1e] p-3 shadow-[0_0_0_0.5px_rgb(248_113_113/0.4),0_1px_2px_0_rgb(0_0_0/0.5),0_4px_8px_-4px_rgb(0_0_0/0.5)]"
                            style={{
                                top: Math.max(0, PADDING_TOP + (firstError.line - 1) * LINE_HEIGHT - 96),
                                left: PADDING_LEFT + Math.max(0, (firstError.column - 1) * charWidth) + 40,
                            }}
                        >
                            <p className="flex items-start gap-1.5 font-mono text-xs font-semibold text-[#f87171]">
                                <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
                                {firstError.message.split(". Maksud kamu")[0]}
                            </p>
                            {firstError.fix && (
                                <>
                                    <p className="mt-2 font-chakra text-xs text-[#94a3b8]">Maksud kamu {firstError.fix.replacement}?</p>
                                    <button
                                        type="button"
                                        onClick={() => onApplyFix(firstError)}
                                        className="mt-2 rounded border border-[#b8fb5c]/50 bg-[#b8fb5c]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#b8fb5c] hover:bg-[#b8fb5c]/20"
                                    >
                                        {firstError.fix.label}
                                    </button>
                                </>
                            )}
                            <button type="button" onClick={onDismissError} className="absolute right-2 top-2 font-mono text-[10px] text-[#64748b] hover:text-white" aria-label="Tutup pesan error">✕</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
