// Renderer Module - Renders HTML for each section
const Renderer = {
    renderDatasets(data) {
        let html = '';
        
        html += `<div class="summary-grid">
            <div class="summary-item">
                <div class="number">${data.datasets.length}</div>
                <div class="label">Datasets Created</div>
            </div>
            <div class="summary-item">
                <div class="number">${data.statusValues.length}</div>
                <div class="label">Status Values</div>
            </div>
        </div>`;

        for (const dataset of data.datasets) {
            html += `<div style="margin-top: 16px;">
                <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 8px;">${dataset.name}</div>
                <ul class="field-list">
                    ${dataset.fields.map(f => `
                        <li>
                            <span>${f.label}</span>
                            <span class="field-type">${f.type}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>`;
        }

        if (data.statusValues.length > 0) {
            html += `<div style="margin-top: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px;">Assessment Status Values</div>
                <div class="status-values">
                    ${data.statusValues.map(s => `
                        <span class="status-tag">
                            <span class="code">${s.code}</span> → ${s.label}
                        </span>
                    `).join('')}
                </div>
            </div>`;
        }

        return html;
    },

    renderForm(data) {
        if (!data) return '<div class="status-message">No form data found</div>';
        
        let html = `<div style="margin-bottom: 12px;">
            <div style="font-weight: 600; font-size: 1.1rem;">${data.title}</div>
            <div style="color: #666; font-size: 0.95rem; margin-top: 4px;">${data.description}</div>
        </div>`;

        html += `<ul class="field-list">
            ${data.fields.map(f => `
                <li>
                    <span>
                        ${f.label}
                        ${f.required ? '<span style="color: #dc3545;">*</span>' : ''}
                        <span style="color: #888; font-size: 0.8rem; margin-left: 8px;">#${f.number}</span>
                    </span>
                    <span class="field-type">${f.type}</span>
                </li>
            `).join('')}
        </ul>`;

        return html;
    },

    renderImports(data) {
        if (!data || data.length === 0) return '<div class="status-message">No import services found</div>';

        let html = `<div class="summary-grid">
            <div class="summary-item">
                <div class="number">${data.length}</div>
                <div class="label">Import Services</div>
            </div>
            <div class="summary-item">
                <div class="number">${data.reduce((sum, d) => sum + d.columns, 0)}</div>
                <div class="label">Total Columns</div>
            </div>
        </div>`;

        for (const imp of data) {
            html += `<div class="card" style="margin-top: 12px;">
                <div class="card-title">${imp.name}</div>
                <div class="card-detail">${imp.description}</div>
                <div style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                    <span class="inline-code">${imp.columns} columns</span>
                    <span style="margin-left: 12px;">Dedup: ${Object.keys(imp.deduping).filter(k => imp.deduping[k]).join(', ') || 'None'}</span>
                </div>
            </div>`;
        }

        return html;
    },

    renderIntegration(data) {
        if (!data) return '<div class="status-message">No integration data found</div>';

        let html = `<div style="margin-bottom: 16px;">
            <div style="font-weight: 600; font-size: 1.1rem;">${data.name}</div>
            <div style="color: #666; font-size: 0.95rem;">${data.description}</div>
            <div style="margin-top: 8px;">
                <span class="inline-code">Code: ${data.code}</span>
                <span class="inline-code" style="margin-left: 12px;">${data.flows.length} flows</span>
            </div>
        </div>`;

        html += `<div style="font-weight: 600; margin-top: 16px; margin-bottom: 8px;">Flows</div>`;
        for (const flow of data.flows) {
            html += `<div class="flow-card">
                <div class="flow-name">${flow.name}</div>
                <div class="flow-code">${flow.code} · ${flow.type}</div>
                <div style="margin-top: 4px; font-size: 0.85rem; color: #666;">
                    ${flow.triggers.length} trigger${flow.triggers.length !== 1 ? 's' : ''}
                </div>
            </div>`;
        }

        if (data.parameters && data.parameters.length > 0) {
            html += `<div style="font-weight: 600; margin-top: 16px; margin-bottom: 8px;">Parameters</div>`;
            for (const param of data.parameters) {
                html += `<div class="card" style="margin-top: 4px;">
                    <div style="font-weight: 500;">${param.name}</div>
                    <div style="font-size: 0.85rem; color: #666;">
                        ${param.fields.map(f => f.label).join(' · ')}
                    </div>
                </div>`;
            }
        }

        return html;
    },

    renderTriggers(data) {
        if (!data || data.length === 0) return '<div class="status-message">No triggers found</div>';

        let html = `<div class="summary-grid">
            <div class="summary-item">
                <div class="number">${data.length}</div>
                <div class="label">Triggers</div>
            </div>
        </div>`;

        for (const trigger of data) {
            html += `<div class="trigger-item">
                <div class="trigger-name">${trigger.name}</div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
                    <span class="trigger-type">${trigger.type}</span>
                    <span style="font-size: 0.85rem; color: #888;">Flow: ${trigger.flow}</span>
                </div>
                ${trigger.description ? `<div style="font-size: 0.85rem; color: #666; margin-top: 4px;">${trigger.description}</div>` : ''}
                
                ${trigger.mapping && trigger.mapping.length > 0 ? `
                    <div style="font-weight: 500; margin-top: 8px; font-size: 0.9rem;">Mapping:</div>
                    <div class="mapping-grid">
                        ${trigger.mapping.map(m => `
                            <div class="mapping-item">
                                ${m.label}
                                ${m.required ? '<span class="required">*</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>`;
        }

        return html;
    },

    renderSection(section, data) {
        const container = document.getElementById('sectionsContainer');
        const title = document.getElementById('sectionTitle');
        
        let html = `<div class="section" id="section-${section.id}">`;
        html += `<div class="section-title">
            ${section.label}
            <span class="badge ${section.badge}">${section.id}</span>
        </div>`;

        switch(section.id) {
            case 'datasets':
                html += this.renderDatasets(data);
                break;
            case 'form':
                html += this.renderForm(data);
                break;
            case 'imports':
                html += this.renderImports(data);
                break;
            case 'integration':
                html += this.renderIntegration(data);
                break;
            case 'triggers':
                html += this.renderTriggers(data);
                break;
        }

        html += '</div>';
        container.innerHTML = html;
    },

    renderStepIndicator(currentStep, totalSteps) {
        const indicator = document.getElementById('stepIndicator');
        let html = '';
        for (let i = 0; i < totalSteps; i++) {
            const cls = i === currentStep ? 'active' : i < currentStep ? 'done' : '';
            html += `<div class="step-dot ${cls}"></div>`;
        }
        indicator.innerHTML = html;
    },

    updateButtons(currentStep, totalSteps) {
        document.getElementById('prevBtn').disabled = currentStep === 0;
        document.getElementById('nextBtn').textContent = currentStep === totalSteps - 1 ? '✅ Done' : 'Next →';
    },

    showStatus(message, type = 'info') {
        const el = document.getElementById('statusMessage');
        el.textContent = message;
        el.className = `status-message ${type} visible`;
        setTimeout(() => {
            el.className = 'status-message hidden';
        }, 5000);
    },

    showContent(show) {
        document.getElementById('contentContainer').className = show ? 'content visible' : 'content hidden';
        document.getElementById('emptyState').style.display = show ? 'none' : 'block';
    }
};