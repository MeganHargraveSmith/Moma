// Defines a utility object with various helper functions.
const Utils = {
    // Creates an editable input field with specified options and a save function.
    createEditableInput(currentValue, className, saveFunction, options = {}) {
        const input = document.createElement('input');
        input.value = currentValue;
        input.className = 'form-control';
        input.style.width = options.width || '200px';
        if (options.type) input.type = options.type;
        if (options.placeholder) input.placeholder = options.placeholder;

        const container = document.createElement('div');
        container.appendChild(input);
        input.focus();

        // Sets up event listeners for the input field.
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveFunction();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                container.innerHTML = `<span class="${className}">${currentValue}</span>`;
            }
        });

        input.addEventListener('blur', () => {
            if (document.body.contains(input)) {
                saveFunction();
            }
        });

        return { input, container };
    },

    // Makes an API call to the specified endpoint with the given method and data.
    async makeApiCall(endpoint, method, data) {
        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    },

    // Displays a confirmation dialog and resolves the promise based on user input.
    async showConfirmationDialog(title, message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'modal fade';
            dialog.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="dontAskAgain">
                                <label class="form-check-label" for="dontAskAgain">
                                    Don't ask me this again
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
                            <button type="button" class="btn btn-primary" id="confirmAction">Yes</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);
            const modal = new bootstrap.Modal(dialog);
            modal.show();

            // Sets up event listeners for the confirmation dialog buttons.
            dialog.querySelector('#confirmAction').addEventListener('click', () => {
                const dontAskAgain = dialog.querySelector('#dontAskAgain').checked;
                if (dontAskAgain) {
                    localStorage.setItem('dontAskConfirmation', 'true');
                }
                modal.hide();
                resolve(true);
            });

            dialog.querySelector('.btn-secondary').addEventListener('click', () => {
                modal.hide();
                resolve(false);
            });

            dialog.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(dialog);
            });
        });
    },

    // Updates the display of a status cell based on the new status.
    updateStatusDisplay(statusCell, newStatus, statusMap) {
        const statusText = statusCell.querySelector('.status-text');
        const displayText = statusMap[newStatus] || newStatus.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        statusText.textContent = displayText;
        statusText.className = 'status-text';
        statusText.classList.add(`status-${newStatus}`);
    }
};

