import assert from "node:assert/strict";
import test from "node:test";
import {
    describeEbooks,
    describeLogDay,
    filterMembers,
    formatUsdt,
    latestLogDay,
    memberStatus,
    normalizeMembers,
    pageOf,
    summarizeEbooks,
} from "../../lib/admin/panel.js";

test("ringkasan ebook dihitung dari status yang dikirim API", () => {
    const summary = summarizeEbooks([{ status: "DRAFT" }, { status: "PUBLISHED" }, { status: "ARCHIVED" }, { status: "DRAFT" }]);
    assert.deepEqual(summary, { draft: 2, published: 1, archived: 1, total: 4 });
    assert.equal(describeEbooks(summary), "2 draft · 1 terbit");
    assert.equal(describeEbooks(summarizeEbooks([])), "Belum ada ebook");
});

test("log terbaru diambil dari hari pertama", () => {
    const day = latestLogDay([{ date: "2026-11-19", errors: "3", warnings: 0 }, { date: "2026-11-18", errors: 9, warnings: 1 }]);
    assert.deepEqual(day, { date: "2026-11-19", errors: 3, warnings: 0 });
    assert.match(describeLogDay(day), /^3 error · 19 Nov/);
    assert.match(describeLogDay({ date: "2026-11-18", errors: 0, warnings: 2 }), /^0 error, 2 warning/);
    assert.equal(describeLogDay(latestLogDay([])), "Belum ada log");
});

test("member Bitunix dinormalisasi tanpa mengarang nilai", () => {
    const [member] = normalizeMembers({ users: [{ id: 7, name: " Andi ", email: "a@b.id", uuidBitunix: 123, bitunixStatus: "VERIFIED", amountUsdt: null, createdAt: "2026-11-01T00:00:00.000Z" }, { name: "tanpa id" }] });
    assert.deepEqual(member, { id: "7", name: "Andi", email: "a@b.id", uuidBitunix: "123", status: "VERIFIED", depositUsdt: null, createdAt: "2026-11-01T00:00:00.000Z" });
    assert.equal(formatUsdt(member.depositUsdt), "–");
    assert.equal(memberStatus("VERIFIED").tone, "ok");
    assert.equal(normalizeMembers(null).length, 0);
});

test("pencarian dan halaman member", () => {
    const members = Array.from({ length: 23 }, (_, index) => ({ name: `M${index}`, email: `m${index}@dcms.id`, uuidBitunix: String(1000 + index) }));
    assert.equal(filterMembers(members, "m1@").length, 1);
    assert.equal(filterMembers(members, "1001").length, 1);
    assert.equal(filterMembers(members, "  ").length, 23);
    const last = pageOf(members, 9);
    assert.equal(last.page, 3);
    assert.equal(last.pages, 3);
    assert.equal(last.items.length, 3);
});
