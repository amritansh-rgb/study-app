const STORAGE_KEYS = {
  tasks: "studysprint.tasks",
  notes: "studysprint.notes",
  flashcards: "studysprint.flashcards",
  sessions: "studysprint.sessions",
};

const NOTE_TEMPLATES = {
  summary: `Main idea:

Key points:
- 
- 
- 

Memory trick:

One-line recap:`,
  mindmap: `Central topic:

Branch 1 -> 
  -> detail

Branch 2 -> 
  -> detail

Branch 3 -> 
  -> detail`,
  formula: `Formula:

Meaning of symbols:
- 
- 

When to use:

Quick example:`,
  checklist: `- [ ] Review the concept
- [ ] Learn the definition
- [ ] Solve 3 practice questions
- [ ] Revise mistakes`,
};

const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskSubject = document.querySelector("#taskSubject");
const taskPriority = document.querySelector("#taskPriority");
const taskList = document.querySelector("#taskList");

const notesForm = document.querySelector("#notesForm");
const noteTitle = document.querySelector("#noteTitle");
const noteSubject = document.querySelector("#noteSubject");
const noteType = document.querySelector("#noteType");
const notePalette = document.querySelector("#notePalette");
const noteTags = document.querySelector("#noteTags");
const noteContent = document.querySelector("#noteContent");
const notesBoard = document.querySelector("#notesBoard");

const flashcardForm = document.querySelector("#flashcardForm");
const flashcardQuestion = document.querySelector("#flashcardQuestion");
const flashcardAnswer = document.querySelector("#flashcardAnswer");
const flashcardDeck = document.querySelector("#flashcardDeck");

const tasksDoneCount = document.querySelector("#tasksDoneCount");
const notesCount = document.querySelector("#notesCount");
const flashcardCount = document.querySelector("#flashcardCount");
const focusSessionCount = document.querySelector("#focusSessionCount");

const timerDisplay = document.querySelector("#timerDisplay");
const timerStatus = document.querySelector("#timerStatus");
const timerMinutes = document.querySelector("#timerMinutes");
const startTimerBtn = document.querySelector("#startTimerBtn");
const pauseTimerBtn = document.querySelector("#pauseTimerBtn");
const resetTimerBtn = document.querySelector("#resetTimerBtn");

let tasks = readStorage(STORAGE_KEYS.tasks, [
  {
    id: crypto.randomUUID(),
    title: "Revise algebra formulas",
    subject: "Mathematics",
    priority: "High",
    completed: false,
  },
  {
    id: crypto.randomUUID(),
    title: "Read chapter summary",
    subject: "Biology",
    priority: "Medium",
    completed: true,
  },
]);

let notes = loadNotes();

let flashcards = readStorage(STORAGE_KEYS.flashcards, [
  {
    id: crypto.randomUUID(),
    question: "What is photosynthesis?",
    answer: "The process by which plants convert light energy into chemical energy.",
  },
  {
    id: crypto.randomUUID(),
    question: "What is the quadratic formula?",
    answer: "x = (-b +/- sqrt(b^2 - 4ac)) / 2a",
  },
]);

let completedSessions = readStorage(STORAGE_KEYS.sessions, 0);
let timeRemaining = Number(timerMinutes.value) * 60;
let activeTimer = null;

renderTasks();
renderNotes();
renderFlashcards();
renderStats();
updateTimerDisplay();

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  tasks.unshift({
    id: crypto.randomUUID(),
    title: taskTitle.value.trim(),
    subject: taskSubject.value.trim(),
    priority: taskPriority.value,
    completed: false,
  });

  persist(STORAGE_KEYS.tasks, tasks);
  renderTasks();
  renderStats();
  taskForm.reset();
  taskPriority.value = "Medium";
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const taskId = button.dataset.taskId;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    task.completed = !task.completed;
  }

  if (button.dataset.action === "delete") {
    tasks = tasks.filter((item) => item.id !== taskId);
  }

  persist(STORAGE_KEYS.tasks, tasks);
  renderTasks();
  renderStats();
});

notesForm.addEventListener("submit", (event) => {
  event.preventDefault();

  notes.unshift({
    id: crypto.randomUUID(),
    title: noteTitle.value.trim(),
    subject: noteSubject.value.trim(),
    type: noteType.value,
    palette: notePalette.value,
    tags: parseTags(noteTags.value),
    content: noteContent.value.trim(),
    pinned: false,
    createdAt: Date.now(),
  });

  persist(STORAGE_KEYS.notes, notes);
  renderNotes();
  renderStats();
  notesForm.reset();
  noteType.value = "Summary";
  notePalette.value = "sunrise";
});

