import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("./sw-template.js",import.meta.url),"utf8")
  .replaceAll("__VERSION__",'"test"')
  .replaceAll("__BASE_PATH__",'"/lambert-admin"')
  .replaceAll("__PRECACHE__","[]");
const handlers={};
const stored=new Map();
const caches={
  async open(name){if(!stored.has(name))stored.set(name,new Map());const map=stored.get(name);return{
    async match(key){return map.get(typeof key==="string"?key:key.url)||undefined;},
    async put(key,value){map.set(typeof key==="string"?key:key.url,value);},
    async addAll(items){for(const item of items)map.set(item,new Response('cached'));},
    async keys(){return [...map.keys()].map(k=>new Request(k.startsWith('https://')?k:`https://example.test${k}`));},
  };},
  async match(key){for(const cache of stored.values())if(cache.has(typeof key==="string"?key:key.url))return cache.get(typeof key==="string"?key:key.url);},
  async keys(){return [...stored.keys()];},async delete(name){return stored.delete(name);},
};
let network=0;
const context={
  self:{ location:{origin:'https://example.test'},addEventListener(name,fn){handlers[name]=fn;},clients:{claim:async()=>{}},skipWaiting:async()=>{} },
  caches, Request, Response, URL, AbortController, Headers, console, setTimeout, clearTimeout,
  fetch:async(request)=>{network++;const response=new Response('<html>STATIC HTML ONLY</html>',{status:200,headers:{'content-type':'text/html'}});Object.defineProperty(response,'type',{value:'basic'});return response;},
};
vm.runInNewContext(source,context);
async function run(url,{method='GET',headers={},mode='cors'}={}) {
  const request={url,method,headers:new Headers(headers),mode};let response;
  handlers.fetch({request,respondWith(p){response=p;},waitUntil(p){p?.catch?.(()=>{});}});
  return response && await response;
}
const base='https://example.test/lambert-admin';
for (const [uri,opts] of [
  [`${base}/api/contacts`,{}],
  [`${base}/dashboard/`,{method:'POST'}],
  [`${base}/dashboard/`,{headers:{Authorization:'Bearer secret'}}],
  [`${base}/dashboard/`,{headers:{Range:'bytes=0-10'}}],
  [`https://other.test/images/brand/favicon.png`,{}],
  [`${base}/sw.js`,{}],
  [`https://example.test/not-in-scope/`,{}],
]) assert.equal(await run(uri,opts),undefined,`must ignore ${uri}`);
assert.equal(network,0,'excluded requests must not reach the worker fetch');
const req={url:`${base}/projects/?id=123`,method:'GET',headers:new Headers(),mode:'navigate'};
let p;handlers.fetch({request:req,respondWith(value){p=value},waitUntil(){}});const html=await p;
assert.equal(await html.text(),'<html>STATIC HTML ONLY</html>');
assert.ok(stored.get('lambert-admin-pages-test').has(`${base}/projects/`));
assert.ok(![...stored.get('lambert-admin-pages-test').keys()].some(k=>k.includes('?')));
assert.equal(network,1);
console.log('[OK] 12 worker interception, origin, auth, query-stripping and shell-cache checks');
