// Initialises basic debugging
console.log('Dashboard.js starting execution');
console.log('Dashboard.js script loaded');

// Refreshes the dashboard table by fetching new data
function refreshDashboard() {
    fetch('/dashboard/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch to-dos');
        }
        return response.text();
    })
    .then(html => {
        // Creates a temporary div to parse the HTML response
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const newTbody = tempDiv.querySelector('#todoTable tbody');
        if (newTbody) {
            const currentTbody = document.querySelector('#todoTable tbody');
            currentTbody.innerHTML = newTbody.innerHTML;
            
            // Reinitialises event listeners after refresh
            initializeNameEditing();
            initializeDateEditing();
            initializeDropdowns();
        }
    })
    .catch(error => {
        console.error('Error refreshing dashboard:', error);
    });
}

// Retrieves CSRF token from cookies for security
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Handles inline editing of task/project names
function initializeNameEditing() {
    document.querySelectorAll('.editable-name').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentName = this.querySelector('.item-name').textContent;
            const input = document.createElement('input');
            input.value = currentName;
            input.className = 'form-control';
            input.style.width = '200px';
            this.innerHTML = '';
            this.appendChild(input);
            input.focus();

            const saveName = () => {
                const newName = input.value.trim();
                if (newName === '') {
                    alert('Name cannot be empty');
                    this.innerHTML = `<span class="item-name">${currentName}</span>`;
                    return;
                }
                
                const id = this.closest('tr').dataset.id;
                const isProject = this.closest('tr').dataset.type === 'project';
                const isSubtask = this.closest('tr').classList.contains('subtask-row');
                
                const endpoint = isSubtask ? '/api/update_subtask/' : 
                                isProject ? '/api/update_project/' : '/api/update_task/';
                
                const cell = this;
                
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        id: id,
                        name: newName
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update name');
                    }
                    return response.json();
                })
                .then(() => {
                    cell.innerHTML = `<span class="item-name">${newName}</span>`;
                })
                .catch(() => {
                    cell.innerHTML = `<span class="item-name">${currentName}</span>`;
                });
            };

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveName();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.innerHTML = `<span class="item-name">${currentName}</span>`;
                }
            });

            input.addEventListener('blur', () => {
                if (document.body.contains(input)) {
                    saveName();
                }
            });
        });
    });
}

// Manages due date editing with validation
function initializeDateEditing() {
    document.querySelectorAll('.editable-due-date').forEach(cell => {
        cell.addEventListener('click', function(e) {
            // Check if this is a subtask row
            const isSubtask = this.closest('tr').classList.contains('subtask-row');
            if (isSubtask) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const currentDate = this.querySelector('.date-text').textContent;
            const dueDateInput = document.createElement('input');
            dueDateInput.type = 'date';
            dueDateInput.value = currentDate ? formatDateForInput(currentDate) : '';
            dueDateInput.className = 'form-control';
            dueDateInput.style.width = '150px';

            this.innerHTML = '';
            this.appendChild(dueDateInput);
            dueDateInput.focus();

            const saveDate = () => {
                const newDate = dueDateInput.value;
                const id = this.closest('tr').dataset.id;
                const isProject = this.closest('tr').dataset.type === 'project';
                
                if (!newDate) {
                    const endpoint = isProject ? '/api/update_project/' : '/api/update_task/';
                    
                    fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken'),
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            id: id,
                            due_date: null
                        })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to update date');
                        }
                        return response.json();
                    })
                    .then(() => {
                        this.innerHTML = `<span class="date-text"></span>`;
                        updateDeadlineStyling();
                    })
                    .catch(() => {
                        this.innerHTML = `<span class="date-text">${currentDate}</span>`;
                        updateDeadlineStyling();
                    });
                    return;
                }

                // Validates that the selected date is not in the past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(newDate);
                due.setHours(0, 0, 0, 0);
                
                if (due < today) {
                    alert('Please select a valid date that is today or later.');
                    this.innerHTML = `<span class="date-text">${currentDate}</span>`;
                    updateDeadlineStyling();
                    return;
                }

                const endpoint = isProject ? '/api/update_project/' : '/api/update_task/';
                
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        id: id,
                        due_date: newDate
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update date');
                    }
                    return response.json();
                })
                .then(() => {
                    this.innerHTML = `<span class="date-text">${formatDateForDisplay(newDate)}</span>`;
                    updateDeadlineStyling();
                })
                .catch(() => {
                    this.innerHTML = `<span class="date-text">${currentDate}</span>`;
                    updateDeadlineStyling();
                });
            };

            dueDateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveDate();
                }
            });

            dueDateInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.innerHTML = `<span class="date-text">${currentDate}</span>`;
                    updateDeadlineStyling();
                }
            });

            dueDateInput.addEventListener('blur', () => {
                if (document.body.contains(dueDateInput)) {
                    saveDate();
                }
            });
        });
    });
}

