'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const request = require('request');

class HttpClient {
	// props.baseUrl *required*
	// props.jwt
	// props.log *required*
	constructor(props) {
		this.baseUrl = props.baseUrl;
		this.jwt = props.jwt;
		this.log = props.log;
	}

	get(path, query) {
		return this.request('GET', path, query);
	}

	post(path, data) {
		return this.request('POST', path, data);
	}

	patch(path, data) {
		return this.request('PATCH', path, data);
	}

	request(method, path, data) {
		const BASE_URL = this.baseUrl;
		const JWT = this.jwt;
		const log = this.log;
		method = method.toUpperCase();

		const params = {
			method,
			url: `${BASE_URL}${path}`
		};

		if (data) {
			if (method === 'GET') {
				params.qs = data;
			} else {
				params.json = data;
			}
		}

		if (JWT) {
			params.headers = {
				Authorization: `Bearer ${JWT}`
			};
		}

		return new Promise((resolve, reject) => {
			log.debug(`HTTP request ${params.method} ${params.url}`);

			const req = request(params, (err, res) => {
				if (err) {
					return reject(err);
				}

				let body = res.body;

				if (_.isString(res.body)) {
					try {
						body = JSON.parse(res.body);
					} catch (err) {
						return reject(new Error(
							`HTTP response body JSON parsing error: ${err.message}`
						));
					}
				}

				return resolve({req: req.toJSON(), res: res.toJSON(), body});
			});
		});
	}
}

module.exports = HttpClient;
