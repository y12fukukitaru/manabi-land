/* =====================================================================
   まなびランド 共通ブリッジ (bridge.js)
   - 全アプリ共通のシールちょうシステム
   - localStorage への保存 (GitHub Pages / 自宅サーバーで動作)
   - window.storage シム (claude.ai 用 API を localStorage に置き換え)
   ===================================================================== */
(function(){
"use strict";

/* ---------- window.storage シム (eigo / sansuu が使用) ---------- */
if(!window.storage){
  window.storage = {
    async get(key){ const v = localStorage.getItem("mbs-"+key); return v==null ? null : {key, value:v}; },
    async set(key, value){ localStorage.setItem("mbs-"+key, String(value)); return {key, value}; },
    async delete(key){ localStorage.removeItem("mbs-"+key); return {key, deleted:true}; },
    async list(prefix){ const keys=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith("mbs-"+(prefix||""))) keys.push(k.slice(4)); } return {keys}; }
  };
}

/* ---------- シールカタログ ---------- */
/* rarity: n=ふつう r=レア s=スーパーレア */
const THEMES = [
  { id:"animal", name:"どうぶつのもり", icon:"🐻",
    n:["🐶","🐱","🐰","🐻","🐼","🐨","🐷","🐸","🐥","🐤","🐔","🦆","🐮","🐭","🐹","🦊","🐺","🦝","🐿️","🦔","🐢","🐌","🐛","🐝","🦋","🐞","🐟","🐠","🦀","🐙"],
    r:["🦁","🐯","🦓","🦒","🦘","🦭","🦦","🐧","🦉","🦜","🐬","🐳"],
    s:["🦄","🐲","🦕","🦖"] },
  { id:"sweets", name:"おかしのくに", icon:"🍰",
    n:["🍓","🍎","🍊","🍋","🍌","🍉","🍇","🍑","🍒","🍈","🥝","🍍","🍅","🫐","🍩","🍪","🍰","🧁","🍭","🍬","🍫","🍮","🍡","🍧","🍨","🍦","🥞","🍿","🥐","🍙"],
    r:["🍯","🥧","🎂","🧃","🥤","🍵","🥭","🍱"],
    s:["🧋","🥮","🍥"] },
  { id:"space", name:"うちゅう", icon:"🚀",
    n:["⭐","🌟","💫","🌙","🌛","🌜","🌕","🌗","🌑","☄️","🛰️","🔭","🌌","👾","🛸","🌍"],
    r:["🪐","🚀","🌠","🌚","🌝","👽","🎆"],
    s:["🧑‍🚀","🪩"] },
  { id:"travel", name:"せかいのたび", icon:"🗺️",
    n:["🚗","🚕","🚌","🚑","🚒","🚓","🚜","🚲","🛴","🛵","🚂","🚃","🚄","✈️","🚁","⛵","🚢","⛴️","🎈","🗺️","🏝️","🏖️","⛺","🗼","🎡","🎢","🎠"],
    r:["🗽","🎪","🏰","🛶","🚤","🛩️","🚠"],
    s:["🧭","🛺","🚊"] },
  { id:"magic", name:"まほうのとしょかん", icon:"📚",
    n:["📚","📖","📕","📗","📘","📙","✏️","🖍️","📝","🎒","🧸","🪁","🎨","🎯","🎲","🧩","🪆","🎺","🎸","🥁","🎻","🎹","🎵","🎶"],
    r:["🪄","🔮","🧚","🧜‍♀️","🧞","🎀","💍"],
    s:["🧝‍♀️","🥷","🔱"] },
  { id:"nature", name:"しぜんときせつ", icon:"🌸",
    n:["🌸","🌺","🌻","🌷","🌹","🌼","🌵","🌲","🌳","🍀","🍁","🍂","🍄","🌾","💐","☀️","⛅","☁️","🌧️","⛈️","❄️","⛄","🌊","💧","🔥","🌋","🗻","🐚"],
    r:["🌈","🦩","🪷","🏵️","💮","🫧"],
    s:["🌅","🎋","🪻"] },
];
/* かんじはんこ (かんじクイズ合格でその字のはんこがもらえる) */
const HANKO = { id:"hanko", name:"かんじはんこ", icon:"🈴",
  list:["一","二","三","十","山","川","日","月","木","火","水","花","雨","空","人","口","目","手","耳","足","犬","虫","貝","車"] };

