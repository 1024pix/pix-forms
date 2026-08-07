import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { FriendlyCaptchaClient } from "@friendlycaptcha/server-sdk";
import "dotenv/config";
import { getConfigParam } from "../services/config.service.ts";
import { createConversation } from "../services/freescout.service.ts";
import { sendFormEmail } from "../services/mail.service.ts";

export const server = {
	answer: defineAction({
		input: z.object({
			formSlug: z.string(),
			formResult: z.any(),
			captchaResponse: z.string(),
		}),

		handler: async ({ formSlug, formResult, captchaResponse }) => {
			let schema = null;
			try {
				schema = await import(`../forms/${formSlug}.json`);
			} catch (error: any) {
				console.error(error);
				throw new Error("Error loading survey JSON:", error);
			}

			const {
				saveToFreescout,
				freescoutMailboxId,
				sendByEmail,
				emailRecipientAddress,
			} = schema;

			const friendlyCaptchaSiteKey = getConfigParam(
				"FRIENDLY_CAPTCHA_SITE_KEY",
				true,
			);

			if (friendlyCaptchaSiteKey) {
				const frcClient = new FriendlyCaptchaClient({
					apiKey: getConfigParam("FRIENDLY_CAPTCHA_API_KEY", true),
					sitekey: friendlyCaptchaSiteKey,
				});

				const result = await frcClient.verifyCaptchaResponse(captchaResponse);

				if (!result.shouldAccept()) {
					if (result.response?.success === false) {
						throw new Error(
							`Le captcha n'a pas été validé (code erreur ${result.response?.error.detail}. Veuillez réessayer.`,
						);
					}
				}
			} else {
				console.log(
					"Friendly Captcha site key is not set. Skipping captcha verification.",
				);
			}

			if (saveToFreescout && freescoutMailboxId) {
				try {
					await createConversation(formResult, freescoutMailboxId);
				} catch (e) {
					console.log(e);
				}
			}

			if (sendByEmail && emailRecipientAddress) {
				await sendFormEmail(formResult, emailRecipientAddress);
			}

			console.log(`Form submitted`);
		},
	}),
};
