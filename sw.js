const CACHE = "korean-daily-3000-v1.0";
const APP_SHELL = ["./manifest.webmanifest"];

function patchWrapper(text){
  return text
    .replaceAll("v0.9","v1.0")
    .replaceAll("?cloud=9","?cloud=10")
    .replaceAll("await initCloudSync();","initCloudSync();");
}

function patchBase(text){
  const observer = `const _completionObserver = new MutationObserver(()=>{\n  const text = document.body ? document.body.innerText : "";\n  if(/今日の.*完了/.test(text) && !extraUnlimitedMode && extraAllowance<=0){\n    showExtraStudyPanel();\n  }\n});\nif(document.body) _completionObserver.observe(document.body,{subtree:true,childList:true,characterData:true});`;
  text = text.replace(observer, "");
  text = text.replace(
    "updateStats(); return;\n  }\n  const rank=queue.shift()",
    "updateStats(); setTimeout(()=>{try{if(typeof showExtraStudyPanel===\"function\")showExtraStudyPanel();}catch(e){}},0); return;\n  }\n  const rank=queue.shift()"
  );
  text = text.replace(
    "await initFSRS(); buildQueue(); updateStats(); renderRank();",
    "buildQueue(); updateStats(); renderRank(); initFSRS().catch(e=>console.warn(\"FSRS init\",e));"
  );
  text = text.replace(
    'FS=await import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm");',
    'FS=await Promise.race([import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm"),new Promise((_,rej)=>setTimeout(()=>rej(new Error("FSRS load timeout")),5000))]);'
  );
  const oldGrade = 'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>grade(b.dataset.grade)));';
  const safeGrade = 'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>{try{grade(b.dataset.grade)}catch(e){console.error("grade click",e)}finally{document.querySelectorAll("[data-grade]").forEach(x=>x.disabled=false)}}));';
  text = text.replace(oldGrade, safeGrade);
  text = text.replace(
    'document.getElementById("knownBtn").addEventListener("click",markKnown);',
    'document.getElementById("knownBtn").addEventListener("click",()=>{try{markKnown()}catch(e){console.error("known click",e)}});'
  );
  text = text.replace(
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer}',
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer} button:disabled{opacity:.55;cursor:wait}'
  );
  text = text.replace(
    '日常会話Rank × 発音 × 想起テスト × FSRS</div>',
    '日常会話Rank × 発音 × 想起テスト × FSRS · v1.0</div>'
  );
  return text;
}

async function patchedHtmlResponse(request, patcher){
  const response = await fetch(request, {cache:"no-store"});
  if(!response.ok) return response;
  const text = patcher(await response.text());
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(text, {status:response.status, statusText:response.statusText, headers});
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("korean-daily-3000-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({type:"window"});
    await Promise.all(clients.map(c => c.navigate(c.url).catch(()=>{})));
  })());
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if(url.origin !== location.origin) return;

  if(event.request.mode === "navigate" || url.pathname.endsWith("/index.html")){
    event.respondWith(patchedHtmlResponse(event.request, patchWrapper).catch(() => caches.match("./index.html")));
    return;
  }
  if(url.pathname.endsWith("/index-upload.html")){
    event.respondWith(patchedHtmlResponse(event.request, patchBase));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