notesBoard.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const noteId = button.dataset.noteId;
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;

  if (button.dataset.action === "pin") {
    note.pinned = !note.pinned;
  }

  if (button.dataset.action === "delete") {
    notes = notes.filter((item) => item.id !== noteId);
  }

  persist(STORAGE_KEYS.notes, notes);
  renderNotes();
  renderStats();
});

notesForm.addEventListener("click", (event) => {
  const button = event.target.closest(".template-chip");
  if (!button) return;

  const template = NOTE_TEMPLATES[button.dataset.template];
  if (!template) return;

  noteContent.value = template;
  noteContent.focus();
});

flashcardForm.addEventListener("submit", (event) => {
  event.preventDefault();

  flashcards.unshift({
    id: crypto.randomUUID(),
    question: flashcardQuestion.value.trim(),
    answer: flashcardAnswer.value.trim(),
  });

  persist(STORAGE_KEYS.flashcards, flashcards);
  renderFlashcards();
  renderStats();
  flashcardForm.reset();
});

flashcardDeck.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("button");
  if (deleteButton) {
    flashcards = flashcards.filter((card) => card.id !== deleteButton.dataset.flashcardId);
    persist(STORAGE_KEYS.flashcards, flashcards);
    renderFlashcards();
    renderStats();
    return;
  }

  const card = event.target.closest(".flashcard");
  if (!card) return;
  card.classList.toggle("flipped");
});

startTimerBtn.addEventListener("click", startTimer);
pauseTimerBtn.addEventListener("click", pauseTimer);
resetTimerBtn.addEventListener("click", resetTimer);

timerMinutes.addEventListener("change", () => {
  if (activeTimer) return;
  const minutes = clampMinutes(timerMinutes.value);
  timerMinutes.value = minutes;
  timeRemaining = minutes * 60;
  updateTimerDisplay();
  timerStatus.textContent = "Ready for a study session.";
});

function renderTasks() {
  taskList.innerHTML = tasks
    .map(
      (task) => `
        <li class="task-item ${task.completed ? "completed" : ""}">
          <button class="icon-button" type="button" data-action="toggle" data-task-id="${task.id}">
            ${task.completed ? "Undo" : "Done"}
          </button>
          <div class="task-main">
            <strong>${escapeHtml(task.title)}</strong>
            <span>${escapeHtml(task.subject)}</span>
          </div>
          <div>
            <span class="priority-pill priority-${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
            <button class="icon-button" type="button" data-action="delete" data-task-id="${task.id}">
              Delete
            </button>
          </div>
        </li>
      `
    )
    .join("");
}

