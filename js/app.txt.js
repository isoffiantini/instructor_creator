// Main Application
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
            // Category change
            document.getElementById('categorySelect').addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.loadInstructorList();
            });

            // Load button
            document.getElementById('loadBtn').addEventListener('click', () => {
                this.loadSelectedInstructor();
            });

            // Enter key on select
            document.getElementById('instructorSelect').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadSelectedInstructor();
                }
            });

            // File upload
            document.getElementById('fileInput').addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        },

        async loadInstructorList() {
            const select = document.getElementById('instructorSelect');
            const category = this.currentCategory;
            
            // Clear existing options
            select.innerHTML = '<option value="">-- Loading... --</option>';
            select.disabled = true;

            try {
                // Fetch the list of files from the server
                const response = await fetch(`/api/instructors/${category}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to load files from ${category}`);
                }
                
                const files = await response.json();
                this.availableFiles = files;
                
                // Populate select
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
                // Fallback: Show manual entry option
                select.innerHTML = `
                    <option value="">-- Select a file --</option>
                    <option value="manual">📝 Enter filename manually...</option>
                    <option value="refresh">🔄 Refresh list</option>
                `;
                select.disabled = false;
                
                // Add refresh handler
                select.addEventListener('change', (e) => {
                    if (e.target.value === 'refresh') {
                        this.loadInstructorList();
                    }
                });
                
                // Also try to list files using a different method
                this.loadInstructorListFallback();
            }
        },

        loadInstructorListFallback() {
            // Try using a directory listing or predefined list
            const select = document.getElementById('instructorSelect');
            
            // You can hardcode known files for development
            const knownFiles = [
                'default-assessment.json',
                'sample-integration.json'
            ];
            
            // Only add if select is empty or has only the default options
            if (select.options.length <= 2) {
                knownFiles.forEach(file => {
                    // Check if file already exists in options
                    let exists = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === file) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        const opt = document.createElement('option');
                        opt.value = file;
                        opt.textContent = file;
                        select.appendChild(opt);
                    }
                });
            }
        },

        async loadSelectedInstructor() {
            const select = document.getElementById('instructorSelect');
            const filename = select.value;
            
            if (!filename || filename === '-- Select a file --') {
                Renderer.showStatus('Please select a file first', 'error');
                return;
            }

            if (filename === 'manual') {
                const customFile = prompt('Enter the filename from the instructors folder:');
                if (customFile) {
                    this.loadInstructorFile(customFile);
                }
                return;
            }

            if (filename === 'refresh') {
                this.loadInstructorList();
                return;
            }

            this.loadInstructorFile(filename);
        },

        async loadInstructorFile(filename) {
            const category = this.currentCategory;
            const filePath = `/instructors/${category}/${filename}`;
            
            try {
                Renderer.showStatus(`Loading ${filename} from ${category}...`, 'info');
                const response = await fetch(filePath);
                
                if (!response.ok) {
                    throw new Error(`File not found: ${filename} in ${category}`);
                }
                
                const json = await response.json();
                this.processJSON(json, filename, category);
                Renderer.showStatus(`✅ Successfully loaded ${filename} from ${category}`, 'success');
            } catch (error) {
                Renderer.showStatus(`❌ Error loading file: ${error.message}`, 'error');
                console.error('Error:', error);
                
                // Try alternative path
                this.tryAlternativePath(filename);
            }
        },

        async tryAlternativePath(filename) {
            // Try without category prefix
            try {
                const response = await fetch(`/instructors/${filename}`);
                if (response.ok) {
                    const json = await response.json();
                    this.processJSON(json, filename, 'root');
                    Renderer.showStatus(`✅ Loaded ${filename} from root instructors folder`, 'success');
                    return;
                }
            } catch (e) {
                // Continue to error
            }
            
            // If all fails, offer manual upload
            Renderer.showStatus(
                `File not found. Please use the "Upload Custom JSON" option to load ${filename}`,
                'error'
            );
        },

        handleFileUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    this.processJSON(json, file.name, 'custom-upload');
                    Renderer.showStatus(`✅ Successfully uploaded ${file.name}`, 'success');
                } catch (err) {
                    Renderer.showStatus(`❌ Error parsing JSON: ${err.message}`, 'error');
                }
            };
            reader.readAsText(file);
            
            // Reset the input so the same file can be selected again
            e.target.value = '';
        },

        processJSON(jsonData, filename = 'unknown', category = 'unknown') {
            try {
                this.jsonData = Parser.parseIntegrationData(jsonData);
                
                // Show file info
                const fileInfo = document.createElement('div');
                fileInfo.className = 'file-info';
                fileInfo.innerHTML = `
                    <span class="label">📄 Current File:</span>
                    <span><strong>${filename}</strong></span>
                    <span class="category-badge">${category}</span>
                `;
                
                // Add to top of content
                const container = document.getElementById('contentContainer');
                const existingInfo = container.querySelector('.file-info');
                if (existingInfo) {
                    existingInfo.replaceWith(fileInfo);
                } else {
                    container.prepend(fileInfo);
                }
                
                Renderer.showContent(true);
                Navigation.init(this.jsonData, this.steps);
            } catch (error) {
                Renderer.showStatus(`❌ Error processing JSON: ${error.message}`, 'error');
                console.error('Processing error:', error);
            }
        }
    };

    // Initialize the app
    app.init();

    // Expose for debugging
    window.app = app;
});