export default function getConfigParam(key) {
	const param = process.env[key];

	if (param === undefined) {
		throw new Error(`Configuration parameter ${key} is not set.`);
	}

	return param;
}