/* ひみつのシール (じょうけんをクリアすると もらえる) */
const SECRETS = [
  { e:"🌱", name:"はじめてのシール",   hint:"シールを 1まい ゲットする",            test:h=>totalStickers(h)>=1 },
  { e:"🥇", name:"ロケットはっしゃ！", hint:"ロケットを はっしゃさせる",            test:h=>(h.records["katachi.rocket"]||0)>=1 },
  { e:"🐉", name:"かんじのたつじん",   hint:"かんじの はんこを 10こ あつめる",      test:h=>(h.records["kanji.hanko"]||0)>=10 },
  { e:"🧙", name:"えほんはかせ",       hint:"えほんを 3さつ よみきる",              test:h=>(h.records["kotoba.book"]||0)>=3 },
  { e:"🦸", name:"ABCヒーロー",        hint:"ABCを ぜんぶ タッチする",              test:h=>!!h.records["eigo.abc"] },
  { e:"🎖️", name:"さんすうめいじん",   hint:"さんすうの ステージを 10かい クリア",  test:h=>(h.records["sansuu.stage"]||0)>=10 },
  { e:"🏆", name:"チャレンジおう",     hint:"チャレンジもんだいを 5かい クリア",    test:h=>(h.records["sansuu.challenge"]||0)>=5 },
  { e:"👑", name:"シールキング",       hint:"シールを 50まい あつめる",             test:h=>totalStickers(h)>=50 },
  { e:"💠", name:"シールレジェンド",   hint:"シールを 100まい あつめる",            test:h=>totalStickers(h)>=100 },
  { e:"🗝️", name:"ずかんコレクター",   hint:"ずかんを はんぶん あつめる",           test:h=>zukanRatio(h)>=0.5 },
  { e:"🎇", name:"ずかんマスター",     hint:"ずかんを ぜんぶ あつめる",             test:h=>zukanRatio(h)>=1 },
  { e:"🧿", name:"なかよしプレイヤー", hint:"5つの アプリ ぜんぶで あそぶ",         test:h=>(h.appsPlayed||[]).length>=5 },
  { e:"⚡", name:"スターあつめ",       hint:"ほしを 100こ あつめる",                test:h=>totalStars(h)>=100 },
];

const RARITY_LABEL = { n:"", r:"✨レア✨", s:"🌟スーパーレア🌟", hanko:"🈴かんじはんこ", secret:"🎖️ひみつのシール" };

/* ---------- 保存 ---------- */
const HUB_KEY = "manabi-hub-v1";
let hub = null;

function defaultHub(){
  return { v:1, owned:{}, tray:[], placed:[], records:{}, appsPlayed:[] };
}
function load(){
  /* ハブとアプリ(iframe)は別ウィンドウで同じ localStorage を共有するため毎回再読込 */
  try{
    const raw = localStorage.getItem(HUB_KEY);
    hub = raw ? Object.assign(defaultHub(), JSON.parse(raw)) : defaultHub();
  }catch(e){ hub = defaultHub(); }
  hub.owned = hub.owned||{}; hub.tray = hub.tray||[]; hub.placed = hub.placed||[];
  hub.records = hub.records||{}; hub.appsPlayed = hub.appsPlayed||[];
  return hub;
}
function save(){
  try{ localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }catch(e){}
  notify();
}
function notify(){
  try{ if(window.parent && window.parent!==window) window.parent.postMessage({type:"mb-refresh"}, "*"); }catch(e){}
  try{ window.dispatchEvent(new CustomEvent("mb-refresh")); }catch(e){}
}

/* ---------- 集計 ---------- */
function totalStickers(h){ h=h||load(); return Object.values(h.owned).reduce((a,b)=>a+b,0); }
function uniqueStickers(h){ h=h||load(); return Object.keys(h.owned).length; }
function totalStars(h){
  h=h||load();
  return (h.records["eigo.stars"]||0)+(h.records["kotoba.stars"]||0)+(h.records["katachi.stars"]||0);
}
function catalogEmojis(){
  const all=[];
  THEMES.forEach(t=>{ all.push(...t.n, ...t.r, ...t.s); });
  return all;
}
function zukanRatio(h){
  h=h||load();
  const cat=catalogEmojis();
  const got=cat.filter(e=>h.owned[e]).length;
  return cat.length ? got/cat.length : 0;
}

