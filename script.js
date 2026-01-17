// Data Storage
let activeTasks = [];
let archivedTasks = [];
let currentTheme = 'moss';

// Drag and Drop Variables
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// Theme Presets
const themes = {
    moss: {
        bgColor: '#1a2d1a',
        panelColor: '#2a3d3a',
        accentColor: '#7a9b76',
        textColor: '#e8dcc4'
    },
    midnight: {
        bgColor: '#0f1419',
        panelColor: '#1a2332',
        accentColor: '#5a7a9b',
        textColor: '#d4dce8'
    },
    stone: {
        bgColor: '#2a2520',
        panelColor: '#3d3530',
        accentColor: '#a8956f',
        textColor: '#e8e0d0'
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    setupDragAndDrop();
    renderActiveTasks();
    renderArchivedTasks();
    updateArchiveCount();
    applyTheme();
});

// Load data from localStorage
function loadData() {
    const savedActive = localStorage.getItem('activeTasks');
    const savedArchived = localStorage.getItem('archivedTasks');
    const savedTheme = localStorage.getItem('currentTheme');
    
    if (savedActive) {
        activeTasks = JSON.parse(savedActive);
    }
    
    if (savedArchived) {
        archivedTasks = JSON.parse(savedArchived);
    }
    
    if (savedTheme) {
        currentTheme = savedTheme;
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('activeTasks', JSON.stringify(activeTasks));
    localStorage.setItem('archivedTasks', JSON.stringify(archivedTasks));
}

// Generate unique ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Setup Event Listeners
function setupEventListeners() {
    // Add task
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Theme panel
    document.getElementById('themeBtn').addEventListener('click', toggleThemePanel);
    document.getElementById('closeTheme').addEventListener('click', toggleThemePanel);
    
    // Preset themes
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.target.dataset.theme;
            applyPresetTheme(theme);
        });
    });
    
    // Custom theme
    document.getElementById('applyCustom').addEventListener('click', applyCustomTheme);
    
    // Archive toggle
    document.getElementById('archiveToggle').addEventListener('click', toggleArchive);
}

// Add Task
function addTask() {
    const input = document.getElementById('taskInput');
    const validationMsg = document.getElementById('validationMsg');
    const title = input.value.trim();
    
    if (!title) {
        validationMsg.classList.remove('hidden');
        setTimeout(() => {
            validationMsg.classList.add('hidden');
        }, 2000);
        return;
    }
    
    const task = {
        id: generateId(),
        title: title,
        createdAt: Date.now()
    };
    
    activeTasks.unshift(task); // Add to beginning (most recent first)
    saveData();
    renderActiveTasks();
    input.value = '';
    input.focus();
}

// Render Active Tasks
function renderActiveTasks() {
    const container = document.getElementById('activeTasks');
    
    if (activeTasks.length === 0) {
        container.innerHTML = '<div class="empty-state">it\'s very quiet around... let\'s #lockin</div>';
        return;
    }
    
    container.innerHTML = '';
    
    activeTasks.forEach(task => {
        const taskEl = createTaskElement(task, false);
        container.appendChild(taskEl);
    });
}

// Create Task Element
function createTaskElement(task, isArchived) {
    const div = document.createElement('div');
    div.className = 'task-item';
    div.dataset.id = task.id;
    
    if (isArchived) {
        div.classList.add('completed');
        
        div.innerHTML = `
            <input type="checkbox" class="task-checkbox" checked disabled>
            <span class="task-title">${escapeHtml(task.title)}</span>
            <div class="task-actions">
                <button class="restore-btn" onclick="restoreTask('${task.id}')">restore</button>
                <button class="delete-btn" onclick="deleteTask('${task.id}', true)">delete</button>
            </div>
        `;
    } else {
        div.innerHTML = `
            <input type="checkbox" class="task-checkbox" onchange="completeTask('${task.id}')">
            <span class="task-title" id="title-${task.id}">${escapeHtml(task.title)}</span>
            <div class="task-actions" id="actions-${task.id}">
                <button class="edit-btn" onclick="editTask('${task.id}')">edit</button>
                <button class="delete-btn" onclick="deleteTask('${task.id}', false)">delete</button>
            </div>
        `;
    }
    
    return div;
}

// Complete Task (move to archive)
function completeTask(id) {
    const taskIndex = activeTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const task = activeTasks[taskIndex];
    task.completedAt = Date.now();
    
    // Move to archive
    archivedTasks.unshift(task);
    activeTasks.splice(taskIndex, 1);
    
    saveData();
    renderActiveTasks();
    renderArchivedTasks();
    updateArchiveCount();
}

// Edit Task
function editTask(id) {
    const titleEl = document.getElementById(`title-${id}`);
    const actionsEl = document.getElementById(`actions-${id}`);
    const currentTitle = titleEl.textContent;
    
    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-title editing';
    input.value = currentTitle;
    
    // Replace title with input
    titleEl.replaceWith(input);
    input.focus();
    input.select();
    
    // Create save/cancel buttons
    actionsEl.innerHTML = `
        <button class="save-btn" onclick="saveEdit('${id}')">save</button>
        <button class="cancel-btn" onclick="cancelEdit('${id}', '${escapeHtml(currentTitle)}')">cancel</button>
    `;
    
    // Handle Enter/Escape
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit(id);
        }
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelEdit(id, currentTitle);
        }
    });
}

