import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { deepEqual } from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const parserCode = readFileSync(join(__dirname, '..', 'js', 'parser.js'), 'utf-8');
const fixturePath = join(__dirname, '..', 'instructors', 'assessment_tools', 'default_assessment_tool_instructor.json');

function createParser() {
    const p = runInNewContext(parserCode + '\n;Parser;');
    const json = JSON.parse(readFileSync(fixturePath, 'utf-8'));
    p.parseIntegrationData(json);
    return p;
}

function freshJson() {
    return JSON.parse(readFileSync(fixturePath, 'utf-8'));
}

describe('toCamelCase', () => {
    it('transforms space-separated words', () => {
        const p = createParser();
        assert.equal(p.toCamelCase('My Vendor'), 'myVendor');
    });

    it('transforms hyphen-separated words', () => {
        const p = createParser();
        assert.equal(p.toCamelCase('my-vendor'), 'myVendor');
    });

    it('transforms single word', () => {
        const p = createParser();
        assert.equal(p.toCamelCase('Acme'), 'acme');
    });

    it('strips non-alphanumeric characters', () => {
        const p = createParser();
        assert.equal(p.toCamelCase('Acme Corp!'), 'acmeCorp');
    });

    it('handles already-camelCase input', () => {
        const p = createParser();
        assert.equal(p.toCamelCase('acmeCorp'), 'acmeCorp');
    });
});

describe('parseIntegrationData', () => {
    it('loads JSON object', () => {
        const p = createParser();
        assert.ok(p.rawJson);
        assert.equal(p.rawJson.title, 'Default Assessment Tool Integration');
    });

    it('loads JSON string', () => {
        const p = runInNewContext(parserCode + '\n;Parser;');
        const str = readFileSync(fixturePath, 'utf-8');
        p.parseIntegrationData(str);
        assert.equal(p.rawJson.title, 'Default Assessment Tool Integration');
    });
});

describe('setVendorName', () => {
    it('updates integration.code to camelCase', () => {
        const p = createParser();
        p.setVendorName('Acme Corp');
        const integration = p.getIntegrationItem();
        assert.equal(integration.code, 'acmeCorp');
    });

    it('updates title with vendor name', () => {
        const p = createParser();
        p.setVendorName('Acme Corp');
        assert.equal(p.rawJson.title, 'Acme Corp Assessment Tool Integration');
    });

    it('updates integration.name when default', () => {
        const p = createParser();
        p.setVendorName('Acme Corp');
        const integration = p.getIntegrationItem();
        assert.equal(integration.name, 'Acme Corp Assessment Tool');
    });

    it('does not overwrite custom integration.name', () => {
        const p = createParser();
        const integration = p.getIntegrationItem();
        integration.name = 'Custom Name';
        p.setVendorName('Acme Corp');
        assert.equal(integration.name, 'Custom Name');
    });

    it('updates integration user credentials', () => {
        const p = createParser();
        p.setVendorName('Acme Corp');
        const userInst = p.rawJson.instructions.find(i => i.driver === 'usermanagement');
        assert.equal(userInst.input.userAccountInfo.username, 'acmeCorp.integration');
        assert.equal(userInst.input.userAccountInfo.email, 'acmeCorp.integration@avature.net');
    });
});

describe('getVendorName', () => {
    it('returns vendor name from integration.name', () => {
        const p = createParser();
        p.setVendorName('Acme Corp');
        assert.equal(p.getVendorName(), 'Acme Corp');
    });

    it('returns empty string when null', () => {
        const p = runInNewContext(parserCode + '\n;Parser;');
        assert.equal(p.getVendorName(), '');
    });
});

describe('setIntegrationName', () => {
    it('updates integration.name', () => {
        const p = createParser();
        p.setIntegrationName('My Custom Integration');
        assert.equal(p.getIntegrationItem().name, 'My Custom Integration');
    });

    it('updates rawJson.title', () => {
        const p = createParser();
        p.setIntegrationName('My Custom Integration');
        assert.equal(p.rawJson.title, 'My Custom Integration');
    });
});

describe('getIntegrationName', () => {
    it('returns integration.name when set', () => {
        const p = createParser();
        p.setIntegrationName('Custom Name');
        assert.equal(p.getIntegrationName(), 'Custom Name');
    });
});

