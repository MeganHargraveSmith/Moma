// Initialises all bookkeeping functionality when the page loads
document.addEventListener('DOMContentLoaded', function() {
    InitialiseDocNumberEditing();
    InitialiseBusinessEditing();
    InitialiseDateEditing();
    InitialiseAmountEditing();
    InitialiseDocumentUpload();
    InitialiseDocumentViewer();
    InitialiseSearch();
    InitialiseAddRecord();
    updateTotals(); // Initial calculation of totals

    const deleteButton = document.getElementById('deleteSelectedRecords');
    const deleteCheckboxes = document.querySelectorAll('.delete-checkbox');
    const deleteConfirmationModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    const confirmDeleteButton = document.getElementById('confirmDelete');
    const dontShowAgainCheckbox = document.getElementById('dontShowAgain');
    let selectedRecords = new Set();

    // Initialises the delete button state based on checked checkboxes
    function updateDeleteButtonState() {
        const checkedCheckboxes = document.querySelectorAll('.delete-checkbox:checked');
        selectedRecords.clear();
        checkedCheckboxes.forEach(checkbox => {
            selectedRecords.add(checkbox.dataset.id);
        });
        deleteButton.disabled = selectedRecords.size === 0;
    }

    // Initial check for any pre-checked boxes
    updateDeleteButtonState();

    // Handle checkbox changes
    deleteCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                selectedRecords.add(this.dataset.id);
            } else {
                selectedRecords.delete(this.dataset.id);
            }
            deleteButton.disabled = selectedRecords.size === 0;
        });
    });

    // Handle delete button click
    deleteButton.addEventListener('click', function() {
        if (selectedRecords.size === 0) {
            showToast('Please select at least one record to delete', 'error');
            return;
        }

        const dontShowAgain = localStorage.getItem('dontShowDeleteConfirmation') === 'true';
        
        if (dontShowAgain) {
            deleteSelectedRecords();
        } else {
            deleteConfirmationModal.show();
        }
    });

    // Handle confirmation modal checkbox
    dontShowAgainCheckbox.addEventListener('change', function() {
        localStorage.setItem('dontShowDeleteConfirmation', this.checked);
    });

    // Handle confirm delete button
    confirmDeleteButton.addEventListener('click', function() {
        deleteSelectedRecords();
        deleteConfirmationModal.hide();
    });

    // Function to delete selected records
    function deleteSelectedRecords() {
        const recordsToDelete = Array.from(selectedRecords);
        
        fetch('/api/delete_bookkeeping_records/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                record_ids: recordsToDelete
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the rows from the table
                recordsToDelete.forEach(id => {
                    const row = document.querySelector(`tr[data-id="${id}"]`);
                    if (row) {
                        row.remove();
                    }
                });
                
                // Reset selection
                selectedRecords.clear();
                deleteButton.disabled = true;
                
                // Update totals
                updateTotals();
                
                // Show success message
                showToast('Records deleted successfully');
            } else {
                showToast('Error deleting records: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error deleting records', 'error');
        });
    }
});

// Refreshes the bookkeeping table by fetching new data
function refreshBookkeeping() {
    fetch('/bookkeeping/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch records');
        }
        return response.text();
    })
    .then(html => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const newTbody = tempDiv.querySelector('#bookkeepingTable tbody');
        if (newTbody) {
            const currentTbody = document.querySelector('#bookkeepingTable tbody');
            currentTbody.innerHTML = newTbody.innerHTML;
            
            // Reinitialises all event listeners after refresh
            InitialiseDocNumberEditing();
            InitialiseBusinessEditing();
            InitialiseDateEditing();
            InitialiseAmountEditing();
            InitialiseDocumentUpload();
            InitialiseDocumentViewer();
            InitialiseSearch();
            InitialiseAddRecord();
        }
    })
    .catch(error => {
        console.error('Error refreshing bookkeeping:', error);
    });
}

// Enables inline editing of document numbers
function InitialiseDocNumberEditing() {
    document.querySelectorAll('.editable-doc-number').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentValue = this.querySelector('.doc-number-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

            const docNumberInput = document.createElement('input');
            docNumberInput.type = 'text';
            docNumberInput.maxLength = '100';
            docNumberInput.value = currentValue || '';
            docNumberInput.className = 'form-control';
            docNumberInput.style.width = '50%';
            docNumberInput.style.minWidth = '0';

            this.innerHTML = '';
            this.appendChild(docNumberInput);
            docNumberInput.focus();

            const saveDocNumber = async () => {
                const newValue = docNumberInput.value.trim();

                try {
                    const response = await fetch('/api/update_bookkeeping/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify({
                            id: id,
                            document_number: newValue
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update document number');
                    }

                    const data = await response.json();
                    if (data.success) {
                        cell.innerHTML = `<span class="doc-number-text text-truncate d-inline-block" style="max-width: 100%; vertical-align: middle;">${newValue}</span>`;
                    } else {
                        throw new Error(data.error || 'Failed to update document number');
                    }
                } catch (error) {
                    console.error('Error updating document number:', error);
                    cell.innerHTML = `<span class="doc-number-text text-truncate d-inline-block" style="max-width: 100%; vertical-align: middle;">${currentValue}</span>`;
                    alert('Failed to update document number. Please try again.');
                }
            };

            docNumberInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveDocNumber();
                }
            });

            docNumberInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cell.innerHTML = `<span class="doc-number-text text-truncate d-inline-block" style="max-width: 100%; vertical-align: middle;">${currentValue}</span>`;
                }
            });

            docNumberInput.addEventListener('blur', () => {
                if (document.body.contains(docNumberInput)) {
                    saveDocNumber();
                }
            });
        });
    });
}

