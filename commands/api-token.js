'use strict';

const _ = require('lodash');
const HttpClient = require('../lib/http-client');
const loginUser = require('../lib/login-user');

// Params:
// - args.username: String
// - args.password: String
exports.main = function apiToken(app, args) {
	const log = app.log;
	const baseUrl = app.baseUrl;

	const client = new HttpClient({baseUrl, log});

	return loginUser(client, args).then(login => {
		if (_.isObject(login)) {
			return login.attributes;
		}

		if (login === 'NOT_FOUND') {
			log.error(`Username ${args.username} not found`);
		} else if (login === 'INVALID_PASSWORD') {
			log.error(`Invalid password`);
		}

		return null;
	});
};
