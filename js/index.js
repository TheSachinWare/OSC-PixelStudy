/* =========================
    Data & Helpers
   ========================= */

// --- LocalStorage key & sample data ---
const LS_KEY = "studyhub_v2_resources";

const sampleData = {
  Math: [
    { name: "Khan Academy", url: "https://www.khanacademy.org", desc: "Free lessons & practice problems for many math topics" },
    { name: "Desmos", url: "https://www.desmos.com", desc: "Graphing calculator and activities" }
  ],
  "Computer Science": [
    { name: "MDN Web Docs", url: "https://developer.mozilla.org", desc: "Documentation and guides for web dev" },
    { name: "freeCodeCamp", url: "https://www.freecodecamp.org", desc: "Free interactive coding lessons" }
  ],
  Biology: [
    { name: "Crash Course", url: "https://www.youtube.com/user/crashcourse", desc: "Engaging video explanations" }
  ]
};

// --- Load/save helpers ---
function loadResources() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return structuredClone(sampleData);
    return JSON.parse(raw);
  } catch {
    return structuredClone(sampleData);
  }
}

function saveResources(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

// --- App state ---
let resources = loadResources();
let currentSubject = null; // null = all resources

// --- DOM elements ---
const subjectsEl = document.getElementById("subjects");
const gridEl = document.getElementById("resource-grid");
const titleEl = document.getElementById("current-subject-title");
const searchEl = document.getElementById("search");

// --- Get subjects list sorted ---
function getSubjectList() {
  return Object.keys(resources).sort((a, b) => a.localeCompare(b));
}

// --- Render sidebar subjects ---
function renderSubjects() {
  subjectsEl.innerHTML = "";
  const keys = getSubjectList();
  if (keys.length === 0) {
    subjectsEl.innerHTML = '<p style="opacity:0.7">No subjects yet — add one to get started</p>';
    return;
  }

  keys.forEach((s) => {
    const el = document.createElement("div");
    el.className = "subject" + (currentSubject === s ? " active" : "");
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.innerHTML = `
      <div style="display:flex;gap:0.65rem;align-items:center">
        <div class="tag">${s[0] || "?"}</div>
        <div class="meta">${s}</div>
      </div>
      <div class="count">${resources[s].length}</div>
    `;
    el.addEventListener("click", () => {
      currentSubject = currentSubject === s ? null : s;
      renderAll();
    });
    el.addEventListener("keydown", (e) => e.key === "Enter" && el.click());

    // Small delete button
    const del = document.createElement("button");
    del.className = "delete-subject-btn";
    del.textContent = "Delete";
    del.title = "Delete subject and all resources";
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (confirm(`Delete subject "${s}" and all its resources?`)) {
        delete resources[s];
        saveResources(resources);
        if (currentSubject === s) currentSubject = null;
        renderAll();
      }
    });
    del.style.marginLeft = "0.6rem";
    el.appendChild(del);

    subjectsEl.appendChild(el);
  });
}