describe('Form field CRUD (default form)', () => {
    it('addFormField creates a field with next number', () => {
        const p = createParser();
        const initialCount = p.getFormFieldsRef().length;
        const field = p.addFormField('Test Field', 'SingleLineText');
        assert.ok(field);
        assert.equal(field.field.label, 'Test Field');
        assert.equal(field.field.type, 'SingleLineText');
        assert.equal(p.getFormFieldsRef().length, initialCount + 1);
    });

    it('addFormField supports MultiLineText with markdown', () => {
        const p = createParser();
        const field = p.addFormField('Description', 'MultiLineText');
        assert.equal(field.field.useMarkdownPreview, 0);
    });

    it('addFormField supports required option', () => {
        const p = createParser();
        const field = p.addFormField('Required Field', 'SingleLineText', { required: true });
        assert.equal(field.field.required, true);
    });

    it('removeFormField removes a field', () => {
        const p = createParser();
        const field = p.addFormField('Temp Field', 'SingleLineText');
        const before = p.getFormFieldsRef().length;
        const result = p.removeFormField(field.field.fieldNumber);
        assert.equal(result, true);
        assert.equal(p.getFormFieldsRef().length, before - 1);
    });

    it('removeFormField returns false when only 1 field', () => {
        const p = createParser();
        const fields = p.getFormFieldsRef();
        while (fields.length > 1) {
            p.removeFormField(fields[fields.length - 1].field.fieldNumber);
        }
        assert.equal(fields.length, 1);
        const result = p.removeFormField(fields[0].field.fieldNumber);
        assert.equal(result, false);
    });

    it('removeFormField returns false for missing field', () => {
        const p = createParser();
        assert.equal(p.removeFormField(999), false);
    });
});

describe('Multi-form CRUD', () => {
    it('addNewForm creates form and import instructions', () => {
        const p = createParser();
        const beforeCount = p.rawJson.instructions.length;
        const result = p.addNewForm('Test Form', 'A test form');
        assert.ok(result);
        assert.ok(result.virtualId);
        assert.ok(result.specVirtualId);
        assert.ok(result.importVirtualId);
        assert.equal(p.rawJson.instructions.length, beforeCount + 2);
    });

    it('addNewForm form has correct structure', () => {
        const p = createParser();
        const { virtualId } = p.addNewForm('Test Form');
        const formItem = p.getFormSpecItemByVirtualId(virtualId);
        assert.ok(formItem);
        assert.equal(formItem.fqn, 'iats.form.libraryitem');
        assert.equal(formItem.data.name, 'Test Form');
        assert.equal(formItem.data.content.spec.title, 'Test Form');
    });

    it('addNewForm import has correct structure', () => {
        const p = createParser();
        const { virtualId, specVirtualId } = p.addNewForm('Test Form');
        const importItem = p.findImportServiceForForm(virtualId);
        assert.ok(importItem);
        assert.equal(importItem.fqn, 'iats.importer.service');
        assert.equal(importItem.data.importerSpec.formsDedupingCriteria[0].schemaSpecId, specVirtualId);
    });

    it('removeForm removes form and import instructions', () => {
        const p = createParser();
        const beforeCount = p.rawJson.instructions.length;
        const { virtualId } = p.addNewForm('Remove Me');
        assert.equal(p.rawJson.instructions.length, beforeCount + 2);
        p.removeForm(virtualId);
        assert.equal(p.rawJson.instructions.length, beforeCount);
    });

    it('addFormFieldToForm adds field to specific form', () => {
        const p = createParser();
        const { virtualId } = p.addNewForm('Multi Form');
        const before = p.getFormFieldsRefByVirtualId(virtualId).length;
        const field = p.addFormFieldToForm(virtualId, 'New Field', 'SingleLineText');
        assert.ok(field);
        assert.equal(p.getFormFieldsRefByVirtualId(virtualId).length, before + 1);
    });

    it('removeFormFieldFromForm removes field from specific form', () => {
        const p = createParser();
        const { virtualId } = p.addNewForm('Multi Form');
        const field = p.addFormFieldToForm(virtualId, 'Temp', 'SingleLineText');
        const before = p.getFormFieldsRefByVirtualId(virtualId).length;
        const result = p.removeFormFieldFromForm(virtualId, field.field.fieldNumber);
        assert.equal(result, true);
        assert.equal(p.getFormFieldsRefByVirtualId(virtualId).length, before - 1);
    });
});

