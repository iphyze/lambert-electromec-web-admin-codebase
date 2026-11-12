/* Offline-only smoke tests for the postbuild generator. No dependencies. */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const temp = mkdtempSync(join(tmpdir(), "lambert-pwa-test-"));
try {
  mkdirSync(join(temp, "scripts"), { recursive: true });
  mkdirSync(join(temp, "out", "_next", "static", "chunks"), { recursive: true });
  mkdirSync(join(temp, "out", "offline"), { recursive: true });
  mkdirSync(join(temp, "out", "icons"), { recursive: true });
  mkdirSync(join(temp, "out", "images", "brand"), { recursive: true });
  mkdirSync(join(temp, "out", "api"), { recursive: true });
  for (const name of ["build-pwa.mjs", "sw-template.js"]) cpSync(join(import.meta.dirname,name),join(temp,"scripts",name));
  writeFileSync(join(temp,"out","_next","static","chunks","a1b2.js"),"console.log('asset');");
  writeFileSync(join(temp,"out","offline","index.html"),"<html><body>offline shell</body></html>");
  writeFileSync(join(temp,"out","manifest.webmanifest"),'{"name":"Lambert Admin"}');
  writeFileSync(join(temp,"out","icons","icon-192.png"),"fake icon bytes");
  writeFileSync(join(temp,"out","images","brand","favicon.png"),"fake logo bytes");
  writeFileSync(join(temp,"out","api","secret.json"),"PRIVATE");
  writeFileSync(join(temp,"out","dashboard.html"),"AUTH USER");
  const run=(env)=>{
    const result=spawnSync(process.execPath,[join(temp,"scripts","build-pwa.mjs")],{env:{...process.env,...env},encoding:"utf8"});
    if(result.status!==0) throw new Error(result.stderr || result.stdout);
    return readFileSync(join(temp,"out","sw.js"),"utf8");
  };
  const first=run({NEXT_PUBLIC_BASE_PATH:"/lambert-admin",NEXT_PUBLIC_PWA_DISABLED:"false"});
  const second=run({NEXT_PUBLIC_BASE_PATH:"/lambert-admin",NEXT_PUBLIC_PWA_DISABLED:"false"});
  assert.equal(first,second,"same source must produce identical SW bytes");
  assert.ok(first.includes('/lambert-admin/offline/index.html'));
  assert.ok(first.includes('/lambert-admin/manifest.webmanifest'));
  assert.ok(first.includes('/lambert-admin/_next/static/chunks/a1b2.js'));
  assert.ok(!first.includes('PRIVATE'));
  assert.ok(!first.includes('/api/secret.json'));
  assert.ok(!first.includes('/dashboard.html'));
  const third=run({NEXT_PUBLIC_BASE_PATH:"/lambert-admin",NEXT_PUBLIC_PWA_DISABLED:"true"});
  assert.match(third,/unregister\(\)/);
  writeFileSync(join(temp,"out","_next","static","chunks","a1b2.js"),"console.log('changed');");
  const changed=run({NEXT_PUBLIC_BASE_PATH:"/lambert-admin",NEXT_PUBLIC_PWA_DISABLED:"false"});
  assert.notEqual(first,changed,"asset change must change the SW version");
  console.log("[OK] 9 deterministic, scope and kill-switch checks");
} finally { rmSync(temp,{recursive:true,force:true}); }
