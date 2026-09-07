const SUPABASE_URL = "https://iathvkwaracztjcninfh.supabase.co";
const SUPABASE_KEY = "sb_publishable_5MUVkkTB6SsNGToLxehVbQ_pCC1KWxy";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let state = { shopping: [], tasks: [] };
let viewDate = new Date();
let selectedDate = iso(new Date());
let currentPage = "home";

function iso(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function fmt(d) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(d + "T00:00:00"));
}

const pages = {
  home: "วันนี้",
  shopping: "ซื้อของ",
  tasks: "งาน",
  calendar: "ปฏิทิน"
};

/* -------------------------
   Supabase
------------------------- */

function toDb(item) {
  return {
    id: item.id,
    name: item.name,
    date: item.date,
    time: item.time || null,
    category: item.category || null,
    qty: item.qty || 1,
    priority: item.priority || "normal",
    notes: item.notes || null,
    done: !!item.done
  };
}

function fromDb(item) {
  return {
    id: item.id,
    name: item.name || "",
    date: item.date,
    time: item.time || "",
    category: item.category || "",
    qty: item.qty || 1,
    priority: item.priority || "normal",
    notes: item.notes || "",
    done: !!item.done
  };
}

async function loadData() {
  const [shoppingResult, tasksResult] = await Promise.all([
    db.from("shopping").select("*").order("created_at", { ascending: false }),
    db.from("tasks").select("*").order("created_at", { ascending: false })
  ]);

  if (shoppingResult.error) {
    console.error("Shopping error:", shoppingResult.error);
    alert("โหลดรายการซื้อจากฐานข้อมูลไม่สำเร็จ");
    return;
  }

  if (tasksResult.error) {
    console.error("Tasks error:", tasksResult.error);
    alert("โหลดงานจากฐานข้อมูลไม่สำเร็จ");
    return;
  }

  state.shopping = shoppingResult.data.map(fromDb);
  state.tasks = tasksResult.data.map(fromDb);

  render();
}

/* -------------------------
   Navigation
------------------------- */

document.querySelectorAll(".nav").forEach(b => {
  b.onclick = () => go(b.dataset.page);
});

document.querySelectorAll("[data-page-link]").forEach(b => {
  b.onclick = () => go(b.dataset.pageLink);
});

function go(page) {
  currentPage = page;

  document.querySelectorAll(".page")
    .forEach(x => x.classList.remove("active"));

  document.getElementById(page).classList.add("active");

  document.querySelectorAll(".nav")
    .forEach(x => x.classList.toggle(
      "active",
      x.dataset.page === page
    ));

  document.getElementById("pageTitle").textContent = pages[page];

  /*
    แก้ปัญหาปุ่มด้านบน:
    หน้าซื้อของ / งาน / ปฏิทิน จะซ่อนปุ่ม quickAdd
    เพราะแต่ละหน้ามีปุ่มของตัวเองอยู่แล้ว
  */
  const quickAdd = document.getElementById("quickAdd");

  if (page === "home") {
    quickAdd.style.display = "inline-flex";
    quickAdd.textContent = "＋ เพิ่มรายการ";
  } else {
    quickAdd.style.display = "none";
  }

  render();
}

/* -------------------------
   Modal
------------------------- */

function openModal(type, id = null) {
  document.getElementById("modal").classList.add("show");

  document.getElementById("itemType").value = type;
  document.getElementById("itemId").value = id || "";

  document.getElementById("modalTitle").textContent =
    (id ? "แก้ไข" : "เพิ่ม") +
    (type === "shopping" ? "รายการซื้อ" : "งาน");

  const old = (state[type] || []).find(x => x.id === id);

  document.getElementById("name").value = old?.name || "";
  document.getElementById("date").value =
    old?.date || selectedDate || iso(new Date());

  document.getElementById("time").value = old?.time || "";
  document.getElementById("category").value = old?.category || "";
  document.getElementById("qty").value = old?.qty || 1;
  document.getElementById("priority").value =
    old?.priority || "normal";
  document.getElementById("notes").value = old?.notes || "";

  document.getElementById("timeWrap").style.display =
    type === "tasks" ? "block" : "none";

  document.getElementById("categoryWrap").style.display =
    type === "shopping" ? "block" : "none";

  document.getElementById("qtyWrap").style.display =
    type === "shopping" ? "block" : "none";

  document.getElementById("priorityWrap").style.display =
    type === "tasks" ? "block" : "none";
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
}