// Enables inline editing of business names
function InitialiseBusinessEditing() {
    document.querySelectorAll('.editable-business').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentValue = this.querySelector('.business-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

            const businessInput = document.createElement('input');
            businessInput.type = 'text';
            businessInput.maxLength = '100';
            businessInput.value = currentValue || '';
            businessInput.className = 'form-control';
            businessInput.style.width = '50%';
            businessInput.style.minWidth = '0';

            this.innerHTML = '';
            this.appendChild(businessInput);
            businessInput.focus();

            const saveBusiness = async () => {
                const newValue = businessInput.value.trim();

                try {
                    const response = await fetch('/api/update_bookkeeping/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify({
                            id: id,
                            business: newValue
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update business name');
                    }

                    const data = await response.json();
                    if (data.success) {
                        cell.innerHTML = `<span class="business-text text-truncate d-inline-block" style="max-width: 100%; vertical-align: middle;">${newValue}</span>`;
                    } else {
                        throw new Error(data.error || 'Failed to update business name');
                    }
                } catch (error) {
                    console.error('Error updating business name:', error);
                    cell.innerHTML = `<span class="business-text text-truncate d-inline-block" style="max-width: 100%; vertical-align: middle;">${currentValue}</span>`;
                    alert('Failed to update business name. Please try again.');
                }
            };

            businessInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveBusiness();
                }
            });

            businessInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cell.innerHTML = `<span class="business-text text-truncate d-inline-block" style="max-width: 100%; vertical-align: middle;">${currentValue}</span>`;
                }
            });

            businessInput.addEventListener('blur', () => {
                if (document.body.contains(businessInput)) {
                    saveBusiness();
                }
            });
        });
    });
}

// Manages date editing with validation
function InitialiseDateEditing() {
    document.querySelectorAll('.editable-invoice-date, .editable-payment-date').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentDate = this.querySelector('.date-text').textContent;
            const isInvoiceDate = this.classList.contains('editable-invoice-date');
            const id = this.closest('tr').dataset.id;
            const cell = this;

            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.value = currentDate ? formatDateForInput(currentDate) : '';
            dateInput.className = 'form-control';
            dateInput.style.width = '100%';
            dateInput.style.minWidth = '0';

            this.innerHTML = '';
            this.appendChild(dateInput);
            dateInput.focus();

            const saveDate = async () => {
                const newDate = dateInput.value;
                if (!newDate && !isInvoiceDate) {
                    alert('Payment date cannot be empty');
                    cell.innerHTML = `<span class="date-text">${currentDate}</span>`;
                    return;
                }

                try {
                    const response = await fetch('/api/update_bookkeeping/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify({
                            id: id,
                            [isInvoiceDate ? 'invoice_date' : 'payment_date']: newDate || null
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update date');
                    }

                    const data = await response.json();
                    if (data.success) {
                        cell.innerHTML = `<span class="date-text text-truncate d-inline-block" style="max-width: 100%;">${newDate ? formatDateForDisplay(newDate) : ''}</span>`;
                    } else {
                        throw new Error(data.error || 'Failed to update date');
                    }
                } catch (error) {
                    console.error('Error updating date:', error);
                    cell.innerHTML = `<span class="date-text">${currentDate}</span>`;
                    alert('Failed to update date. Please try again.');
                }
            };

            dateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveDate();
                }
            });

            dateInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cell.innerHTML = `<span class="date-text">${currentDate}</span>`;
                }
            });

            dateInput.addEventListener('blur', () => {
                if (document.body.contains(dateInput)) {
                    saveDate();
                }
            });
        });
    });
}

