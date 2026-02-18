import './style.css';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- State Management ---
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let editingTaskId = null;
let currentTheme = localStorage.getItem('theme') || 'system';
let viewMode = 'grid'; // 'grid' or 'timeline'

// --- Constants & Config ---
const CATEGORY_COLORS = {
  Work: '#3b82f6',
  Personal: '#8b5cf6',
  Health: '#10b981',
  Urgent: '#ef4444',
  Leisure: '#f59e0b'
};

const GEN_AI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// --- DOM Elements ---
const tasksContainer = document.getElementById('tasks-container');
const timelineContainer = document.getElementById('timeline-container');
const addTaskBtn = document.getElementById('add-task-btn');
const quickAddInput = document.getElementById('quick-add-input');
const quickAddBtn = document.getElementById('quick-add-btn');
const aiOptimizeBtn = document.getElementById('ai-optimize-btn');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const modalTitle = document.getElementById('modal-title');
const aiModal = document.getElementById('ai-modal');
const aiContent = document.getElementById('ai-content');
const aiCloseBtn = document.getElementById('ai-close-btn');
const themeSelect = document.getElementById('theme-select');
const viewGridBtn = document.getElementById('view-grid-btn');
const viewTimelineBtn = document.getElementById('view-timeline-btn');
const subtasksList = document.getElementById('subtasks-list');
const newSubtaskInput = document.getElementById('new-subtask');
const addSubtaskBtn = document.getElementById('add-subtask-btn');

// --- Initialization ---
function init() {
  applyTheme(currentTheme);
  themeSelect.value = currentTheme;
  renderTasks();
  setupEventListeners();
  requestNotificationPermission();
  
  // Update progress every minute
  setInterval(renderTasks, 60000);
}