/* ---------- シール抽選 ---------- */
function rollRarity(rareBoost){
  const x=Math.random();
  if(rareBoost){ if(x<0.12) return "s"; if(x<0.50) return "r"; return "n"; }
  if(x<0.05) return "s"; if(x<0.25) return "r"; return "n";
}
function pickFrom(themeId, tier){
  const h=load();
  let theme=THEMES.find(t=>t.id===themeId);
  /* 25% でほかのテーマからも出る (あきない工夫) */
  if(!theme || Math.random()<0.25) theme=THEMES[Math.floor(Math.random()*THEMES.length)];
  let pool=theme[tier]&&theme[tier].length?theme[tier]:theme.n;
  const fresh=pool.filter(e=>!h.owned[e]);
  if(!fresh.length){
    /* このテーマは持ってる → 全テーマの未所持を優先 */
    const allFresh=catalogEmojis().filter(e=>!h.owned[e]);
    if(allFresh.length) pool=allFresh;
  } else pool=fresh;
  return pool[Math.floor(Math.random()*pool.length)];
}

/* ---------- 付与 ---------- */
function grant(emoji, rarity, name, quiet, delay){
  const h=load();
  h.owned[emoji]=(h.owned[emoji]||0)+1;
  h.tray.push(emoji);
  if(h.tray.length>400) h.tray=h.tray.slice(-400);
  save();
  if(quiet) toast("シールちょうに "+emoji+" が はいったよ！");
  else queueOverlay({emoji, rarity, name, delay});
  checkMilestones();
  return emoji;
}

/* MB.award(themeId, opts)
   opts: {fixed, quiet, rareBoost, delay, rarity, name} */
function award(themeId, opts){
  opts=opts||{};
  if(opts.fixed){
    return grant(opts.fixed, opts.rarity||"n", opts.name, opts.quiet, opts.delay);
  }
  const tier=rollRarity(opts.rareBoost);
  const e=pickFrom(themeId, tier);
  return grant(e, tier, opts.name, opts.quiet, opts.delay);
}

/* ---------- きろく ---------- */
function record(key, n){
  const h=load();
  h.records[key]=(h.records[key]||0)+(n==null?1:n);
  save();
  checkMilestones();
}
function flag(key){
  const h=load();
  if(h.records[key]) return false;
  h.records[key]=1;
  save();
  checkMilestones();
  return true;
}
function appStart(appId){
  const h=load();
  if(!h.appsPlayed.includes(appId)){ h.appsPlayed.push(appId); save(); }
  checkMilestones();
}

/* ---------- ひみつのシール チェック ---------- */
let checking=false;
function checkMilestones(){
  if(checking) return;   /* grant→check→grant の無限ループ防止 */
  checking=true;
  try{
    const h=load();
    SECRETS.forEach(s=>{
      if(!h.owned[s.e] && s.test(h)){
        grant(s.e, "secret", s.name, false, 600);
      }
    });
  }finally{ checking=false; }
}