// Manages priority and client dropdown functionality
function initializeDropdowns() {
    const priorityCells = document.querySelectorAll('.editable-priority');
    const priorityDropdown = document.querySelector('.priority-dropdown');
    let currentPriorityCell = null;
    let currentClientCell = null;

    priorityCells.forEach(cell => {
        cell.addEventListener('click', (e) => {
            // Check if this is a subtask row
            const isSubtask = cell.closest('tr').classList.contains('subtask-row');
            if (isSubtask) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            e.stopPropagation();
            
            if (currentPriorityCell && currentPriorityCell !== cell) {
                priorityDropdown.style.display = 'none';
            }
            
            currentPriorityCell = cell;
            
            // Positions dropdown based on available space
            const rect = cell.getBoundingClientRect();
            const dropdownHeight = priorityDropdown.offsetHeight;
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - rect.bottom;
            
            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                priorityDropdown.style.top = `${rect.top - dropdownHeight}px`;
            } else {
                priorityDropdown.style.top = `${rect.bottom}px`;
            }
            
            priorityDropdown.style.left = `${rect.left}px`;
            priorityDropdown.style.display = 'block';
            
            const currentValue = cell.querySelector('.priority-text').textContent.toLowerCase();
            priorityDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.classList.toggle('active', item.dataset.value === currentValue);
            });
        });
    });

    priorityDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const newValue = item.dataset.value;
            const id = currentPriorityCell.closest('tr').dataset.id;
            const isProject = currentPriorityCell.closest('tr').dataset.type === 'project';
            const isSubtask = currentPriorityCell.closest('tr').classList.contains('subtask-row');
            
            const endpoint = isSubtask ? '/api/update_subtask/' : 
                            isProject ? '/api/update_project/' : '/api/update_task/';
            
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                credentials: 'include',
                body: JSON.stringify({
                    id: id,
                    priority: newValue
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update priority');
                }
                return response.json();
            })
            .then(() => {
                currentPriorityCell.querySelector('.priority-text').textContent = 
                    newValue.charAt(0).toUpperCase() + newValue.slice(1);
                priorityDropdown.style.display = 'none';
                currentPriorityCell = null;
            })
            .catch(error => {
                console.error('Error updating priority:', error);
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!priorityDropdown.contains(e.target) && !Array.from(priorityCells).some(cell => cell.contains(e.target))) {
            priorityDropdown.style.display = 'none';
            currentPriorityCell = null;
        }
    });

    // Handles subtask visibility toggling
    document.querySelectorAll('.toggle-subtasks').forEach(button => {
        button.setAttribute('data-expanded', 'false');
        
        button.addEventListener('click', function() {
            const projectRow = this.closest('tr');
            const projectId = projectRow.dataset.id;
            
            const subtaskRows = document.querySelectorAll(`tr.subtask-row[data-project="${projectId}"]`);
            
            subtaskRows.forEach(row => {
                const currentDisplay = window.getComputedStyle(row).display;
                row.style.display = currentDisplay === 'none' ? 'table-row' : 'none';
            });
            
            const icon = this.querySelector('i');
            if (icon) {
                const currentState = this.getAttribute('data-expanded');
                const newState = currentState === 'true' ? 'false' : 'true';
                this.setAttribute('data-expanded', newState);
                
                if (newState === 'true') {
                    icon.classList.add('rotated');
                } else {
                    icon.classList.remove('rotated');
                }
            }
        });
    });

    // Client dropdown functionality
    document.querySelectorAll('.editable-client').forEach(cell => {
        const dropdown = document.querySelector('.client-dropdown');
        const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
        
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (currentClientCell && currentClientCell !== cell) {
                dropdown.style.display = 'none';
            }
            
            currentClientCell = cell;
            
            const rect = cell.getBoundingClientRect();
            const dropdownHeight = dropdown.offsetHeight;
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - rect.bottom;
            
            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                dropdown.style.top = `${rect.top - dropdownHeight}px`;
            } else {
                dropdown.style.top = `${rect.bottom}px`;
            }
            
            dropdown.style.left = `${rect.left}px`;
            dropdown.style.display = 'block';
            
            const currentValue = cell.querySelector('.client-text').textContent;
            dropdownItems.forEach(item => {
                item.classList.toggle('active', item.textContent === currentValue);
            });
        });
    });

    document.querySelector('.client-dropdown').querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const newName = item.textContent;
            const newId = item.dataset.value;
            const id = currentClientCell.closest('tr').dataset.id;
            const isProject = currentClientCell.closest('tr').dataset.type === 'project';
            
            const updateData = {
                id: id,
                client: newId === 'my_business' ? null : (newId || null),
                is_my_business: newId === 'my_business' ? 'true' : 'false'
            };
            
            fetch(isProject ? '/api/update_project/' : '/api/update_task/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update client');
                }
                return response.json();
            })
            .then(() => {
                currentClientCell.querySelector('.client-text').textContent = newName;
                dropdown.style.display = 'none';
                currentClientCell = null;
            })
            .catch(error => {
                console.error('Error updating client:', error);
            });
        });
    });

    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.client-dropdown');
        if (!dropdown.contains(e.target) && !Array.from(document.querySelectorAll('.editable-client')).some(cell => cell.contains(e.target))) {
            dropdown.style.display = 'none';
            currentClientCell = null;
        }
    });
}