document.getElementById("closeModal").onclick = closeModal;
document.getElementById("cancelModal").onclick = closeModal;

document.getElementById("quickAdd").onclick = () => {
  openModal("tasks");
};

document.getElementById("addTask").onclick = () => {
  openModal("tasks");
};

document.getElementById("addShopping").onclick = () => {
  openModal("shopping");
};

/* -------------------------
   Add / Edit
------------------------- */

document.getElementById("itemForm").onsubmit = async e => {
  e.preventDefault();

  const type = document.getElementById("itemType").value;
  const id = document.getElementById("itemId").value;

  const existing = id
    ? state[type].find(x => x.id === id)
    : null;

  const item = {
    id: id || crypto.randomUUID(),
    name: document.getElementById("name").value.trim(),
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    category: document.getElementById("category").value.trim(),
    qty: +document.getElementById("qty").value || 1,
    priority: document.getElementById("priority").value,
    notes: document.getElementById("notes").value.trim(),
    done: existing ? existing.done : false
  };

  if (!item.name) return;

  const { error } = await db
    .from(type)
    .upsert(toDb(item));

  if (error) {
    console.error(error);
    alert("บันทึกไม่สำเร็จ\n" + error.message);
    return;
  }

  const arr = state[type];
  const idx = arr.findIndex(x => x.id === item.id);

  if (idx >= 0) {
    arr[idx] = item;
  } else {
    arr.unshift(item);
  }

  closeModal();
  render();
};

/* -------------------------
   Row
------------------------- */

function row(item, type) {
  return `
    <div class="item">
      <div
        class="check ${item.done ? "done" : ""}"
        onclick="toggle('${type}','${item.id}')"
      >
        ${item.done ? "✓" : ""}
      </div>

      <div class="itemmain">
        <div
          class="itemname"
          style="${
            item.done
              ? "text-decoration:line-through;color:#8b95a5"
              : ""
          }"
        >
          ${esc(item.name)}
        </div>

        <div class="muted">
          ${fmt(item.date)}
          ${item.time ? " · " + item.time : ""}
          ${item.category ? " · " + esc(item.category) : ""}
          ${
            type === "shopping"
              ? " · " + item.qty + " ชิ้น"
              : ""
          }
          ${item.notes ? " · " + esc(item.notes) : ""}
        </div>
      </div>

      <div class="actions">
        <button onclick="openModal('${type}','${item.id}')">
          แก้
        </button>

        <button onclick="removeItem('${type}','${item.id}')">
          ลบ
        </button>
      </div>
    </div>
  `;
}

window.toggle = async (type, id) => {
  const item = state[type].find(x => x.id === id);

  if (!item) return;

  const newDone = !item.done;

  const { error } = await db
    .from(type)
    .update({ done: newDone })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("เปลี่ยนสถานะไม่สำเร็จ\n" + error.message);
    return;
  }

  item.done = newDone;
  render();
};

window.removeItem = async (type, id) => {
  if (!confirm("ลบรายการนี้ใช่ไหม?")) return;

  const { error } = await db
    .from(type)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("ลบไม่สำเร็จ\n" + error.message);
    return;
  }

  state[type] = state[type].filter(x => x.id !== id);
  render();
};

/* -------------------------
   Render
------------------------- */

