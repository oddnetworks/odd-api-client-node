'use strict';

const _ = require('lodash');

module.exports = function transformResource(channel, resource) {
	switch (resource.type) {
		case 'view':
			resource = transformView(channel, resource);
			break;
		case 'collection':
			resource = transformCollection(channel, resource);
			break;
		case 'platform':
			resource = transformPlatform(channel, resource);
			break;
		default:
			_.noop();
	}

	if (resource.relationships) {
		delete resource.channel;
		resource.relationships.channel = {data: {id: channel, type: 'channel'}};
	} else {
		resource.channel = channel;
	}

	return resource;
};

function transformView(channel, resource) {
	const relationships = resource.relationships;

	// API service view objects don't have relationships like Oddworks objects
	delete resource.relationships;

	if (!resource.content && relationships) {
		resource.content = Object.keys(relationships).reduce((content, key) => {
			const data = relationships[key].data;
			content[key] = Array.isArray(data) ? data : [data];
			return content;
		}, {});
	}

	return resource;
}

function transformCollection(channel, resource) {
	const relationships = resource.relationships;

	// API service view objects don't have relationships like Oddworks objects
	delete resource.relationships;

	if (!resource.children && relationships) {
		resource.children = Object.keys(relationships).reduce((content, key) => {
			const data = relationships[key].data;
			content[key] = Array.isArray(data) ? data : [data];
			return content;
		}, {});
	}

	return resource;
}

function transformPlatform(channel, resource) {
	if (resource.platformType) {
		resource.title = resource.platformType;
	}

	resource.id = `${channel}-${resource.title}-${resource.category}`.toLowerCase();
	return resource;
}