describe('Import service sync on field changes', () => {
    it('addNewForm creates import with builtin + schema columns', () => {
        const p = createParser();
        const { virtualId, specVirtualId } = p.addNewForm('Sync Form');
        const importItem = p.findImportServiceForForm(virtualId);
        assert.ok(importItem);
        const cols = importItem.data.importerSpec.columns;
        const builtins = cols.filter(c => c.columnType === 'builtin');
        const schemas = cols.filter(c => c.columnType === 'schema');
        assert.equal(builtins.length, 3);
        assert.equal(builtins[0].possibleNames[0], 'Avature ID');
        assert.equal(builtins[1].possibleNames[0], 'Link to job ID');
        assert.equal(builtins[2].possibleNames[0], 'Workflow Step ID');
        assert.ok(schemas.length >= 2);
    });

    it('addFormFieldToForm syncs import columns', () => {
        const p = createParser();
        const { virtualId } = p.addNewForm('Sync Form');
        p.addFormFieldToForm(virtualId, 'Rating', 'SingleLineText');
        p.addFormFieldToForm(virtualId, 'Feedback', 'MultiLineText');
        const importItem = p.findImportServiceForForm(virtualId);
        const schemaCols = importItem.data.importerSpec.columns.filter(c => c.columnType === 'schema');
        const fieldNames = schemaCols.map(c => c.fieldName);
        assert.ok(fieldNames.includes('Rating'));
        assert.ok(fieldNames.includes('Feedback'));
    });

    it('removeFormFieldFromForm syncs import columns', () => {
        const p = createParser();
        const { virtualId } = p.addNewForm('Sync Form');
        const field = p.addFormFieldToForm(virtualId, 'Remove Me', 'SingleLineText');
        p.addFormFieldToForm(virtualId, 'Keep Me', 'SingleLineText');
        p.removeFormFieldFromForm(virtualId, field.field.fieldNumber);
        const importItem = p.findImportServiceForForm(virtualId);
        const schemaFieldNames = importItem.data.importerSpec.columns
            .filter(c => c.columnType === 'schema')
            .map(c => c.fieldName);
        assert.ok(!schemaFieldNames.includes('Remove Me'));
        assert.ok(schemaFieldNames.includes('Keep Me'));
    });
});

describe('Flow CRUD', () => {
    it('addFlow creates a new flow', () => {
        const p = createParser();
        const integration = p.getIntegrationItem();
        const before = integration.flows.length;
        const flow = p.addFlow('newFlow', 'New Flow');
        assert.ok(flow);
        assert.equal(integration.flows.length, before + 1);
        assert.equal(flow.code, 'newFlow');
        assert.equal(flow.name, 'New Flow');
        assert.equal(flow.triggers.length, 0);
    });

    it('addFlow returns false for duplicate code', () => {
        const p = createParser();
        const result = p.addFlow('syncAssessmentTypes', 'Duplicate');
        assert.equal(result, false);
    });

    it('addFlow sets externalName with integration code', () => {
        const p = createParser();
        p.setVendorName('Acme Corp');
        const flow = p.addFlow('testFlow', 'Test Flow');
        assert.ok(flow.deployment.externalName.startsWith('acmeCorp_'));
    });

    it('removeFlow removes a flow', () => {
        const p = createParser();
        p.addFlow('tempFlow', 'Temp');
        const before = p.getIntegrationItem().flows.length;
        p.removeFlow('tempFlow');
        assert.equal(p.getIntegrationItem().flows.length, before - 1);
    });

    it('removeFlow returns false when only 1 flow would remain', () => {
        const p = createParser();
        const integration = p.getIntegrationItem();
        const flows = integration.flows;
        while (flows.length > 2) {
            p.removeFlow(flows[flows.length - 1].code);
        }
        assert.equal(flows.length, 2);
        assert.equal(p.removeFlow(flows[0].code), true);
        assert.equal(flows.length, 1);
        assert.equal(p.removeFlow(flows[0].code), false);
    });
});

describe('Trigger CRUD', () => {
    it('addTrigger adds a trigger to a flow', () => {
        const p = createParser();
        const flow = p.getIntegrationItem().flows[0];
        const before = flow.triggers.length;
        const trigger = { name: 'Test Trigger', type_id: 3 };
        const result = p.addTrigger(flow.code, trigger);
        assert.equal(result, true);
        assert.equal(flow.triggers.length, before + 1);
    });

    it('removeTrigger removes a trigger', () => {
        const p = createParser();
        const flow = p.getIntegrationItem().flows[0];
        p.addTrigger(flow.code, { name: 'Remove Me', type_id: 4 });
        const before = flow.triggers.length;
        p.removeTrigger(flow.code, 'Remove Me');
        assert.equal(flow.triggers.length, before - 1);
    });
});