// Initialises various editing functionalities when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', function() {
    InitialiseNameEditing();
    InitialiseStatusEditing();
    InitialisePhoneEditing();
    InitialiseEmailEditing();
    InitialiseLinkedInEditing();
    InitialiseDetailsToggle();
    InitialiseDetailsEditing();
    InitialiseSearch();
    handlePageRefresh();

    const newClientModal = document.getElementById('newClientModal');
    if (newClientModal) {
        const modalInstance = new bootstrap.Modal(newClientModal);
        const newClientButton = document.getElementById('newClientButton');
        const newInfoButton = document.getElementById('newInfoButton');
        const createClientButton = document.getElementById('createClientButton');
        const otherInfoContainer = document.getElementById('otherInfoContainer');
        const clientForm = document.getElementById('newClientForm');

        // Sets up an event listener for the new client button.
        if (newClientButton) {
            newClientButton.addEventListener('click', function() {
                modalInstance.show();
            });
        }

        // Sets up an event listener for the new info button.
        if (newInfoButton) {
            newInfoButton.addEventListener('click', function() {
                const newInfoDiv = document.createElement('div');
                newInfoDiv.className = 'mb-3';
                newInfoDiv.innerHTML = `
                    <textarea class="form-control" name="details[]" rows="3"></textarea>
                `;
                otherInfoContainer.appendChild(newInfoDiv);
            });
        }

        // Sets up an event listener for the create client button.
        if (createClientButton) {
            createClientButton.addEventListener('click', function(e) {
                e.preventDefault();
                const formData = new FormData(clientForm);
                const details = Array.from(formData.getAll('details[]'))
                    .filter(detail => detail.trim() !== '')
                    .join('\n');
                const clientData = {
                    name: formData.get('name'),
                    active: formData.get('active'),
                    phone_number: formData.get('phone_number'),
                    email: formData.get('email'),
                    linkedin: formData.get('linkedin'),
                    details: details
                };

                // Sends a POST request to create a new client.
                fetch('/api/clients/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify({
                        name: clientData.name,
                        active: clientData.active,
                        email: clientData.email,
                        phone_number: clientData.phone_number,
                        linkedin: clientData.linkedin,
                        details: clientData.details
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || 'Failed to create client');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    modalInstance.hide();
                    if (window.location.pathname !== '/clients/') {
                        fetchBusinessName();
                    }
                    showToast('Client created successfully');
                    
                    clientForm.reset();
                    otherInfoContainer.innerHTML = `
                        <div class="mb-3">
                            <label class="form-label">Other Information</label>
                            <textarea class="form-control" name="details[]" rows="3"></textarea>
                        </div>
                    `;
                    
                    handlePageRefresh();
                })
                .catch(error => {
                    console.error('Error creating client:', error);
                    showToast('Failed to create client. Please try again.', 'error');
                });
            });
        }
    }
});

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
function InitialiseNameEditing() {
    document.querySelectorAll('.editable-name').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentName = this.querySelector('.item-name').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

            // Defines the function to save the new name.
            const saveName = async () => {
                const newName = input.value.trim();
                if (newName === '') {
                    alert('Name cannot be empty');
                    cell.innerHTML = `<span class="item-name">${currentName}</span>`;
                    return;
                }

                try {
                    await Utils.makeApiCall(`/api/clients/${id}/`, 'PATCH', {
                        name: newName
                    });
                    cell.innerHTML = `<span class="item-name">${newName}</span>`;
                } catch (error) {
                    cell.innerHTML = `<span class="item-name">${currentName}</span>`;
                }
            };

            const { input, container } = Utils.createEditableInput(
                currentName,
                'item-name',
                saveName,
                { width: '200px' }
            );

            cell.innerHTML = '';
            cell.appendChild(container);
        });
    });
}

