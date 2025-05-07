// Contains utility functions for common operations across the client management system
const Utils = {
    // Creates an editable input field with standard event handlers
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

    // Makes an API call with proper error handling and CSRF token management
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

    // Displays a modal dialog for user confirmation with optional "don't ask again" feature
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

    // Updates the status display in the UI with appropriate styling and text formatting
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

// Initialises all client management functionality when the page loads
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

        if (newClientButton) {
            newClientButton.addEventListener('click', function() {
                modalInstance.show();
            });
        }

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

        if (createClientButton) {
            createClientButton.addEventListener('click', function(e) {
                e.preventDefault();
                const formData = new FormData(clientForm);
                const clientData = {
                    name: formData.get('name'),
                    phone_number: formData.get('phone_number'),
                    email: formData.get('email'),
                    linkedin: formData.get('linkedin'),
                    details: Array.from(formData.getAll('details[]')).filter(detail => detail.trim() !== '')
                };

                fetch('/api/clients/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify(clientData)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            console.error('Server response:', err);
                            throw new Error('Failed to create client');
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
                })
                .catch(error => {
                    console.error('Error creating client:', error);
                    showToast('Failed to create client. Please try again.', 'error');
                });
            });
        }
    }
});

// Retrieves the CSRF token from cookies for secure API requests
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

// Enables inline editing of client names with validation and error handling
function InitialiseNameEditing() {
    document.querySelectorAll('.editable-name').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentName = this.querySelector('.item-name').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

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

// Manages client status changes with confirmation for removal actions
function InitialiseStatusEditing() {
    const statusCells = document.querySelectorAll('.editable-status');
    const statusDropdown = document.querySelector('.status-dropdown');
    let currentStatusCell = null;
    let previousStatus = null;

    async function saveStatus(newStatus) {
        if (!currentStatusCell) return;

        const id = currentStatusCell.closest('tr').dataset.id;
        const statusText = currentStatusCell.querySelector('.status-text');

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
                // Mark the client for deletion but keep it visible
                const row = currentStatusCell.closest('tr');
                row.dataset.markedForDeletion = 'true';
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

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

// Handles phone number editing with proper formatting and validation
function InitialisePhoneEditing() {
    document.querySelectorAll('.editable-phone').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentPhone = this.querySelector('.phone-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

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

// Manages email address editing with type validation and error handling
function InitialiseEmailEditing() {
    document.querySelectorAll('.editable-email').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentEmail = this.querySelector('.email-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

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

// Controls LinkedIn URL editing with link formatting and validation
function InitialiseLinkedInEditing() {
    document.querySelectorAll('.editable-linkedin').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentLinkedIn = this.querySelector('.linkedin-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

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

// Initialises the details toggle functionality
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
            
            // Toggle the details row
            if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
                detailsRow.style.display = 'table-row';
                row.classList.add('active');
                icon.classList.add('rotated');
                
                // Fetch and display details if they exist
                const detailsContent = detailsRow.querySelector('.details-content');
                if (detailsContent && !detailsContent.querySelector('.detail-item')) {
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

// Initialises the details editing functionality
function InitialiseDetailsEditing() {
    // Handle adding new details
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
            
            // Insert the new detail above the add button
            detailsContent.appendChild(newDetailItem);
            
            // Focus the new textarea
            const textarea = newDetailItem.querySelector('textarea');
            textarea.focus();
            
            // Adjust textarea height based on content
            const adjustTextareaHeight = () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
            };
            
            textarea.addEventListener('input', adjustTextareaHeight);
            
            // Handle saving the new detail
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
    
    // Handle editing existing details
    document.querySelectorAll('.detail-item').forEach(item => {
        item.addEventListener('click', handleDetailEdit);
    });
}

// Handles editing an existing detail
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
    
    // Adjust textarea height based on content
    const adjustTextareaHeight = () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    };
    
    adjustTextareaHeight();
    textarea.addEventListener('input', adjustTextareaHeight);
    
    const saveDetail = async () => {
        const newText = textarea.value.trim();
        if (newText) {
            // Get all detail items, including the one being edited
            const allDetailItems = Array.from(detailsContent.querySelectorAll('.detail-item'));
            const existingDetails = allDetailItems.map(item => {
                if (item === originalItem) {
                    return newText; // Use the new text for the edited item
                } else {
                    return item.querySelector('.detail-text')?.textContent || '';
                }
            }).filter(text => text.trim() !== ''); // Remove any empty details
            
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
            // If the text is empty, remove this detail
            originalItem.remove();
            // Update the database to remove this detail
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

// Implements search functionality across all client fields
function InitialiseSearch() {
    const searchInput = document.getElementById('clientSearchInput');
    console.log('Initialising search with input:', searchInput);
    
    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }

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
            
            const matches = name.includes(searchTerm) || 
                          phone.includes(searchTerm) || 
                          email.includes(searchTerm) || 
                          linkedin.includes(searchTerm) ||
                          status.includes(searchTerm) ||
                          details.includes(searchTerm);
            
            console.log('Row matches search:', matches, 'for client:', name);
            row.style.display = matches ? '' : 'none';
            
            if (detailsRow) {
                detailsRow.style.display = 'none';  // Always hide details row when searching
                const toggleButton = row.querySelector('.toggle-details i');
                if (toggleButton) {
                    toggleButton.classList.remove('bi-caret-down-fill');
                    toggleButton.classList.add('bi-caret-right-fill');
                }
            }
        });
    });
}

// Handles client status changes with appropriate confirmation dialogs
function handleStatusChange(clientId, newStatus) {
    if (newStatus === 'removed') {
        if (confirm('Are you sure you want to remove this client? This action cannot be undone.')) {
            updateClientStatus(clientId, newStatus);
        }
    } else {
        updateClientStatus(clientId, newStatus);
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

// Handle client deletion when leaving the page
window.addEventListener('beforeunload', function() {
    const removedClients = document.querySelectorAll('tr[data-marked-for-deletion="true"]');
    if (removedClients.length > 0) {
        // Send a request to delete all marked clients
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