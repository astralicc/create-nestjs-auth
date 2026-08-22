/**
 * Module exports for CLI source files
 * @module src
 */

const constants = require('./constants');
const utils = require('./utils');
const prompts = require('./prompts');
const generator = require('./generator');
const postSetup = require('./postSetup');
const moduleGenerator = require('./moduleGenerator');
const fieldManager = require('./fieldManager');
const moduleConfigurator = require('./moduleConfigurator');

module.exports = {
  ...constants,
  ...utils,
  ...prompts,
  ...generator,
  ...postSetup,
  ...moduleGenerator,
  ...fieldManager,
  ...moduleConfigurator,
};
