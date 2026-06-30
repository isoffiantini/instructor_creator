document.addEventListener('DOMContentLoaded', () => {
    const app = {
        jsonData: null,
        steps: Parser.getSections(),
        currentCategory: 'assessment_tools',
        availableFiles: [],

        init() {
            this.setupEventListeners();
            this.loadInstructorList();
            Renderer.showContent(false);
        },

        setupEventListeners() {
            document.getElementById('categorySelect').addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.loadInstructorList();
            });

            document.getElementById('loadBtn').addEventListener('click', () => {
                this.loadSelectedInstructor();
            });

            document.getElementById('instructorSelect').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadSelectedInstructor();
                }
            });

            document.getElementById('fileInput').addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        },

        async loadInstructorList() {
            const select = document.getElementById('instructorSelect');
            const category = this.currentCategory;

            select.innerHTML = '<option value="">-- Loading... --</option>';
            select.disabled = true;

            try {
                const response = await fetch(`/api/instructors/${category}`);
                if (!response.ok) throw new Error(`Failed to load files from ${category}`);
                const files = await response.json();
                this.availableFiles = files;

                select.innerHTML = '';
                if (files.length === 0) {
                    select.innerHTML = '<option value="">-- No files found --</option>';
                } else {
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = '-- Select a file --';
                    select.appendChild(defaultOption);

                    files.forEach(file => {
                        const opt = document.createElement('option');
                        opt.value = file;
                        opt.textContent = file;
                        select.appendChild(opt);
                    });
                }
                select.disabled = false;
            } catch (error) {
                console.error('Error loading instructor list:', error);
                select.innerHTML = `
                    <option value="">-- Select a file --</option>
                    <option value="manual">Enter filename manually...</option>
                `;
                select.disabled = false;
            }
        },

        async loadSelectedInstructor() {
            const select = document.getElementById('instructorSelect');
            const filename = select.value;

            if (!filename) {
                Renderer.showStatus('Please select a file first', 'error');
                return;
            }

            if (filename === 'manual') {
                const customFile = prompt('Enter the filename from the instructors folder:');
                if (customFile) this.loadInstructorFile(customFile);
                return;
            }

            this.loadInstructorFile(filename);
        },

        async loadInstructorFile(filename) {
            const category = this.currentCategory;
            const filePath = `/instructors/${category}/${filename}`;

            try {
                Renderer.showStatus(`Loading ${filename}...`, 'info');
                const response = await fetch(filePath);
                if (!response.ok) throw new Error(`File not found: ${filename}`);
                const json = await response.json();
                this.processJSON(json, filename, category);
                Renderer.showStatus(`Loaded ${filename}`, 'success');
            } catch (error) {
                Renderer.showStatus(`Error loading file: ${error.message}`, 'error');
                console.error('Error:', error);
                try {
                    const response = await fetch(`/instructors/${filename}`);
                    if (response.ok) {
                        const json = await response.json();
                        this.processJSON(json, filename, 'root');
                        Renderer.showStatus(`Loaded ${filename}`, 'success');
                        return;
                    }
                } catch (e) { }
                Renderer.showStatus(`File not found. Use upload instead.`, 'error');
            }
        },

        handleFileUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    this.processJSON(json, file.name, 'custom-upload');
                    Renderer.showStatus(`Uploaded ${file.name}`, 'success');
                } catch (err) {
                    Renderer.showStatus(`Error parsing JSON: ${err.message}`, 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        },

        processJSON(jsonData, filename = 'unknown', category = 'unknown') {
            try {
                Parser.parseIntegrationData(jsonData);
                this.jsonData = jsonData;

                const fileInfo = document.createElement('div');
                fileInfo.className = 'file-info';
                fileInfo.innerHTML = `
                    <span class="label">File:</span>
                    <span><strong>${filename}</strong></span>
                    <span class="category-badge">${category}</span>
                `;

                const container = document.getElementById('contentContainer');
                const existingInfo = container.querySelector('.file-info');
                if (existingInfo) {
                    existingInfo.replaceWith(fileInfo);
                } else {
                    container.prepend(fileInfo);
                }

                Renderer.showContent(true);
                Navigation.init(Parser.rawJson, this.steps);
            } catch (error) {
                Renderer.showStatus(`Error processing JSON: ${error.message}`, 'error');
                console.error('Processing error:', error);
            }
        },

        setVendorName() {
            const input = document.getElementById('vendorNameInput');
            if (!input || !input.value.trim()) {
                Renderer.showStatus('Please enter a vendor name', 'warning');
                return;
            }
            Parser.setVendorName(input.value.trim());
            this.refreshCurrentSection();
            Renderer.showStatus(`Vendor set to "${Parser.getVendorName()}"`, 'success');
        },

        setIntegrationName() {
            const input = document.getElementById('integrationNameInput');
            if (!input || !input.value.trim()) {
                Renderer.showStatus('Please enter an integration name', 'warning');
                return;
            }
            Parser.setIntegrationName(input.value.trim());
            this.refreshCurrentSection();
            Renderer.showStatus(`Integration name set to "${input.value.trim()}"`, 'success');
        },

        showAddForm() {
            const form = document.getElementById('add-form-form');
            if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        },

        confirmAddForm() {
            const name = document.getElementById('new-form-name');
            const desc = document.getElementById('new-form-desc');
            if (!name || !name.value.trim()) {
                Renderer.showStatus('Please enter a form name', 'warning');
                return;
            }
            const formName = name.value.trim();
            Parser.addNewForm(formName, desc?.value?.trim() || '');
            document.getElementById('add-form-form').style.display = 'none';
            name.value = '';
            if (desc) desc.value = '';
            this.refreshCurrentSection();
            Renderer.showStatus(`Form "${formName}" added as new instruction`, 'success');
        },

        removeForm(virtualId) {
            if (!virtualId || !confirm('Remove this form and all its fields?')) return;
            Parser.removeForm(virtualId);
            this.refreshCurrentSection();
            Renderer.showStatus('Form removed', 'info');
        },

        addFormFieldToForm(virtualId) {
            const formEditor = document.querySelector(`.form-editor[data-virtual-id="${virtualId}"]`);
            if (formEditor) {
                const form = formEditor.querySelector('.add-field-to-form');
                if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
            }
        },

        confirmAddFormFieldToForm(virtualId, btn) {
            const formEditor = btn.closest('.form-editor');
            const labelInput = formEditor.querySelector('.ff-new-label');
            const typeSelect = formEditor.querySelector('.ff-new-type');
            if (!labelInput || !labelInput.value.trim()) {
                Renderer.showStatus('Please enter a field label', 'warning');
                return;
            }
            const options = {};
            if (typeSelect.value === 'SingleOptionDataset') {
                const datasetSelect = formEditor.querySelector('.ff-new-dataset');
                if (datasetSelect && datasetSelect.value) {
                    options.schemaSpecIdDataset = datasetSelect.value;
                }
            }
            Parser.addFormFieldToForm(virtualId, labelInput.value.trim(), typeSelect.value, options);
            formEditor.querySelector('.add-field-to-form').style.display = 'none';
            labelInput.value = '';
            this.refreshCurrentSection();
            Renderer.showStatus('Form field added', 'success');
        },

        removeFormFieldFromForm(virtualId, fieldNumber) {
            if (!confirm('Remove this form field?')) return;
            Parser.removeFormFieldFromForm(virtualId, fieldNumber);
            this.refreshCurrentSection();
            Renderer.showStatus('Form field removed', 'info');
        },

        addDatasetField(virtualId) {
            const editor = document.querySelector(`.dataset-editor[data-virtual-id="${virtualId}"]`);
            if (editor) {
                const form = editor.querySelector('.add-dataset-field-form');
                if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
            }
        },

        confirmAddDatasetField(virtualId, btn) {
            const editor = btn.closest('.dataset-editor');
            const labelInput = editor.querySelector('.ds-new-label');
            const typeSelect = editor.querySelector('.ds-new-type');
            if (!labelInput || !labelInput.value.trim()) {
                Renderer.showStatus('Please enter a field label', 'warning');
                return;
            }
            Parser.addDatasetField(virtualId, labelInput.value.trim(), typeSelect.value);
            editor.querySelector('.add-dataset-field-form').style.display = 'none';
            labelInput.value = '';
            this.refreshCurrentSection();
            Renderer.showStatus('Dataset field added', 'success');
        },

        removeDatasetField(virtualId, fieldNumber) {
            if (!confirm('Remove this dataset field?')) return;
            Parser.removeDatasetField(virtualId, fieldNumber);
            this.refreshCurrentSection();
            Renderer.showStatus('Dataset field removed', 'info');
        },

        showAddDataset() {
            const form = document.getElementById('add-dataset-form');
            if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        },

        confirmAddDataset() {
            const title = document.getElementById('new-dataset-title');
            if (!title || !title.value.trim()) {
                Renderer.showStatus('Please enter a dataset title', 'warning');
                return;
            }
            const dsTitle = title.value.trim();
            Parser.addNewDataset(dsTitle);
            document.getElementById('add-dataset-form').style.display = 'none';
            title.value = '';
            this.refreshCurrentSection();
            Renderer.showStatus(`Dataset "${dsTitle}" added as new instruction`, 'success');
        },

        removeDataset(virtualId) {
            if (!virtualId || !confirm('Remove this dataset?')) return;
            Parser.removeDataset(virtualId);
            this.refreshCurrentSection();
            Renderer.showStatus('Dataset removed', 'info');
        },

        showAddFlowForm() {
            const form = document.getElementById('add-flow-form');
            if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        },

        confirmAddFlow() {
            const code = document.getElementById('new-flow-code');
            const name = document.getElementById('new-flow-name');
            if (!code || !code.value.trim() || !name || !name.value.trim()) {
                Renderer.showStatus('Please enter both code and name', 'warning');
                return;
            }
            const result = Parser.addFlow(code.value.trim(), name.value.trim());
            if (!result) {
                Renderer.showStatus('Flow code already exists or integration not found', 'error');
                return;
            }
            document.getElementById('add-flow-form').style.display = 'none';
            code.value = '';
            name.value = '';
            this.refreshCurrentSection();
            Renderer.showStatus('Flow added', 'success');
        },

        removeFlow(code) {
            if (!confirm(`Remove flow "${code}"?`)) return;
            Parser.removeFlow(code);
            this.refreshCurrentSection();
            Renderer.showStatus('Flow removed', 'info');
        },

        showAddTriggerForm(flowCode) {
            const flowCard = document.querySelector(`.flow-card[data-flow-code="${flowCode}"]`);
            if (flowCard) {
                let form = flowCard.nextElementSibling;
                if (form && form.classList.contains('add-trigger-form')) {
                    form.style.display = form.style.display === 'none' ? 'block' : 'none';
                }
            }
        },

        addTriggerMapping(btn) {
            const form = btn.closest('.add-trigger-form');
            const labelInput = form.querySelector('.new-mapping-label');
            const requiredCheck = form.querySelector('.new-mapping-required');
            if (!labelInput || !labelInput.value.trim()) return;
            const list = form.querySelector('.trigger-mapping-list');
            const entry = document.createElement('div');
            entry.className = 'mapping-entry';
            entry.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;margin-top:4px;background:#f3f4f6;border-radius:4px;font-size:0.85rem;';
            entry.innerHTML = `
                <span style="flex:1;">${labelInput.value.trim()}${requiredCheck.checked ? ' <span class="required">*</span>' : ''}</span>
                <button onclick="this.parentElement.remove()" class="btn-icon danger" style="font-size:0.8rem;" title="Remove mapping">✕</button>
                <input type="hidden" class="mapping-label" value="${labelInput.value.trim()}" />
                <input type="hidden" class="mapping-required" value="${requiredCheck.checked ? 'true' : 'false'}" />
            `;
            list.appendChild(entry);
            labelInput.value = '';
            requiredCheck.checked = false;
            labelInput.focus();
        },

        confirmAddTrigger(flowCode, btn) {
            const form = btn.closest('.add-trigger-form');
            const nameInput = form.querySelector('.new-trigger-name');
            const typeSelect = form.querySelector('.new-trigger-type');
            const descInput = form.querySelector('.new-trigger-desc');
            if (!nameInput || !nameInput.value.trim()) {
                Renderer.showStatus('Please enter a trigger name', 'warning');
                return;
            }
            const mapping = [];
            const mappingEntries = form.querySelectorAll('.mapping-entry');
            mappingEntries.forEach(entry => {
                const label = entry.querySelector('.mapping-label')?.value;
                const required = entry.querySelector('.mapping-required')?.value === 'true';
                if (label) mapping.push({ label, required });
            });
            const trigger = {
                name: nameInput.value.trim(),
                type_id: parseInt(typeSelect.value),
                description: descInput?.value?.trim() || '',
                create_automatic_log_entries: true,
                create_automatic_journal_entries: true,
                mapping,
                entity_id: 2,
                entity_extension_id: 2
            };
            if (trigger.type_id === 3) {
                trigger.include_name = true;
            }
            if (trigger.type_id === 4) {
                trigger.mapping = [];
            }
            Parser.addTrigger(flowCode, trigger);
            form.style.display = 'none';
            nameInput.value = '';
            if (descInput) descInput.value = '';
            this.refreshCurrentSection();
            Renderer.showStatus('Trigger added', 'success');
        },

        removeTrigger(flowCode, triggerName) {
            if (!confirm(`Remove trigger "${triggerName}"?`)) return;
            Parser.removeTrigger(flowCode, triggerName);
            this.refreshCurrentSection();
            Renderer.showStatus('Trigger removed', 'info');
        },

        refreshCurrentSection() {
            const step = this.steps[Navigation.currentStep];
            if (!step) return;
            const data = Navigation.getSectionData(step.id);
            Renderer.renderSection(step, data);
        },

        exportJSON() {
            const json = Parser.getCustomizedJSON();
            const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const integration = Parser.getIntegrationItem();
            const vendorCode = integration?.code || Parser.getVendorName() || 'custom';
            a.href = url;
            a.download = `${vendorCode.toLowerCase().replace(/\s+/g, '_')}_assessment.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Renderer.showStatus('JSON downloaded!', 'success');
        }
    };

    window.App = app;
    app.init();
});