// Enables inline editing of amounts
function InitialiseAmountEditing() {
    document.querySelectorAll('.editable-amount').forEach(cell => {
        cell.addEventListener('click', function() {
            const currentValue = this.querySelector('.amount-text').textContent;
            const id = this.closest('tr').dataset.id;
            const cell = this;

            const amountInput = document.createElement('input');
            amountInput.type = 'number';
            amountInput.step = '0.01';
            amountInput.min = '0.01';
            amountInput.value = currentValue || '';
            amountInput.className = 'form-control';
            amountInput.style.width = '100%';
            amountInput.style.minWidth = '0';

            this.innerHTML = '';
            this.appendChild(amountInput);
            amountInput.focus();

            const saveAmount = async () => {
                const newValue = amountInput.value.trim();
                if (newValue === '') {
                    alert('Amount cannot be empty');
                    cell.innerHTML = `<span class="amount-text">${currentValue}</span>`;
                    return;
                }

                const numericValue = parseFloat(newValue);
                if (isNaN(numericValue) || numericValue <= 0) {
                    alert('Please enter a valid amount greater than 0');
                    cell.innerHTML = `<span class="amount-text">${currentValue}</span>`;
                    return;
                }

                try {
                    const response = await fetch('/api/update_bookkeeping/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify({
                            id: id,
                            amount: numericValue
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update amount');
                    }

                    const data = await response.json();
                    if (data.success) {
                        cell.innerHTML = `<span class="amount-text text-truncate d-inline-block" style="max-width: 100%; vertical-align: middle;">${numericValue.toFixed(2)}</span>`;
                        updateTotals(); // Update totals after amount change
                    } else {
                        throw new Error(data.error || 'Failed to update amount');
                    }
                } catch (error) {
                    console.error('Error updating amount:', error);
                    cell.innerHTML = `<span class="amount-text">${currentValue}</span>`;
                    alert('Failed to update amount. Please try again.');
                }
            };

            amountInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveAmount();
                }
            });

            amountInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cell.innerHTML = `<span class="amount-text">${currentValue}</span>`;
                }
            });

            amountInput.addEventListener('blur', () => {
                if (document.body.contains(amountInput)) {
                    saveAmount();
                }
            });
        });
    });
}

// Handles document upload functionality
function InitialiseDocumentUpload() {
    document.querySelectorAll('.upload-button').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.closest('tr').dataset.id;
            const cell = this.closest('.document');
            
            // Check if there's already a document
            if (cell.querySelector('.document-link')) {
                alert('A document has already been uploaded for this record. Please delete the existing document before uploading a new one.');
                return;
            }
            
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf,.png,.jpg,.jpeg,.docx';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files[0];
                if (!file) return;
                
                // Validate file size (10MB = 10 * 1024 * 1024 bytes)
                const maxSize = 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                    alert(`The selected file (${fileSizeMB}MB) exceeds the maximum allowed size of 10MB. Please choose a smaller file.`);
                    // Clear the file input to allow selecting a new file
                    fileInput.value = '';
                    return;
                }
                
                // Validate file type
                const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                if (!validTypes.includes(file.type)) {
                    alert('Please select a valid file type (PDF, PNG, JPG, or DOCX)');
                    fileInput.value = '';
                    return;
                }
                
                const formData = new FormData();
                formData.append('id', id);
                formData.append('document', file);
                
                try {
                    const response = await fetch('/api/upload_bookkeeping_document/', {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: formData
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        cell.innerHTML = `
                            <a href="#" class="document-link" data-bs-toggle="modal" data-bs-target="#documentViewerModal" data-document-url="${data.converted_pdf_url}">
                                <span class="document-text" style="display: block; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
                            </a>
                        `;
                        InitialiseDocumentViewer();
                    } else {
                        alert(data.error || 'Failed to upload document');
                    }
                } catch (error) {
                    console.error('Error uploading document:', error);
                    alert('Failed to upload document');
                }
                
                document.body.removeChild(fileInput);
            });
            
            fileInput.click();
        });
    });
}

// Initialises document viewer functionality
function InitialiseDocumentViewer() {
    const documentLinks = document.querySelectorAll('.document-link');
    const documentFrame = document.getElementById('documentFrame');
    
    documentLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const documentUrl = this.dataset.documentUrl;
            
            // Always use the PDF version
            documentFrame.style.display = 'block';
            documentFrame.src = documentUrl;
        });
    });
    
    // Clear content when modal is closed
    const documentViewerModal = document.getElementById('documentViewerModal');
    documentViewerModal.addEventListener('hidden.bs.modal', function() {
        documentFrame.src = '';
    });
}

