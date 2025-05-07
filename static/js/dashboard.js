// Logs the start of the script execution.
console.log('Dashboard.js starting execution');

// Logs that the script has loaded.
console.log('Dashboard.js script loaded');

// Defines the function to refresh the dashboard.
function refreshDashboard() {
    // Fetches the dashboard data from the server.
    fetch('/dashboard/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include'
    })
    .then(response => {
        // Throws an error if the response is not OK.
        if (!response.ok) {
            throw new Error('Failed to fetch to-dos');
        }
        return response.text();
    })
    .then(html => {
        // Creates a temporary div to hold the fetched HTML.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Selects the new tbody from the fetched HTML.
        const newTbody = tempDiv.querySelector('#todoTable tbody');
        if (newTbody) {
            // Updates the current tbody with the new content.
            const currentTbody = document.querySelector('#todoTable tbody');
            currentTbody.innerHTML = newTbody.innerHTML;
            +
            // Initializes various editing and styling functions.
            initializeNameEditing();
            initializeDateEditing();
            initializeDropdowns();
            initializeStatusEditing();
            updateDeadlineStyling();
            initializeTooltips();
            
            // Sets up event listeners for toggling subtasks.
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
        }
    })
    .catch(error => {
        // Logs an error if the fetch fails.
        console.error('Error refreshing dashboard:', error);
    });
}

// Defines the function to get a cookie by name.
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Checks if the cookie matches the name.
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Defines the function to initialise name editing.
function initializeNameEditing() {
    // Selects all editable name cells and adds click event listeners.
    document.querySelectorAll('.editable-name').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentName = this.querySelector('.item-name').textContent;
            const input = document.createElement('input');
            input.value = currentName;
            input.className = 'form-control';
            input.style.width = '200px';
            const isSubtask = this.closest('tr').classList.contains('subtask-row');

            // Creates a wrapper for the input if it is a subtask.
            if (isSubtask) {
                const wrapper = document.createElement('div');
                wrapper.style.paddingLeft = '2.5rem';
                wrapper.appendChild(input);
                this.innerHTML = '';
                this.appendChild(wrapper);
            } else {
                this.innerHTML = '';
                this.appendChild(input);
            }

            input.focus();

            // Defines the function to save the new name.
            const saveName = () => {
                const newName = input.value.trim();
                if (newName === '') {
                    alert('Name cannot be empty');
                    if (isSubtask) {
                        this.innerHTML = `<div style="padding-left: 2.5rem;"><span class="item-name">${currentName}</span></div>`;
                    } else {
                        this.innerHTML = `<span class="item-name">${currentName}</span>`;
                    }
                    return;
                }
                
                const id = this.closest('tr').dataset.id;
                const isProject = this.closest('tr').dataset.type === 'project';
                const endpoint = isSubtask ? '/api/update_subtask/' : 
                                isProject ? '/api/update_project/' : '/api/update_task/';
                
                const cell = this;
                // Sends a POST request to update the name.
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        id: id,
                        name: newName
                    })
                })
                .then(response => response.json())
                .then(data => {
                    // Updates the cell with the new name if successful.
                    if (data.success) {
                        if (isSubtask) {
                            cell.innerHTML = `<div style="padding-left: 2.5rem;"><span class="item-name">${newName}</span></div>`;
                        } else {
                            cell.innerHTML = `<span class="item-name">${newName}</span>`;
                        }
                    } else {
                        alert('Failed to update name');
                        if (isSubtask) {
                            cell.innerHTML = `<div style="padding-left: 2.5rem;"><span class="item-name">${currentName}</span></div>`;
                        } else {
                            cell.innerHTML = `<span class="item-name">${currentName}</span>`;
                        }
                    }
                })
                .catch(error => {
                    // Logs an error if the update fails.
                    console.error('Error:', error);
                    alert('Failed to update name');
                    if (isSubtask) {
                        cell.innerHTML = `<div style="padding-left: 2.5rem;"><span class="item-name">${currentName}</span></div>`;
                    } else {
                        cell.innerHTML = `<span class="item-name">${currentName}</span>`;
                    }
                });
            };
            input.addEventListener('blur', saveName);
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    saveName();
                }
            });
        });
    });
}

