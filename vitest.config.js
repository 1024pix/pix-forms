/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
	},
});
