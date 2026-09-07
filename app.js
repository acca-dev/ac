const KEY="my-list-v1";
let state=JSON.parse(localStorage.getItem(KEY)||'{"shopping":[],"tasks":[]}');
let viewDate=new Date(); let selectedDate=iso(new Date());

function iso(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function save(){localStorage.setItem(KEY,JSON.stringify(state)); render()}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmt(d){return new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short",year:"numeric"}).format(new Date(d+"T00:00:00"))}

const pages={home:"วันนี้",shopping:"ซื้อของ",tasks:"งาน",calendar:"ปฏิทิน"};
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll("[data-page-link]").forEach(b=>b.onclick=()=>go(b.dataset.pageLink));
function go(page){currentPage=page;document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.getElementById(page).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.getElementById("pageTitle").textContent=pages[page];document.getElementById("quickAdd").textContent=page==="shopping"?"＋ เพิ่มของ":page==="tasks"||page==="calendar"?"＋ เพิ่มงาน":"＋ เพิ่มรายการ";render();}

function openModal(type,id=null){
  document.getElementById("modal").classList.add("show"); document.getElementById("itemType").value=type; document.getElementById("itemId").value=id||"";
  document.getElementById("modalTitle").textContent=(id?"แก้ไข":"เพิ่ม")+(type==="shopping"?"รายการซื้อ":"งาน");
  const old=(state[type]||[]).find(x=>x.id===id);
  document.getElementById("name").value=old?.name||"";
  document.getElementById("date").value=old?.date||selectedDate||iso(new Date());
  document.getElementById("time").value=old?.time||"";
  document.getElementById("category").value=old?.category||"";
  document.getElementById("qty").value=old?.qty||1;
  document.getElementById("priority").value=old?.priority||"normal";
  document.getElementById("notes").value=old?.notes||"";
  document.getElementById("timeWrap").style.display=type==="tasks"?"block":"none";
  document.getElementById("categoryWrap").style.display=type==="shopping"?"block":"none";
  document.getElementById("qtyWrap").style.display=type==="shopping"?"block":"none";
  document.getElementById("priorityWrap").style.display=type==="tasks"?"block":"none";
}
function closeModal(){document.getElementById("modal").classList.remove("show")}
document.getElementById("closeModal").onclick=closeModal;document.getElementById("cancelModal").onclick=closeModal;
let currentPage="home";
document.getElementById("quickAdd").onclick=()=>openModal(currentPage==="shopping"?"shopping":"tasks");
document.getElementById("addTask").onclick=()=>openModal("tasks");
document.getElementById("addShopping").onclick=()=>openModal("shopping");

document.getElementById("itemForm").onsubmit=e=>{
 e.preventDefault(); const type=document.getElementById("itemType").value,id=document.getElementById("itemId").value;
 const item={id:id||crypto.randomUUID(),name:document.getElementById("name").value.trim(),date:document.getElementById("date").value,time:document.getElementById("time").value,category:document.getElementById("category").value.trim(),qty:+document.getElementById("qty").value||1,priority:document.getElementById("priority").value,notes:document.getElementById("notes").value.trim(),done:false};
 const arr=state[type]; const idx=arr.findIndex(x=>x.id===item.id); if(idx>=0){item.done=arr[idx].done;arr[idx]=item}else arr.unshift(item); closeModal();save();
};

function row(item,type){
 return `<div class="item"><div class="check ${item.done?"done":""}" onclick="toggle('${type}','${item.id}')">${item.done?"✓":""}</div><div class="itemmain"><div class="itemname" style="${item.done?'text-decoration:line-through;color:#8b95a5':''}">${esc(item.name)}</div><div class="muted">${fmt(item.date)}${item.time?" · "+item.time:""}${item.category?" · "+esc(item.category):""}${type==="shopping"?" · "+item.qty+" ชิ้น":""}${item.notes?" · "+esc(item.notes):""}</div></div><div class="actions"><button onclick="openModal('${type}','${item.id}')">แก้</button><button onclick="removeItem('${type}','${item.id}')">ลบ</button></div></div>`;
}
window.toggle=(type,id)=>{let x=state[type].find(x=>x.id===id);if(x){x.done=!x.done;save()}};
window.removeItem=(type,id)=>{if(confirm("ลบรายการนี้ใช่ไหม?")){state[type]=state[type].filter(x=>x.id!==id);save()}};

function render(){
 const today=iso(new Date()); document.getElementById("todayLabel").textContent=new Intl.DateTimeFormat("th-TH",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
 document.getElementById("todayTasks").textContent=state.tasks.filter(x=>x.date===today&&!x.done).length;
 document.getElementById("pendingShopping").textContent=state.shopping.filter(x=>!x.done).length;
 document.getElementById("doneTasks").textContent=state.tasks.filter(x=>x.done).length;
 document.getElementById("homeTasks").innerHTML=state.tasks.filter(x=>!x.done).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5).map(x=>row(x,"tasks")).join("")||empty("ยังไม่มีงาน");
 document.getElementById("homeShopping").innerHTML=state.shopping.filter(x=>!x.done).slice(0,5).map(x=>row(x,"shopping")).join("")||empty("ไม่มีรายการที่ต้องซื้อ");
 const ss=document.getElementById("shopSearch").value.toLowerCase(), sf=document.getElementById("shopFilter").value;
 document.getElementById("shoppingList").innerHTML=state.shopping.filter(x=>(sf==="all"||(sf==="done"?x.done:!x.done))&&x.name.toLowerCase().includes(ss)).map(x=>row(x,"shopping")).join("")||empty("ยังไม่มีรายการ");
 const ts=document.getElementById("taskSearch").value.toLowerCase(), tf=document.getElementById("taskFilter").value;
 document.getElementById("taskList").innerHTML=state.tasks.filter(x=>(tf==="all"||(tf==="done"?x.done:!x.done))&&x.name.toLowerCase().includes(ts)).map(x=>row(x,"tasks")).join("")||empty("ยังไม่มีงาน");
 renderCalendar();
}
function empty(t){return `<div class="muted" style="padding:16px 0">${t}</div>`}
["shopSearch","shopFilter","taskSearch","taskFilter"].forEach(id=>document.getElementById(id).oninput=render);

function renderCalendar(){
 const y=viewDate.getFullYear(),m=viewDate.getMonth();document.getElementById("monthTitle").textContent=new Intl.DateTimeFormat("th-TH",{month:"long",year:"numeric"}).format(viewDate);
 const first=new Date(y,m,1), start=new Date(y,m,1-first.getDay()), grid=document.getElementById("calendarGrid");grid.innerHTML="";
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=iso(d);const cls=(d.getMonth()!==m?" mutedday":"")+(key===iso(new Date())?" today":"")+(key===selectedDate?" selected":"");let ev=[...state.tasks.map(x=>({...x,t:"task"})),...state.shopping.map(x=>({...x,t:"shop"}))].filter(x=>x.date===key);grid.innerHTML+=`<div class="day${cls}" onclick="selectDay('${key}')"><div class="daynum">${d.getDate()}</div>${ev.slice(0,3).map(x=>`<div class="dot ${x.t}">${x.t==="shop"?"🛒":"✓"} ${esc(x.name)}</div>`).join("")}</div>`}
 const events=[...state.tasks.map(x=>({...x,t:"task"})),...state.shopping.map(x=>({...x,t:"shop"}))].filter(x=>x.date===selectedDate).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
 document.getElementById("selectedDateTitle").textContent="รายการ · "+fmt(selectedDate);
 document.getElementById("selectedEvents").innerHTML=events.map(x=>row(x,x.t==="shop"?"shopping":"tasks")).join("")||empty("ไม่มีรายการในวันนี้");
}
window.selectDay=k=>{selectedDate=k;renderCalendar()};
document.getElementById("prevMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);renderCalendar()};
document.getElementById("nextMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);renderCalendar()};
document.getElementById("todayBtn").onclick=()=>{viewDate=new Date();selectedDate=iso(new Date());renderCalendar()};

render();
