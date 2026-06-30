const Parser = {
    rawJson: null,

    parseIntegrationData(json) {
        this.rawJson = typeof json === 'string' ? JSON.parse(json) : json;
        return this.rawJson;
    },

    findInstructions(driver) {
        return (this.rawJson?.instructions || []).filter(i => i.driver === driver);
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
        const forms = this.extractAllForms(instructions);
        return forms.length > 0 ? forms[0] : null;
    },

    extractAllForms(instructions) {
        const forms = [];
        for (const instruction of instructions) {
            if (instruction.driver === 'configmanagement' && instruction.input) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.form.libraryitem') {
                        const spec = item.data.content.spec;
                        forms.push({
                            virtualId: item.virtualId || item.data.id,
                            title: spec.title,
                            description: spec.description,
                            fields: spec.fields.map(f => ({
                                number: f.field.fieldNumber,
                                label: f.field.label,
                                type: f.field.type,
                                required: f.field.required || false
                            }))
                        });
                    }
                }
            }
        }
        return forms;
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
            { id: 'overview', label: 'Overview', badge: 'gray' },
            { id: 'form', label: 'Form Fields', badge: 'green' },
            { id: 'datasets', label: 'Datasets', badge: 'blue' },
            { id: 'imports', label: 'Import Services', badge: 'orange' },
            { id: 'integration', label: 'Integration', badge: 'purple' },
            { id: 'triggers', label: 'Triggers', badge: 'red' },
            { id: 'export', label: 'Summary & Export', badge: 'teal' }
        ];
    },

    getFormSpecItem() {
        const configInstructions = this.findInstructions('configmanagement');
        for (const instruction of configInstructions) {
            if (instruction.input && Array.isArray(instruction.input)) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.form.libraryitem') {
                        return item;
                    }
                }
            }
        }
        return null;
    },

    getFormSpecItemByVirtualId(virtualId) {
        const configInstructions = this.findInstructions('configmanagement');
        for (const instruction of configInstructions) {
            if (instruction.input && Array.isArray(instruction.input)) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.form.libraryitem' && (item.virtualId === virtualId || item.data?.id === virtualId)) {
                        return item;
                    }
                }
            }
        }
        return null;
    },

    getFormFieldsRef() {
        const item = this.getFormSpecItem();
        if (item) return item.data.content.spec.fields;
        return null;
    },

    getFormFieldsRefByVirtualId(virtualId) {
        const item = this.getFormSpecItemByVirtualId(virtualId);
        if (item) return item.data.content.spec.fields;
        return null;
    },

    addFormField(label, type, options = {}) {
        const fields = this.getFormFieldsRef();
        if (!fields) return false;
        const item = this.getFormSpecItem();
        const fieldNumber = item.data.nextFieldNumber || fields.length + 1;
        const field = {
            field: {
                fieldNumber, label, type,
                visible: options.visible !== false,
                required: options.required || false,
                saved: true, editable: true,
                schemaFieldId: null,
                description: options.description || '',
                displayConditions: [], editConditions: []
            }
        };
        if (type === 'MultiLineText') field.field.useMarkdownPreview = 0;
        fields.push(field);
        item.data.nextFieldNumber = fieldNumber + 1;
        if (item.virtualIdsByPath) {
            const idx = fields.length - 1;
            item.virtualIdsByPath[`/content/spec/fields/${idx}/field/schemaFieldId`] =
                `|field-${label.toLowerCase().replace(/\s+/g, '-')}|`;
        }
        const importItem = this.findImportServiceForForm(item?.virtualId);
        if (importItem) {
            const formSpecId = this.getFormSpecVirtualId(item?.virtualId);
            this.rebuildImportSchemaColumns(importItem, formSpecId, item?.data?.name || 'Form', fields);
        }
        return field;
    },

    removeFormField(fieldNumber) {
        const fields = this.getFormFieldsRef();
        if (!fields || fields.length <= 1) return false;
        const idx = fields.findIndex(f => f.field.fieldNumber === fieldNumber);
        if (idx === -1) return false;
        fields.splice(idx, 1);
        const item = this.getFormSpecItem();
        if (item && item.virtualIdsByPath) {
            const prefix = `/content/spec/fields/`;
            Object.keys(item.virtualIdsByPath).forEach(key => {
                if (key.startsWith(prefix)) {
                    const fieldIdx = parseInt(key.split('/')[4], 10);
                    if (fieldIdx === idx) delete item.virtualIdsByPath[key];
                    else if (fieldIdx > idx) {
                        const newKey = key.replace(`/fields/${fieldIdx}/`, `/fields/${fieldIdx - 1}/`);
                        item.virtualIdsByPath[newKey] = item.virtualIdsByPath[key];
                        delete item.virtualIdsByPath[key];
                    }
                }
            });
        }
        const importItem = this.findImportServiceForForm(item?.virtualId);
        if (importItem) {
            const formSpecId = this.getFormSpecVirtualId(item?.virtualId);
            this.rebuildImportSchemaColumns(importItem, formSpecId, item?.data?.name || 'Form', fields);
        }
        return true;
    },

    getFormSpecVirtualId(virtualId) {
        const item = this.getFormSpecItemByVirtualId(virtualId);
        if (item && item.virtualIdsByPath && item.virtualIdsByPath['/content/id']) {
            return item.virtualIdsByPath['/content/id'];
        }
        return null;
    },

    findImportServiceForForm(formVirtualId) {
        const specVirtualId = this.getFormSpecVirtualId(formVirtualId);
        if (!specVirtualId) return null;
        const configInstructions = this.findInstructions('configmanagement');
        for (const instruction of configInstructions) {
            if (instruction.input && Array.isArray(instruction.input)) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.importer.service') {
                        const specRef = item.data?.importerSpec?.formsDedupingCriteria?.[0]?.schemaSpecId;
                        if (specRef === specVirtualId) return item;
                    }
                }
            }
        }
        return null;
    },

    rebuildImportSchemaColumns(importItem, formSpecId, formName, fields) {
        if (!importItem) return;
        const newSchemaCols = [];

        newSchemaCols.push({
            id: `schemaFieldRelatedToJob_${formSpecId}_0_jobId_0`,
            columnPosition: 4,
            extraConfigurations: { isTableField: 0, entityExtensionId: 3, format: 'id' },
            conversionTableId: null, valueDefault: null,
            possibleNames: ['Job to relate the form to - ID'],
            columnType: 'schema', isEncrypted: false, isRequired: false,
            groupName: `job - ${formName}`, isDefaultable: true, isConvertible: true,
            columnInfoMessage: '', type: 'schemaFieldRelatedToJob',
            fieldType: 'DedupingField', wrappedFieldType: null,
            schemaSpecIdDataset: null, isSchemaFieldRelatedtoJob: true,
            targetId: null, jobIdToRelate: 0, jobTitleToRelate: `job - ${formName}`,
            schemaSpecId: formSpecId, schemaFieldNumber: 0,
            tableFieldNumber: null, formName: formName,
            fieldName: 'Job to relate the form to',
            innerFields: [], isMultipleSelectColumn: false, schemaFieldId: null
        });

        for (const f of fields) {
            const fn = f.field.fieldNumber;
            newSchemaCols.push({
                id: `schemaFieldRelatedToJob_${formSpecId}_${fn}_jobId_0`,
                columnPosition: 4 + fn,
                extraConfigurations: { isTableField: 0, entityExtensionId: 3, format: null },
                conversionTableId: null, valueDefault: null,
                possibleNames: [f.field.label],
                columnType: 'schema', isEncrypted: false, isRequired: f.field.required || false,
                groupName: `job - ${formName}`, isDefaultable: true, isConvertible: true,
                columnInfoMessage: '', type: 'schemaFieldRelatedToJob',
                fieldType: f.field.type, wrappedFieldType: null,
                schemaSpecIdDataset: null, isSchemaFieldRelatedtoJob: true,
                targetId: null, jobIdToRelate: 0, jobTitleToRelate: `job - ${formName}`,
                schemaSpecId: formSpecId, schemaFieldNumber: fn,
                tableFieldNumber: null, formName: formName,
                fieldName: f.field.label,
                innerFields: [], isMultipleSelectColumn: false,
                schemaFieldId: f.field.schemaFieldId || null
            });
        }

        const columns = importItem.data.importerSpec.columns || [];
        const builtinCols = columns.filter(c => c.columnType === 'builtin');
        importItem.data.importerSpec.columns = [...builtinCols, ...newSchemaCols];
    },

    addFormFieldToForm(virtualId, label, type, options = {}) {
        const fields = this.getFormFieldsRefByVirtualId(virtualId);
        if (!fields) return false;
        const item = this.getFormSpecItemByVirtualId(virtualId);
        const fieldNumber = item.data.nextFieldNumber || fields.length + 1;
        const field = {
            field: {
                fieldNumber, label, type,
                visible: options.visible !== false,
                required: options.required || false,
                saved: true, editable: true,
                schemaFieldId: null,
                description: options.description || '',
                displayConditions: [], editConditions: []
            }
        };
        if (type === 'MultiLineText') field.field.useMarkdownPreview = 0;
        fields.push(field);
        item.data.nextFieldNumber = fieldNumber + 1;
        if (item.virtualIdsByPath) {
            const idx = fields.length - 1;
            item.virtualIdsByPath[`/content/spec/fields/${idx}/field/schemaFieldId`] =
                `|field-${label.toLowerCase().replace(/\s+/g, '-')}|`;
        }
        const importItem = this.findImportServiceForForm(virtualId);
        if (importItem) {
            const formSpecId = this.getFormSpecVirtualId(virtualId);
            this.rebuildImportSchemaColumns(importItem, formSpecId, item.data.name, fields);
        }
        return field;
    },

    removeFormFieldFromForm(virtualId, fieldNumber) {
        const fields = this.getFormFieldsRefByVirtualId(virtualId);
        if (!fields || fields.length <= 1) return false;
        const idx = fields.findIndex(f => f.field.fieldNumber === fieldNumber);
        if (idx === -1) return false;
        fields.splice(idx, 1);
        const item = this.getFormSpecItemByVirtualId(virtualId);
        const importItem = this.findImportServiceForForm(virtualId);
        if (importItem) {
            const formSpecId = this.getFormSpecVirtualId(virtualId);
            this.rebuildImportSchemaColumns(importItem, formSpecId, item?.data?.name || 'Form', fields);
        }
        return true;
    },

    addNewForm(name, description) {
        if (!this.rawJson) return false;
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        const virtualId = `|form-${slug}-library-item-id|`;
        const specVirtualId = `|form-${slug}-spec-id|`;

        const initialFields = {
            field: {
                fieldNumber: 1,
                label: `${name} Field 1`,
                type: 'SingleLineText',
                visible: true, required: false, saved: true, editable: true,
                schemaFieldId: null, description: '',
                displayConditions: [], editConditions: []
            }
        };

        const formInstruction = {
            driver: 'configmanagement',
            render: {
                type: 'layout::simple',
                content: [{
                    type: 'container::section',
                    content: [{
                        type: 'element::markdown',
                        text: `The next step will create the **${name}** form.`
                    }]
                }]
            },
            input: [{
                type: 'create',
                fqn: 'iats.form.libraryitem',
                virtualId: virtualId,
                virtualIdsByPath: {
                    '/content/id': specVirtualId,
                    '/content/spec/fields/0/field/schemaFieldId': `|field-${slug}-1|`
                },
                data: {
                    id: null,
                    libraryItemTypeId: 5,
                    name: name,
                    isActive: true, isProtected: false, access: 2, forceVisibility: true,
                    description: description || `${name} form fields.`,
                    content: {
                        spec: {
                            title: name,
                            description: description || `${name} form fields.`,
                            canonicalName: null,
                            fields: [initialFields],
                            schemaTypeId: 2
                        },
                        active: 1, nextFieldNumber: 2,
                        id: null, isLocked: 0, internationalizable: 0,
                        formcompletionSettings: {
                            schemaSpecId: null, isHideTitle: false,
                            themeLibraryItemId: null, layoutAttachmentId: null, isRequireLogin: false
                        }
                    },
                    tags: [], canonicalName: null
                }
            }]
        };

        const importSlug = slug;
        const importVirtualId = `|import-service-${importSlug}-id|`;

        const schemaColumns = [{
            id: `schemaFieldRelatedToJob_${specVirtualId}_0_jobId_0`,
            columnPosition: 4,
            extraConfigurations: { isTableField: 0, entityExtensionId: 3, format: 'id' },
            conversionTableId: null, valueDefault: null,
            possibleNames: ['Job to relate the form to - ID'],
            columnType: 'schema', isEncrypted: false, isRequired: false,
            groupName: `job - ${name}`, isDefaultable: true, isConvertible: true,
            columnInfoMessage: '', type: 'schemaFieldRelatedToJob',
            fieldType: 'DedupingField', wrappedFieldType: null,
            schemaSpecIdDataset: null, isSchemaFieldRelatedtoJob: true,
            targetId: null, jobIdToRelate: 0, jobTitleToRelate: `job - ${name}`,
            schemaSpecId: specVirtualId, schemaFieldNumber: 0,
            tableFieldNumber: null, formName: name,
            fieldName: 'Job to relate the form to',
            innerFields: [], isMultipleSelectColumn: false, schemaFieldId: null
        }];

        schemaColumns.push({
            id: `schemaFieldRelatedToJob_${specVirtualId}_1_jobId_0`,
            columnPosition: 5,
            extraConfigurations: { isTableField: 0, entityExtensionId: 3, format: null },
            conversionTableId: null, valueDefault: null,
            possibleNames: [`${name} Field 1`],
            columnType: 'schema', isEncrypted: false, isRequired: false,
            groupName: `job - ${name}`, isDefaultable: true, isConvertible: true,
            columnInfoMessage: '', type: 'schemaFieldRelatedToJob',
            fieldType: 'SingleLineText', wrappedFieldType: null,
            schemaSpecIdDataset: null, isSchemaFieldRelatedtoJob: true,
            targetId: null, jobIdToRelate: 0, jobTitleToRelate: `job - ${name}`,
            schemaSpecId: specVirtualId, schemaFieldNumber: 1,
            tableFieldNumber: null, formName: name,
            fieldName: `${name} Field 1`,
            innerFields: [], isMultipleSelectColumn: false,
            schemaFieldId: `|field-${slug}-1|`
        });

        const importInstruction = {
            driver: 'configmanagement',
            render: {
                type: 'layout::simple',
                content: [{
                    type: 'container::section',
                    content: [{
                        type: 'element::markdown',
                        text: `The next step will create the import service for **${name}**.`
                    }]
                }]
            },
            input: [{
                type: 'create',
                fqn: 'iats.importer.service',
                virtualId: importVirtualId,
                data: {
                    name: `Integration - ${name} - Parameters`,
                    description: `Import service for the ${name} form fields.`,
                    callbackUrl: '',
                    importerSpec: {
                        entityTypeId: 2, entityExtensionId: 2,
                        encoding: 'AUTO', firstRowIsHeader: 1, delimiter: ',',
                        dedupingCriteria: {
                            isDedupByEntityId: true, isDedupByEmail: false,
                            isDedupByEmailOrFullName: false, isDedupByFullName: false,
                            isDedupByUserName: false, isDedupByTextField: false,
                            isDedupByWebsite: false, isDedupByEmailAndZipCode: false,
                            isDedupByCompoundRelatedRecordIds: false
                        },
                        schemaFieldIdDedupingCriteriaTextField: null,
                        dedupingAction: 'importAndOverwrite',
                        formsDedupingCriteria: [{
                            schemaSpecId: specVirtualId,
                            schemaFieldNumberIfTableField: 0,
                            formTitle: name,
                            formDedupingCriteriaTypeId: 3,
                            schemaFieldNumberDeduping: 1,
                            type: 'schemaFieldRelatedToJob'
                        }],
                        workflowIdJob: null, workflowStatusIdJob: null, workflowIdPeople: null,
                        columns: [
                            {
                                id: 'builtin_entityId', columnPosition: 1,
                                extraConfigurations: {},
                                conversionTableId: null, valueDefault: null,
                                possibleNames: ['Avature ID'],
                                columnType: 'builtin', isEncrypted: false, isRequired: true
                            },
                            {
                                id: 'builtin_person_linktorecord_link', columnPosition: 2,
                                extraConfigurations: { valueType: 'id', entityExtensionId: 3 },
                                conversionTableId: null, valueDefault: null,
                                possibleNames: ['Link to job ID'],
                                columnType: 'builtin', isEncrypted: false, isRequired: false
                            },
                            {
                                id: 'builtin_person_linktorecord_stepUpdate', columnPosition: 3,
                                extraConfigurations: { valueType: 'id', entityExtensionId: 3 },
                                conversionTableId: null, valueDefault: null,
                                possibleNames: ['Workflow Step ID'],
                                columnType: 'builtin', isEncrypted: false, isRequired: false
                            },
                            ...schemaColumns
                        ],
                        appRoleIdDefault: null, appGroupIdDefault: null,
                        notifyUserCreation: 0, firstLoginPlaceTypeId: 3,
                        setEmailAccountsAsVerified: 0,
                        noDuplicateAction: 'ignore', alreadyLinkedAction: 'updateStep',
                        tags: [], schemaSpecIdDataset: null,
                        relationshipsDedupingAction: 'none',
                        languageIdForSchemaFields: null, usedSchemaSpecIds: [],
                        linkToJobOptions: {
                            hasToAvoidInitialStep: 0, hasToAvoidNextStep: 0,
                            hasToAvoidPreconditions: 0, hasToAvoidTriggers: 0,
                            hasToLinkToClosedJobs: false,
                            importerLinkToJobOptionsDefaultStepSourceId: null
                        },
                        usedSchemaSpecIdsRelatedToJob: [{
                            jobId: 0, entityExtensionId: 3,
                            schemaSpecId: specVirtualId, jobName: '',
                            schemaSpecTitle: name
                        }],
                        additionalIdentifierOnErrorReportColumnNumber: null,
                        isProcessingEncryptedFields: 0,
                        emailNotification: { email: null, hasNotificationOnlyIfError: true }
                    },
                    appUserIdDelegate: null,
                    appUserIdExecutor: '|integration-user-id|',
                    isActive: 1, versionId: 2,
                    importerServiceQueueId: null, priority: 1
                }
            }]
        };

        this.rawJson.instructions.push(formInstruction);
        this.rawJson.instructions.push(importInstruction);
        return { virtualId, specVirtualId, importVirtualId };
    },

    removeForm(virtualId) {
        if (!this.rawJson) return false;
        const idx = this.rawJson.instructions.findIndex(inst => {
            if (inst.driver === 'configmanagement' && inst.input) {
                return inst.input.some(item => item.fqn === 'iats.form.libraryitem' && item.virtualId === virtualId);
            }
            return false;
        });
        if (idx === -1) return false;
        const importItem = this.findImportServiceForForm(virtualId);
        const importIdx = this.rawJson.instructions.findIndex(inst => {
            if (inst.driver === 'configmanagement' && inst.input) {
                return inst.input.some(item => item.fqn === 'iats.importer.service' && item === importItem);
            }
            return false;
        });
        if (importIdx !== -1) this.rawJson.instructions.splice(importIdx, 1);
        this.rawJson.instructions.splice(idx, 1);
        return true;
    },

    getAllDatasets() {
        const configInstructions = this.findInstructions('configmanagement');
        const datasets = [];
        for (const instruction of configInstructions) {
            if (instruction.input && Array.isArray(instruction.input)) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.dataset.spec') {
                        datasets.push({
                            virtualId: item.virtualId,
                            title: item.data.spec.title,
                            fields: item.data.spec.fields,
                            nextFieldNumber: item.data.nextFieldNumber
                        });
                    }
                }
            }
        }
        return datasets;
    },

    getDatasetSpecItem(virtualId) {
        const configInstructions = this.findInstructions('configmanagement');
        for (const instruction of configInstructions) {
            if (instruction.input && Array.isArray(instruction.input)) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.dataset.spec' && item.virtualId === virtualId) {
                        return item;
                    }
                }
            }
        }
        return null;
    },

    addDatasetField(virtualId, label, type) {
        const item = this.getDatasetSpecItem(virtualId);
        if (!item) return false;
        const fields = item.data.spec.fields;
        const fieldNumber = item.data.nextFieldNumber || fields.length + 1;
        const field = { field: { fieldNumber, label, type } };
        if (type === 'Date') field.field.dateFormat = 4;
        fields.push(field);
        item.data.nextFieldNumber = fieldNumber + 1;
        return field;
    },

    removeDatasetField(virtualId, fieldNumber) {
        const item = this.getDatasetSpecItem(virtualId);
        if (!item) return false;
        const fields = item.data.spec.fields;
        if (fields.length <= 1) return false;
        const idx = fields.findIndex(f => f.field.fieldNumber === fieldNumber);
        if (idx === -1) return false;
        fields.splice(idx, 1);
        return true;
    },

    addNewDataset(title) {
        if (!this.rawJson) return false;
        const virtualId = `|dataset-${title.toLowerCase().replace(/\s+/g, '-')}-id|`;

        const instruction = {
            driver: 'configmanagement',
            render: {
                type: 'layout::simple',
                content: [{
                    type: 'container::section',
                    content: [{
                        type: 'element::markdown',
                        text: `The next step will create the **${title}** dataset.`
                    }]
                }]
            },
            input: [{
                type: 'create',
                fqn: 'iats.dataset.spec',
                virtualId: virtualId,
                data: {
                    spec: {
                        title: title,
                        fields: [{
                            field: { fieldNumber: 1, label: 'Code', type: 'SingleLineText' }
                        }, {
                            field: { fieldNumber: 2, label: 'Label', type: 'SingleLineText' }
                        }],
                        schemaTypeId: 3
                    },
                    active: 1,
                    nextFieldNumber: 3
                }
            }]
        };

        this.rawJson.instructions.push(instruction);
        return virtualId;
    },

    removeDataset(virtualId) {
        if (!this.rawJson) return false;
        const idx = this.rawJson.instructions.findIndex(inst => {
            if (inst.driver === 'configmanagement' && inst.input) {
                return inst.input.some(item => item.fqn === 'iats.dataset.spec' && item.virtualId === virtualId);
            }
            return false;
        });
        if (idx === -1) return false;
        this.rawJson.instructions.splice(idx, 1);
        return true;
    },

    getIntegrationItem() {
        for (const instruction of this.rawJson?.instructions || []) {
            if (instruction.driver === 'junctionmanagement' && instruction.input) {
                return instruction.input.integration;
            }
        }
        return null;
    },

    addFlow(code, name, type = 'internalServers') {
        const integration = this.getIntegrationItem();
        if (!integration) return false;
        if (integration.flows.find(f => f.code === code)) return false;
        const flow = {
            code, name, type,
            credentialId: integration.flows[0]?.credentialId || '|vendor-credential-id|',
            deployment: {
                version: 1,
                externalName: `${integration.code}_${code}`,
                configuration: {
                    'processGroupVariable|"junction.instanceName"': '{!instanceName}',
                    'processGroupVariable|"junction.intLogEndpoint"': '{!junctionEvents}',
                    'processGroupVariable|"junction.integrationId"': '{!integrationCode}',
                    'processGroupVariable|"junction.pipelineId"': '{!flowCode}',
                    'processGroupVariable|"junction.vendorApiEndpoint"': '{!parameter.General.vendorApiEndpoint}',
                    'processGroupVariable|"junction.vendorApiCredentials"': '{!parameter.General.vendorApiCredentials}'
                },
                type: 'nifi', nifiVersion: '1.7'
            },
            server: 'internal1',
            path: '{!instanceName}/{!integrationCode}/{!flowCode}',
            triggers: []
        };
        integration.flows.push(flow);
        return flow;
    },

    removeFlow(code) {
        const integration = this.getIntegrationItem();
        if (!integration || integration.flows.length <= 1) return false;
        const idx = integration.flows.findIndex(f => f.code === code);
        if (idx === -1) return false;
        integration.flows.splice(idx, 1);
        return true;
    },

    addTrigger(flowCode, trigger) {
        const integration = this.getIntegrationItem();
        if (!integration) return false;
        const flow = integration.flows.find(f => f.code === flowCode);
        if (!flow) return false;
        if (!flow.triggers) flow.triggers = [];
        flow.triggers.push(trigger);
        return true;
    },

    removeTrigger(flowCode, triggerName) {
        const integration = this.getIntegrationItem();
        if (!integration) return false;
        const flow = integration.flows.find(f => f.code === flowCode);
        if (!flow || !flow.triggers) return false;
        const idx = flow.triggers.findIndex(t => t.name === triggerName);
        if (idx === -1) return false;
        flow.triggers.splice(idx, 1);
        return true;
    },

    toCamelCase(str) {
        return str
            .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
            .replace(/^[A-Z]/, c => c.toLowerCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    },

    updateIntegrationUser(vendorCamel) {
        if (!this.rawJson) return;
        for (const instruction of this.rawJson.instructions) {
            if (instruction.driver === 'usermanagement' && instruction.input?.userAccountInfo) {
                instruction.input.userAccountInfo.username = `${vendorCamel}.integration`;
                instruction.input.userAccountInfo.email = `${vendorCamel}.integration@avature.net`;
            }
        }
    },

    setVendorName(name) {
        if (!this.rawJson) return;
        const camel = this.toCamelCase(name);
        this.rawJson.title = `${name} Assessment Tool Integration`;
        this.rawJson.description = `Custom integration for ${name}. Creates assessment type storage, an application-level assessment form, import services for creation/results, and a Junction integration with sync, create, and result-update flows.`;
        this.updateIntegrationUser(camel || 'vendor');
        const integration = this.getIntegrationItem();
        if (integration) {
            integration.name = integration.name || `${name} Assessment Tool`;
        }
    },

    getVendorName() {
        if (!this.rawJson) return '';
        const integration = this.getIntegrationItem();
        if (integration) {
            const match = integration.name.match(/^(.+?)\s*Assessment Tool$/);
            if (match) return match[1];
        }
        return this.rawJson.title?.replace(' Assessment Tool Integration', '') || '';
    },

    setIntegrationName(name) {
        if (!this.rawJson) return;
        this.rawJson.title = `${name}`;
        const integration = this.getIntegrationItem();
        if (integration) {
            integration.name = name;
        }
    },

    getIntegrationName() {
        if (!this.rawJson) return '';
        const integration = this.getIntegrationItem();
        if (integration) return integration.name || '';
        return this.rawJson.title || '';
    },

    getImportColumnsDetail() {
        const imports = [];
        const configInstructions = this.findInstructions('configmanagement');
        for (const instruction of configInstructions) {
            if (instruction.input && Array.isArray(instruction.input)) {
                for (const item of instruction.input) {
                    if (item.fqn === 'iats.importer.service') {
                        const cols = (item.data.importerSpec.columns || []).map(c => ({
                            position: c.columnPosition,
                            name: c.possibleNames?.[0] || c.id,
                            type: c.columnType,
                            fieldType: c.fieldType || c.columnType,
                            fieldNumber: c.type === 'schemaFieldRelatedToJob' ? c.schemaFieldNumber : null,
                            required: c.isRequired || false,
                            formName: c.formName || null
                        }));
                        imports.push({ name: item.data.name, id: item.virtualId, columns: cols });
                    }
                }
            }
        }
        return imports;
    },

    getCustomizedJSON() {
        return JSON.parse(JSON.stringify(this.rawJson));
    }
};