// Defines the function to initialise status editing.
function InitialiseStatusEditing() {
    const statusCells = document.querySelectorAll('.editable-status');
    const statusDropdown = document.querySelector('.status-dropdown');
    let currentStatusCell = null;
    let previousStatus = null;

    // Defines the function to save the new status.
    async function saveStatus(newStatus) {
        if (!currentStatusCell) return;

        const id = currentStatusCell.closest('tr').dataset.id;
        const statusText = currentStatusCell.querySelector('.status-text');

        // Shows a confirmation dialog if the new status is 'removed'.
        if (newStatus === 'removed') {
            const dontAskAgain = localStorage.getItem('dontAskConfirmation') === 'true';
            
            if (!dontAskAgain) {
                const confirmed = await Utils.showConfirmationDialog(
                    'Confirm Removal',
                    'Are you sure you want to remove this client? This action cannot be undone.'
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
            await Utils.makeApiCall(`/api/clients/${id}/`, 'PATCH', {
                active: newStatus
            });

            const displayText = newStatus.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            statusText.textContent = displayText;
            
            statusText.className = 'status-text';
            statusText.classList.add(`status-${newStatus}`);

            if (newStatus === 'removed') {
                // Marks the client for deletion but keeps it visible.
                const row = currentStatusCell.closest('tr');
                row.dataset.markedForDeletion = 'true';
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    // Sets up event listeners for status cells.
    statusCells.forEach(cell => {
        cell.addEventListener('click', (e) => {
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

// Defines the function to initialise phone editing.
function InitialisePhoneEditing() {
    document.querySelectorAll('.editable-phone').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentPhone = this.querySelector('.phone-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

            // Defines the function to save the new phone number.
            const savePhone = async () => {
                const newPhone = input.value.trim();
                try {
                    await Utils.makeApiCall(`/api/clients/${id}/`, 'PATCH', {
                        phone_number: newPhone
                    });
                    cell.innerHTML = `<span class="phone-text">${newPhone}</span>`;
                } catch (error) {
                    cell.innerHTML = `<span class="phone-text">${currentPhone}</span>`;
                }
            };

            const { input, container } = Utils.createEditableInput(
                currentPhone,
                'phone-text',
                savePhone,
                { width: '150px' }
            );

            cell.innerHTML = '';
            cell.appendChild(container);
        });
    });
}

// Defines the function to initialise email editing.
function InitialiseEmailEditing() {
    document.querySelectorAll('.editable-email').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentEmail = this.querySelector('.email-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

            // Defines the function to save the new email address.
            const saveEmail = async () => {
                const newEmail = input.value.trim();
                try {
                    await Utils.makeApiCall(`/api/clients/${id}/`, 'PATCH', {
                        email: newEmail
                    });
                    cell.innerHTML = `<span class="email-text">${newEmail}</span>`;
                } catch (error) {
                    cell.innerHTML = `<span class="email-text">${currentEmail}</span>`;
                }
            };

            const { input, container } = Utils.createEditableInput(
                currentEmail,
                'email-text',
                saveEmail,
                { width: '200px', type: 'email' }
            );

            cell.innerHTML = '';
            cell.appendChild(container);
        });
    });
}

// Defines the function to initialise LinkedIn editing.
function InitialiseLinkedInEditing() {
    document.querySelectorAll('.editable-linkedin').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentLinkedIn = this.querySelector('.linkedin-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

            // Defines the function to save the new LinkedIn URL.
            const saveLinkedIn = async () => {
                const newLinkedIn = input.value.trim();
                try {
                    await Utils.makeApiCall(`/api/clients/${id}/`, 'PATCH', {
                        linkedin: newLinkedIn
                    });
                    if (newLinkedIn) {
                        cell.innerHTML = `<a href="${newLinkedIn}" target="_blank" class="linkedin-link"><span class="linkedin-text">${newLinkedIn}</span></a>`;
                    } else {
                        cell.innerHTML = '<span class="linkedin-text"></span>';
                    }
                } catch (error) {
                    if (currentLinkedIn) {
                        cell.innerHTML = `<a href="${currentLinkedIn}" target="_blank" class="linkedin-link"><span class="linkedin-text">${currentLinkedIn}</span></a>`;
                    } else {
                        cell.innerHTML = '<span class="linkedin-text"></span>';
                    }
                }
            };

            const { input, container } = Utils.createEditableInput(
                currentLinkedIn,
                'linkedin-text',
                saveLinkedIn,
                { width: '200px', type: 'url' }
            );

            cell.innerHTML = '';
            cell.appendChild(container);
        });
    });
}

// Defines the function to initialise the toggle for client details.
function InitialiseDetailsToggle() {
    document.querySelectorAll('.toggle-details').forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const detailsRow = document.querySelector(`.details-row[data-client="${row.dataset.id}"]`);
            const icon = this.querySelector('i');
            
            if (!detailsRow) {
                console.error('Details row not found for client:', row.dataset.id);
                return;
            }

            // Toggles the visibility of the details row.
            if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
                detailsRow.style.display = 'table-row';
                row.classList.add('active');
                icon.classList.add('rotated');
                
                const detailsContent = detailsRow.querySelector('.details-content');
                if (detailsContent && !detailsContent.querySelector('.detail-item')) {
                    // Fetches client details if they are not already loaded.
                    fetch(`/api/get_client_details/${row.dataset.id}/`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.details) {
                                const details = data.details.split('\n').filter(detail => detail.trim());
                                details.forEach(detail => {
                                    const detailItem = document.createElement('div');
                                    detailItem.className = 'detail-item';
                                    detailItem.innerHTML = `<span class="detail-text">${detail}</span>`;
                                    detailsContent.insertBefore(detailItem, detailsContent.querySelector('.add-detail-row'));
                                });
                            }
                        })
                        .catch(error => console.error('Error fetching details:', error));
                }
            } else {
                detailsRow.style.display = 'none';
                row.classList.remove('active');
                icon.classList.remove('rotated');
            }
        });
    });
}

