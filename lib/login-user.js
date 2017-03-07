'use strict';
const lib = require('./');

const toJsonApiResource = lib.toJsonApiResource;

// Params:
// - client: HTTP Client instance
// - args: Hash
//   - args.username: String
//   - args.password: String
//
// Returns a Promise for "NOT_FOUND" string if the user is not found,
// otherwise the full JSON web token resource from the server.
//
// If invalid user credentials are passed the resulting error message from
// the server will be wrapped and returned in a rejected Error.
function loginUser(client, args) {
	const username = args.username;
	const password = args.password;

	const data = toJsonApiResource({type: 'login', username, password});

	return client.post(`/logins`, {data}).then(result => {
		const statusCode = result.res.statusCode;
		const body = result.res.body;

		if (statusCode === 401) {
			const err = body.errors[0];

			if (/^No user for username/.test(err.detail)) {
				return 'NOT_FOUND';
			}

			throw new Error(`Unexpected user login error: "${err.detail}"`);
		}

		if (statusCode === 201) {
			return body.data;
		}

		throw new Error(`Unexpected HTTP status code ${statusCode} from /logins`);
	});
}

module.exports = loginUser;