// Updates visual styling for approaching and overdue deadlines
function updateDeadlineStyling() {
    const dateTexts = document.querySelectorAll('#todoTable tbody tr td.editable-due-date span.date-text');
    
    dateTexts.forEach(dateText => {
        const dueDate = dateText.textContent.trim();
        
        if (!dueDate) {
            return;
        }
        
        dateText.classList.remove('deadline-approaching', 'deadline-today', 'deadline-overdue');
        
        const status = getDeadlineStatus(dueDate);
        
        if (status) {
            dateText.classList.add(`deadline-${status}`);
        }
    });
}

// Determines the status of a deadline (overdue, today, or approaching)
function getDeadlineStatus(dueDate) {
    if (!dueDate) return null;
    
    const [day, month, year] = dueDate.split('/');
    const formattedDate = `${year}-${month}-${day}`;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(formattedDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return 'approaching';
    return null;
}

function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
}

// Manages status editing with confirmation for cancellations
function initializeStatusEditing() {
    const statusCells = document.querySelectorAll('.editable-status');
    const statusDropdown = document.querySelector('.status-dropdown');
    let currentStatusCell = null;
    let previousStatus = null;

    async function saveStatus(newStatus) {
        if (!currentStatusCell) return;

        const id = currentStatusCell.closest('tr').dataset.id;
        const isProject = currentStatusCell.closest('tr').dataset.type === 'project';
        const isSubtask = currentStatusCell.closest('tr').classList.contains('subtask-row');
        const statusText = currentStatusCell.querySelector('.status-text');

        if (newStatus === 'cancelled') {
            const dontAskAgain = localStorage.getItem('dontAskConfirmation') === 'true';
            
            if (!dontAskAgain) {
                const confirmed = await Utils.showConfirmationDialog(
                    'Confirm Cancellation',
                    'Are you sure you want to cancel this to-do? This action cannot be undone.'
                );
                if (!confirmed) {
                    statusText.textContent = previousStatus.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    statusText.className = 'status-text';
                    statusText.classList.add(`status-${previousStatus}`);
                    return;
                }
            }
        }

        try {
            const endpoint = isSubtask ? '/api/update_subtask/' : 
                            isProject ? '/api/update_project/' : '/api/update_task/';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    id: id,
                    status: newStatus
                })
            });

            if (response.ok) {
                const displayText = newStatus.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                statusText.textContent = displayText;
                
                statusText.className = 'status-text';
                statusText.classList.add(`status-${newStatus}`);

                if (newStatus === 'cancelled') {
                    const row = currentStatusCell.closest('tr');
                    row.dataset.markedForDeletion = 'true';
                }
            } else {
                console.error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    statusCells.forEach(cell => {
        cell.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (currentStatusCell && currentStatusCell !== cell) {
                statusDropdown.style.display = 'none';
            }
            
            currentStatusCell = cell;
            previousStatus = cell.querySelector('.status-text').textContent.toLowerCase().replace(/\s+/g, '_');
            
            const rect = cell.getBoundingClientRect();
            const dropdownHeight = statusDropdown.offsetHeight;
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - rect.bottom;
            
            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                statusDropdown.style.top = `${rect.top - dropdownHeight}px`;
            } else {
                statusDropdown.style.top = `${rect.bottom}px`;
            }
            
            statusDropdown.style.left = `${rect.left}px`;
            statusDropdown.style.display = 'block';
            
            const currentStatus = cell.querySelector('.status-text').textContent.toLowerCase().replace(/\s+/g, '_');
            statusDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.classList.toggle('active', item.dataset.value === currentStatus);
            });
        });
    });

    statusDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const newStatus = item.dataset.value;
            saveStatus(newStatus);
            statusDropdown.style.display = 'none';
            currentStatusCell = null;
        });
    });

    document.addEventListener('click', (e) => {
        if (!statusDropdown.contains(e.target) && !Array.from(statusCells).some(cell => cell.contains(e.target))) {
            statusDropdown.style.display = 'none';
            currentStatusCell = null;
        }
    });
}

