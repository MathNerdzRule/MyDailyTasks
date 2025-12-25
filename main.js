import './style.css';
import { GoogleGenerativeAI } from "@google/generative-ai";

// State Management
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let editingTaskId = null;
let currentTheme = localStorage.getItem('theme') || 'system';

// DOM Elements
const tasksContainer = document.getElementById('tasks-container');
const addTaskBtn = document.getElementById('add-task-btn');
const aiOptimizeBtn = document.getElementById('ai-optimize-btn');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const modalTitle = document.getElementById('modal-title');
const aiModal = document.getElementById('ai-modal');
const aiContent = document.getElementById('ai-content');
const aiCloseBtn = document.getElementById('ai-close-btn');
const themeSelect = document.getElementById('theme-select');

// Initialize
function init() {
  populateTimeSelects();
  applyTheme(currentTheme);
  themeSelect.value = currentTheme;
  renderTasks();
  setupEventListeners();
  requestNotificationPermission();
}

function populateTimeSelects() {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const hourHtml = hours.map(h => `<option value="${h}">${h}</option>`).join('');
  const minuteHtml = minutes.map(m => `<option value="${m}">${m}</option>`).join('');

  document.getElementById('start-h').innerHTML = hourHtml;
  document.getElementById('end-h').innerHTML = hourHtml;
  document.getElementById('start-m').innerHTML = minuteHtml;
  document.getElementById('end-m').innerHTML = minuteHtml;
}

function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Render Tasks
function renderTasks() {
  // Update AI Optimize button visibility
  if (tasks.length === 0) {
    aiOptimizeBtn.classList.add('hidden');
    tasksContainer.innerHTML = `
      <div class="loader">
        <p>No tasks yet. Start by adding one!</p>
      </div>
    `;
    return;
  }

  aiOptimizeBtn.classList.remove('hidden');

  // Sort tasks by start time
  const sortedTasks = [...tasks].sort((a, b) => a.start.localeCompare(b.start));

  tasksContainer.innerHTML = sortedTasks.map(task => `
    <div class="task-card" data-id="${task.id}">
      <div class="task-header">
        <span class="task-title">${task.title}</span>
        <div class="task-actions">
          <button class="icon-btn edit" onclick="window.editTask(${task.id})">✏️</button>
          <button class="icon-btn delete" onclick="window.deleteTask(${task.id})">🗑️</button>
        </div>
      </div>
      <div class="task-time">
        <span>🕒</span>
        <span>${formatTime(task.start)} - ${formatTime(task.end)}</span>
      </div>
    </div>
  `).join('');
}

function formatTime(timeStr) {
  const { h, m, p } = timeFrom24h(timeStr);
  return `${h}:${m.toString().padStart(2, '0')} ${p}`;
}

function timeTo24h(h, m, p) {
  let hours = parseInt(h);
  if (p === 'PM' && hours < 12) hours += 12;
  if (p === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeFrom24h(time24) {
  let [h, m] = time24.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { h, m, p };
}

// Event Listeners
function setupEventListeners() {
  addTaskBtn.addEventListener('click', () => openModal());
  cancelBtn.addEventListener('click', closeModal);
  taskForm.addEventListener('submit', handleFormSubmit);
  aiOptimizeBtn.addEventListener('click', handleAIOptimize);
  aiCloseBtn.addEventListener('click', () => aiModal.classList.remove('visible'));

  themeSelect.addEventListener('change', (e) => {
    currentTheme = e.target.value;
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
  });

  // Global functions for inline onclick (simplified for vanilla)
  window.editTask = (id) => openModal(id);
  window.deleteTask = (id) => {
    if (confirm('Are you sure you want to delete this task?')) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
    }
  };
}

// Modal Management
function openModal(id = null) {
  editingTaskId = id;
  if (id) {
    const task = tasks.find(t => t.id === id);
    modalTitle.textContent = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    const start = timeFrom24h(task.start);
    const end = timeFrom24h(task.end);
    
    document.getElementById('start-h').value = start.h;
    document.getElementById('start-m').value = start.m;
    document.getElementById('start-p').value = start.p;
    document.getElementById('end-h').value = end.h;
    document.getElementById('end-m').value = end.m;
    document.getElementById('end-p').value = end.p;
  } else {
    modalTitle.textContent = 'New Task';
    taskForm.reset();
    // Default values if needed
    document.getElementById('start-h').value = "9";
    document.getElementById('start-m').value = "0";
    document.getElementById('start-p').value = "AM";
    document.getElementById('end-h').value = "10";
    document.getElementById('end-m').value = "0";
    document.getElementById('end-p').value = "AM";
  }
  taskModal.classList.add('visible');
  taskModal.classList.remove('hidden');
}

function closeModal() {
  taskModal.classList.remove('visible');
  setTimeout(() => taskModal.classList.add('hidden'), 300);
}

// Form Handlers
function handleFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  
  const start = timeTo24h(
    document.getElementById('start-h').value,
    document.getElementById('start-m').value,
    document.getElementById('start-p').value
  );
  const end = timeTo24h(
    document.getElementById('end-h').value,
    document.getElementById('end-m').value,
    document.getElementById('end-p').value
  );

  if (start >= end) {
    alert('End time must be after start time.');
    return;
  }

  // Check for overlaps
  if (hasOverlap(start, end, editingTaskId)) {
    alert('Task overlaps with an existing task!');
    return;
  }

  if (editingTaskId) {
    tasks = tasks.map(t => t.id === editingTaskId ? { ...t, title, start, end } : t);
  } else {
    const newTask = {
      id: Date.now(),
      title,
      start,
      end
    };
    tasks.push(newTask);
    scheduleNotification(newTask);
  }

  saveTasks();
  renderTasks();
  closeModal();
}

function hasOverlap(start, end, excludeId) {
  return tasks.some(t => {
    if (t.id === excludeId) return false;
    return (start < t.end && end > t.start);
  });
}

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Notifications
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

function scheduleNotification(task) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const [hours, minutes] = task.start.split(':');
  const startTime = new Date();
  startTime.setHours(parseInt(hours), parseInt(minutes), 0);

  const diff = startTime.getTime() - now.getTime();
  if (diff > 0) {
    setTimeout(() => {
      new Notification(`Task Starting: ${task.title}`, {
        body: `Your task from ${formatTime(task.start)} to ${formatTime(task.end)} is starting now!`,
        icon: '/vite.svg'
      });
    }, diff);
  }
}

// AI Integration
async function handleAIOptimize() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    alert('Please set VITE_GEMINI_API_KEY in your .env file to use AI features.');
    return;
  }

  aiContent.innerHTML = '<p class="loader">Gemini is analyzing your schedule...</p>';
  aiCloseBtn.classList.add('hidden');
  aiModal.classList.add('visible');
  aiModal.classList.remove('hidden');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      I have the following daily tasks:
      ${tasks
        .map(t => `- ${t.title}: ${formatTime(t.start)} to ${formatTime(t.end)}`)
        .join('\n')}
      
      Please analyze this schedule and provide 3-5 concise, actionable productivity tips or suggestions to optimize my day. 
      IMPORTANT: All times in your response MUST use 12-hour AM/PM format (e.g., 4:00 PM, not 16:00).
      Format the output as a clean HTML list.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    aiContent.innerHTML = text;
  } catch (error) {
    console.error('AI Error:', error);
    aiContent.innerHTML = `<p style="color: var(--danger)">Error: ${error.message}</p>`;
  } finally {
    aiCloseBtn.classList.remove('hidden');
  }
}

init();
