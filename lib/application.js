'use strict';

class Application {
	constructor(props) {
		this.log = props.log;
		this.baseUrl = props.baseUrl;
	}

	static create(props) {
		props = props || {};

		if (!props.baseUrl) {
			throw new Error('props.baseUrl is required');
		}

		if (!props.log) {
			throw new Error('props.log is required');
		}

		return new Application(props);
	}
}

module.exports = Application;