// --- Create resource card ---
function createCard(subject, item, idx) {
  const c = document.createElement("article");
  c.className = "card";
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:0.6rem;align-items:start">
      <div>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.2rem">
          <span class="tag">${subject}</span>
          <a href="${item.url}" target="_blank" rel="noopener">${item.name}</a>
        </div>
        <p title="${item.desc || ""}">${item.desc || "No description provided."}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.4rem;align-items:flex-end">
        <button class="btn-ghost" data-subject="${subject}" data-idx="${idx}" aria-label="Edit resource">✎</button>
        <button class="delete-btn" data-subject="${subject}" data-idx="${idx}" aria-label="Delete resource">🗑</button>
      </div>
    </div>
  `;
  return c;
}

/* =========================
    Grid & Modal
   ========================= */

// --- Render resource grid ---
function renderGrid(filterText = "") {
  gridEl.innerHTML = "";
  const filter = (filterText || "").toLowerCase().trim();
  const pairs = [];

  if (currentSubject) {
    (resources[currentSubject] || []).forEach((r, i) => pairs.push([currentSubject, r, i]));
  } else {
    Object.keys(resources).forEach((s) =>
      resources[s].forEach((r, i) => pairs.push([s, r, i]))
    );
  }

  const filtered = pairs.filter(([s, r]) => {
    if (!filter) return true;
    return (
      s.toLowerCase().includes(filter) ||
      r.name.toLowerCase().includes(filter) ||
      (r.desc || "").toLowerCase().includes(filter) ||
      (r.url || "").toLowerCase().includes(filter)
    );
  });

  if (filtered.length === 0) {
    gridEl.innerHTML = `<p style="opacity:0.8">No results. Try a different search or add a new resource.</p>`;
    return;
  }

  filtered.forEach(([s, r, i]) => {
    gridEl.appendChild(createCard(s, r, i));
  });

  // --- Attach delete buttons ---
  gridEl.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const s = e.currentTarget.dataset.subject;
      const idx = Number(e.currentTarget.dataset.idx);
      if (confirm("Delete this resource?")) {
        resources[s].splice(idx, 1);
        if (resources[s].length === 0) delete resources[s];
        saveResources(resources);
        renderAll();
      }
    })
  );

  // --- Attach edit buttons ---
  gridEl.querySelectorAll(".btn-ghost").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const s = e.currentTarget.dataset.subject;
      const idx = Number(e.currentTarget.dataset.idx);
      document.getElementById("modal-subject").value = s;
      document.getElementById("modal-name").value = resources[s][idx].name;
      document.getElementById("modal-link").value = resources[s][idx].url;

      openModal(() => {
        const ns = document.getElementById("modal-subject").value.trim();
        const nn = document.getElementById("modal-name").value.trim();
        const nu = document.getElementById("modal-link").value.trim();
        if (!ns || !nn || !nu) {
          alert("Please provide subject, name and link.");
          return false;
        }

        // Remove old
        const oldDesc = resources[s][idx].desc;
        resources[s].splice(idx, 1);
        if (resources[s].length === 0) delete resources[s];

        // Add updated
        resources[ns] = resources[ns] || [];
        resources[ns].push({ name: nn, url: nu, desc: oldDesc });
        saveResources(resources);
        renderAll();
        return true;
      });
    })
  );
}

// --- Render everything ---
function renderAll() {
  renderSubjects();
  titleEl.textContent = currentSubject ? currentSubject : "All Resources";
  renderGrid(searchEl.value);
}

/* --- Modal utilities --- */
const modal = document.getElementById("modal");
let modalCallback = null;

function openModal(onSave) {
  modalCallback = onSave || onSaveDefault;
  modal.classList.add("show");
  document.getElementById("modal-subject").focus();
}

function closeModal() {
  modal.classList.remove("show");
  modalCallback = null;
  document.getElementById("modal-subject").value = "";
  document.getElementById("modal-name").value = "";
  document.getElementById("modal-link").value = "";
}

// Default save for adding new resource
function onSaveDefault() {
  const ns = document.getElementById("modal-subject").value.trim();
  const nn = document.getElementById("modal-name").value.trim();
  const nu = document.getElementById("modal-link").value.trim();

  if (ns.length < 4) { alert("Subject must be at least 4 characters."); return false; }
  if (nn.length < 4) { alert("Resource name must be at least 4 characters."); return false; }
  const urlPattern = /^(https?:\/\/)[\w.-]+(\.[\w.-]+)+[/\w\-.?=&%]*/;
  if (!urlPattern.test(nu)) { alert("Please enter a valid URL starting with http:// or https://"); return false; }

  resources[ns] = resources[ns] || [];
  resources[ns].push({ name: nn, url: nu, desc: "" });
  saveResources(resources);
  renderAll();
  return true;
}

/* =========================
    Event Listeners & Init
   ========================= */

// --- Modal buttons ---
document.getElementById("modal-cancel").addEventListener("click", () => closeModal());
document.getElementById("modal-save").addEventListener("click", () => {
  if (!modalCallback) return closeModal();
  const ok = modalCallback();
  if (ok) closeModal();
});

// --- Open add resource modal ---
document.getElementById("open-add").addEventListener("click", () => openModal());

// --- Add subject button ---
document.getElementById("add-subject-btn").addEventListener("click", () => {
  const v = document.getElementById("new-subject-name").value.trim();
  if (!v) return;
  resources[v] = resources[v] || [];
  saveResources(resources);
  document.getElementById("new-subject-name").value = "";
  renderAll();
});

// --- Reset to sample data ---
document.getElementById("reset-sample").addEventListener("click", () => {
  if (confirm("Reset to sample data? This will overwrite your saved resources.")) {
    resources = structuredClone(sampleData);
    saveResources(resources);
    currentSubject = null;
    renderAll();
  }
});

// --- Search input ---
searchEl.addEventListener("input", () => renderGrid(searchEl.value));
document.getElementById("clear-search").addEventListener("click", () => {
  searchEl.value = "";
  renderGrid("");
  searchEl.focus();
});

// --- Theme toggle ---
const themeBtn = document.getElementById("theme-toggle");

function setTheme(isLight) {
  if (isLight) document.body.classList.add("light");
  else document.body.classList.remove("light");

  themeBtn.setAttribute("aria-pressed", (!isLight).toString());
  themeBtn.textContent = isLight ? "🌙" : "☀️";
  themeBtn.title = isLight ? "Switch to dark mode" : "Switch to light mode";

  try { localStorage.setItem("studyhub_theme_light", JSON.stringify(isLight)); }
  catch (e) { console.warn("Could not save theme preference", e); }
}

themeBtn.addEventListener("click", () => {
  const isCurrentlyLight = document.body.classList.contains("light");
  setTheme(!isCurrentlyLight);
});

// Restore saved theme on load
try {
  const saved = localStorage.getItem("studyhub_theme_light");
  if (saved !== null) setTheme(JSON.parse(saved));
  else setTheme(true); // default light
} catch (e) {
  console.warn("Could not restore theme", e);
  setTheme(true);
}

// --- Keyboard shortcuts ---
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal.classList.contains("show")) closeModal();
    else {
      currentSubject = null;
      renderAll();
    }
  }
});

// --- Initial render ---
renderAll();
