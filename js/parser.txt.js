// Parser Module - Extracts data from JSON
const Parser = {
    parseIntegrationData(json) {
        return typeof json === 'string' ? JSON.parse(json) : json;
    },

    extractDatasets(instructions) {
        const datasets = [];
        const statusValues = [];

        for (const instruction of instructions) {
            if (instruction.driver === 'configmanagement' && instruction.input) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.dataset.spec') {
                        datasets.push({
                            name: item.data.spec.title,
                            fields: item.data.spec.fields.map(f => ({
                                number: f.field.fieldNumber,
                                label: f.field.label,
                                type: f.field.type
                            })),
                            id: item.virtualId
                        });
                    }
                }
            }
            if (instruction.driver === 'datasetmanagement' && instruction.input?.value) {
                const values = instruction.input.value;
                const entries = Object.entries(values);
                if (entries.length > 0) {
                    const [code, label] = entries[0];
                    statusValues.push({ code, label });
                }
            }
        }

        return { datasets, statusValues };
    },

    extractForm(instructions) {
        for (const instruction of instructions) {
            if (instruction.driver === 'configmanagement' && instruction.input) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.form.libraryitem') {
                        const spec = item.data.content.spec;
                        return {
                            title: spec.title,
                            description: spec.description,
                            fields: spec.fields.map(f => ({
                                number: f.field.fieldNumber,
                                label: f.field.label,
                                type: f.field.type,
                                required: f.field.required || false
                            }))
                        };
                    }
                }
            }
        }
        return null;
    },

    extractImports(instructions) {
        const imports = [];
        for (const instruction of instructions) {
            if (instruction.driver === 'configmanagement' && instruction.input) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.importer.service') {
                        imports.push({
                            name: item.data.name,
                            description: item.data.description,
                            id: item.virtualId,
                            deduping: item.data.importerSpec.dedupingCriteria,
                            columns: item.data.importerSpec.columns?.length || 0
                        });
                    }
                }
            }
        }
        return imports;
    },

    extractIntegration(instructions) {
        for (const instruction of instructions) {
            if (instruction.driver === 'junctionmanagement' && instruction.input) {
                const integration = instruction.input.integration;
                return {
                    name: integration.name,
                    description: integration.description,
                    code: integration.code,
                    flows: integration.flows.map(f => ({
                        code: f.code,
                        name: f.name,
                        type: f.type,
                        triggers: f.triggers || []
                    })),
                    services: integration.services || [],
                    parameters: integration.settings?.parameters || []
                };
            }
        }
        return null;
    },

    extractTriggers(instructions) {
        const triggers = [];
        for (const instruction of instructions) {
            if (instruction.driver === 'junctionmanagement' && instruction.input) {
                const flows = instruction.input.integration.flows || [];
                for (const flow of flows) {
                    if (flow.triggers) {
                        for (const trigger of flow.triggers) {
                            triggers.push({
                                name: trigger.name,
                                type: trigger.type_id === 3 ? 'Workflow Step Action' : 
                                      trigger.type_id === 4 ? 'HTTP Endpoint' : 'Other',
                                flow: flow.name,
                                mapping: trigger.mapping || [],
                                description: trigger.description || ''
                            });
                        }
                    }
                }
            }
        }
        return triggers;
    },

    getSections() {
        return [
            { id: 'datasets', label: '📊 Datasets', badge: 'blue' },
            { id: 'form', label: '📝 Form', badge: 'green' },
            { id: 'imports', label: '📥 Import Services', badge: 'orange' },
            { id: 'integration', label: '🔌 Integration', badge: 'purple' },
            { id: 'triggers', label: '⚡ Triggers & Mapping', badge: 'red' }
        ];
    }
};