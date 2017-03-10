'use strict';

const _ = require('lodash');
const slug = require('slug');

exports.toJsonApiResource = function (resource) {
	const data = _.pick(resource, ['id', 'type']);
	data.attributes = _.omit(resource, ['id', 'type', 'relationships']);

	if (resource.relationships) {
		const relationships = resource.relationships;
		data.relationships = Object.keys(relationships).reduce((related, key) => {
			let links = _.get(relationships, `${key}.data`);
			if (!links) {
				links = relationships[key];
			}

			related[key] = {data: links};
			return related;
		}, Object.create(null));
	}

	return data;
};

exports.listJsonDirectory = function (dir) {
	return dir.list().filter(file => {
		return file.extname() === '.json';
	});
};

exports.recurseJsonDirectory = function (dir) {
	const files = [];

	dir.recurse(file => {
		if (file.extname() === '.json') {
			files.push(file);
		}
	});

	return files;
};

exports.readJsonFile = function (filepath) {
	return filepath.read().then(text => {
		let json;

		try {
			json = JSON.parse(text);
		} catch (err) {
			throw new Error(
				`JSON parsing error "${err.message}" in file at ${filepath}`
			);
		}

		return json;
	});
};

exports.slugify = function (str) {
	return slug(str || '', {lower: true}).slice(0, 60);
};
