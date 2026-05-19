import { getConfigParam } from "../../../src/services/config.service";

describe("Unit | Services | Config", () => {
	describe("#getConfigParam", () => {
		describe("When env variable is defined", () => {
			test("it should return its value", () => {
				// given
				vi.stubEnv("API_URL", "url");

				// when
				const result = getConfigParam("API_URL");

				// then
				expect(result).toBe("url");
			});
		});

		describe("When env variable is not defined but is optional", () => {
			test("it should return empty string", () => {
				// when
				const result = getConfigParam("UNDEFINED_ENV_VARIABLE", true);

				// then
				expect(result).toBe("");
			});
		});

		describe("When env variable is not defined and is not optional", () => {
			test("it should throw an error", () => {
				// when
				const getConfigParamFunction = () =>
					getConfigParam("UNDEFINED_MANDATORY_ENV_VARIABLE", false);

				// then
				expect(getConfigParamFunction).toThrow(
					new Error(
						"Configuration parameter UNDEFINED_MANDATORY_ENV_VARIABLE is not set.",
					),
				);
			});
		});
	});
});
