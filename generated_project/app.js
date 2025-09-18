// app.js - Todo List Application Core Logic

/**
 * Utility function to escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Generate a unique ID for a task. Uses timestamp plus a random component.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5);
}

/**
 * Task model representing a single todo item.
 */
class Task {
  /**
   * @param {string} id
   * @param {string} text
   * @param {boolean} [completed=false]
   */
  constructor(id, text, completed = false) {
    this.id = id;
    this.text = text;
    this.completed = completed;
  }

  toggleComplete() {
    this.completed = !this.completed;
  }

  /**
   * Update the task text.
   * @param {string} newText
   */
  updateText(newText) {
    this.text = newText;
  }
}

/**
 * Persistence layer using browser localStorage.
 */
const TaskStorage = {
  /**
   * Load tasks from localStorage and return an array of Task instances.
   * @returns {Task[]}
   */
  load() {
    const raw = localStorage.getItem('tasks');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      // Ensure we return proper Task instances
      return parsed.map(item => new Task(item.id, item.text, item.completed));
    } catch (e) {
      console.error('Failed to parse tasks from storage:', e);
      return [];
    }
  },

  /**
   * Save an array of Task objects to localStorage.
   * @param {Task[]} tasksArray
   */
  save(tasksArray) {
    try {
      const plain = tasksArray.map(t => ({ id: t.id, text: t.text, completed: t.completed }));
      localStorage.setItem('tasks', JSON.stringify(plain));
    } catch (e) {
      console.error('Failed to save tasks to storage:', e);
    }
  }
};

/**
 * Application state.
 */
let tasks = TaskStorage.load();
let currentFilter = 'all'; // possible values: 'all', 'active', 'completed'

/**
 * Render the task list based on current state and filter.
 */
function renderTasks() {
  const listEl = document.getElementById('task-list');
  if (!listEl) return;
  // Clear existing content
  listEl.innerHTML = '';

  const filtered = tasks.filter(task => {
    if (currentFilter === 'active') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true; // all
  });

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    if (task.completed) li.classList.add('completed');
    li.dataset.id = task.id;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle-checkbox';
    checkbox.dataset.id = task.id;
    if (task.completed) checkbox.checked = true;

    // Label
    const label = document.createElement('label');
    label.className = 'task-label';
    label.dataset.id = task.id;
    label.innerHTML = escapeHtml(task.text);

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.dataset.id = task.id;
    editBtn.textContent = '✎';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = '🗑️';

    // Assemble
    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  });
}

/**
 * Add a new task based on the value of the input field.
 */
function addTaskFromInput() {
  const input = document.getElementById('new-task-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const newTask = new Task(generateId(), text, false);
  tasks.push(newTask);
  TaskStorage.save(tasks);
  renderTasks();
  input.value = '';
}

/**
 * Find a task by its id.
 * @param {string} id
 * @returns {Task|undefined}
 */
function findTask(id) {
  return tasks.find(t => t.id === id);
}

/**
 * Initialize event listeners and render the UI.
 */
function initApp() {
  // Render initial list
  renderTasks();

  // Add task button
  const addBtn = document.getElementById('add-task-btn');
  if (addBtn) {
    addBtn.addEventListener('click', addTaskFromInput);
  }

  // Enter key on new task input
  const newTaskInput = document.getElementById('new-task-input');
  if (newTaskInput) {
    newTaskInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        addTaskFromInput();
      }
    });
  }

  // Delegated events for task list actions
  const taskList = document.getElementById('task-list');
  if (taskList) {
    taskList.addEventListener('click', e => {
      const target = e.target;
      const id = target.dataset.id;
      if (!id) return;

      // Toggle completed
      if (target.classList.contains('toggle-checkbox')) {
        const task = findTask(id);
        if (task) {
          task.toggleComplete();
          TaskStorage.save(tasks);
          renderTasks();
        }
        return;
      }

      // Delete task
      if (target.classList.contains('delete-btn')) {
        tasks = tasks.filter(t => t.id !== id);
        TaskStorage.save(tasks);
        renderTasks();
        return;
      }

      // Edit task – replace label with input for inline editing
      if (target.classList.contains('edit-btn')) {
        const li = target.closest('li');
        if (!li) return;
        const label = li.querySelector('.task-label');
        if (!label) return;
        const originalText = label.textContent;
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = originalText;
        // Replace label with input
        li.replaceChild(editInput, label);
        editInput.focus();

        const commitEdit = () => {
          const newText = editInput.value.trim();
          const task = findTask(id);
          if (task && newText && newText !== originalText) {
            task.updateText(newText);
          }
          // Restore UI via re-render
          TaskStorage.save(tasks);
          renderTasks();
        };

        editInput.addEventListener('keypress', ev => {
          if (ev.key === 'Enter') {
            commitEdit();
          }
        });
        editInput.addEventListener('blur', commitEdit);
      }
    });
  }

  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      if (!filter) return;
      currentFilter = filter;
      // Update active class
      filterButtons.forEach(b => b.classList.toggle('active', b === btn));
      renderTasks();
    });
  });

  // Clear completed button
  const clearBtn = document.getElementById('clear-completed-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      tasks = tasks.filter(t => !t.completed);
      TaskStorage.save(tasks);
      renderTasks();
    });
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    // Ctrl+Enter -> focus new task input
    if (!isInput && e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      const input = document.getElementById('new-task-input');
      if (input) input.focus();
    }
    // Esc clears the new task input when not editing a task
    if (!isInput && e.key === 'Escape') {
      const input = document.getElementById('new-task-input');
      if (input) input.value = '';
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
