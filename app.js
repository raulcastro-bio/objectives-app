let goals = JSON.parse(localStorage.getItem("goals")) || [];

// Migración de datos
goals = goals.map(g => ({ ...g, dates: g.dates || g.logs || [], color: g.color || "#4caf50" }));

let currentYear = new Date().getFullYear();

function save() { localStorage.setItem("goals", JSON.stringify(goals)); }
function getColor(goal) { return goal.color; }

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

  for (let month = 0; month < 12; month++) {
    const monthDiv = document.createElement("div");
    monthDiv.className = "month-container";

    const monthName = document.createElement("div");
    monthName.className = "month-name";
    monthName.textContent = new Date(currentYear, month).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
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
      const dateStr = `${currentYear}-${month+1}-${day}`;
      const dayDiv = document.createElement("div");
      dayDiv.className = "day";
      dayDiv.textContent = day;

      goals.forEach(g => {
        if (g.dates.includes(dateStr)) {
          const dot = document.createElement("div");
          dot.className = "dot";
          dot.style.background = getColor(g);
          dayDiv.appendChild(dot);
        }
      });

      dayDiv.onclick = () => toggleDay(dateStr);
      calendar.appendChild(dayDiv);
    }

    monthDiv.appendChild(calendar);
    container.appendChild(monthDiv);
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
    const label = document.createElement("label");
    label.style.display="block"; label.style.marginBottom="8px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = g.dates.includes(dateStr);
    checkbox.onchange = () => {
      const idx = g.dates.indexOf(dateStr);
      if (checkbox.checked && idx===-1) g.dates.push(dateStr);
      else if (!checkbox.checked && idx>=0) g.dates.splice(idx,1);
      save();
      renderDashboard();
    };

    const colorDot = document.createElement("span");
    colorDot.style = `
      display:inline-block;width:12px;height:12px;
      border-radius:50%;background:${getColor(g)};margin-right:6px;
    `;
    label.appendChild(checkbox);
    label.appendChild(colorDot);
    label.appendChild(document.createTextNode(g.title));
    container.appendChild(label);
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent="Cerrar";
  closeBtn.style.marginTop="10px";
  closeBtn.onclick = () => document.body.removeChild(modal);

  container.appendChild(closeBtn);
  modal.appendChild(container);
  document.body.appendChild(modal);
}

/* ---------- NAVEGACIÓN DE AÑOS ---------- */
function prevYear() { currentYear--; renderDashboard(); }
function nextYear() { currentYear++; renderDashboard(); }

/* ---------- INIT ---------- */
renderDashboard();
