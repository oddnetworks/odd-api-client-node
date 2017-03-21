'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Filepath = require('filepath');
const lib = require('../lib/');
const HttpClient = require('../lib/http-client');
const loginUser = require('../lib/login-user');
const transformResource = require('../lib/transform-resource');
const createOrUpdateResource = require('../lib/create-or-update-resource');

const toJsonApiResource = lib.toJsonApiResource;
const listJsonDirectory = lib.listJsonDirectory;
const recurseJsonDirectory = lib.recurseJsonDirectory;
const readJsonFile = lib.readJsonFile;

// Params:
// - app: The Application Object
// - args.source: Source directory path String
exports.main = function updateProperty(app, args) {
	const log = app.log;
	const source = Filepath.create(args.source);
	const baseUrl = app.baseUrl;

	let jwt = null;
	let client = new HttpClient({baseUrl, log});

	const users = [];
	let account = null;
	let channel = null;

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
		// Establish all the users
		.then(() => {
			const dir = source.append('user');

			if (!dir.isDirectory()) {
				throw new Error(`${dir} is not a directory`);
			}

			const promises = listJsonDirectory(dir).map(file => {
				return readJsonFile(file).then(resource => {
					return setupUser(log, client, resource);
				});
			});

			return Promise.all(promises).then(logins => {
				log.info('all users sucessfully setup');

				logins.forEach(login => {
					const user = login.relationships.user.data;

					// Add the users so we can reference them later.
					users.push(user);

					if (!jwt) {
						log.info(`established logged-in user ${user.id}`);
						jwt = login.attributes;
					}
				});

				// Setup the authenticated request client
				client = new HttpClient({baseUrl, log, jwt: jwt.token});
				return null;
			});
		})
		// Create or update the account.
		.then(() => {
			const dir = source.append('account');

			if (!dir.isDirectory()) {
				throw new Error(`${dir} is not a directory`);
			}

			const files = listJsonDirectory(dir);
			if (files.length < 1) {
				throw new Error(`An account file is required in ${dir}`);
			}
			if (files.length > 1) {
				throw new Error('Only one account may be created using this tool');
			}

			return readJsonFile(files[0])
				.then(resource => {
					return createOrUpdateResource(client, null, resource);
				})
				.then(data => {
					account = data;
					log.info(`account ${account.id} setup and updated`);
					return null;
				});
		})
		// Create or update the channel.
		.then(() => {
			const dir = source.append('channel');

			if (!dir.isDirectory()) {
				throw new Error(`${dir} is not a directory`);
			}

			const files = listJsonDirectory(dir);
			if (files.length < 1) {
				throw new Error(`A channel file is required in ${dir}`);
			}
			if (files.length > 1) {
				throw new Error('Only one channel may be created using this tool');
			}

			const memberIds = users.map(user => user.id).filter(id => {
				return id !== jwt.subject;
			});

			return readJsonFile(files[0])
				.then(resource => {
					// Add the relationships.
					const relationships = resource.relationships || {};
					relationships.account = {id: account.id, type: 'account'};
					resource.relationships = relationships;

					// Add the users.
					const members = resource.members || [];
					resource.members = members.concat(memberIds);

					return createOrUpdateChannel(log, client, resource);
				})
				.then(data => {
					channel = data;
					log.info(`channel ${channel.id} setup and updated`);
					return null;
				});
		})
		// Push the jobs.
		.then(() => {
			const dir = source.append('job');

			if (!dir.isDirectory()) {
				log.info(`No jobs to push`);
				return null;
			}

			return listJsonDirectory(dir).reduce((promise, file) => {
				return promise.then(() => {
					return readJsonFile(file).then(resource => {
						return createOrUpdateResource(client, channel.id, resource)
							.catch(maybeValidationError(file));
					});
				});
			}, Promise.resolve(null)).then(() => {
				log.info(`All jobs have been pushed`);
				return null;
			});
		})
		// Create or update all the content items
		.then(() => {
			const dir = source.append('content');

			if (!dir.isDirectory()) {
				log.info(`No content to update`);
				return null;
			}

			const files = recurseJsonDirectory(dir);

			function updateResource(file) {
				log.info(`Reading file ${file}`);
				return readJsonFile(file).then(resource => {
					resource = transformResource(channel.id, resource);

					return createOrUpdateResource(client, channel.id, resource)
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

function setupUser(log, client, userData) {
	const username = userData.username;
	const password = userData.password;

	return loginUser(client, {username, password}).then(res => {
		if (_.isObject(res) && res.type === 'login') {
			log.info(`user ${username} already created`);
			return res;
		}

		throw new Error(`Unexpected login response: ${res}`);
	}).catch(err => {
		if (/^No user for username/.test(err.detail)) {
			log.info(`creating user ${username} for the first time`);

			return createOrUpdateResource(client, null, userData).then(() => {
				log.info(`created user ${username}`);
				return loginUser(client, {username, password});
			});
		}

		throw new Error(`Unexpected user login error: "${err.detail}"`);
	});
}

function createOrUpdateChannel(log, client, channelData) {
	const data = toJsonApiResource(channelData);

	return Promise.resolve(null)
		.then(() => {
			return client.get(`/channels/${data.id}`).then(result => {
				const statusCode = result.res.statusCode;
				if (statusCode === 404) {
					return client.post(`/channels`, {data});
				} else if (statusCode === 200) {
					return client.patch(`/channels/${data.id}`, {data});
				}

				return result;
			});
		})
		.then(result => {
			const statusCode = result.res.statusCode;
			const body = result.body;

			if (statusCode === 201 || statusCode === 200 || statusCode === 204) {
				return body.data;
			}

			if (statusCode === 422) {
				const req = result.req;
				const error = new Error(`Validation errors from ${req.method} ${req.uri.href}`);
				error.code = 'VALIDATION_ERROR';
				error.errors = body.errors;
				throw error;
			}

			throw new Error(
				`Unexpected status code ${statusCode} from create or update channel id:${data.id}`
			);
		});
}
