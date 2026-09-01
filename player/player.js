const $=x=>document.getElementById(x),a=$("audio"),list=$("list"),search=$("search"),play=$("play"),seek=$("seek");
const tracks=(typeof musicLibrary==="undefined"?[]:musicLibrary).flatMap(s=>(s.audio||[]).map(t=>({
  title:s.title,
  artist:s.composer||"Practice Track",
  type:(t.type||"practice").trim(),
  file:t.file
})));
let i=0,selected=false,shuffle=false,repeat=true;
const fmt=s=>Number.isFinite(s)?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`:"0:00";
const typeLabel=t=>t?t.replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()):"Practice";
function render(q=""){
  q=q.toLowerCase();
  list.innerHTML=tracks.map((t,n)=>({...t,n})).filter(t=>!q||(`${t.title} ${t.artist} ${t.type}`).toLowerCase().includes(q)).map(t=>`<button class="track ${selected&&t.n===i?"playing":""}" data-i="${t.n}"><span class="num">${selected&&t.n===i&&!a.paused?"♫":t.n+1}</span><span class="copy"><strong>${t.title}</strong><span>${t.artist}</span></span><span class="track-type">${typeLabel(t.type)}</span><span class="go">▶</span></button>`).join("");
  list.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>select(+b.dataset.i,true));
}
function select(n,auto=true){
  if(!tracks.length)return;
  i=(n+tracks.length)%tracks.length;
  let t=tracks[i];
  selected=true;
  a.src=t.file;
  $("title").textContent=t.title;
  $("artist").textContent=t.artist;
  $("nowType").textContent=typeLabel(t.type);
  $("nowType").classList.remove("hidden");
  if("mediaSession"in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:`${t.artist} • ${typeLabel(t.type)}`,album:"Worship Music"});
  render(search.value);
  if(auto)a.play().catch(()=>{});
}
function next(){if(shuffle&&tracks.length>1){let n=i;while(n===i)n=Math.floor(Math.random()*tracks.length);select(n)}else if(i<tracks.length-1)select(i+1);else if(repeat)select(0)}
function prev(){a.currentTime>4?a.currentTime=0:select(i-1)}
function toggle(){selected?(a.paused?a.play():a.pause()):select(0)}
function shuf(){shuffle=!shuffle;$("shuffle").classList.toggle("active",shuffle);$("shuffleTop").classList.toggle("active",shuffle)}
play.onclick=toggle;
$("next").onclick=next;
$("prev").onclick=prev;
$("shuffle").onclick=shuf;
$("shuffleTop").onclick=shuf;
$("repeat").onclick=()=>{repeat=!repeat;$("repeat").classList.toggle("active",repeat)};
search.oninput=()=>render(search.value);
a.onplay=()=>{play.textContent="❚❚";render(search.value)};
a.onpause=()=>{play.textContent="▶";render(search.value)};
a.ontimeupdate=()=>{if(a.duration){seek.value=Math.round(a.currentTime/a.duration*1000);$("cur").textContent=fmt(a.currentTime)}};
a.onloadedmetadata=()=>$("dur").textContent=fmt(a.duration);
a.onended=next;
seek.oninput=()=>{if(a.duration)a.currentTime=(+seek.value/1000)*a.duration};
if("mediaSession"in navigator){navigator.mediaSession.setActionHandler("play",()=>a.play());navigator.mediaSession.setActionHandler("pause",()=>a.pause());navigator.mediaSession.setActionHandler("previoustrack",prev);navigator.mediaSession.setActionHandler("nexttrack",next)}
$("count").textContent=`${tracks.length} ${tracks.length===1?"track":"tracks"}`;
render();
tracks.length?select(0,false):($("empty").classList.remove("hidden"),$("app").classList.add("hidden"));
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