// Defines the function to initialise date editing.
function initializeDateEditing() {
    // Selects all editable due date cells and adds click event listeners.
    document.querySelectorAll('.editable-due-date').forEach(cell => {
        cell.addEventListener('click', function(e) {
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

            // Defines the function to save the new due date.
            const saveDate = () => {
                const newDate = dueDateInput.value;
                const id = this.closest('tr').dataset.id;
                const isProject = this.closest('tr').dataset.type === 'project';
                
                if (!newDate) {
                    const endpoint = isProject ? '/api/update_project/' : '/api/update_task/';
                    // Sends a POST request to update the due date to null.
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

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(newDate);
                due.setHours(0, 0, 0, 0);
                
                // Checks if the selected date is valid.
                if (due < today) {
                    alert('Please select a valid date that is today or later.');
                    this.innerHTML = `<span class="date-text">${currentDate}</span>`;
                    updateDeadlineStyling();
                    return;
                }

                const endpoint = isProject ? '/api/update_project/' : '/api/update_task/';
                // Sends a POST request to update the due date.
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

// Defines the function to initialise dropdowns for priority and client selection.
function initializeDropdowns() {
    const priorityCells = document.querySelectorAll('.editable-priority');
    const priorityDropdown = document.querySelector('.priority-dropdown');
    let currentPriorityCell = null;
    let currentClientCell = null;

    // Sets up event listeners for priority cells.
    priorityCells.forEach(cell => {
        cell.addEventListener('click', (e) => {
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
            const rect = cell.getBoundingClientRect();
            const dropdownHeight = priorityDropdown.offsetHeight;
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - rect.bottom;
            
            // Positions the dropdown based on available space.
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

    // Sets up event listeners for dropdown items.
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
            
            // Sends a POST request to update the priority.
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
                // Logs an error if the update fails.
                console.error('Error updating priority:', error);
            });
        });
    });

    // Hides the dropdown when clicking outside of it.
    document.addEventListener('click', (e) => {
        if (!priorityDropdown.contains(e.target) && !Array.from(priorityCells).some(cell => cell.contains(e.target))) {
            priorityDropdown.style.display = 'none';
            currentPriorityCell = null;
        }
    });

    // Sets up event listeners for toggling subtasks.
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

    // Sets up event listeners for client cells.
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
            
            // Positions the dropdown based on available space.
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

    // Sets up event listeners for client dropdown items.
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
            
            // Sends a POST request to update the client.
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
                // Logs an error if the update fails.
                console.error('Error updating client:', error);
            });
        });
    });

    // Hides the dropdown when clicking outside of it.
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.client-dropdown');
        if (!dropdown.contains(e.target) && !Array.from(document.querySelectorAll('.editable-client')).some(cell => cell.contains(e.target))) {
            dropdown.style.display = 'none';
            currentClientCell = null;
        }
    });
}

// Defines the function to update the styling of deadlines.
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

// Defines the function to get the status of a deadline.
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

// Defines the function to format a date for display.
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Defines the function to format a date for input.
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
}

