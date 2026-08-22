/**
 * Interactive Field Manager for existing modules
 * @module fieldManager
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { detectOrm, getOrmFieldChoices, regenerateModuleComponents } = require('./moduleGenerator');

// Helper to parse existing fields from DTO file
async function parseExistingFields(moduleDir, kebabName) {
  const dtoPath = path.join(moduleDir, 'dto', `${kebabName}.dto.ts`);
  if (!(await fs.pathExists(dtoPath))) return [];

  const content = await fs.readFile(dtoPath, 'utf8');
  const fields = [];

  // RegEx to extract NestJS DTO property (fieldName?: type)
  const regex = /^\s*([a-zA-Z0-9_]+)(\?)?:\s*([a-zA-Z\[\]<>]+);/gm;
  let match;

  const ignoredFields = ['id', 'status', 'createdAt', 'updatedAt', 'deletedAt'];

  while ((match = regex.exec(content)) !== null) {
    const [, name, optional, tsType] = match;
    if (!ignoredFields.includes(name)) {
      let type = 'String';
      if (tsType === 'number') type = 'Number';
      if (tsType === 'boolean') type = 'Boolean';
      if (tsType === 'Date') type = 'Date';

      fields.push({
        name,
        type,
        isOptional: !!optional,
      });
    }
  }

  return fields;
}

/**
 * Main Interactive Field Manager Entry Point
 */
async function manageFields(providedModuleName, targetDir = process.cwd()) {
  try {
    const orm = await detectOrm(targetDir);
    const ormTypeChoices = getOrmFieldChoices(orm);

    let moduleName = providedModuleName;

    if (!moduleName) {
      const nameAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'moduleName',
        message: 'Which module do you want to manage fields for? (e.g., orders, products)',
        validate: (input) => (input && input.trim() ? true : 'Module name is required'),
      }]);
      moduleName = nameAnswer.moduleName.trim();
    }

    const kebabName = moduleName.toLowerCase();
    const moduleDir = path.join(targetDir, 'src', 'modules', kebabName);

    if (!(await fs.pathExists(moduleDir))) {
      console.error(chalk.red(`\n❌ Module "${kebabName}" not found at src/modules/${kebabName}`));
      return false;
    }

    // Load existing fields
    let fields = await parseExistingFields(moduleDir, kebabName);
    console.log(chalk.cyan(`\n📦 Managing fields for module: ${chalk.bold(kebabName)} (Detected ORM: ${orm})`));

    let managing = true;

    const promptSingleField = async (initialValues = {}) => {
      return await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldName',
          message: 'Enter field name:',
          default: initialValues.name,
          validate: (input) => {
            if (!input || !input.trim()) return 'Field name is required';
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(input.trim())) {
              return 'Field name must be a valid identifier';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'fieldType',
          message: (answers) => `Select field type for '${answers.fieldName}':`,
          choices: ormTypeChoices,
          default: initialValues.type && ormTypeChoices.includes(initialValues.type) ? initialValues.type : ormTypeChoices[0],
        },
        {
          type: 'confirm',
          name: 'isOptional',
          message: (answers) => `Is '${answers.fieldName}' optional?`,
          default: initialValues.isOptional !== undefined ? initialValues.isOptional : false,
        },
      ]);
    };

    while (managing) {
      console.log(
        chalk.gray(`\nCurrent Fields (${fields.length}): `) +
        (fields.length > 0
          ? fields.map(f => chalk.yellow(`${f.name} (${f.type}${f.isOptional ? '?' : ''})`)).join(', ')
          : chalk.gray('None'))
      );

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: '➕ Add new field', value: 'add' },
          { name: '✏️  Edit an existing field', value: 'edit' },
          { name: '🗑️  Delete a field', value: 'delete' },
          { name: '💾 Save changes and update files', value: 'save' },
          { name: '❌ Cancel', value: 'cancel' },
        ],
      }]);

      if (action === 'add') {
        const newField = await promptSingleField();
        fields.push({
          name: newField.fieldName.trim(),
          type: newField.fieldType,
          isOptional: newField.isOptional,
        });
      } else if (action === 'edit') {
        if (fields.length === 0) {
          console.log(chalk.yellow('⚠️ No fields to edit.'));
          continue;
        }

        const { fieldToEditIndex } = await inquirer.prompt([{
          type: 'list',
          name: 'fieldToEditIndex',
          message: 'Select field to edit:',
          choices: fields.map((f, index) => ({
            name: `${f.name} (${f.type}${f.isOptional ? '?' : ''})`,
            value: index,
          })),
        }]);

        const editedField = await promptSingleField(fields[fieldToEditIndex]);
        fields[fieldToEditIndex] = {
          name: editedField.fieldName.trim(),
          type: editedField.fieldType,
          isOptional: editedField.isOptional,
        };
        console.log(chalk.green(`✓ Field updated.`));
      } else if (action === 'delete') {
        if (fields.length === 0) {
          console.log(chalk.yellow('⚠️ No fields to delete.'));
          continue;
        }

        const { fieldToDeleteIndex } = await inquirer.prompt([{
          type: 'list',
          name: 'fieldToDeleteIndex',
          message: 'Select field to delete:',
          choices: fields.map((f, index) => ({
            name: `${f.name} (${f.type}${f.isOptional ? '?' : ''})`,
            value: index,
          })),
        }]);

        const deletedName = fields[fieldToDeleteIndex].name;
        fields.splice(fieldToDeleteIndex, 1);
        console.log(chalk.red(`🗑️ Field '${deletedName}' removed.`));
      } else if (action === 'save') {
        managing = false;
        await regenerateModuleComponents(moduleName, fields, targetDir);
        console.log(chalk.green(`\n✅ Successfully updated fields for module "${kebabName}"!`));
      } else if (action === 'cancel') {
        console.log(chalk.gray('Cancelled field management. No files were modified.'));
        managing = false;
      }
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Field management failed:'), error.message);
  }
}

module.exports = { manageFields };