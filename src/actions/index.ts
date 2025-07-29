import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { FriendlyCaptchaClient } from "@friendlycaptcha/server-sdk";
import "dotenv/config";
import getConfigParam from "../services/config.service.ts";
import { sendForm } from "../services/freescout.service.ts";

export const server = {
	answer: defineAction({
		input: z.object({
			formResult: z.any(),
			captchaResponse: z.string(),
			saveToFreescout: z.boolean().optional(),
			freescoutMailboxId: z.number().optional(),
		}),

		handler: async ({
			formResult,
			captchaResponse,
			saveToFreescout,
			freescoutMailboxId,
		}) => {
			const friendlyCaptchaSiteKey = getConfigParam(
				"FRIENDLY_CAPTCHA_SITE_KEY",
				true,
			);
			if (friendlyCaptchaSiteKey) {
				console.log(
					"Friendly Captcha site key is not set. Skipping captcha verification.",
				);
				const frcClient = new FriendlyCaptchaClient({
					apiKey: getConfigParam("FRIENDLY_CAPTCHA_API_KEY", true),
					sitekey: friendlyCaptchaSiteKey,
				});
				const result = await frcClient.verifyCaptchaResponse(captchaResponse);

				if (result.shouldReject()) {
					throw new Error(
						`Le captcha n'a pas été validé (code erreur ${result.response?.error.detail}. Veuillez réessayer.`,
					);
				}
			}
			if (saveToFreescout) {
				try {
					await sendForm({ formResult, freescoutMailboxId });
				} catch (e) {
					console.log(e);
				}
			}

			console.log(`Form submitted`);
		},
	}),
};
