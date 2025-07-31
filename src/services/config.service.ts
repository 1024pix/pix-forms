export default function getConfigParam(key: string, optional = false) {
	const param = process.env[key] || "";

	if (param === "" && !optional) {
		throw new Error(`Configuration parameter ${key} is not set.`);
	}

	return param;
}
