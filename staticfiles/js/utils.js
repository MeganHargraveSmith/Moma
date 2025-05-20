function showToast(message, type = 'success') {
    // Creates a toast notification to display messages to the user.
    const toastContainer = document.createElement('div');  // Creates a container for the toast.
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';  // Sets the position and padding for the toast container.
    toastContainer.style.zIndex = '5';  // Ensures the toast appears above other elements.
    
    const toast = document.createElement('div');  // Creates the toast element.
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;  // Sets the toast's appearance based on the type.
    toast.setAttribute('role', 'alert');  // Sets ARIA role for accessibility.
    toast.setAttribute('aria-live', 'assertive');  // Indicates that the toast is a live region.
    toast.setAttribute('aria-atomic', 'true');  // Ensures the entire toast is announced when it appears.
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button> 
        </div>
    `;
    
    toastContainer.appendChild(toast);  // Appends the toast to the container.
    document.body.appendChild(toastContainer);  // Appends the container to the body.
    
    const bsToast = new bootstrap.Toast(toast);  // Initializes Bootstrap toast functionality.
    bsToast.show();  // Displays the toast.
    
    toast.addEventListener('hidden.bs.toast', function() {
        toastContainer.remove();  // Removes the toast container from the DOM after it is hidden.
    });
} 