describe('Dataset CRUD', () => {
    it('addNewDataset creates a new dataset instruction', () => {
        const p = createParser();
        const before = p.rawJson.instructions.length;
        const result = p.addNewDataset('Test Dataset');
        assert.ok(result);
        assert.equal(p.rawJson.instructions.length, before + 1);
    });

    it('addDatasetField adds a field', () => {
        const p = createParser();
        const datasets = p.getAllDatasets();
        const dataset = datasets[0];
        const before = dataset.fields.length;
        p.addDatasetField(dataset.virtualId, 'New Field', 'SingleLineText');
        const updated = p.getDatasetSpecItem(dataset.virtualId);
        assert.equal(updated.data.spec.fields.length, before + 1);
    });

    it('removeDatasetField removes a field', () => {
        const p = createParser();
        const datasets = p.getAllDatasets();
        const dataset = datasets[0];
        const dsItem = p.getDatasetSpecItem(dataset.virtualId);
        const field = dsItem.data.spec.fields[0];
        const before = dsItem.data.spec.fields.length;
        if (before > 1) {
            p.removeDatasetField(dataset.virtualId, field.field.fieldNumber);
            assert.equal(dsItem.data.spec.fields.length, before - 1);
        }
    });

    it('removeDataset removes a dataset instruction', () => {
        const p = createParser();
        const virtualId = p.addNewDataset('Remove Dataset');
        const before = p.rawJson.instructions.length;
        p.removeDataset(virtualId);
        assert.equal(p.rawJson.instructions.length, before - 1);
    });
});

describe('getCustomizedJSON', () => {
    it('returns a deep clone', () => {
        const p = createParser();
        const clone = p.getCustomizedJSON();
        assert.notEqual(clone, p.rawJson);
        clone.title = 'Modified';
        assert.equal(p.rawJson.title, 'Default Assessment Tool Integration');
    });

    it('includes added flows', () => {
        const p = createParser();
        p.addFlow('testFlow', 'Test Flow');
        const clone = p.getCustomizedJSON();
        const integration = clone.instructions
            .find(i => i.driver === 'junctionmanagement').input.integration;
        assert.ok(integration.flows.find(f => f.code === 'testFlow'));
    });

    it('includes vendor name changes', () => {
        const p = createParser();
        p.setVendorName('My Vendor');
        const clone = p.getCustomizedJSON();
        assert.equal(clone.title, 'My Vendor Assessment Tool Integration');
        const integration = clone.instructions
            .find(i => i.driver === 'junctionmanagement').input.integration;
        assert.equal(integration.code, 'myVendor');
    });
});

describe('Extractors', () => {
    it('extractAllForms returns all forms', () => {
        const p = createParser();
        p.addNewForm('Second Form');
        const forms = p.extractAllForms(p.rawJson.instructions);
        assert.ok(forms.length >= 2);
        assert.ok(forms.find(f => f.title === 'Second Form'));
    });

    it('extractIntegration returns integration snapshot', () => {
        const p = createParser();
        const data = p.extractIntegration(p.rawJson.instructions);
        assert.ok(data);
        assert.equal(typeof data.name, 'string');
        assert.equal(typeof data.code, 'string');
        assert.ok(Array.isArray(data.flows));
    });

    it('extractImports returns import services', () => {
        const p = createParser();
        const imports = p.extractImports(p.rawJson.instructions);
        assert.ok(imports.length >= 1);
        assert.ok(imports[0].name);
        assert.ok(imports[0].columns >= 0);
    });

    it('extractTriggers returns all triggers', () => {
        const p = createParser();
        const flow = p.getIntegrationItem().flows[0];
        p.addTrigger(flow.code, { name: 'Extracted Trigger', type_id: 4, description: 'test' });
        const triggers = p.extractTriggers(p.rawJson.instructions);
        assert.ok(triggers.find(t => t.name === 'Extracted Trigger'));
    });
});

describe('Edge cases', () => {
    it('getFormSpecItem returns null with no data', () => {
        const p = runInNewContext(parserCode + '\n;Parser;');
        assert.equal(p.getFormSpecItem(), null);
    });

    it('addNewForm returns false with no data', () => {
        const p = runInNewContext(parserCode + '\n;Parser;');
        assert.equal(p.addNewForm('Test'), false);
    });

    it('removeForm returns false for missing virtualId', () => {
        const p = createParser();
        assert.equal(p.removeForm('|non-existent|'), false);
    });

    it('addFlow returns false with no integration', () => {
        const p = runInNewContext(parserCode + '\n;Parser;');
        assert.equal(p.addFlow('test', 'Test'), false);
    });
});
