import assert from "node:assert/strict";
import test from "node:test";
import {
    buildAnalysisPrompt,
    describeAgentError,
    splitReply,
    toAgentHistory,
} from "../../lib/ai/agent-chat.js";

test("pesan analisis menyebut pair dan rentang fokus waktu", () => {
    assert.match(buildAnalysisPrompt("HIGH/USDT", "intraday"), /HIGH\/USDT untuk fokus Intraday \(1H–4H\)/);
    assert.match(buildAnalysisPrompt("HIGH/USDT", "tidak-ada"), /fokus Scalp/);
});

test("riwayat hanya membawa 6 giliran terakhir dan melewati pesan gagal", () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `m${index}`, charts: [] }));
    messages.push({ role: "user", content: "gagal", failed: true });
    const history = toAgentHistory(messages);
    assert.equal(history.length, 6);
    assert.deepEqual(history.at(-1), { role: "assistant", content: "m7" });
    assert.ok(history.every((item) => Object.keys(item).length === 2));
});

test("jawaban dipecah jadi teks tebal dan blok kode", () => {
    const blocks = splitReply("**Setup**\nLong di atas 0.5\n```yaml\nentry: 0.5\nsl: 0.4\n```\nSelesai");
    assert.deepEqual(blocks.map((block) => block.type), ["text", "code", "text"]);
    assert.deepEqual(blocks[0].spans[0], { bold: true, text: "Setup" });
    assert.equal(blocks[1].text, "entry: 0.5\nsl: 0.4");
});

test("pesan error memakai kode dari dcms-api", () => {
    assert.match(describeAgentError({ code: "AI_QUOTA_EXCEEDED", status: 429 }), /Kuota/);
    assert.match(describeAgentError({ status: 401 }), /login/);
    assert.equal(describeAgentError({ code: "X", message: "Pesan server" }), "Pesan server");
});
