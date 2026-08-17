import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete name typing game", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /내 이름,/);
  assert.match(html, /누가 제일 빠를까\?/);
  assert.match(html, /참가자 이름/);
  assert.match(html, /실시간 순위/);
  assert.match(html, /NO LOGIN · NO DATABASE/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/);
});

test("keeps timing and rankings device-local", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /performance\.now\(\)/);
  assert.match(page, /window\.localStorage/);
  assert.match(page, /event\.key === "Enter"/);
  assert.match(page, /event\.nativeEvent\.isComposing/);
  assert.match(page, /onPaste=/);
  assert.match(page, /timeMs - b\.timeMs/);
  assert.match(layout, /images: \[\{ url: `\$\{origin\}\/og\.png`/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
