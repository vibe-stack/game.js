#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createProject } from './commands/create.js';

const program = new Command();

program
  .name('game.js')
  .description('CLI tool for Game.js Three.js framework')
  .version('0.1.0');

program
  .command('create')
  .description('Create a new game.js project')
  .argument('<project-name>', 'name of the project')
  .option('-t, --template <template>', 'project template to use', 'basic')
  .action(async (projectName: string, options: { template: string }) => {
    try {
      await createProject(projectName, options.template);
    } catch (error) {
      console.error(chalk.red('Error creating project:'), error);
      process.exit(1);
    }
  });

program.parse(); 