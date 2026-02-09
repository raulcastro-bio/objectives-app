let goals = JSON.parse(localStorage.getItem("goals")) || [];
let didAutoScrollThisYear = null;


// Migración + normalización de fechas
goals = goals.map(g => ({
  ...g,
  dates: (g.dates || g.logs || []).map(normalizeDateStr),
  color: g.color || "#4caf50",
  milestones: g.milestones || [],
  hoursByDate: g.hoursByDate || {}   // ✅ NUEVO
}));

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

    // Botón eliminar
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.style.marginLeft = "6px";
    delBtn.title = "Eliminar objetivo";
    delBtn.onclick = () => {
      if (confirm(`¿Eliminar el objetivo "${g.title}"?`)) {
        goals = goals.filter(goal => goal.id !== g.id);
        save();
        renderDashboard();
      }
    };

    div.appendChild(colorInput);
    div.appendChild(label);
    div.appendChild(delBtn);
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
    row.style.gridTemplateColumns = "auto auto 1fr auto";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.style.marginBottom = "10px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = (g.dates || []).includes(dateStr);

    const colorDot = document.createElement("span");
    colorDot.style = `
      display:inline-block;width:12px;height:12px;border-radius:50%;
      background:${getColor(g)};
    `;

    const title = document.createElement("span");
    title.textContent = g.title;

    // ✅ Input horas
    const hoursInput = document.createElement("input");
    hoursInput.type = "number";
    hoursInput.min = "0";
    hoursInput.step = "0.25";
    hoursInput.placeholder = "h";
    hoursInput.style.width = "70px";
    hoursInput.value = (g.hoursByDate && g.hoursByDate[dateStr] != null) ? g.hoursByDate[dateStr] : "";
    hoursInput.disabled = !checkbox.checked;

    // Guardar horas al escribir (solo si está marcado)
    hoursInput.oninput = () => {
      if (!checkbox.checked) return;
      const val = Number(hoursInput.value);
      if (!g.hoursByDate) g.hoursByDate = {};
      if (Number.isFinite(val) && val >= 0) {
        g.hoursByDate[dateStr] = val;
      } else {
        delete g.hoursByDate[dateStr];
      }
      save();
    };

    // Toggle del objetivo para ese día
    checkbox.onchange = () => {
      const idx = (g.dates || []).indexOf(dateStr);

      if (checkbox.checked) {
        if (idx === -1) (g.dates || (g.dates = [])).push(dateStr);
        hoursInput.disabled = false;

        // Si no había horas, pon 1 por defecto (o déjalo vacío si prefieres)
        if (!g.hoursByDate) g.hoursByDate = {};
        if (g.hoursByDate[dateStr] == null) {
          g.hoursByDate[dateStr] = 1;
          hoursInput.value = "1";
        }
        hoursInput.focus();
        hoursInput.select();
      } else {
        if (idx >= 0) g.dates.splice(idx, 1);
        hoursInput.disabled = true;
        hoursInput.value = "";

        // Al desmarcar, borramos horas de ese día
        if (g.hoursByDate) delete g.hoursByDate[dateStr];
      }

      save();
      renderDashboard(); // o renderYearCalendar() si prefieres evitar repintar todo
    };

    row.appendChild(checkbox);
    row.appendChild(colorDot);
    row.appendChild(title);
    row.appendChild(hoursInput);

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

/* ------------ SIDEBAR ------------*/
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const isOpen = sidebar.classList.toggle("open");
  overlay.classList.toggle("hidden", !isOpen);
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
