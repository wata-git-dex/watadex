// ============================================================
// fetch-notion.mjs
// Run by GitHub Action every 6 hours.
// Pulls all WATADEX data from Notion and bakes it into index.html:
//   • Replaces the 5 data arrays (Js, pA, hA, _s, xA)
//   • Replaces async function Eh() with live-Worker version
//
// Requires: NOTION_TOKEN environment variable (GitHub Actions secret)
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";

const TOKEN   = process.env.NOTION_TOKEN;
const VERSION = "2022-06-28";

const DB = {
  watamon:   "e824b56450a64c209c31049480676f5d",
  artDir:    "a9ef1b1c658341a383e45de9bd2c04fb",
  items:     "16206bc459dc4090b4565913b89f3d2b",
  towns:     "92698239e2404ead93a68a6260bcd738",
  regions:   "67c67ffbecd64d4797a0a523bbd234be",
  practices: "a036a67db3bc4490824ef20600412bb5",
};

// Worker URL — live data on refresh
const WORKER_URL = "https://watadex-notion.cleanwataorg.workers.dev";

if (!TOKEN) { console.error("Missing NOTION_TOKEN"); process.exit(1); }

// ── Notion REST helpers ───────────────────────────────────────

async function queryAll(dbId) {
  const rows = [];
  let cursor;
  do {
    const res = await fetch(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        method: "POST",
        headers: {
          Authorization:    `Bearer ${TOKEN}`,
          "Notion-Version": VERSION,
          "Content-Type":   "application/json",
        },
        body: JSON.stringify(
          cursor
            ? { start_cursor: cursor, page_size: 100 }
            : { page_size: 100 }
        ),
      }
    );
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Notion ${res.status} (${dbId}): ${msg.slice(0, 200)}`);
    }
    const d = await res.json();
    rows.push(...d.results);
    cursor = d.has_more ? d.next_cursor : undefined;
  } while (cursor);
  return rows;
}

const txt  = (page, name) => {
  const p = page.properties?.[name];
  if (!p) return "";
  return (p.title || p.rich_text || []).map(t => t.plain_text).join("").trim();
};
const rtxt = (page, name) => {
  const p = page.properties?.[name];
  if (!p) return "";
  return (p.rich_text || p.title || []).map(t => t.plain_text).join("").trim();
};
const sel  = (page, name) => page.properties?.[name]?.select?.name ?? null;
const ms   = (page, name) => (page.properties?.[name]?.multi_select || []).map(o => o.name);
const num  = (page, name) => page.properties?.[name]?.number ?? null;

// ── Fetch all databases ───────────────────────────────────────

console.log("Fetching Notion databases…");

const [watamonPages, artDirPages, itemsPages, townsPages, regionsPages, practicesPages] =
  await Promise.all([
    queryAll(DB.watamon),
    queryAll(DB.artDir),
    queryAll(DB.items),
    queryAll(DB.towns),
    queryAll(DB.regions),
    queryAll(DB.practices),
  ]);

// ── Build region lookup {id → name} ──────────────────────────

const regionNameById = {};
for (const rp of regionsPages) {
  regionNameById[rp.id] = txt(rp, "Name");
}

// ── Map: Js (watamon) ─────────────────────────────────────────
// Sorted by dex number ascending.

const Js = watamonPages
  .filter(p => txt(p, "Name"))
  .map(p => ({
    dex:      num(p, "Dex Number"),
    name:     txt(p, "Name"),
    category: sel(p, "Category"),
    family:   sel(p, "Family"),
    hp:       num(p, "HP"),
    atk:      num(p, "PWR"),
    habitat:  ms(p,  "Habitat"),
    stage:    sel(p, "Evolution Stage"),
    desc:     rtxt(p, "Description"),
    simple:   rtxt(p, "Simple Explanation"),
    wash:     rtxt(p, "WASH Concept"),
    why:      rtxt(p, "Why It Matters"),
    how:      rtxt(p, "How Its Addressed"),
    weakTo:   rtxt(p, "Real Weak To"),
    resistTo: rtxt(p, "Real Resistant To"),
  }))
  .filter(c => c.dex)
  .sort((a, b) => a.dex - b.dex);

// ── Map: pA (practices) ───────────────────────────────────────

const pA = practicesPages
  .filter(p => txt(p, "Name"))
  .map((p, i) => ({
    id:            i + 1,
    name:          txt(p, "Name"),
    practiceType:  sel(p, "Practice Type"),
    hwtsStage:     sel(p, "HWTS Stage"),
    desc:          rtxt(p, "Description"),
    simple:        rtxt(p, "Simple Explanation"),
    wash:          rtxt(p, "WASH Concept"),
    why:           rtxt(p, "Why It Matters"),
    strongAgainst: ms(p, "Strong Against"),
    ineffective:   ms(p, "Ineffective Against"),
    status:        sel(p, "Finalization Status"),
  }));

// ── Map: hA (towns) ───────────────────────────────────────────

const hA = townsPages
  .filter(p => txt(p, "Name"))
  .map((p, i) => {
    const parentRels = p.properties["Parent Region"]?.relation || [];
    const regionId   = parentRels[0]?.id || null;
    const regionName = regionId ? (regionNameById[regionId] || null) : null;
    return {
      id:          i + 1,
      name:        txt(p, "Name"),
      region:      regionName,
      townType:    sel(p, "Town Type"),
      waterSource: rtxt(p, "Primary Water Source") || sel(p, "Primary Water Source"),
      presence:    sel(p, "W.A.T.A. Presence"),
      status:      sel(p, "Finalization Status"),
      realBasis:   rtxt(p, "Real-World Basis"),
      notes:       rtxt(p, "Notes"),
    };
  });

// ── Map: _s (items) ───────────────────────────────────────────

const _s = itemsPages
  .filter(p => txt(p, "Name"))
  .map((p, i) => ({
    id:       num(p, "Item Number") || (i + 1),
    name:     txt(p, "Name"),
    itemType: sel(p, "Item Type"),
    desc:     rtxt(p, "Description"),
    wash:     rtxt(p, "WASH Concept"),
    why:      rtxt(p, "Why It Matters"),
  }))
  .sort((a, b) => a.id - b.id);

// ── Map: xA (regions) ─────────────────────────────────────────

const xA = regionsPages
  .filter(p => txt(p, "Name"))
  .map(p => ({
    name:        txt(p, "Name"),
    env:         sel(p, "Environment"),
    inspiration: rtxt(p, "Real-World Inspiration") || sel(p, "Real-World Inspiration"),
    fictional:   false,
    waterSource: ms(p, "Water Source"),
  }));

// ── New Eh() function (live Worker fetch) ─────────────────────
// This replaces the current version that just reloads baked data.
// It calls the Cloudflare Worker to get live Notion data, updates
// React state (watamon + items), injects sprite URLs, and refreshes
// the last-sync display.

const newEh = `async function Eh(){O(!0),ql(null);try{const r=await fetch(${JSON.stringify(WORKER_URL)});if(!r.ok)throw new Error("Worker "+r.status);const d=await r.json();if(d.error)throw new Error(d.error);l(d.watamon);i(d.items);if(d.sprites&&typeof SPRITES!="undefined"){Object.assign(SPRITES,d.sprites);window.WATADEX_SPRITES=SPRITES;}let A=new Date().toISOString();ld(A);ql("Live \\u2022 "+d.watamon.length+" Watamon \\u2022 "+new Date(A).toLocaleDateString(void 0,{month:"short",day:"numeric"}))}catch(e){ql("Refresh failed \\u2014 "+(e.message||"try again"))}finally{O(!1)}}`;

// ── Patch index.html ──────────────────────────────────────────

let html = readFileSync("index.html", "utf8");
const before = html.length;

// 1. Replace Js (watamon array)
//    Terminated by ",pA=" which always follows it in the bundle.
html = html.replace(
  /\bJs=\[[\s\S]*?\],pA=/,
  `Js=${JSON.stringify(Js)},pA=`
);

// 2. Replace pA (practices array)
//    Terminated by ",hA=" which always follows it in the bundle.
html = html.replace(
  /\bpA=\[[\s\S]*?\],hA=/,
  `pA=${JSON.stringify(pA)},hA=`
);

// 3. Replace hA (towns array)
//    Terminated by ",gA=" (status effects object) which follows it.
html = html.replace(
  /\bhA=\[[\s\S]*?\],gA=/,
  `hA=${JSON.stringify(hA)},gA=`
);

// 4. Replace _s (items array)
//    Terminated by ",xA=" which always follows it in the bundle.
html = html.replace(
  /\b_s=\[[\s\S]*?\],xA=/,
  `_s=${JSON.stringify(_s)},xA=`
);

// 5. Replace xA (regions array)
//    Terminated by ";var Xu=" (version string) which follows it.
html = html.replace(
  /\bxA=\[[\s\S]*?\];var Xu=/,
  `xA=${JSON.stringify(xA)};var Xu=`
);

// 6. Replace async function Eh() with live-Worker version
const EH_OLD = `async function Eh(){O(!0),ql(null);try{l(Js),i(_s);try{await window.storage.set("watadex:watamon",JSON.stringify(Js),!1),await window.storage.set("watadex:items",JSON.stringify(_s),!1),await window.storage.set("watadex:version",Xu,!1)}catch{}let A=new Date().toISOString();ld(A);try{await window.storage.set("watadex:last-sync",A,!1)}catch{}ql(\`Last updated \${new Date(A).toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}\`)}catch{ql("Refresh failed \\u2014 try closing and reopening the app.")}finally{O(!1)}}`;

if (html.includes(EH_OLD)) {
  html = html.replace(EH_OLD, newEh);
  console.log("✓ Eh() replaced with live-Worker version");
} else {
  console.warn("⚠ Eh() pattern not found — function not replaced");
  console.warn("  This usually means the bundle was rebuilt since last check.");
  console.warn("  The baked data still updated; live refresh uses baked data.");
}

// 6. Update the baked date to today
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
html = html.replace(/\byA="[\d-]+"/, `yA="${today}"`);

writeFileSync("index.html", html, "utf8");
const after = html.length;

console.log(`\nDone ✓`);
console.log(`  Watamon: ${Js.length}`);
console.log(`  Items:   ${_s.length}`);
console.log(`  Practices: ${pA.length}`);
console.log(`  Towns:   ${hA.length}`);
console.log(`  Regions: ${xA.length}`);
console.log(`  File size: ${(before/1024).toFixed(0)} KB → ${(after/1024).toFixed(0)} KB`);
