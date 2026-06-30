const Renderer = {
    renderOverview(data) {
        const vendorName = Parser.getVendorName();
        const integrationName = Parser.getIntegrationName();
        const forms = Parser.extractAllForms(Parser.rawJson?.instructions || []);
        const datasetData = Parser.extractDatasets(Parser.rawJson?.instructions || []);
        const importData = Parser.extractImports(Parser.rawJson?.instructions || []);
        const integrationData = Parser.extractIntegration(Parser.rawJson?.instructions || []);
        const triggerData = Parser.extractTriggers(Parser.rawJson?.instructions || []);

        const totalFormFields = forms.reduce((s, f) => s + f.fields.length, 0);

        let html = `
        <div class="overview-grid">
            <div class="vendor-name-section">
                <label style="font-weight: 700; display: block; margin-bottom: 6px;">Vendor Name <span style="font-weight:400;color:#888;">(auto camelCase)</span></label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="vendorNameInput" value="${this.esc(vendorName)}" placeholder="e.g. myVendor or My Vendor" class="vendor-input" />
                    <button onclick="App.setVendorName()" class="btn primary small">Set Vendor</button>
                </div>
                <div style="font-size:0.82rem;color:#888;margin-top:4px;">Used for integration user: <strong>${this.esc(Parser.toCamelCase ? Parser.toCamelCase(vendorName || 'vendor') : (vendorName || 'vendor').toLowerCase().replace(/\s+/g, ''))}.integration</strong></div>
            </div>
            <div class="vendor-name-section" style="margin-top:12px;">
                <label for="integrationNameInput" style="font-weight: 700; display: block; margin-bottom: 6px;">Integration Name <span style="font-weight:400;color:#888;">(any characters)</span></label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="integrationNameInput" value="${this.esc(integrationName)}" placeholder="e.g. My Custom Assessment Tool" class="vendor-input" />
                    <button onclick="App.setIntegrationName()" class="btn primary small">Set Name</button>
                </div>
            </div>
            <div class="summary-grid" style="margin-top: 16px;">
                <div class="summary-item">
                    <div class="number">${forms.length}</div>
                    <div class="label">Forms (${totalFormFields} fields)</div>
                </div>
                <div class="summary-item">
                    <div class="number">${datasetData.datasets.length}</div>
                    <div class="label">Datasets</div>
                </div>
                <div class="summary-item">
                    <div class="number">${importData.length}</div>
                    <div class="label">Import Services</div>
                </div>
                <div class="summary-item">
                    <div class="number">${integrationData?.flows?.length || 0}</div>
                    <div class="label">Integration Flows</div>
                </div>
                <div class="summary-item">
                    <div class="number">${triggerData.length}</div>
                    <div class="label">Triggers</div>
                </div>
            </div>
        </div>`;

        return html;
    },

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    toggleDatasetSelect(selectEl) {
        const row = selectEl.closest('.add-field-to-form').querySelector('.ff-dataset-row');
        if (row) {
            row.style.display = selectEl.value === 'SingleOptionDataset' ? 'block' : 'none';
        }
    },

    toggleTriggerMappingSection(selectEl) {
        const section = selectEl.closest('.add-trigger-form').querySelector('.trigger-mapping-section');
        if (section) {
            section.style.display = selectEl.value === '3' ? 'block' : 'none';
        }
    },

    renderForm(forms) {
        if (!forms || forms.length === 0) return '<div class="status-message">No forms found</div>';

        let html = `<div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
            <div style="font-weight: 600;">All Forms (${forms.length})</div>
            <button onclick="App.showAddForm()" class="btn primary small">+ Add Form</button>
        </div>`;

        for (const form of forms) {
            html += `<div class="form-editor" data-virtual-id="${this.esc(form.virtualId || '')}" style="margin-top: 16px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 700; font-size: 1.05rem;">${this.esc(form.title)}</div>
                        <div style="color: #666; font-size: 0.85rem;">${this.esc(form.description || '')}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="App.addFormFieldToForm('${this.esc(form.virtualId || '')}')" class="btn primary small">+ Add Field</button>
                        <button onclick="App.removeForm('${this.esc(form.virtualId || '')}')" class="btn-icon danger" title="Remove form">✕</button>
                    </div>
                </div>
                <ul class="field-list edit-mode">`;

            if (form.fields.length === 0) {
                html += '<li class="empty-small" style="list-style: none;">No fields defined.</li>';
            } else {
                for (const f of form.fields) {
                    html += `
                    <li class="editor-field-row" data-field-number="${f.number}">
                        <span class="drag-handle">⠿</span>
                        <span class="field-label-display">
                            ${this.esc(f.label)}
                            ${f.required ? '<span class="required">*</span>' : ''}
                            <span class="field-number-badge">#${f.number}</span>
                        </span>
                        <span class="field-type-badge">${f.type}</span>
                        <div class="field-actions">
                            <button onclick="App.removeFormFieldFromForm('${this.esc(form.virtualId || '')}', ${f.number})" class="btn-icon danger" title="Remove field">✕</button>
                        </div>
                    </li>`;
                }
            }

            const datasets = Parser.getAllDatasets ? Parser.getAllDatasets() : [];
            html += `</ul>
                <div class="add-field-to-form" style="display:none; margin-top: 8px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background: #f9fafb;">
                    <div style="display: grid; gap: 8px; grid-template-columns: 1fr 1fr auto;">
                        <input type="text" class="ff-new-label editor-input" placeholder="Field label..." />
                        <select class="ff-new-type editor-select" onchange="Renderer.toggleDatasetSelect(this)">
                            <option value="SingleLineText">Single Line Text</option>
                            <option value="MultiLineText">Multi Line Text</option>
                            <option value="Number">Number</option>
                            <option value="Date">Date</option>
                            <option value="URL">URL</option>
                            <option value="SingleOptionDataset">Single Option Dataset</option>
                        </select>
                        <div style="display: flex; gap: 4px;">
                            <button onclick="App.confirmAddFormFieldToForm('${this.esc(form.virtualId || '')}', this)" class="btn primary small">Add</button>
                            <button onclick="this.closest('.add-field-to-form').style.display='none'" class="btn secondary small">Cancel</button>
                        </div>
                    </div>
                    <div class="ff-dataset-row" style="display:none; margin-top: 8px; grid-template-columns: 1fr;">
                        <select class="ff-new-dataset editor-select" style="width:100%;">
                            <option value="">-- Select dataset --</option>
                            ${datasets.map(d => `<option value="${this.esc(d.virtualId)}">${this.esc(d.title)}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>`;
        }

        html += `
        <div id="add-form-form" style="display:none; margin-top: 16px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: #f9fafb;">
            <div style="font-weight: 600; margin-bottom: 10px;">New Form</div>
            <div style="display: grid; gap: 10px;">
                <input type="text" id="new-form-name" placeholder="Form name (e.g. Results)" class="editor-input" />
                <input type="text" id="new-form-desc" placeholder="Description (optional)" class="editor-input" />
                <div style="display: flex; gap: 6px;">
                    <button onclick="App.confirmAddForm()" class="btn primary small">Create Form</button>
                    <button onclick="document.getElementById('add-form-form').style.display='none'" class="btn secondary small">Cancel</button>
                </div>
            </div>
        </div>`;

        return html;
    },

    renderDatasets(data) {
        let html = `<div class="summary-grid">
            <div class="summary-item">
                <div class="number">${data.datasets.length}</div>
                <div class="label">Datasets Created</div>
            </div>
            <div class="summary-item">
                <div class="number">${data.statusValues.length}</div>
                <div class="label">Status Values</div>
            </div>
        </div>
        <div style="margin-top: 12px;">
            <button onclick="App.showAddDataset()" class="btn primary small">+ Add Dataset</button>
        </div>`;

        const allDatasets = Parser.getAllDatasets();

        for (const dataset of allDatasets) {
            html += `<div class="dataset-editor" data-virtual-id="${this.esc(dataset.virtualId)}" style="margin-top: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="font-weight: 600; font-size: 1.05rem;">${this.esc(dataset.title)}</div>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="App.addDatasetField('${this.esc(dataset.virtualId)}')" class="btn primary small">+ Add Field</button>
                        <button onclick="App.removeDataset('${this.esc(dataset.virtualId)}')" class="btn-icon danger" title="Remove dataset">✕</button>
                    </div>
                </div>
                <ul class="field-list edit-mode">`;

            for (const f of dataset.fields) {
                html += `
                <li class="editor-field-row" data-field-number="${f.field.fieldNumber}">
                    <span class="field-label-display">
                        ${this.esc(f.field.label)}
                        <span class="field-number-badge">#${f.field.fieldNumber}</span>
                    </span>
                    <span class="field-type-badge">${f.field.type}</span>
                    <div class="field-actions">
                        <button onclick="App.removeDatasetField('${this.esc(dataset.virtualId)}', ${f.field.fieldNumber})" class="btn-icon danger" title="Remove field">✕</button>
                    </div>
                </li>`;
            }

            html += `</ul>
                <div class="add-dataset-field-form" style="display:none; margin-top: 8px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background: #f9fafb;">
                    <div style="display: grid; gap: 8px; grid-template-columns: 1fr 1fr auto;">
                        <input type="text" class="ds-new-label editor-input" placeholder="Field label..." />
                        <select class="ds-new-type editor-select">
                            <option value="SingleLineText">Single Line Text</option>
                            <option value="Number">Number</option>
                            <option value="Date">Date</option>
                            <option value="SingleOptionDataset">Single Option Dataset</option>
                        </select>
                        <div style="display: flex; gap: 4px;">
                            <button onclick="App.confirmAddDatasetField('${this.esc(dataset.virtualId)}', this)" class="btn primary small">Add</button>
                            <button onclick="this.closest('.add-dataset-field-form').style.display='none'" class="btn secondary small">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        if (data.statusValues.length > 0) {
            html += `<div style="margin-top: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px;">Assessment Status Values</div>
                <div class="status-values">
                    ${data.statusValues.map(s => `
                        <span class="status-tag">
                            <span class="code">${this.esc(s.code)}</span> → ${this.esc(s.label)}
                        </span>
                    `).join('')}
                </div>
            </div>`;
        }

        html += `
        <div id="add-dataset-form" style="display:none; margin-top: 16px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: #f9fafb;">
            <div style="font-weight: 600; margin-bottom: 10px;">New Dataset</div>
            <div style="display: grid; gap: 10px; grid-template-columns: 1fr auto;">
                <input type="text" id="new-dataset-title" placeholder="Dataset title (e.g. Assessment Categories)" class="editor-input" />
                <div style="display: flex; gap: 6px;">
                    <button onclick="App.confirmAddDataset()" class="btn primary small">Create Dataset</button>
                    <button onclick="document.getElementById('add-dataset-form').style.display='none'" class="btn secondary small">Cancel</button>
                </div>
            </div>
        </div>`;

        return html;
    },

    renderImports(data) {
        if (!data || data.length === 0) return '<div class="status-message">No import services found</div>';

        const detail = Parser.getImportColumnsDetail();
        const formFields = Parser.getFormFieldsRef() || [];

        let html = `<div class="summary-grid">
            <div class="summary-item">
                <div class="number">${data.length}</div>
                <div class="label">Import Services</div>
            </div>
            <div class="summary-item">
                <div class="number">${detail.reduce((s, d) => s + d.columns.length, 0)}</div>
                <div class="label">Total Columns</div>
            </div>
        </div>`;

        for (const imp of detail) {
            const schemaCols = imp.columns.filter(c => c.type === 'schema');
            const builtinCols = imp.columns.filter(c => c.type === 'builtin');

            html += `<div class="card" style="margin-top: 12px;">
                <div class="card-title">${this.esc(imp.name)}</div>
                <div style="margin-top: 10px; font-size: 0.85rem; color: #666; font-weight: 600;">Built-in Columns (${builtinCols.length})</div>
                <div class="mapping-grid" style="margin-top: 6px;">
                    ${builtinCols.map(c => `
                        <div class="mapping-item builtin">
                            ${this.esc(c.name)}
                            ${c.required ? '<span class="required">*</span>' : ''}
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 10px; font-size: 0.85rem; color: #666; font-weight: 600;">Form Field Columns (${schemaCols.length})</div>
                <div class="mapping-grid" style="margin-top: 6px;">
                    ${schemaCols.map(c => {
                        const matched = formFields.find(ff => ff.field.fieldNumber === c.fieldNumber);
                        return `
                        <div class="mapping-item schema ${matched ? '' : 'orphan'}">
                            ${this.esc(c.name)}
                            ${c.required ? '<span class="required">*</span>' : ''}
                            ${matched ? '' : '<span class="orphan-badge">orphaned</span>'}
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        html += `<div style="margin-top: 12px; padding: 10px 14px; border-radius: var(--radius-sm); background: #f0f9ff; border: 1px solid #bae6fd; font-size: 0.85rem; color: #0369a1;">
            When form fields change, the import columns with matching field numbers update automatically. Orphaned fields (in red) have no matching form field.
        </div>`;

        return html;
    },

    renderIntegration(data) {
        if (!data) return '<div class="status-message">No integration data found</div>';

        let html = `<div style="margin-bottom: 16px;">
            <div style="font-weight: 600; font-size: 1.1rem;">${this.esc(data.name)}</div>
            <div style="color: #666; font-size: 0.95rem;">${this.esc(data.description)}</div>
            <div style="margin-top: 8px;">
                <span class="inline-code">Code: ${this.esc(data.code)}</span>
                <span class="inline-code" style="margin-left: 12px;">${data.flows.length} flows</span>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; margin-bottom: 8px;">
            <div style="font-weight: 600;">Flows</div>
            <button onclick="App.showAddFlowForm()" class="btn primary small">+ Add Flow</button>
        </div>`;

        for (const flow of data.flows) {
            html += `<div class="flow-card" data-flow-code="${this.esc(flow.code)}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div class="flow-name">${this.esc(flow.name)}</div>
                        <div class="flow-code">${this.esc(flow.code)} · ${flow.type}</div>
                    </div>
                    <button onclick="App.removeFlow('${this.esc(flow.code)}')" class="btn-icon danger" title="Remove flow">✕</button>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.85rem; color: #666;">
                    <span>${flow.triggers.length} trigger${flow.triggers.length !== 1 ? 's' : ''}</span>
                </div>
            </div>`;
        }

        const addFlowHtml = `
        <div id="add-flow-form" style="display:none; margin-top: 12px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: #f9fafb;">
            <div style="font-weight: 600; margin-bottom: 10px;">New Integration Flow</div>
            <div style="display: grid; gap: 10px; grid-template-columns: 1fr 1fr auto;">
                <input type="text" id="new-flow-code" placeholder="Flow code (e.g. syncData)" class="editor-input" />
                <input type="text" id="new-flow-name" placeholder="Flow name (e.g. Sync Data)" class="editor-input" />
                <div style="display: flex; gap: 4px;">
                    <button onclick="App.confirmAddFlow()" class="btn primary small">Add</button>
                    <button onclick="document.getElementById('add-flow-form').style.display='none'" class="btn secondary small">Cancel</button>
                </div>
            </div>
        </div>`;

        html += addFlowHtml;

        if (data.parameters && data.parameters.length > 0) {
            html += `<div style="font-weight: 600; margin-top: 16px; margin-bottom: 8px;">Parameters</div>`;
            for (const param of data.parameters) {
                html += `<div class="card" style="margin-top: 4px;">
                    <div style="font-weight: 500;">${this.esc(param.name)}</div>
                    <div style="font-size: 0.85rem; color: #666;">
                        ${param.fields.map(f => this.esc(f.label)).join(' · ')}
                    </div>
                </div>`;
            }
        }

        if (data.services && data.services.length > 0) {
            html += `<div style="font-weight: 600; margin-top: 16px; margin-bottom: 8px;">Services</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${data.services.map(s => `
                    <span class="service-tag">${this.esc(s.type)}: ${this.esc(s.code || s.type)}</span>
                `).join('')}
            </div>`;
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

        const integration = Parser.getIntegrationItem();
        const flows = integration?.flows || [];

        for (const flow of flows) {
            const triggers = flow.triggers || [];
            html += `<div class="flow-card" style="margin-top: 14px;" data-flow-code="${this.esc(flow.code)}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 700; font-size: 1.05rem;">${this.esc(flow.name)}</div>
                    <button onclick="App.showAddTriggerForm('${this.esc(flow.code)}')" class="btn primary small">+ Add Trigger</button>
                </div>
                <div class="flow-code" style="margin-top: 2px;">${this.esc(flow.code)}</div>`;

            if (triggers.length === 0) {
                html += `<div class="empty-small" style="margin-top: 10px;">No triggers on this flow</div>`;
            } else {
                for (const trigger of triggers) {
                    html += `
                    <div class="trigger-item" style="margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <div class="trigger-name">${this.esc(trigger.name)}</div>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
                                    <span class="trigger-type">${trigger.type_id === 3 ? 'Workflow Step Action' : trigger.type_id === 4 ? 'HTTP Endpoint' : 'Other'}</span>
                                </div>
                            </div>
                            <button onclick="App.removeTrigger('${this.esc(flow.code)}', '${this.esc(trigger.name)}')" class="btn-icon danger" title="Remove trigger">✕</button>
                        </div>
                        ${trigger.description ? `<div style="font-size: 0.85rem; color: #666; margin-top: 4px;">${this.esc(trigger.description)}</div>` : ''}
                        ${trigger.mapping && trigger.mapping.length > 0 ? `
                        <div style="font-weight: 500; margin-top: 8px; font-size: 0.9rem;">Mapping:</div>
                        <div class="mapping-grid">
                            ${trigger.mapping.map(m => `
                                <div class="mapping-item">
                                    ${this.esc(m.label)}
                                    ${m.required ? '<span class="required">*</span>' : ''}
                                </div>
                            `).join('')}
                        </div>` : ''}
                    </div>`;
                }
            }
            html += `</div>`;

            html += `
            <div class="add-trigger-form" style="display:none; margin-top: 12px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: #f9fafb;">
                <div style="font-weight: 600; margin-bottom: 10px;">New Trigger for <span class="flow-name-inline">${this.esc(flow.name)}</span></div>
                <div style="display: grid; gap: 10px;">
                    <input type="text" class="new-trigger-name editor-input" placeholder="Trigger name..." />
                    <select class="new-trigger-type editor-select" onchange="Renderer.toggleTriggerMappingSection(this)">
                        <option value="3">Workflow Step Action</option>
                        <option value="4">HTTP Endpoint</option>
                    </select>
                    <textarea class="new-trigger-desc editor-input" placeholder="Description..." rows="2"></textarea>
                    <div class="trigger-mapping-section" style="display:none; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px;">
                        <div style="font-weight: 600; margin-bottom: 6px; font-size: 0.9rem;">Mapping</div>
                        <div class="trigger-mapping-list"></div>
                        <div style="display: flex; gap: 6px; margin-top: 6px;">
                            <input type="text" class="new-mapping-label editor-input" placeholder="Label (e.g. candidateId)" style="flex:1;" />
                            <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;white-space:nowrap;">
                                <input type="checkbox" class="new-mapping-required" /> Required
                            </label>
                            <button onclick="App.addTriggerMapping(this)" class="btn primary small">+</button>
                        </div>
                    </div>
                    <div>
                        <button onclick="App.confirmAddTrigger('${this.esc(flow.code)}', this)" class="btn primary small">Add Trigger</button>
                        <button onclick="this.closest('.add-trigger-form').style.display='none'" class="btn secondary small">Cancel</button>
                    </div>
                </div>
            </div>`;
        }

        return html;
    },

    renderExport() {
        const vendorName = Parser.getVendorName();
        const forms = Parser.extractAllForms(Parser.rawJson?.instructions || []);
        const allDatasets = Parser.getAllDatasets();
        const integration = Parser.getIntegrationItem();
        const flowCount = integration?.flows?.length || 0;
        const triggerCount = integration?.flows?.reduce((s, f) => s + (f.triggers?.length || 0), 0) || 0;
        const instructionsCount = Parser.rawJson?.instructions?.length || 0;

        let html = `
        <div style="margin-bottom: 16px;">
            <div style="font-weight: 600; font-size: 1.1rem;">Integration Summary</div>
            <div style="color: #666; font-size: 0.95rem; margin-top: 4px;">Review your customized integration before exporting.</div>
        </div>
        <div class="summary-grid" style="margin-bottom: 16px;">
            <div class="summary-item">
                <div class="number">${this.esc(vendorName || 'Not set')}</div>
                <div class="label">Vendor</div>
            </div>
            <div class="summary-item">
                <div class="number">${forms.length}</div>
                <div class="label">Forms</div>
            </div>
            <div class="summary-item">
                <div class="number">${allDatasets.length}</div>
                <div class="label">Datasets</div>
            </div>
            <div class="summary-item">
                <div class="number">${flowCount}</div>
                <div class="label">Flows</div>
            </div>
            <div class="summary-item">
                <div class="number">${triggerCount}</div>
                <div class="label">Triggers</div>
            </div>
        </div>
        <div style="margin-bottom: 12px; padding: 10px 14px; border-radius: var(--radius-sm); background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 0.85rem; color: #166534;">
            The exported JSON contains <strong>${instructionsCount} instructions</strong> including all forms, datasets, import services, and the integration definition.
        </div>
        <div style="margin-top: 20px;">
            <button onclick="App.exportJSON()" class="btn primary" style="width: 100%; padding: 14px; font-size: 1.05rem;">
                ⬇ Download Customized JSON
            </button>
        </div>
        <div style="margin-top: 12px; padding: 10px 14px; border-radius: var(--radius-sm); background: #fef3c7; border: 1px solid #fde68a; font-size: 0.85rem; color: #92400e;">
            The JSON file will include all your customizations: vendor name, forms, datasets, flows, and triggers as separate instructions.
        </div>`;

        return html;
    },

    renderSection(section, data) {
        const container = document.getElementById('sectionsContainer');

        let html = `<div class="section" id="section-${section.id}">`;
        html += `<div class="section-title">
            ${section.label}
            <span class="badge ${section.badge}">${section.id}</span>
        </div>`;

        switch(section.id) {
            case 'overview':
                html += this.renderOverview(data);
                break;
            case 'form':
                html += this.renderForm(data);
                break;
            case 'datasets':
                html += this.renderDatasets(data);
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
            case 'export':
                html += this.renderExport(data);
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
            const dots = Parser.getSections();
            const label = dots[i]?.label?.replace(/[^a-zA-Z ]/g, '').trim() || '';
            html += `<div class="step-dot ${cls}" title="${label}"></div>`;
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
