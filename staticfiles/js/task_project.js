let businessName = 'My Business';
let subtaskCount = 1;
console.log('task_project.js starting execution');



function initializeTaskProjectCreation() {
    console.log('Initialising task/project creation...');
    const selectionModal = document.getElementById('selectionModal');
    const taskModal = document.getElementById('taskModal');
    const projectModal = document.getElementById('projectModal');
    console.log('Selection modal found:', selectionModal);
    console.log('Task modal found:', taskModal);
    console.log('Project modal found:', projectModal);

    if (!selectionModal || !taskModal || !projectModal) {
        console.error('One or more modals not found in the DOM');
        return;
    }

    const selectionModalInstance = new bootstrap.Modal(selectionModal, {
        backdrop: 'static',
        keyboard: false
    });
    const taskModalInstance = new bootstrap.Modal(taskModal, {
        backdrop: 'static',
        keyboard: false
    });
    const projectModalInstance = new bootstrap.Modal(projectModal, {
        backdrop: 'static',
        keyboard: false
    });




    document.addEventListener('click', function(e) {
        const taskButton = e.target.closest('#taskButton');
        if (taskButton) {
            console.log('Task button clicked');
            e.preventDefault();
            e.stopPropagation();
            
            selectionModalInstance.show();
            selectionModal.removeAttribute('aria-hidden');
        }
    });

    const taskClientSelect = document.getElementById('client');
    const projectClientSelect = document.getElementById('projectClient');
    
    if (taskClientSelect) {
        taskClientSelect.innerHTML = `
            <option value="my_business">My Business</option>
            <option value="">Unassigned</option>
        `;
    }
    if (projectClientSelect) {
        projectClientSelect.innerHTML = `
            <option value="my_business">My Business</option>
            <option value="">Unassigned</option>
        `;
    }

    const bookkeepingButton = document.querySelector("a[href=\"{% url 'bookkeeping' %}\"]");
    if (bookkeepingButton) {
        bookkeepingButton.setAttribute('data-bs-toggle', 'tooltip');
        bookkeepingButton.setAttribute('title', 'Bookkeeping');
        new bootstrap.Tooltip(bookkeepingButton);
    }

    console.log('Fetching clients from /api/active_clients/');
    fetch('/api/active_clients/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Failed to fetch clients');
        }
        return response.json();
    })
    .then(data => {
        console.log('Received client data:', data);
        const taskClientSelect = document.getElementById('client');
        const projectClientSelect = document.getElementById('projectClient');
        
        console.log('Task client select element:', taskClientSelect);
        console.log('Project client select element:', projectClientSelect);
        
        if (taskClientSelect && data.clients) {
            console.log('Updating task client dropdown with', data.clients.length, 'clients');
            while (taskClientSelect.options.length > 2) {
                taskClientSelect.remove(2);
            }
            data.clients.forEach(client => {
                console.log('Adding client option:', client);
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                taskClientSelect.appendChild(option);
            });
        }
        
        if (projectClientSelect && data.clients) {
            console.log('Updating project client dropdown with', data.clients.length, 'clients');
            while (projectClientSelect.options.length > 2) {
                projectClientSelect.remove(2);
            }
            data.clients.forEach(client => {
                console.log('Adding client option:', client);
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                projectClientSelect.appendChild(option);
            });
        }
    })
    .catch(error => {
        console.error('Error fetching clients:', error);
        showToast('An error occurred while fetching clients. Please try again later.', 'error');
    });



    const createTaskButton = document.getElementById('createTaskButton');
    if (createTaskButton) {
        createTaskButton.addEventListener('click', function() {
            console.log('Create task button clicked');
            selectionModalInstance.hide();
            selectionModal.setAttribute('aria-hidden', 'true');
            taskModalInstance.show();
            document.getElementById('taskName').focus();
        });
    }



    const backToSelectionButton = document.getElementById('backToSelectionButton');
    if (backToSelectionButton) {
        backToSelectionButton.addEventListener('click', function() {
            console.log('Back to selection button clicked');
            taskModalInstance.hide();
            taskModal.setAttribute('aria-hidden', 'true');
            selectionModalInstance.show();
            selectionModal.removeAttribute('aria-hidden');
        });
    }



    const createProjectButton = document.getElementById('createProjectButton');
    if (createProjectButton) {
        createProjectButton.addEventListener('click', function() {
            console.log('Create project button clicked');
            selectionModalInstance.hide();
            selectionModal.setAttribute('aria-hidden', 'true');
            projectModalInstance.show();
            projectModal.removeAttribute('aria-hidden');
            document.getElementById('projectName').focus();
        });
    }



    const backToProjectSelectionButton = document.getElementById('backToProjectSelectionButton');
    if (backToProjectSelectionButton) {
        backToProjectSelectionButton.addEventListener('click', function() {
            console.log('Back to project selection button clicked');
            projectModalInstance.hide();
            projectModal.setAttribute('aria-hidden', 'true');
            selectionModalInstance.show();
            selectionModal.removeAttribute('aria-hidden');
        });
    }



    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const taskName = document.getElementById('taskName').value;
            const priority = document.getElementById('priority').value;
            const clientId = document.getElementById('client').value;
            const dueDate = document.getElementById('dueDate').value;

            let valid = true;
            if (!taskName || taskName.length > 100) {
                document.getElementById('taskNameError').textContent = "Task name is required and must be under 100 characters.";
                valid = false;
            }
            if (dueDate && !isDateValid(dueDate)) {
                document.getElementById('dueDateError').textContent = "Due date must be today or later.";
                valid = false;
            }
            if (valid) {
                const data = {
                    name: taskName,
                    priority: priority.toLowerCase(),
                    client: clientId === 'my_business' ? '' : clientId,
                    is_my_business: clientId === 'my_business' ? 'true' : 'false'
                };
                if (dueDate) {
                    data.due_date = dueDate;
                }

                console.log('Sending task creation request with data:', data);
                const csrftoken = getCookie('csrftoken');

                fetch('/api/create_task/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken,
                    },
                    credentials: 'include',
                    body: JSON.stringify(data)
                })
                .then(response => {
                    console.log('Task creation response status:', response.status);
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.errors ? JSON.stringify(data.errors) : 'Failed to create task');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Task created successfully:', data);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
                    if (modal) {
                        modal.hide();
                    }
                    document.getElementById('taskForm').reset();
                    showToast('Task created successfully');
                    refreshDashboard();
                })
                .catch(error => {
                    console.error('Error creating task:', error);
                    showToast('An error occurred while creating the task. Please try again later.', 'error');
                });
            }
        });
    }



    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const projectName = document.getElementById('projectName').value;
            const projectPriority = document.getElementById('projectPriority').value;
            const projectClientId = document.getElementById('projectClient').value;
            const projectDueDate = document.getElementById('projectDueDate').value;

            let valid = true;
            if (!projectName || projectName.length > 100) {
                document.getElementById('projectNameError').textContent = "Project name is required and must be under 100 characters.";
                valid = false;
            }
            if (projectDueDate && !isDateValid(projectDueDate)) {
                document.getElementById('projectDueDateError').textContent = "Due date must be today or later.";
                valid = false;
            }

            if (valid) {
                const data = {
                    name: projectName,
                    priority: projectPriority.toLowerCase(),
                    client: projectClientId === 'my_business' ? '' : projectClientId,
                    is_my_business: projectClientId === 'my_business' ? 'true' : 'false'
                };
                if (projectDueDate) {
                    data.due_date = projectDueDate;
                }

                const subtasks = [];
                for (let i = 1; i <= subtaskCount; i++) {
                    const subtaskName = document.getElementById(`subtaskName${i}`).value;
                    if (subtaskName.trim()) {
                        subtasks.push({
                            name: subtaskName,
                            status: 'not_started'
                        });
                    }
                }

                data.subtasks = subtasks;
                const csrftoken = getCookie('csrftoken');

                fetch('/api/create_project/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken,
                    },
                    credentials: 'include',
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.errors ? JSON.stringify(data.errors) : 'Failed to create project');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('projectModal'));
                        if (modal) {
                            modal.hide();
                        }
                        document.getElementById('projectForm').reset();
                        subtaskCount = 1;
                        const subtaskContainer = document.getElementById('subtaskContainer');
                        subtaskContainer.innerHTML = `
                            <div class="mb-3">
                                <label for="subtaskName1" class="form-label">Subtask Name</label>
                                <input type="text" class="form-control" id="subtaskName1" maxlength="100" required>
                            </div>
                        `;
                        if (window.location.pathname === '/dashboard/') {
                            refreshDashboard();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error details:', error);
                    alert('An error occurred while creating the project: ' + error.message);
                });
            }
        });
    }



    const addSubtaskButton = document.getElementById('addSubtaskButton');
    if (addSubtaskButton) {
        addSubtaskButton.addEventListener('click', function() {
            subtaskCount++;
            const subtaskContainer = document.getElementById('subtaskContainer');
            const newSubtaskDiv = document.createElement('div');
            newSubtaskDiv.className = 'mb-3';
            newSubtaskDiv.innerHTML = `
                <label for="subtaskName${subtaskCount}" class="form-label">Subtask Name</label>
                <input type="text" class="form-control" id="subtaskName${subtaskCount}" maxlength="100" required>
            `;
            subtaskContainer.appendChild(newSubtaskDiv);
        });
    }
}



function isDateValid(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateString);
    return selectedDate >= today;
}



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



document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initialising task/project functionality...');
    initializeTaskProjectCreation();
}); 