/* ---------- ごほうび演出 (どのアプリでも同じ見た目) ---------- */
const olQueue=[]; let olBusy=false;
function queueOverlay(item){ olQueue.push(item); pump(); }
function pump(){
  if(olBusy || !olQueue.length) return;
  olBusy=true;
  const it=olQueue.shift();
  setTimeout(()=>showOverlay(it), it.delay||0);
}
function ensureStyles(){
  if(document.getElementById("mb-style")) return;
  const st=document.createElement("style");
  st.id="mb-style";
  st.textContent =
  "#mb-ol{position:fixed;inset:0;background:rgba(42,59,95,.55);display:flex;align-items:center;justify-content:center;z-index:99999;animation:mbfade .25s ease;}"+
  "@keyframes mbfade{from{opacity:0}to{opacity:1}}"+
  "#mb-ol .card{background:#FFF8E9;border-radius:30px;padding:30px 34px 24px;text-align:center;box-shadow:0 10px 0 rgba(0,0,0,.18);max-width:320px;width:86%;font-family:'M PLUS Rounded 1c','Hiragino Maru Gothic ProN',sans-serif;color:#2A3B5F;animation:mbpop .4s cubic-bezier(.2,1.6,.4,1);}"+
  "@keyframes mbpop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}"+
  "#mb-ol .big{font-size:88px;line-height:1.1;animation:mbspin .7s cubic-bezier(.2,1.6,.4,1);}"+
  "@keyframes mbspin{from{transform:rotate(-360deg) scale(.2)}to{transform:rotate(0) scale(1)}}"+
  "#mb-ol .rar{font-size:14px;font-weight:800;margin-top:6px;color:#B07B00;}"+
  "#mb-ol .rar.s{color:#C9308F}#mb-ol .rar.secret{color:#7B4FD8}"+
  "#mb-ol .ttl{font-size:19px;font-weight:800;margin-top:4px;}"+
  "#mb-ol .sub{font-size:13px;font-weight:700;color:#8a94ad;margin-top:4px;}"+
  "#mb-ol button{margin-top:14px;background:#FFD44D;border:none;border-radius:999px;padding:12px 34px;font-size:16px;font-weight:800;color:#6b4d00;cursor:pointer;box-shadow:0 5px 0 #d9a800;font-family:inherit;}"+
  "#mb-ol button:active{transform:translateY(4px);box-shadow:none;}"+
  ".mb-conf{position:fixed;top:-40px;font-size:26px;z-index:100000;animation:mbdrop linear forwards;pointer-events:none;}"+
  "@keyframes mbdrop{to{transform:translateY(110vh) rotate(360deg)}}"+
  "#mb-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#2A3B5F;color:#fff;padding:10px 20px;border-radius:999px;font-size:14px;font-weight:800;z-index:99998;opacity:0;transition:opacity .3s;font-family:'M PLUS Rounded 1c',sans-serif;pointer-events:none;max-width:90vw;}"+
  "#mb-toast.show{opacity:1;}"+
  "@media (prefers-reduced-motion:reduce){#mb-ol,#mb-ol .card,#mb-ol .big,.mb-conf{animation:none!important}}";
  document.head.appendChild(st);
}
function showOverlay(it){
  ensureStyles();
  const ol=document.createElement("div");
  ol.id="mb-ol";
  const rar=RARITY_LABEL[it.rarity]||"";
  ol.innerHTML =
    '<div class="card">'+
      '<div class="big">'+it.emoji+'</div>'+
      (rar?'<div class="rar '+it.rarity+'">'+rar+'</div>':'')+
      '<div class="ttl">'+(it.name?it.name:'シール ゲット！')+'</div>'+
      '<div class="sub">シールちょうに はりつけたよ</div>'+
      '<button>やったー！</button>'+
    '</div>';
  const close=()=>{ ol.remove(); olBusy=false; pump(); };
  ol.querySelector("button").onclick=close;
  ol.addEventListener("click",e=>{ if(e.target===ol) close(); });
  document.body.appendChild(ol);
  mbConfetti(it.rarity==="secret"||it.rarity==="s"?26:14);
  setTimeout(()=>{ if(document.body.contains(ol)) close(); }, 6000);
}
function mbConfetti(n){
  ensureStyles();
  const em=["🎉","✨","⭐","🎊","💛","💙","🌸"];
  for(let i=0;i<n;i++){
    const c=document.createElement("div");
    c.className="mb-conf"; c.textContent=em[i%em.length];
    c.style.left=Math.random()*100+"vw";
    c.style.animationDuration=(1.5+Math.random()*1.5)+"s";
    document.body.appendChild(c);
    setTimeout(()=>c.remove(),3200);
  }
}
let toastTimer=null;
function toast(msg){
  ensureStyles();
  let t=document.getElementById("mb-toast");
  if(!t){ t=document.createElement("div"); t.id="mb-toast"; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),2200);
}

/* ---------- シールちょうを開く ---------- */
function openBook(){
  try{
    if(window.parent && window.parent!==window){
      window.parent.postMessage({type:"mb-open-book"}, "*");
      return;
    }
  }catch(e){}
  location.href = location.pathname.includes("/apps/") ? "../index.html#book" : "index.html#book";
}

/* ---------- リセット ---------- */
function resetAll(){
  ["manabi-hub-v1","sansu-save","mb-kanji-v1","mb-kotoba-v1","mb-katachi-v1","mbs-eigo-adventure-v1","mbs-sansu-save"].forEach(k=>{
    try{ localStorage.removeItem(k); }catch(e){}
  });
  hub=null; load();
}

/* ---------- 公開 API ---------- */
window.MB = {
  THEMES, HANKO, SECRETS, RARITY_LABEL,
  load, save, award, record, flag, appStart, openBook, toast, resetAll,
  totalStickers, uniqueStickers, totalStars, zukanRatio, catalogEmojis,
  confetti: mbConfetti
};
})();