// Implements search functionality
function InitialiseSearch() {
    const searchInput = document.getElementById('bookkeepingSearchInput');
    if (!searchInput) return;

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
        const rows = document.querySelectorAll('#bookkeepingTable tbody tr');
        
        if (searchTerm === '') {
            rows.forEach(row => {
                row.style.display = '';
            });
            return;
        }

        let monthNumber = null;
        if (monthMap[searchTerm]) {
            monthNumber = monthMap[searchTerm];
        }
        
        rows.forEach(row => {
            const docNumber = row.querySelector('.document-number .editable')?.textContent?.toLowerCase() || '';
            const business = row.querySelector('.business .editable')?.textContent?.toLowerCase() || '';
            const amount = row.querySelector('.amount .editable')?.textContent?.toLowerCase() || '';
            const invoiceDate = row.querySelector('.invoice-date .editable')?.textContent?.toLowerCase() || '';
            const paymentDate = row.querySelector('.payment-date .editable')?.textContent?.toLowerCase() || '';
            
            let matches = docNumber.includes(searchTerm) || 
                         business.includes(searchTerm) || 
                         amount.includes(searchTerm);

            if (monthNumber) {
                const invoiceMonth = invoiceDate.split('-')[1];
                const paymentMonth = paymentDate.split('-')[1];
                matches = matches || invoiceMonth === monthNumber || paymentMonth === monthNumber;
            }
            
            row.style.display = matches ? '' : 'none';
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

// Handles adding new records
function InitialiseAddRecord() {
    const addButton = document.getElementById('addBookkeepingRecord');
    if (!addButton) return;

    addButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/create_bookkeeping/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    document_number: '',
                    business: '',
                    invoice_date: null,
                    payment_date: null,
                    amount: null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create new record');
            }

            const data = await response.json();
            if (data.success) {
                // Create the new row HTML
                const newRow = document.createElement('tr');
                newRow.className = 'bookkeeping-row';
                newRow.dataset.id = data.record_id;
                newRow.innerHTML = `
                    <td class="delete-cell" style="width: 8%; text-align: center; vertical-align: middle;">
                        <div class="form-check d-flex justify-content-center">
                            <input class="form-check-input delete-checkbox" type="checkbox" data-id="${data.record_id}">
                        </div>
                    </td>
                    <td class="document" data-id="${data.record_id}" style="width: 14%; text-align: left; padding-left: 20px;">
                        <button class="btn btn-link p-0 upload-button" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Upload a Receipt or Invoice">
                            <i class="bi bi-upload" style="font-size: 28px; color: black;"></i>
                        </button>
                    </td>
                    <td class="editable-doc-number" data-id="${data.record_id}" style="text-align: left;">
                        <span class="doc-number-text text-truncate d-inline-block" style="max-width: 100%;"></span>
                    </td>
                    <td class="editable-business" data-id="${data.record_id}" style="text-align: left;">
                        <span class="business-text text-truncate d-inline-block" style="max-width: 100%;"></span>
                    </td>
                    <td class="editable-invoice-date" data-id="${data.record_id}" style="text-align: left;">
                        <span class="date-text text-truncate d-inline-block" style="max-width: 100%;"></span>
                    </td>
                    <td class="editable-payment-date" data-id="${data.record_id}" style="text-align: left;">
                        <span class="date-text text-truncate d-inline-block" style="max-width: 100%;"></span>
                    </td>
                    <td class="editable-amount" data-id="${data.record_id}" style="text-align: left;">
                        <span class="amount-text text-truncate d-inline-block" style="max-width: 100%;"></span>
                    </td>
                `;

                // Add the new row to the table
                const tbody = document.querySelector('#bookkeepingTable tbody');
                tbody.appendChild(newRow);

                // Initialise event listeners for the new row
                InitialiseDocNumberEditing();
                InitialiseBusinessEditing();
                InitialiseDateEditing();
                InitialiseAmountEditing();
                InitialiseDocumentUpload();
                InitialiseDocumentViewer();
                InitialiseSearch();

                // Update totals
                updateTotals();

                // Scroll to the new row with a slight delay to ensure the DOM is updated
                setTimeout(() => {
                    const container = document.querySelector('.main-container');
                    const rowTop = newRow.offsetTop;
                    const containerHeight = container.clientHeight;
                    const scrollPosition = rowTop - containerHeight + newRow.offsetHeight;
                    
                    container.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                }, 100);

                // Show success message
                showToast('New record created successfully');
            } else {
                showToast('Failed to create new record', 'error');
            }
        } catch (error) {
            console.error('Error creating record:', error);
            showToast('Failed to create new record', 'error');
        }
    });
}

// Utility functions
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

// Helper function to show toast messages
function showToast(message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', function() {
        toastContainer.remove();
    });
}

// Calculates and updates the totals in the summary row
function updateTotals() {
    const rows = document.querySelectorAll('.bookkeeping-row');
    const totalRecords = rows.length;
    let totalExpenditure = 0;

    rows.forEach(row => {
        const amountText = row.querySelector('.amount-text').textContent;
        if (amountText) {
            totalExpenditure += parseFloat(amountText) || 0;
        }
    });

    document.getElementById('totalRecords').textContent = totalRecords;
    document.getElementById('totalExpenditure').textContent = totalExpenditure.toFixed(2);
} 