// Defines the function to initialise details editing.
function InitialiseDetailsEditing() {
    document.querySelectorAll('.add-detail-btn').forEach(button => {
        button.addEventListener('click', function() {
            const detailsContent = this.closest('.details-container').querySelector('.details-content');
            const newDetailItem = document.createElement('div');
            newDetailItem.className = 'detail-item';
            newDetailItem.innerHTML = `
                <textarea class="form-control detail-textarea" 
                          placeholder="Add New Details Here..." 
                          maxlength="500" 
                          rows="1"></textarea>
            `;
            
            detailsContent.appendChild(newDetailItem);
            const textarea = newDetailItem.querySelector('textarea');
            textarea.focus();
            const adjustTextareaHeight = () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
            };
            textarea.addEventListener('input', adjustTextareaHeight);
            
            // Defines the function to save the new detail.
            const saveDetail = async () => {
                const detailText = textarea.value.trim();
                if (detailText) {
                    const clientId = this.closest('.details-row').dataset.client;
                    const existingDetails = Array.from(detailsContent.querySelectorAll('.detail-text'))
                        .map(el => el.textContent);
                    existingDetails.push(detailText);
                    
                    try {
                        await Utils.makeApiCall(`/api/clients/${clientId}/`, 'PATCH', {
                            details: existingDetails.join('\n')
                        });
                        
                        newDetailItem.innerHTML = `<span class="detail-text">${detailText}</span>`;
                        newDetailItem.addEventListener('click', handleDetailEdit);
                    } catch (error) {
                        console.error('Error saving detail:', error);
                    }
                } else {
                    newDetailItem.remove();
                }
            };
            
            textarea.addEventListener('blur', saveDetail);
            textarea.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveDetail();
                }
            });
        });
    });
    document.querySelectorAll('.detail-item').forEach(item => {
        item.addEventListener('click', handleDetailEdit);
    });
}

// Defines the function to handle detail editing.
function handleDetailEdit() {
    const detailText = this.querySelector('.detail-text').textContent;
    const originalItem = this;
    const detailsContent = this.closest('.details-content');
    const clientId = this.closest('.details-row').dataset.client;
    
    this.innerHTML = `
        <textarea class="form-control detail-textarea" 
                  maxlength="500" 
                  rows="1">${detailText}</textarea>
    `;
    
    const textarea = this.querySelector('textarea');
    textarea.focus();
    const adjustTextareaHeight = () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    };
    
    adjustTextareaHeight();
    textarea.addEventListener('input', adjustTextareaHeight);
    
    // Defines the function to save the edited detail.
    const saveDetail = async () => {
        const newText = textarea.value.trim();
        if (newText) {
            const allDetailItems = Array.from(detailsContent.querySelectorAll('.detail-item'));
            const existingDetails = allDetailItems.map(item => {
                if (item === originalItem) {
                    return newText;
                } else {
                    return item.querySelector('.detail-text')?.textContent || '';
                }
            }).filter(text => text.trim() !== '');
        
            try {
                await Utils.makeApiCall(`/api/clients/${clientId}/`, 'PATCH', {
                    details: existingDetails.join('\n')
                });
                
                originalItem.innerHTML = `<span class="detail-text">${newText}</span>`;
                originalItem.addEventListener('click', handleDetailEdit);
            } catch (error) {
                console.error('Error saving detail:', error);
            }
        } else {
            originalItem.remove();
            const remainingDetails = Array.from(detailsContent.querySelectorAll('.detail-item'))
                .map(item => item.querySelector('.detail-text')?.textContent || '')
                .filter(text => text.trim() !== '');
            try {
                await Utils.makeApiCall(`/api/clients/${clientId}/`, 'PATCH', {
                    details: remainingDetails.join('\n')
                });
            } catch (error) {
                console.error('Error updating details after removal:', error);
            }
        }
    };
    
    textarea.addEventListener('blur', saveDetail);
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveDetail();
        }
    });
}