// Save Edit
function saveEdit(id) {
    const input = document.querySelector(`[data-id="${id}"] .editing`);
    if (!input) return;
    
    const newTitle = input.value.trim();
    if (!newTitle) {
        cancelEdit(id, input.defaultValue);
        return;
    }
    
    const task = activeTasks.find(t => t.id === id);
    if (task) {
        task.title = newTitle;
        saveData();
        renderActiveTasks();
    }
}

// Cancel Edit
function cancelEdit(id, originalTitle) {
    renderActiveTasks();
}

// Delete Task
function deleteTask(id, isArchived) {
    if (isArchived) {
        const index = archivedTasks.findIndex(t => t.id === id);
        if (index !== -1) {
            archivedTasks.splice(index, 1);
        }
    } else {
        const index = activeTasks.findIndex(t => t.id === id);
        if (index !== -1) {
            activeTasks.splice(index, 1);
        }
    }
    
    saveData();
    renderActiveTasks();
    renderArchivedTasks();
    updateArchiveCount();
}

// Restore Task
function restoreTask(id) {
    const taskIndex = archivedTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const task = archivedTasks[taskIndex];
    delete task.completedAt;
    
    // Move back to active
    activeTasks.unshift(task);
    archivedTasks.splice(taskIndex, 1);
    
    saveData();
    renderActiveTasks();
    renderArchivedTasks();
    updateArchiveCount();
}

// Render Archived Tasks
function renderArchivedTasks() {
    const container = document.getElementById('archivedTasks');
    
    if (archivedTasks.length === 0) {
        container.innerHTML = '<div class="empty-state">nothing tucked away yet...</div>';
        return;
    }
    
    container.innerHTML = '';
    
    archivedTasks.forEach(task => {
        const taskEl = createTaskElement(task, true);
        container.appendChild(taskEl);
    });
}

// Update Archive Count
function updateArchiveCount() {
    document.getElementById('archiveCount').textContent = archivedTasks.length;
}

// Toggle Archive
function toggleArchive() {
    const content = document.getElementById('archiveContent');
    const icon = document.querySelector('.toggle-icon');
    
    content.classList.toggle('hidden');
    icon.classList.toggle('open');
}

// Toggle Theme Panel
function toggleThemePanel() {
    const panel = document.getElementById('themePanel');
    panel.classList.toggle('hidden');
}

// Apply Preset Theme
function applyPresetTheme(themeName) {
    currentTheme = themeName;
    const theme = themes[themeName];
    
    document.documentElement.style.setProperty('--bg-color', theme.bgColor);
    document.documentElement.style.setProperty('--panel-color', theme.panelColor);
    document.documentElement.style.setProperty('--accent-color', theme.accentColor);
    document.documentElement.style.setProperty('--text-color', theme.textColor);
    
    localStorage.setItem('currentTheme', themeName);
    localStorage.removeItem('customTheme');
}

// Apply Custom Theme
function applyCustomTheme() {
    const customTheme = {
        bgColor: document.getElementById('bgColor').value,
        panelColor: document.getElementById('panelColor').value,
        accentColor: document.getElementById('accentColor').value,
        textColor: document.getElementById('textColor').value
    };
    
    document.documentElement.style.setProperty('--bg-color', customTheme.bgColor);
    document.documentElement.style.setProperty('--panel-color', customTheme.panelColor);
    document.documentElement.style.setProperty('--accent-color', customTheme.accentColor);
    document.documentElement.style.setProperty('--text-color', customTheme.textColor);
    
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
    currentTheme = 'custom';
    localStorage.setItem('currentTheme', 'custom');
}

// Apply Theme on Load
function applyTheme() {
    const savedCustom = localStorage.getItem('customTheme');
    
    if (currentTheme === 'custom' && savedCustom) {
        const theme = JSON.parse(savedCustom);
        document.documentElement.style.setProperty('--bg-color', theme.bgColor);
        document.documentElement.style.setProperty('--panel-color', theme.panelColor);
        document.documentElement.style.setProperty('--accent-color', theme.accentColor);
        document.documentElement.style.setProperty('--text-color', theme.textColor);
        
        // Update color inputs
        document.getElementById('bgColor').value = theme.bgColor;
        document.getElementById('panelColor').value = theme.panelColor;
        document.getElementById('accentColor').value = theme.accentColor;
        document.getElementById('textColor').value = theme.textColor;
    } else if (themes[currentTheme]) {
        applyPresetTheme(currentTheme);
    }
}

// Utility: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available for inline onclick handlers
window.completeTask = completeTask;
window.editTask = editTask;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;
window.deleteTask = deleteTask;
window.restoreTask = restoreTask;

// Drag and Drop Functionality
function setupDragAndDrop() {
    const container = document.getElementById('appContainer');
    const dragHandle = document.getElementById('dragHandle');
    
    dragHandle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    // Touch support for tablets
    dragHandle.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);
}

function dragStart(e) {
    // Don't drag if clicking on buttons
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
    }
    
    const container = document.getElementById('appContainer');
    
    if (e.type === 'touchstart') {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
    } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
    }
    
    isDragging = true;
    container.style.cursor = 'grabbing';
    document.getElementById('dragHandle').classList.add('dragging');
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        
        const container = document.getElementById('appContainer');
        
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }
        
        xOffset = currentX;
        yOffset = currentY;
        
        setTranslate(currentX, currentY, container);
    }
}

function dragEnd(e) {
    if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        
        const container = document.getElementById('appContainer');
        container.style.cursor = 'move';
        document.getElementById('dragHandle').classList.remove('dragging');
    }
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
}