function renderNotes() {
  const sortedNotes = [...notes].sort((left, right) => Number(right.pinned) - Number(left.pinned));

  if (sortedNotes.length === 0) {
    notesBoard.innerHTML = `
      <article class="note-card note-sunrise">
        <h3>Your note wall is empty</h3>
        <p class="note-subject">Start with a summary, mind map, formula sheet, or checklist.</p>
      </article>
    `;
    return;
  }

  notesBoard.innerHTML = sortedNotes
    .map((note) => {
      const tags = note.tags
        .map((tag) => `<span class="note-tag">${escapeHtml(tag)}</span>`)
        .join("");

      return `
        <article class="note-card note-${escapeHtml(note.palette)}">
          <div class="note-toolbar">
            <span class="note-badge">${escapeHtml(note.type)}</span>
            <div class="note-actions">
              <button type="button" class="icon-button" data-action="pin" data-note-id="${note.id}">
                ${note.pinned ? "Unpin" : "Pin"}
              </button>
              <button type="button" class="icon-button" data-action="delete" data-note-id="${note.id}">
                Delete
              </button>
            </div>
          </div>
          <h3>${escapeHtml(note.title)}</h3>
          <p class="note-subject">${escapeHtml(note.subject)}</p>
          <div class="note-content ${note.type === "Formula Sheet" ? "formula-note" : ""}">
            ${renderNoteContent(note)}
          </div>
          <div class="note-footer">
            <div class="note-tags">${tags || '<span class="note-tag muted-tag">No tags yet</span>'}</div>
            <span class="note-date">${formatDate(note.createdAt)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderFlashcards() {
  flashcardDeck.innerHTML = flashcards
    .map(
      (card) => `
        <article class="flashcard">
          <button
            type="button"
            class="icon-button flashcard-delete"
            data-flashcard-id="${card.id}"
          >
            Delete
          </button>
          <div class="flashcard-inner">
            <div class="flashcard-face">
              <span class="flashcard-label">Question</span>
              <p>${escapeHtml(card.question)}</p>
            </div>
            <div class="flashcard-face flashcard-back">
              <span class="flashcard-label">Answer</span>
              <p>${escapeHtml(card.answer)}</p>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderStats() {
  tasksDoneCount.textContent = tasks.filter((task) => task.completed).length;
  notesCount.textContent = notes.length;
  flashcardCount.textContent = flashcards.length;
  focusSessionCount.textContent = completedSessions;
}

function renderNoteContent(note) {
  if (note.type === "Checklist") {
    return renderChecklist(note.content);
  }

  return note.content
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function renderChecklist(content) {
  const items = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const checked = line.startsWith("- [x]") || line.startsWith("- [X]");
      const cleanText = line.replace(/^- \[[xX ]\]\s*/, "");

      return `
        <li class="checklist-item ${checked ? "checked" : ""}">
          <span class="checkmark">${checked ? "✓" : "○"}</span>
          <span>${escapeHtml(cleanText || line)}</span>
        </li>
      `;
    })
    .join("");

  return `<ul class="checklist">${items}</ul>`;
}

function startTimer() {
  if (activeTimer) return;

  if (timeRemaining <= 0) {
    timeRemaining = clampMinutes(timerMinutes.value) * 60;
  }

  timerStatus.textContent = "Focus mode is running. Stay with one task.";

  activeTimer = window.setInterval(() => {
    timeRemaining -= 1;
    updateTimerDisplay();

    if (timeRemaining <= 0) {
      clearInterval(activeTimer);
      activeTimer = null;
      completedSessions += 1;
      persist(STORAGE_KEYS.sessions, completedSessions);
      renderStats();
      timerStatus.textContent = "Session complete. Take a short break.";
      window.alert("Nice work. You completed a focus session.");
    }
  }, 1000);
}

function pauseTimer() {
  if (!activeTimer) return;
  clearInterval(activeTimer);
  activeTimer = null;
  timerStatus.textContent = "Timer paused. Restart when you are ready.";
}

function resetTimer() {
  clearInterval(activeTimer);
  activeTimer = null;
  const minutes = clampMinutes(timerMinutes.value);
  timerMinutes.value = minutes;
  timeRemaining = minutes * 60;
  updateTimerDisplay();
  timerStatus.textContent = "Ready for a study session.";
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timeRemaining % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function clampMinutes(value) {
  return Math.max(1, Math.min(90, Number(value) || 25));
}

function persist(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readStorage(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function loadNotes() {
  const defaultNotes = [
    {
      id: crypto.randomUUID(),
      title: "Cell Biology Memory Web",
      subject: "Biology",
      type: "Mind Map",
      palette: "mint",
      tags: ["diagram", "revision"],
      content: "Cell\n-> Nucleus -> controls cell activities\n-> Mitochondria -> powerhouse\n-> Ribosomes -> protein synthesis",
      pinned: true,
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      title: "Trigonometry Formula Sheet",
      subject: "Mathematics",
      type: "Formula Sheet",
      palette: "ocean",
      tags: ["formulas", "angles"],
      content:
        "sin^2(theta) + cos^2(theta) = 1\n\nUse this identity to simplify expressions and check answers quickly.",
      pinned: false,
      createdAt: Date.now() - 1000,
    },
  ];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.notes);
    if (!stored) return defaultNotes;

    const parsed = JSON.parse(stored);

    if (typeof parsed === "string") {
      const legacyNote = parsed.trim();
      return legacyNote
        ? [
            {
              id: crypto.randomUUID(),
              title: "Saved Notes",
              subject: "General",
              type: "Summary",
              palette: "sunrise",
              tags: ["imported"],
              content: legacyNote,
              pinned: false,
              createdAt: Date.now(),
            },
          ]
        : defaultNotes;
    }

    if (Array.isArray(parsed)) {
      return parsed.map((note, index) => ({
        id: note.id || crypto.randomUUID(),
        title: note.title || `Note ${index + 1}`,
        subject: note.subject || "General",
        type: note.type || "Summary",
        palette: note.palette || "sunrise",
        tags: Array.isArray(note.tags) ? note.tags : [],
        content: note.content || "",
        pinned: Boolean(note.pinned),
        createdAt: note.createdAt || Date.now() - index,
      }));
    }

    return defaultNotes;
  } catch {
    return defaultNotes;
  }
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
