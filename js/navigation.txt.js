// Navigation Module - Handles step navigation
const Navigation = {
    currentStep: 0,
    steps: [],
    data: null,

    init(data, steps) {
        this.data = data;
        this.steps = steps;
        this.currentStep = 0;
        this.setupEventListeners();
        this.goToStep(0);
    },

    setupEventListeners() {
        document.getElementById('prevBtn').addEventListener('click', () => this.previous());
        document.getElementById('nextBtn').addEventListener('click', () => this.next());
    },

    goToStep(index) {
        if (index < 0 || index >= this.steps.length) return;
        
        this.currentStep = index;
        const section = this.steps[index];
        const data = this.getSectionData(section.id);
        
        Renderer.renderSection(section, data);
        Renderer.renderStepIndicator(index, this.steps.length);
        Renderer.updateButtons(index, this.steps.length);
    },

    getSectionData(sectionId) {
        if (!this.data) return null;
        
        const instructions = this.data.instructions || [];
        
        switch(sectionId) {
            case 'datasets':
                return Parser.extractDatasets(instructions);
            case 'form':
                return Parser.extractForm(instructions);
            case 'imports':
                return Parser.extractImports(instructions);
            case 'integration':
                return Parser.extractIntegration(instructions);
            case 'triggers':
                return Parser.extractTriggers(instructions);
            default:
                return null;
        }
    },

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.goToStep(this.currentStep + 1);
        } else {
            Renderer.showStatus('✅ All components have been reviewed!', 'success');
        }
    },

    previous() {
        if (this.currentStep > 0) {
            this.goToStep(this.currentStep - 1);
        }
    },

    reset() {
        this.currentStep = 0;
        const steps = Parser.getSections();
        this.steps = steps;
        this.goToStep(0);
    }
};