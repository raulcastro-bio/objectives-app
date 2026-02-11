let goals = JSON.parse(localStorage.getItem("goals")) || [];
let didAutoScrollThisYear = null;


// Migración + normalización de fechas
goals = goals.map(g => {
  const dates = (g.dates || g.logs || []).map(normalizeDateStr);

  // Convertir hoursByDate -> minutesByDate si existe
  const minutesByDate = g.minutesByDate || {};
  if (g.hoursByDate && typeof g.hoursByDate === "object") {
    for (const [k, v] of Object.entries(g.hoursByDate)) {
      const key = normalizeDateStr(k);
      const hours = Number(v);
      if (Number.isFinite(hours) && hours >= 0) {
        minutesByDate[key] = Math.round(hours * 60);
      }
    }
  }

  return {
    ...g,
    dates,
    color: g.color || "#4caf50",
    milestones: g.milestones || [],
    minutesByDate
  };
});

// (opcional) elimina hoursByDate para no mantener dos fuentes
goals.forEach(g => { delete g.hoursByDate; });

localStorage.setItem("goals", JSON.stringify(goals));


let currentYear = new Date().getFullYear();

let selectedBreakdownGoalId = null;

function byId(id) {
  return document.getElementById(id);
}


function save() { localStorage.setItem("goals", JSON.stringify(goals)); }
function getColor(goal) { return goal.color; }

function toISODate(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeDateStr(s) {
  // acepta "YYYY-M-D" o "YYYY-MM-DD" y lo convierte a "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s).trim());
  if (!m) return s;
  return toISODate(Number(m[1]), Number(m[2]), Number(m[3]));
}


/* ---------- OBJETIVOS ---------- */
function addGoal() {
  const titleInput = document.getElementById("new-goal-title");
  const colorInput = document.getElementById("new-goal-color");
  if (!titleInput.value) return;

  goals.push({ id: Date.now(), title: titleInput.value, dates: [], color: colorInput.value });
  titleInput.value = "";
  save();
  renderDashboard();
}

/* ---------- DASHBOARD ---------- */
function renderDashboard() {
  document.getElementById("year-label").textContent = currentYear;
  renderGoalSummary();
  renderYearCalendar();
  renderBreakdownAll();
}

/* ---------- TABS ----------*/
function switchTab(tabName) {
  // botones
  document.querySelectorAll(".tab").forEach(btn =>
    btn.classList.toggle("active", btn.textContent.toLowerCase().includes(tabName))
  );

  // contenidos
  document.getElementById("tab-calendar").classList.toggle("active", tabName === "calendar");
  document.getElementById("tab-breakdown").classList.toggle("active", tabName === "breakdown");

  // UX: subir arriba al cambiar
  window.scrollTo({ top: 0, behavior: "smooth" });
}


/* ---------- RESUMEN DE OBJETIVOS ---------- */
function renderGoalSummary() {
  const container = document.getElementById("goal-summary");
  container.innerHTML = "";

  const totalDays = 365; // aproximación
  goals.forEach(g => {
    const div = document.createElement("div");
    div.className = "goal-item";

    // Selector de color
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = g.color;
    colorInput.className = "goal-color-picker";
    colorInput.oninput = () => {
      g.color = colorInput.value;
      save();
      renderDashboard();
    };

    // Label con días y porcentaje
    const count = g.dates.filter(d => d.startsWith(currentYear)).length;
    const perc = Math.round((count / totalDays) * 100);
    const label = document.createElement("span");
    label.textContent = `${g.title}: ${count} días (${perc}%)`;

    // Botón información
    const infoBtn = document.createElement("button");
    infoBtn.textContent = "ⓘ";
    infoBtn.title = "Ver resumen de horas";
    infoBtn.onclick = () => showGoalInfo(g);


    div.appendChild(colorInput);
    div.appendChild(label);
    div.appendChild(infoBtn);
    container.appendChild(div);
  });
}


/* ---------- CALENDARIO ANUAL ---------- */
function renderYearCalendar() {
  const container = document.getElementById("calendar-year");
  container.innerHTML = "";

  const today = new Date();
  const isCurrentYearToday = (today.getFullYear() === currentYear);
  const todayMonth = today.getMonth(); // 0-11
  const todayDay = today.getDate();    // 1-31

  for (let month = 0; month < 12; month++) {
    const monthDiv = document.createElement("div");
    monthDiv.className = "month-container";
    monthDiv.dataset.month = month;

    const monthName = document.createElement("div");
    monthName.className = "month-name";
    monthName.textContent = new Date(currentYear, month).toLocaleDateString("es-ES", { month: "long"});
    monthDiv.appendChild(monthName);

    const calendar = document.createElement("div");
    calendar.style.display = "grid";
    calendar.style.gridTemplateColumns = "repeat(7, 1fr)";
    calendar.style.gap = "5px";

    const weekdays = ["L","M","X","J","V","S","D"];
    weekdays.forEach(d => {
      const wd = document.createElement("div");
      wd.textContent = d;
      wd.className = "weekday";
      calendar.appendChild(wd);
    });

    const firstDay = new Date(currentYear, month, 1);
    const start = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();

    for (let i = 0; i < start; i++) calendar.appendChild(document.createElement("div"));

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = toISODate(currentYear, month + 1, day);
          const dayDiv = document.createElement("div");
          dayDiv.className = "day";
          dayDiv.textContent = day;

          // ✅ Resaltar día actual
          if (isCurrentYearToday && month === todayMonth && day === todayDay) {
            dayDiv.classList.add("today");
          }

          const markers = document.createElement("div");
          markers.className = "markers";

          goals.forEach(g => {
            if (g.dates.includes(dateStr)) {
              const m = document.createElement("div");
              m.className = "marker";
              m.style.background = getColor(g);
              markers.appendChild(m);
            }
          });

          dayDiv.appendChild(markers);


          dayDiv.onclick = () => toggleDay(dateStr);
          calendar.appendChild(dayDiv);
        }

    monthDiv.appendChild(calendar);
    container.appendChild(monthDiv);
  }

  // Scroll automático al mes actual (solo si estamos en el año actual)
  if (currentYear === today.getFullYear() && didAutoScrollThisYear !== currentYear) {
  const currentMonth = today.getMonth();
  const targetMonth = container.querySelector(`.month-container[data-month="${currentMonth}"]`);

  if (targetMonth) {
    targetMonth.scrollIntoView({ behavior: "smooth", block: "start" });
    didAutoScrollThisYear = currentYear; // ✅ solo una vez
  }
}

}