// --- Theme Management ---
function applyTheme(theme) {
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// --- Task Rendering (Grid) ---
function renderTasks() {
  if (viewMode === 'timeline') {
    renderTimeline();
    return;
  }

  tasksContainer.classList.remove('hidden');
  timelineContainer.classList.add('hidden');

  if (tasks.length === 0) {
    aiOptimizeBtn.classList.add('hidden');
    tasksContainer.innerHTML = `
      <div class="loader" style="grid-column: 1/-1; text-align: center; padding: 4rem;">
        <p style="font-size: 1.2rem; opacity: 0.7;">✨ No tasks yet. Try the AI Quick Add or the Add Task button!</p>
      </div>
    `;
    return;
  }

  aiOptimizeBtn.classList.remove('hidden');

  const sortedTasks = [...tasks].sort((a, b) => a.start.localeCompare(b.start));

  tasksContainer.innerHTML = sortedTasks.map(task => {
    const progress = calculateProgress(task.start, task.end);
    const catColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Work;
    const isCurrent = progress > 0 && progress < 100;

    return `
      <div class="task-card glass ${isCurrent ? 'current-active' : ''}" style="--cat-color: ${catColor}" data-id="${task.id}">
        <div class="task-header">
          <div>
            <div class="task-title">${task.title}</div>
            <span class="task-category-tag" style="--cat-color: ${catColor}">${task.category}</span>
          </div>
          <div class="task-actions">
            <button class="icon-btn" onclick="window.editTask(${task.id})">✏️</button>
            <button class="icon-btn" onclick="window.deleteTask(${task.id})">🗑️</button>
          </div>
        </div>

        <div class="task-time-row">
          <span>🕒</span>
          <span>${formatTime(task.start)} - ${formatTime(task.end)}</span>
          ${isCurrent ? '<span class="live-badge">LIVE</span>' : ''}
        </div>

        <div class="progress-container">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>

        ${task.subtasks?.length > 0 ? `
          <ul class="subtasks-list-mini">
            ${task.subtasks.slice(0, 3).map(st => `
              <li class="subtask-item-mini ${st.done ? 'done' : ''}">
                <input type="checkbox" ${st.done ? 'checked' : ''} onclick="window.toggleSubtask(${task.id}, ${st.id}, event)">
                <span>${st.text}</span>
              </li>
            `).join('')}
            ${task.subtasks.length > 3 ? `<li class="subtask-more">+ ${task.subtasks.length - 3} more</li>` : ''}
          </ul>
        ` : ''}
      </div>
    `;
  }).join('');
}

// --- Timeline Rendering ---
function renderTimeline() {
  tasksContainer.classList.add('hidden');
  timelineContainer.classList.remove('hidden');
  
  const labels = timelineContainer.querySelector('.timeline-labels');
  const tracks = timelineContainer.querySelector('.timeline-tracks');
  
  labels.innerHTML = '';
  tracks.innerHTML = '';

  // Generate 24 hours of labels
  for (let i = 0; i < 24; i++) {
    const hourLabel = document.createElement('div');
    hourLabel.className = 'time-label';
    hourLabel.textContent = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
    labels.appendChild(hourLabel);
  }

  tasks.forEach(task => {
    const startMins = timeToMins(task.start);
    const endMins = timeToMins(task.end);
    const duration = endMins - startMins;
    const catColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Work;

    const taskBlock = document.createElement('div');
    taskBlock.className = 'timeline-task glass';
    taskBlock.style.top = `${(startMins / 60) * 60}px`; // 60px per hour
    taskBlock.style.height = `${(duration / 60) * 60}px`;
    taskBlock.style.borderLeft = `4px solid ${catColor}`;
    taskBlock.style.position = 'absolute';
    taskBlock.style.width = 'calc(100% - 20px)';
    taskBlock.style.margin = '0 10px';
    taskBlock.innerHTML = `
      <div style="font-weight: bold; font-size: 0.8rem;">${task.title}</div>
      <div style="font-size: 0.7rem; opacity: 0.7;">${formatTime(task.start)}</div>
    `;
    taskBlock.onclick = () => openModal(task.id);
    tracks.appendChild(taskBlock);
  });
}

// --- AI Quick Add ---
async function handleQuickAdd() {
  const query = quickAddInput.value.trim();
  if (!query) return;

  quickAddBtn.textContent = '⏳';
  quickAddBtn.disabled = true;

  try {
    const model = GEN_AI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Parse this user task input into a JSON object: "${query}"
      Use this structure:
      {
        "title": "Task title",
        "start": "HH:mm" (24h format),
        "end": "HH:mm" (24h format),
        "category": "Work" | "Personal" | "Health" | "Urgent" | "Leisure",
        "priority": 1 | 2 | 3
      }
      If duration isn't specified, default to 1 hour.
      Current time is ${new Date().toLocaleTimeString('en-US', { hour12: false })}.
      Return ONLY the JSON.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const taskData = JSON.parse(cleanJson);

    const newTask = {
      ...taskData,
      id: Date.now(),
      subtasks: []
    };

    if (hasOverlap(newTask.start, newTask.end)) {
      alert('AI suggested a time that overlaps with an existing task. Please adjust manually.');
      openModalWithData(newTask);
    } else {
      tasks.push(newTask);
      saveTasks();
      renderTasks();
      quickAddInput.value = '';
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [CATEGORY_COLORS[newTask.category], '#ffffff']
      });
    }
  } catch (error) {
    console.error('Quick Add Error:', error);
    alert('AI couldn\\'t parse that. Try a simpler format or use the Add Task button.');
  } finally {
    quickAddBtn.textContent = '➔';
    quickAddBtn.disabled = false;
  }
}

