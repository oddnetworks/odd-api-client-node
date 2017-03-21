'use strict';

const Promise = require('bluebird');
const Filepath = require('filepath');
const lib = require('../lib/');
const HttpClient = require('../lib/http-client');
const loginUser = require('../lib/login-user');
const transformResource = require('../lib/transform-resource');
const createOrUpdateResource = require('../lib/create-or-update-resource');

const recurseJsonDirectory = lib.recurseJsonDirectory;
const readJsonFile = lib.readJsonFile;

// Params:
// - app: The Application Object
// - args.source: Source directory path String
// - args.channel: Channel ID String
// - args.username: Username String
// - args.password: Password String
exports.main = function loadDocuments(app, args) {
	const log = app.log;
	const source = Filepath.create(args.source);
	const channel = args.channel;
	const username = args.username;
	const password = args.password;
	const baseUrl = app.baseUrl;

	let client = new HttpClient({baseUrl, log});

	function maybeValidationError(file) {
		return function (err) {
			if (err.code === 'VALIDATION_ERROR') {
				err.errors.forEach(err => {
					log.error(`Validation error in ${file} : ${err.detail} at ${err.source.pointer}`);
				});
			}

			return Promise.reject(err);
		};
	}

	return Promise.resolve(null)
		// Login the user
		.then(() => {
			return loginUser(client, {username, password}).then(res => {
				client = new HttpClient({baseUrl, log, jwt: res.attributes.token});
				return null;
			});
		})
		.then(() => {
			let files = [source];
			if (source.isDirectory()) {
				files = recurseJsonDirectory(source);
			}

			function updateResource(file) {
				log.info(`Reading file ${file}`);
				return readJsonFile(file).then(resource => {
					resource = transformResource(channel, resource);

					return createOrUpdateResource(client, channel, resource)
						.then(data => {
							log.info(`Updated resource ${data.type} ${data.id}`);
						})
						.catch(maybeValidationError(file));
				});
			}

			return files.reduce((promise, file) => {
				return promise.then(() => {
					return updateResource(file);
				});
			}, Promise.resolve(null));
		});
};