// Implements search functionality with support for tasks, projects, and dates
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
        return;
    }
    
    const monthMap = {
        'january': '01', 'jan': '01',
        'february': '02', 'feb': '02',
        'march': '03', 'mar': '03',
        'april': '04', 'apr': '04',
        'may': '05',
        'june': '06', 'jun': '06',
        'july': '07', 'jul': '07',
        'august': '08', 'aug': '08',
        'september': '09', 'sep': '09',
        'october': '10', 'oct': '10',
        'november': '11', 'nov': '11',
        'december': '12', 'dec': '12'
    };
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const table = document.getElementById('todoTable');
        
        if (!table) {
            return;
        }
        
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            row.style.display = 'none';
        });
        
        if (searchTerm === '') {
            rows.forEach(row => {
                row.style.display = '';
            });
            return;
        }
        
        const isTaskSearch = searchTerm === 'task';
        const isProjectSearch = searchTerm === 'project';
        
        let monthNumber = null;
        if (monthMap[searchTerm]) {
            monthNumber = monthMap[searchTerm];
        }
        
        rows.forEach(row => {
            const isProject = row.classList.contains('project-row');
            const isSubtask = row.classList.contains('subtask-row');
            
            if (isTaskSearch) {
                if (!isProject) {
                    row.style.display = '';
                    return;
                }
            } else if (isProjectSearch) {
                if (isProject) {
                    row.style.display = '';
                    return;
                }
            }
            
            const cells = row.querySelectorAll('td');
            let rowContent = '';
            let hasDateCell = false;
            let dateContent = '';
            let statusContent = '';
            let nameContent = '';
            
            cells.forEach(cell => {
                const text = cell.textContent.toLowerCase().trim();
                rowContent += text + ' ';
                
                if (cell.classList.contains('editable-due-date')) {
                    hasDateCell = true;
                    dateContent = text;
                }
                else if (cell.classList.contains('editable-status')) {
                    statusContent = text;
                }
                else if (cell.classList.contains('editable-name')) {
                    nameContent = text;
                }
            });
            
            let matches = false;
            
            if (nameContent && nameContent.includes(searchTerm)) {
                matches = true;
            }
            else if (statusContent && statusContent.includes(searchTerm)) {
                matches = true;
            }
            else if (rowContent.includes(searchTerm)) {
                matches = true;
            }
            else if (monthNumber && hasDateCell && dateContent) {
                const dateParts = dateContent.split('/');
                if (dateParts.length >= 2 && dateParts[1] === monthNumber) {
                    matches = true;
                }
            }
            
            if (matches) {
                row.style.display = '';
                
                if (isProject) {
                    const projectId = row.dataset.id;
                    const subtaskRows = document.querySelectorAll(`tr.subtask-row[data-project="${projectId}"]`);
                    subtaskRows.forEach(subtaskRow => {
                        subtaskRow.style.display = '';
                    });
                }
                
                if (isSubtask) {
                    const projectId = row.dataset.project;
                    const projectRow = document.querySelector(`tr.project-row[data-id="${projectId}"]`);
                    if (projectRow) {
                        projectRow.style.display = '';
                    }
                }
            }
        });
    }
    
    searchInput.addEventListener('input', performSearch);
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
});