/* ---------- SELECCIÓN DE OBJETIVOS ---------- */
function toggleDay(dateStr) {
  if (goals.length===0) return;

  const modal = document.createElement("div");
  modal.style = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1000;
  `;
  const container = document.createElement("div");
  container.style = `
    background:white;padding:20px;border-radius:8px;max-height:80%;overflow-y:auto;
  `;
  container.innerHTML = `<h3>Marcar objetivos para ${dateStr}</h3>`;

  goals.forEach(g => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "auto auto 1fr auto"; // ✅ la última columna es el timeWrap (un solo bloque)
    row.style.alignItems = "center";
    row.style.gap = "10px";
    row.style.marginBottom = "10px";

    // Evita que el texto empuje al tiempo a otra línea
    const title = document.createElement("span");
    title.textContent = g.title;
    title.style.minWidth = "0";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.whiteSpace = "nowrap";


    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = (g.dates || []).includes(dateStr);

    const colorDot = document.createElement("span");
    colorDot.style = `
      display:inline-block;width:12px;height:12px;border-radius:50%;
      background:${getColor(g)};
    `;

   // --- valores actuales ---
    const totalMin = (g.minutesByDate && g.minutesByDate[dateStr] != null) ? g.minutesByDate[dateStr] : null;
    const hm = totalMin == null ? { h: "", m: "" } : minutesToHM(totalMin);

    // contenedor conjunto hh:mm
    const timeWrap = document.createElement("div");
    timeWrap.className = "time-input";

    // input horas
    const hoursInput = document.createElement("input");
    hoursInput.type = "number";
    hoursInput.min = "0";
    hoursInput.step = "1";
    hoursInput.placeholder = "h";
    hoursInput.value = hm.h === "" ? "" : String(hm.h);

    // separador :
    const sep = document.createElement("span");
    sep.className = "time-sep";
    sep.textContent = ":";

    // input minutos
    const minutesInput = document.createElement("input");
    minutesInput.type = "number";
    minutesInput.min = "0";
    minutesInput.max = "59";
    minutesInput.step = "1";
    minutesInput.placeholder = "min";
    minutesInput.value = hm.m === "" ? "" : String(hm.m);

    // habilitar/deshabilitar según checkbox
    const setEnabled = (enabled) => {
      hoursInput.disabled = !enabled;
      minutesInput.disabled = !enabled;
      timeWrap.classList.toggle("disabled", !enabled);
    };

    setEnabled(checkbox.checked);

    // normalizar minutos a 0..59 y guardar
    const persistTime = () => {
      if (!checkbox.checked) return;

      const h = hoursInput.value === "" ? 0 : Number(hoursInput.value);
      let m = minutesInput.value === "" ? 0 : Number(minutesInput.value);

      if (!Number.isFinite(m) || m < 0) m = 0;
      if (m >= 60) {
        const extraH = Math.floor(m / 60);
        m = m % 60;
        const currentH = hoursInput.value === "" ? 0 : Number(hoursInput.value);
        hoursInput.value = String(currentH + extraH);
        minutesInput.value = String(m);
      }

      // si el usuario escribe 7, que quede "07" visualmente (opcional)
      // minutesInput.value = String(m).padStart(2, "0");

      if (!g.minutesByDate) g.minutesByDate = {};
      const total = hmToMinutes(h, m);

      if (total === 0) {
        delete g.minutesByDate[dateStr];
      } else {
        g.minutesByDate[dateStr] = total;
      }

      save();
    };

    hoursInput.oninput = persistTime;
    minutesInput.oninput = persistTime;

    // montar el conjunto
    timeWrap.appendChild(hoursInput);
    timeWrap.appendChild(sep);
    timeWrap.appendChild(minutesInput);


    // Toggle del objetivo para ese día
    checkbox.onchange = () => {
      const idx = (g.dates || []).indexOf(dateStr);

      if (checkbox.checked) {
        setEnabled(true);

        // Si no hay tiempo aún, deja vacío (o pon 0:00)
        if (!g.minutesByDate) g.minutesByDate = {};
        if (g.minutesByDate[dateStr] == null) {
          // no asignamos nada por defecto -> queda vacío
        }

        hoursInput.focus();
      } else {
        setEnabled(false);
        hoursInput.value = "";
        minutesInput.value = "";

        if (g.minutesByDate) delete g.minutesByDate[dateStr];
      }



      save();
      renderDashboard(); // o renderYearCalendar() si prefieres evitar repintar todo
    };

    row.appendChild(checkbox);
    row.appendChild(colorDot);
    row.appendChild(title);
    row.appendChild(timeWrap);



    container.appendChild(row);
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent="Cerrar";
  closeBtn.style.marginTop="10px";
  closeBtn.onclick = () => document.body.removeChild(modal);

  container.appendChild(closeBtn);
  modal.appendChild(container);
  document.body.appendChild(modal);
}

function minutesToHM(total) {
  const t = Number(total);
  if (!Number.isFinite(t) || t < 0) return { h: 0, m: 0 };
  const h = Math.floor(t / 60);
  const m = t % 60;
  return { h, m };
}

function hmToMinutes(h, m) {
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || hh < 0) return 0;
  if (!Number.isFinite(mm) || mm < 0) return 0;
  return Math.round(hh * 60 + mm);
}

/* ------------ SIDEBAR ------------*/
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const isOpen = sidebar.classList.toggle("open");
  overlay.classList.toggle("hidden", !isOpen);
}

function formatMinutes(mins) {
  const t = Number(mins) || 0;
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function sumMinutesForYear(goal, year) {
  const map = goal.minutesByDate || {};
  let total = 0;
  for (const [dateStr, mins] of Object.entries(map)) {
    if (String(dateStr).startsWith(String(year))) {
      const v = Number(mins);
      if (Number.isFinite(v) && v > 0) total += v;
    }
  }
  return total;
}

function showGoalInfo(goal) {
  const days = (goal.dates || []).filter(d => String(d).startsWith(String(currentYear))).length;
  const totalMinutes = sumMinutesForYear(goal, currentYear);
  const avg = days > 0 ? Math.round(totalMinutes / days) : 0;

  const modal = document.createElement("div");
  modal.style = `
    position:fixed; inset:0; background:rgba(0,0,0,0.35);
    display:flex; align-items:center; justify-content:center; z-index:5000;
    padding:16px;
  `;

  const card = document.createElement("div");
  card.style = `
    background:white; width:min(420px, 92vw);
    border-radius:16px; padding:16px;
    box-shadow: 0 18px 50px rgba(0,0,0,0.18);
  `;

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-weight:800;font-size:16px;">${goal.title}</div>
      <button id="close-info" style="width:38px;height:38px;border-radius:12px;">✕</button>
    </div>

    <div style="margin-top:12px;display:grid;gap:8px;">
      <div><strong>Días marcados (${currentYear}):</strong> ${days}</div>
      <div><strong>Tiempo total (${currentYear}):</strong> ${formatMinutes(totalMinutes)}</div>
      <div><strong>Media por día:</strong> ${formatMinutes(avg)}</div>
    </div>

    <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
      <button id="delete-goal"
        style="
          color:#FF3B30; background:transparent; border:0;
        ">
        Eliminar objetivo
      </button>
    </div>
  `;

  modal.appendChild(card);
  document.body.appendChild(modal);

  const close = () => document.body.removeChild(modal);

  card.querySelector("#close-info").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  // eliminar dentro del panel info
  card.querySelector("#delete-goal").onclick = () => {
    if (confirm(`¿Eliminar el objetivo "${goal.title}"?`)) {
      goals = goals.filter(g => g.id !== goal.id);
      save();
      renderDashboard();
      close();
    }
  };
}


