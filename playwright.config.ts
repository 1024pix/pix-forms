import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/integration",
	fullyParallel: false,
	retries: 0,
	reporter: "list",
	use: {
		baseURL: "http://localhost:4321",
		trace: "retain-on-failure",
	},
	webServer: {
		command: "npm run build && npm run preview",
		url: "http://localhost:4321",
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