// Initialises Bootstrap tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover'
        });
    });
}

// Initialises all dashboard functionality when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeNameEditing();
    initializeDateEditing();
    initializeDropdowns();
    initializeStatusEditing();
    
    updateDeadlineStyling();
    
    initializeTooltips();

    // Task/Project Creation Form Handling
    const taskProjectModal = document.getElementById('taskProjectModal');
    const taskProjectForm = document.getElementById('taskProjectForm');
    const createButton = document.getElementById('createTaskProject');

    if (createButton) {
        createButton.addEventListener('click', function() {
            const formData = new FormData(taskProjectForm);
            const clientValue = formData.get('client');
            const data = {
                name: formData.get('name'),
                priority: formData.get('priority'),
                due_date: formData.get('due_date'),
                client: clientValue === 'my_business' ? '' : clientValue,
                is_my_business: clientValue === 'my_business' ? 'true' : 'false'
            };

            fetch('/api/create_task/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to create task');
                }
                return response.json();
            })
            .then(() => {
                const modal = bootstrap.Modal.getInstance(taskProjectModal);
                modal.hide();
                location.reload();
            })
            .catch(error => {
                console.error('Error creating task:', error);
            });
        });
    }
});

// Handles view dropdown arrow icon animation
const viewDropdown = document.querySelector('.dropdown');
if (viewDropdown) {
    const arrowIcon = viewDropdown.querySelector('i');
    if (arrowIcon) {
        viewDropdown.addEventListener('show.bs.dropdown', () => {
            arrowIcon.classList.remove('bi-caret-right');
            arrowIcon.classList.add('bi-caret-down');
        });
        viewDropdown.addEventListener('hide.bs.dropdown', () => {
            arrowIcon.classList.remove('bi-caret-down');
            arrowIcon.classList.add('bi-caret-right');
        });
    }
}

// Updates the client status in the database and UI
function updateClientStatus(clientId, newStatus, statusCell) {
    const csrfToken = getCookie('csrftoken');
    fetch(`/clients/${clientId}/update_status/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update client status');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const statusText = statusCell.querySelector('.status-text');
            
            const statusDisplayMap = {
                'active': 'Active',
                'inactive': 'Inactive',
                'prospective': 'Prospective',
                'removed': 'Removed'
            };
            
            statusText.textContent = statusDisplayMap[newStatus];
            statusText.className = 'status-text';
            statusText.classList.add(`status-${newStatus}`);
            
            if (newStatus === 'removed') {
                const row = statusCell.closest('tr');
                row.dataset.markedForDeletion = 'true';
                row.style.display = 'none';
                
                const detailsRow = document.querySelector(`.details-row[data-client="${clientId}"]`);
                if (detailsRow) {
                    detailsRow.style.display = 'none';
                }
            }
        } else {
            alert('Failed to update client status');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while updating the client status');
    });
}

// Manages the display of removed clients on page refresh
function handlePageRefresh() {
    document.querySelectorAll('tr[data-marked-for-deletion="true"]').forEach(row => {
        row.style.display = 'none';
    });
}