// Defines the function to initialise the search functionality.
function InitialiseSearch() {
    const searchInput = document.getElementById('clientSearchInput');
    console.log('Initialising search with input:', searchInput);
    
    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }

    // Sets up an event listener for the search input.
    searchInput.addEventListener('input', function() {
        console.log('Search input changed:', this.value);
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#clientsTable tbody tr.client-row');
        console.log('Found client rows:', rows.length);
        
        rows.forEach(row => {
            const nameElement = row.querySelector('.item-name');
            const phoneElement = row.querySelector('.phone-text');
            const emailElement = row.querySelector('.email-text');
            const linkedinElement = row.querySelector('.linkedin-text');
            const statusElement = row.querySelector('.status-text');
            
            const name = nameElement ? nameElement.textContent.toLowerCase() : '';
            const phone = phoneElement ? phoneElement.textContent.toLowerCase() : '';
            const email = emailElement ? emailElement.textContent.toLowerCase() : '';
            const linkedin = linkedinElement ? linkedinElement.textContent.toLowerCase() : '';
            const status = statusElement ? statusElement.textContent.toLowerCase() : '';
            
            const clientId = row.dataset.id;
            const detailsRow = document.querySelector(`.details-row[data-client="${clientId}"]`);
            const detailsContent = detailsRow ? detailsRow.querySelector('.details-content') : null;
            const details = detailsContent ? detailsContent.textContent.toLowerCase() : '';
            
            // Checks if the row matches the search term.
            const matches = name.includes(searchTerm) || 
                          phone.includes(searchTerm) || 
                          email.includes(searchTerm) || 
                          linkedin.includes(searchTerm) ||
                          status.includes(searchTerm) ||
                          details.includes(searchTerm);
            
            console.log('Row matches search:', matches, 'for client:', name);
            row.style.display = matches ? '' : 'none';
            
            if (detailsRow) {
                detailsRow.style.display = 'none';
                const toggleButton = row.querySelector('.toggle-details i');
                if (toggleButton) {
                    toggleButton.classList.remove('bi-caret-down-fill');
                    toggleButton.classList.add('bi-caret-right-fill');
                }
            }
        });
    });
}

// Defines the function to handle status changes for clients.
function handleStatusChange(clientId, newStatus) {
    if (newStatus === 'removed') {
        if (confirm('Are you sure you want to remove this client? This action cannot be undone.')) {
            updateClientStatus(clientId, newStatus);
        }
    } else {
        updateClientStatus(clientId, newStatus);
    }
}

// Defines the function to update the status of a client.
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
            
            if (newStatus === 'removed') {
                const row = statusCell.closest('tr');
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

// Defines the function to refresh the clients table.
function refreshClientsTable() {
    fetch('/clients/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch clients');
        }
        return response.text();
    })
    .then(html => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const newTbody = tempDiv.querySelector('#clientsTable tbody');
        if (newTbody) {
            const currentTbody = document.querySelector('#clientsTable tbody');
            currentTbody.innerHTML = newTbody.innerHTML;
            
            // Reinitialises editing functionalities for the new table.
            InitialiseNameEditing();
            InitialiseStatusEditing();
            InitialisePhoneEditing();
            InitialiseEmailEditing();
            InitialiseLinkedInEditing();
            InitialiseDetailsToggle();
            InitialiseDetailsEditing();
            InitialiseSearch();
        }
    })
    .catch(error => {
        console.error('Error refreshing clients table:', error);
        showToast('Failed to refresh client list. Please try again.', 'error');
    });
}

// Defines the function to handle page refresh.
function handlePageRefresh() {
    refreshClientsTable();
    document.querySelectorAll('tr[data-marked-for-deletion="true"]').forEach(row => {
        row.style.display = 'none';
    });
}

// Sets up an event listener to handle client deletions before the page unloads.
window.addEventListener('beforeunload', function() {
    const removedClients = document.querySelectorAll('tr[data-marked-for-deletion="true"]');
    if (removedClients.length > 0) {
        fetch('/api/delete_marked_clients/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                client_ids: Array.from(removedClients).map(row => row.dataset.id)
            })
        });
    }
});