function render() {
  const today = iso(new Date());

  document.getElementById("todayLabel").textContent =
    new Intl.DateTimeFormat("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());

  document.getElementById("todayTasks").textContent =
    state.tasks.filter(
      x => x.date === today && !x.done
    ).length;

  document.getElementById("pendingShopping").textContent =
    state.shopping.filter(x => !x.done).length;

  document.getElementById("doneTasks").textContent =
    state.tasks.filter(x => x.done).length;

  document.getElementById("homeTasks").innerHTML =
    state.tasks
      .filter(x => !x.done)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map(x => row(x, "tasks"))
      .join("") || empty("ยังไม่มีงาน");

  document.getElementById("homeShopping").innerHTML =
    state.shopping
      .filter(x => !x.done)
      .slice(0, 5)
      .map(x => row(x, "shopping"))
      .join("") || empty("ไม่มีรายการที่ต้องซื้อ");

  const ss =
    document.getElementById("shopSearch").value.toLowerCase();

  const sf =
    document.getElementById("shopFilter").value;

  document.getElementById("shoppingList").innerHTML =
    state.shopping
      .filter(x =>
        (sf === "all" ||
          (sf === "done" ? x.done : !x.done)) &&
        x.name.toLowerCase().includes(ss)
      )
      .map(x => row(x, "shopping"))
      .join("") || empty("ยังไม่มีรายการ");

  const ts =
    document.getElementById("taskSearch").value.toLowerCase();

  const tf =
    document.getElementById("taskFilter").value;

  document.getElementById("taskList").innerHTML =
    state.tasks
      .filter(x =>
        (tf === "all" ||
          (tf === "done" ? x.done : !x.done)) &&
        x.name.toLowerCase().includes(ts)
      )
      .map(x => row(x, "tasks"))
      .join("") || empty("ยังไม่มีงาน");

  renderCalendar();
}

function empty(t) {
  return `
    <div class="muted" style="padding:16px 0">
      ${t}
    </div>
  `;
}

["shopSearch", "shopFilter", "taskSearch", "taskFilter"]
  .forEach(id => {
    document.getElementById(id).oninput = render;
  });

/* -------------------------
   Calendar
------------------------- */

function renderCalendar() {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();

  document.getElementById("monthTitle").textContent =
    new Intl.DateTimeFormat("th-TH", {
      month: "long",
      year: "numeric"
    }).format(viewDate);

  const first = new Date(y, m, 1);
  const start = new Date(
    y,
    m,
    1 - first.getDay()
  );

  const grid = document.getElementById("calendarGrid");

  grid.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);

    d.setDate(start.getDate() + i);

    const key = iso(d);

    const cls =
      (d.getMonth() !== m ? " mutedday" : "") +
      (key === iso(new Date()) ? " today" : "") +
      (key === selectedDate ? " selected" : "");

    const ev = [
      ...state.tasks.map(x => ({
        ...x,
        t: "task"
      })),
      ...state.shopping.map(x => ({
        ...x,
        t: "shop"
      }))
    ].filter(x => x.date === key);

    grid.innerHTML += `
      <div
        class="day${cls}"
        onclick="selectDay('${key}')"
      >
        <div class="daynum">${d.getDate()}</div>

        ${ev.slice(0, 3).map(x => `
          <div class="dot ${x.t}">
            ${x.t === "shop" ? "🛒" : "✓"}
            ${esc(x.name)}
          </div>
        `).join("")}
      </div>
    `;
  }

  const events = [
    ...state.tasks.map(x => ({
      ...x,
      t: "task"
    })),
    ...state.shopping.map(x => ({
      ...x,
      t: "shop"
    }))
  ]
    .filter(x => x.date === selectedDate)
    .sort((a, b) =>
      (a.time || "").localeCompare(b.time || "")
    );

  document.getElementById("selectedDateTitle").textContent =
    "รายการ · " + fmt(selectedDate);

  document.getElementById("selectedEvents").innerHTML =
    events
      .map(x =>
        row(
          x,
          x.t === "shop"
            ? "shopping"
            : "tasks"
        )
      )
      .join("") ||
    empty("ไม่มีรายการในวันนี้");
}

window.selectDay = k => {
  selectedDate = k;
  renderCalendar();
};

document.getElementById("prevMonth").onclick = () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  renderCalendar();
};

document.getElementById("todayBtn").onclick = () => {
  viewDate = new Date();
  selectedDate = iso(new Date());
  renderCalendar();
};

/* -------------------------
   Start
------------------------- */

async function startApp() {
  const quickAdd = document.getElementById("quickAdd");

  // ซ่อนปุ่มด้านบนไว้ก่อน
  quickAdd.style.display = "none";

  await loadData();
}

startApp();
