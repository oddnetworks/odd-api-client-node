#!/usr/bin/env node
'use strict';

const winston = require('winston');
const yargs = require('yargs');
const Application = require('./lib/application');
const apiToken = require('./commands/api-token');
const updateProperty = require('./commands/update-property');

exports.main = function () {
	const LOG_LEVEL = process.env.ODD_LOG_LEVEL || 'info';
	const BASE_URL = process.env.ODD_BASE_URL;

	if (!BASE_URL) {
		console.error(`The ODD_BASE_URL env variable is required. Ex: https://api.oddnetworks.com/api/v1`);
		process.exit(1);
	}

	winston.level = LOG_LEVEL;

	const app = Application.create({
		log: winston,
		baseUrl: BASE_URL
	});

	const parser = yargs
		.command(
			'api-token',
			'Generate an API token for a user', {
				username: {
					describe: 'The username to own the token',
					demand: true,
					alias: 'u'
				},
				password: {
					describe: 'The the password for the user',
					demand: true,
					alias: 'p'
				}
			}
		)
		.command(
			'update-property',
			'Create or update a property using a source directory', {
				source: {
					describe: 'Path to the source directory',
					demand: true,
					alias: 's'
				}
			}
		)
		.help();

	const argv = parser.argv;
	const command = argv._[0];

	if (!command) {
		console.error('A command must be specified\n');
		parser.showHelp();
		process.exit(1);
	}

	function printErrorAndExit(message) {
		console.error(`${message}\n`);
		parser.showHelp();
		process.exit(1);
	}

	function reportError(err) {
		switch (err.code) {
			case 'VALIDATION_ERROR':
				err.errors.forEach(err => {
					app.log.error(`Validation Error: ${err.detail}`);
				});
				break;
			default:
				return Promise.reject(err);
		}

		return null;
	}

	switch (command) {
		case 'api-token':
			if (!argv.username) {
				printErrorAndExit('A username is required');
			} else if (argv.password) {
				execApiToken(app, argv).catch(reportError);
			} else {
				printErrorAndExit('A password is required');
			}
			break;
		case 'update-property':
			if (argv.source) {
				execUpdateProperty(app, {source: argv.source}).catch(reportError);
			} else {
				printErrorAndExit('A source path is required');
			}
			break;
		default:
			console.error(`"${command}" is not a valid command\n`);
			parser.showHelp();
	}
};

function execApiToken(app, args) {
	return apiToken.main(app, args).then(jwt => {
		console.log(jwt.token);
	});
}

function execUpdateProperty(app, args) {
	return updateProperty.main(app, args);
}

if (require.main === module) {
	exports.main();
}