// Defines the function to initialise status editing.
function initializeStatusEditing() {
    const statusCells = document.querySelectorAll('.editable-status');
    const statusDropdown = document.querySelector('.status-dropdown');
    let currentStatusCell = null;
    let previousStatus = null;

    // Defines the function to save the new status.
    async function saveStatus(newStatus) {
        if (!currentStatusCell) return;
        const id = currentStatusCell.closest('tr').dataset.id;
        const isProject = currentStatusCell.closest('tr').dataset.type === 'project';
        const isSubtask = currentStatusCell.closest('tr').classList.contains('subtask-row');
        const statusText = currentStatusCell.querySelector('.status-text');

        // Confirms cancellation if the new status is 'cancelled'.
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
            // Sends a POST request to update the status.
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
            // Logs an error if the update fails.
            console.error('Error updating status:', error);
        }
    }

    // Sets up event listeners for status cells.
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
            // Positions the dropdown based on available space.
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

    // Sets up event listeners for dropdown items.
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

    // Hides the dropdown when clicking outside of it.
    document.addEventListener('click', (e) => {
        if (!statusDropdown.contains(e.target) && !Array.from(statusCells).some(cell => cell.contains(e.target))) {
            statusDropdown.style.display = 'none';
            currentStatusCell = null;
        }
    });
}

// Defines the function to initialise the search functionality.
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        return;
    }

    // Maps month names to their corresponding numbers.
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

    // Defines the function to perform the search.
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const table = document.getElementById('todoTable');
        
        if (!table) {
            return;
        }
        
        const rows = table.querySelectorAll('tbody tr');
        
        // Hides all rows initially.
        rows.forEach(row => {
            row.style.display = 'none';
        });
        
        // Shows all rows if the search term is empty.
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
            
            // Displays tasks if the search term is 'task'.
            if (isTaskSearch) {
                if (!isProject) {
                    row.style.display = '';
                    return;
                }
            } else if (isProjectSearch) {
                // Displays projects if the search term is 'project'.
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
            
            // Collects content from each cell in the row.
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
            // Checks if the row matches the search term.
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
                // Displays subtasks if the row is a project.
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

    // Sets up event listeners for the search input.
    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });
}

// Initialises the search functionality when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
});

// Defines the function to initialise tooltips.
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover'
        });
    });
}

// Initialises various editing and styling functions when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', function() {
    initializeNameEditing();
    initializeDateEditing();
    initializeDropdowns();
    initializeStatusEditing();
    updateDeadlineStyling();
    initializeTooltips();

    const taskProjectModal = document.getElementById('taskProjectModal');
    const taskProjectForm = document.getElementById('taskProjectForm');
    const createButton = document.getElementById('createTaskProject');

    // Sets up an event listener for the create button.
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

            // Sends a POST request to create a new task.
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
                showToast('Task created successfully');
                refreshDashboard();
            })
            .catch(error => {
                // Logs an error if the creation fails.
                console.error('Error creating task:', error);
                showToast('Failed to create task', 'error');
            });
        });
    }
});

// Defines the function to update the status of a client.
function updateClientStatus(clientId, newStatus, statusCell) {
    const csrfToken = getCookie('csrftoken');
    // Sends a POST request to update the client status.
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
            
            // Maps status values to their display text.
            const statusDisplayMap = {
                'active': 'Active',
                'inactive': 'Inactive',
                'prospective': 'Prospective',
                'removed': 'Removed'
            };
            
            statusText.textContent = statusDisplayMap[newStatus];
            statusText.className = 'status-text';
            statusText.classList.add(`status-${newStatus}`);
            
            // Hides the row if the status is 'removed'.
            if (newStatus === 'removed') {
                const row = statusCell.closest('tr');
                row.dataset.markedForDeletion = 'true';
                row.style.display = 'none';
                
                const detailsRow = document.querySelector(`.details-row[data-client="${clientId}"]`);
                if (detailsRow) {
                    detailsRow.style.display = 'none';
                }
            }
            showToast('Client status updated successfully');
        } else {
            showToast('Failed to update client status', 'error');
        }
    })
    .catch(error => {
        // Logs an error if the update fails.
        console.error('Error:', error);
        showToast('An error occurred while updating the client status', 'error');
    });
}

// Defines the function to handle page refresh.
function handlePageRefresh() {
    // Hides all rows marked for deletion.
    document.querySelectorAll('tr[data-marked-for-deletion="true"]').forEach(row => {
        row.style.display = 'none';
    });
}