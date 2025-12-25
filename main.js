import './style.css';
import { GoogleGenerativeAI } from "@google/generative-ai";

// State Management
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let editingTaskId = null;

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

// Initialize
function init() {
  renderTasks();
  setupEventListeners();
  requestNotificationPermission();
}

// Render Tasks
function renderTasks() {
  if (tasks.length === 0) {
    tasksContainer.innerHTML = `
      <div class="loader">
        <p>No tasks yet. Start by adding one!</p>
      </div>
    `;
    return;
  }

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
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Event Listeners
function setupEventListeners() {
  addTaskBtn.addEventListener('click', () => openModal());
  cancelBtn.addEventListener('click', closeModal);
  taskForm.addEventListener('submit', handleFormSubmit);
  aiOptimizeBtn.addEventListener('click', handleAIOptimize);
  aiCloseBtn.addEventListener('click', () => aiModal.classList.remove('visible'));

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
    document.getElementById('task-start').value = task.start;
    document.getElementById('task-end').value = task.end;
  } else {
    modalTitle.textContent = 'New Task';
    taskForm.reset();
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
  const start = document.getElementById('task-start').value;
  const end = document.getElementById('task-end').value;

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
  aiModal.classList.add('visible');
  aiModal.classList.remove('hidden');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      I have the following daily tasks:
      ${tasks.map(t => `- ${t.title}: ${t.start} to ${t.end}`).join('\n')}
      
      Please analyze this schedule and provide 3-5 concise, actionable productivity tips or suggestions to optimize my day. 
      Format the output as a clean HTML list.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    aiContent.innerHTML = text;
  } catch (error) {
    console.error('AI Error:', error);
    aiContent.innerHTML = `<p style="color: var(--danger)">Error: ${error.message}</p>`;
  }
}

init();
