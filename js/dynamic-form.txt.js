// Dynamic Form Field Management
let fieldCount = 0;

// Initialize dynamic form when page loads
function initDynamicForm() {
    const wrapper = document.getElementById('fields-wrapper');
    if (wrapper && wrapper.children.length === 0) {
        // Start with 2 default fields
        addField();
        addField();
        showNotification('Form initialized with 2 fields', 'success');
    }
}

// Add a new field
function addField() {
    fieldCount++;
    const wrapper = document.getElementById('fields-wrapper');
    if (!wrapper) {
        console.error('Fields wrapper not found');
        return;
    }
    
    const div = document.createElement('div');
    div.className = 'field-group';
    div.dataset.fieldId = fieldCount;
    div.innerHTML = `
        <div class="field-number">${fieldCount}</div>
        <input 
            type="text" 
            name="dynamic_field_${fieldCount}" 
            placeholder="Enter field name..." 
            class="dynamic-field"
            required
        />
        <select class="field-type">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="email">Email</option>
            <option value="textarea">Text Area</option>
            <option value="date">Date</option>
            <option value="url">URL</option>
        </select>
        <button type="button" onclick="removeField(this)" class="remove-btn" title="Remove field">
            ✕
        </button>
    `;
    wrapper.appendChild(div);
    
    // Auto-focus the new field
    const input = div.querySelector('.dynamic-field');
    if (input) {
        setTimeout(() => input.focus(), 100);
    }
    
    // Update field numbers
    updateFieldNumbers();
}

// Remove a field
function removeField(button) {
    const fieldGroup = button.parentElement;
    const totalFields = document.querySelectorAll('.field-group').length;
    
    if (totalFields > 1) {
        // Animate removal
        fieldGroup.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            fieldGroup.remove();
            updateFieldNumbers();
            showNotification('Field removed', 'info');
        }, 300);
    } else {
        showNotification('At least one field is required', 'warning');
    }
}

// Update field numbers after removal
function updateFieldNumbers() {
    const fields = document.querySelectorAll('.field-group');
    fields.forEach((field, index) => {
        const numberDiv = field.querySelector('.field-number');
        if (numberDiv) {
            numberDiv.textContent = index + 1;
        }
        const input = field.querySelector('.dynamic-field');
        if (input) {
            input.name = `dynamic_field_${index + 1}`;
        }
    });
    fieldCount = fields.length;
}

// Get all form field data
function getFormFields() {
    const fields = [];
    const fieldGroups = document.querySelectorAll('.field-group');
    
    fieldGroups.forEach(group => {
        const input = group.querySelector('.dynamic-field');
        const type = group.querySelector('.field-type');
        if (input && input.value.trim()) {
            fields.push({
                id: parseInt(group.dataset.fieldId) || fields.length + 1,
                name: input.value.trim(),
                type: type ? type.value : 'text'
            });
        }
    });
    
    return fields;
}

// Get field values (for when fields are filled with data)
function getFieldValues() {
    const values = {};
    const fieldGroups = document.querySelectorAll('.field-group');
    
    fieldGroups.forEach(group => {
        const input = group.querySelector('.dynamic-field');
        const type = group.querySelector('.field-type');
        if (input) {
            const name = input.value.trim() || `field_${group.dataset.fieldId}`;
            values[name] = {
                value: input.value,
                type: type ? type.value : 'text'
            };
        }
    });
    
    return values;
}

// Show collected data (for testing)
function showFormData() {
    const fields = getFormFields();
    const values = getFieldValues();
    
    if (fields.length === 0) {
        showNotification('No fields have been added yet. Add some fields first!', 'warning');
        return;
    }
    
    const message = [
        '📊 Collected Form Data:',
        '─────────────────────',
        `Total Fields: ${fields.length}`,
        '',
        ...fields.map((f, i) => `${i+1}. ${f.name} (${f.type})`),
        '',
        'Field Values:',
        ...Object.entries(values).map(([key, val]) => `  ${key}: ${val.value || '(empty)'}`)
    ].join('\n');
    
    alert(message);
    showNotification(`Collected ${fields.length} field(s)`, 'success');
}

// Clear all fields
function clearAllFields() {
    if (confirm('Are you sure you want to clear all fields?')) {
        const wrapper = document.getElementById('fields-wrapper');
        if (wrapper) {
            wrapper.innerHTML = '';
            fieldCount = 0;
            // Add one default field
            addField();
            showNotification('All fields cleared', 'info');
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.classList.remove('hidden');
        
        // Clear any existing timeout
        if (window.notificationTimeout) {
            clearTimeout(window.notificationTimeout);
        }
        
        window.notificationTimeout = setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Add slideOut animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(30px);
        }
    }
`;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Try to initialize if container exists
    setTimeout(() => {
        const container = document.getElementById('dynamic-form-container');
        if (container) {
            initDynamicForm();
        }
    }, 500);
});

// Export functions for use in other scripts
window.addField = addField;
window.removeField = removeField;
window.getFormFields = getFormFields;
window.getFieldValues = getFieldValues;
window.showFormData = showFormData;
window.clearAllFields = clearAllFields;
window.initDynamicForm = initDynamicForm;
window.showNotification = showNotification;