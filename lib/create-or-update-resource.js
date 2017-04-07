'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const inflection = require('inflection');
const lib = require('./');

const toJsonApiResource = lib.toJsonApiResource;

// Params:
// - client: HTTP Client instance
// - channel: Channel ID String *optional*
//
// Only use a channel ID string if the resource is scoped to a channel.
// Otherwise omit it.
//
// Example resource Object:
//   {
//     id: 'abc-123',
//     type: 'widget',
//     title: 'Citizen Kane',
//     description: 'The best film of all time?'
//   }
//
// Returns a Promise for the JSON API resource returned from
// the server.
//
// In case of a validation error a rejected Promise for an error will be
// returned with code 'VALIDATION_ERROR' and an errors Array.
function createOrUpdateResource(client, channel, resource) {
	const data = toJsonApiResource(resource);

	return Promise.resolve(null)
		// Try to create the resource using a POST
		.then(() => {
			const typePath = _.kebabCase(inflection.pluralize(data.type));

			let path;
			if (channel) {
				path = `/channels/${channel}/${typePath}/`;
			} else {
				path = `/${typePath}/`;
			}

			return client.post(path, {data});
		})
		.then(result => {
			const body = result.res.body;
			const statusCode = result.res.statusCode;

			if (statusCode === 201) {
				return result;
			}

			if (statusCode === 422) {
				const req = result.req;
				const error = new Error(`Validation errors from ${req.method} ${req.uri.href}`);
				error.code = 'VALIDATION_ERROR';
				error.errors = body.errors;
				throw error;
			}

			if (statusCode !== 409) {
				throw new Error(
					`Unexpected status code ${statusCode} from POST resource type:${data.type} id:${data.id}`
				);
			}

			// If creating using a POST fails, try updating using PATCH
			const typePath = _.kebabCase(inflection.pluralize(data.type));

			let path;
			if (channel) {
				path = `/channels/${channel}/${typePath}/${data.id}`;
			} else {
				path = `/${typePath}/${data.id}`;
			}

			return client.patch(path, {data});
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
				`Unexpected status code ${statusCode} from PATCH resource type:${data.type} id:${data.id}`
			);
		});
}

module.exports = createOrUpdateResource;
