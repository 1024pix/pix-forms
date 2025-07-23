import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
	answer: defineAction({
		input: z.object({
			formId: z.string(),
		}),
		handler: async (input) => {
			const { formId } = input;
			// Handle the form submission logic here
			console.log(`Form submitted with ID: ${formId}`);
		},
	}),
};
