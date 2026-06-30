const DynamicForm = {
    showNotification(message, type = 'info') {
        const el = document.getElementById('statusMessage');
        if (!el) return;
        el.textContent = message;
        el.className = `status-message ${type} visible`;
        if (window._notifTimer) clearTimeout(window._notifTimer);
        window._notifTimer = setTimeout(() => {
            el.className = 'status-message hidden';
        }, 3000);
    }
};

window.DynamicForm = DynamicForm;