/* ------------ DESGLOSE -------------*/
function renderBreakdownAll() {
  const container = document.getElementById("breakdown-list");
  if (!container) return;

  container.innerHTML = "";

  if (goals.length === 0) {
    container.textContent = "No hay objetivos. Crea uno primero desde el menú.";
    return;
  }

  goals.forEach(goal => {
    const card = document.createElement("div");
    card.className = "breakdown-goal";

    // Header
    const header = document.createElement("div");
    header.className = "breakdown-goal-header";

    const title = document.createElement("div");
    title.className = "breakdown-goal-title";
    title.textContent = goal.title;

    header.appendChild(title);
    card.appendChild(header);

    // Add milestone row
    const addRow = document.createElement("div");
    addRow.className = "breakdown-add";

    const input = document.createElement("input");
    input.placeholder = 'Añadir hito… (p. ej. "A1", "Libro 1")';

    const btn = document.createElement("button");
    btn.textContent = "Añadir";
    btn.onclick = () => {
      const t = (input.value || "").trim();
      if (!t) return;

      goal.milestones = goal.milestones || [];
      goal.milestones.push({ id: Date.now(), title: t, done: false });
      input.value = "";
      save();
      renderBreakdownAll();
    };

    addRow.appendChild(input);
    addRow.appendChild(btn);
    card.appendChild(addRow);

    // Milestone list
    const ul = document.createElement("ul");
    ul.className = "milestone-list";

    (goal.milestones || []).forEach(m => {
      const li = document.createElement("li");
      li.className = "milestone-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!m.done;
      checkbox.onchange = () => {
        m.done = checkbox.checked;
        save();
        renderBreakdownAll();
      };

      const mTitle = document.createElement("div");
      mTitle.className = "milestone-title" + (m.done ? " done" : "");
      mTitle.textContent = m.title;

      const actions = document.createElement("div");
      actions.className = "milestone-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.title = "Editar";
      editBtn.onclick = () => {
        const newTitle = prompt("Editar hito:", m.title);
        if (newTitle && newTitle.trim()) {
          m.title = newTitle.trim();
          save();
          renderBreakdownAll();
        }
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑";
      delBtn.title = "Eliminar";
      delBtn.onclick = () => {
        if (confirm(`¿Eliminar "${m.title}"?`)) {
          goal.milestones = (goal.milestones || []).filter(x => x.id !== m.id);
          save();
          renderBreakdownAll();
        }
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(checkbox);
      li.appendChild(mTitle);
      li.appendChild(actions);

      ul.appendChild(li);
    });

    card.appendChild(ul);
    container.appendChild(card);
  });
}


/* ---------- NAVEGACIÓN DE AÑOS ---------- */
function prevYear() { 
  currentYear--; 
  didAutoScrollThisYear = null;
  renderDashboard(); 
}

function nextYear() { 
  currentYear++; 
  didAutoScrollThisYear = null;
  renderDashboard(); 
}


/* ---------- INIT ---------- */
renderDashboard();