// --- Helpers ---
function formatTime(timeStr) {
  let [h, m] = timeStr.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${p}`;
}

function timeToMins(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function calculateProgress(start, end) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMins(start);
  const endMins = timeToMins(end);

  if (nowMins < startMins) return 0;
  if (nowMins > endMins) return 100;
  
  const total = endMins - startMins;
  const elapsed = nowMins - startMins;
  return Math.round((elapsed / total) * 100);
}

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function hasOverlap(start, end, excludeId) {
  return tasks.some(t => {
    if (t.id === excludeId) return false;
    return (start < t.end && end > t.start);
  });
}

// --- Event Listeners ---
function setupEventListeners() {
  addTaskBtn.addEventListener('click', () => openModal());
  cancelBtn.addEventListener('click', closeModal);
  taskForm.addEventListener('submit', handleFormSubmit);
  aiOptimizeBtn.addEventListener('click', handleAIOptimize);
  aiCloseBtn.addEventListener('click', () => aiModal.classList.add('hidden'));
  quickAddBtn.addEventListener('click', handleQuickAdd);
  quickAddInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleQuickAdd());

  themeSelect.addEventListener('change', (e) => {
    currentTheme = e.target.value;
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
  });

  viewGridBtn.addEventListener('click', () => {
    viewMode = 'grid';
    viewGridBtn.classList.add('active');
    viewTimelineBtn.classList.remove('active');
    renderTasks();
  });

  viewTimelineBtn.addEventListener('click', () => {
    viewMode = 'timeline';
    viewTimelineBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    renderTasks();
  });

  addSubtaskBtn.addEventListener('click', addSubtaskFromInput);

  window.editTask = (id) => openModal(id);
  window.deleteTask = (id) => {
    if (confirm('Delete this task?')) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
    }
  };

  window.toggleSubtask = (taskId, subId, e) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const sub = task.subtasks.find(s => s.id === subId);
      if (sub) {
        sub.done = e.target.checked;
        saveTasks();
        // Don't full re-render if we can help it, but for simplicity:
        renderTasks();
      }
    }
  };
}

// --- Modal Management ---
let currentSubtasks = [];

function openModal(id = null) {
  editingTaskId = id;
  currentSubtasks = [];
  subtasksList.innerHTML = '';
  
  if (id) {
    const task = tasks.find(t => t.id === id);
    modalTitle.textContent = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('start-native').value = task.start;
    document.getElementById('end-native').value = task.end;
    currentSubtasks = [...(task.subtasks || [])];
    renderSubtasks();
  } else {
    modalTitle.textContent = 'New Task';
    taskForm.reset();
  }
  taskModal.classList.remove('hidden');
}

function openModalWithData(data) {
  openModal();
  document.getElementById('task-title').value = data.title;
  document.getElementById('task-category').value = data.category;
  document.getElementById('task-priority').value = data.priority;
  document.getElementById('start-native').value = data.start;
  document.getElementById('end-native').value = data.end;
}

function closeModal() {
  taskModal.classList.add('hidden');
}

function addSubtaskFromInput() {
  const text = newSubtaskInput.value.trim();
  if (!text) return;
  currentSubtasks.push({ id: Date.now(), text, done: false });
  newSubtaskInput.value = '';
  renderSubtasks();
}

function renderSubtasks() {
  subtasksList.innerHTML = currentSubtasks.map(st => `
    <div class="subtask-edit-item">
      <span>${st.text}</span>
      <button type="button" onclick="window.removeSubtask(${st.id})">✕</button>
    </div>
  `).join('');
}

window.removeSubtask = (id) => {
  currentSubtasks = currentSubtasks.filter(st => st.id !== id);
  renderSubtasks();
};

function handleFormSubmit(e) {
  e.preventDefault();
  const taskData = {
    title: document.getElementById('task-title').value,
    category: document.getElementById('task-category').value,
    priority: parseInt(document.getElementById('task-priority').value),
    start: document.getElementById('start-native').value,
    end: document.getElementById('end-native').value,
    subtasks: currentSubtasks
  };

  if (taskData.start >= taskData.end) {
    alert('End time must be after start time.');
    return;
  }

  if (hasOverlap(taskData.start, taskData.end, editingTaskId)) {
    alert('This overlaps with an existing task!');
    return;
  }

  if (editingTaskId) {
    tasks = tasks.map(t => t.id === editingTaskId ? { ...t, ...taskData } : t);
  } else {
    tasks.push({ ...taskData, id: Date.now() });
  }

  saveTasks();
  renderTasks();
  closeModal();
}

// --- AI Insights ---
async function handleAIOptimize() {
  aiContent.innerHTML = '<p class="loader">Gemini is analyzing your schedule...</p>';
  aiModal.classList.remove('hidden');

  try {
    const model = GEN_AI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Analyze my daily schedule:
      ${tasks.map(t => `- [${t.category}] ${t.title}: ${formatTime(t.start)} to ${formatTime(t.end)} (Priority: ${t.priority})`).join('\\n')}
      
      Provide 3-5 strategic productivity tips. Focus on:
      1. Potential burnout (too many urgent tasks).
      2. Time-blocking efficiency.
      3. Energy management.
      
      Format as a clean HTML list. Be concise. Use 12h time format.
    `;

    const result = await model.generateContent(prompt);
    aiContent.innerHTML = result.response.text();
  } catch (error) {
    aiContent.innerHTML = `<p style="color: var(--danger)">AI Error: ${error.message}</p>`;
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

init();
