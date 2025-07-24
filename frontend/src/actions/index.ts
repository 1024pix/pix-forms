import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { FriendlyCaptchaClient } from "@friendlycaptcha/server-sdk";
import 'dotenv/config';

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
	validateCaptcha: defineAction({
		input: z.object({
			captchaResponse: z.string(),
		}),
		handler: async ({captchaResponse}) => {
			const frcClient = new FriendlyCaptchaClient({
				apiKey: process.env.FRIENDLY_CAPTCHA_API_KEY,
				sitekey: process.env.FRIENDLY_CAPTCHA_SITE_KEY,
			});
			const result = await frcClient.verifyCaptchaResponse(captchaResponse);
			return result.shouldAccept()
		}
	})
};
