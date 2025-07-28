import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { FriendlyCaptchaClient } from "@friendlycaptcha/server-sdk";
import "dotenv/config";
import getConfigParam from "../services/config.service.ts";

export const server = {
	answer: defineAction({
		input: z.object({
			formResult: z.any(),
			captchaResponse: z.string(),
			saveToFreescout: z.boolean().optional(),
		}),

		handler: async ({  formResult, captchaResponse, saveToFreescout }) => {
      const friendlyCaptchaSiteKey = getConfigParam("FRIENDLY_CAPTCHA_SITE_KEY", true);
      if (friendlyCaptchaSiteKey) {
				console.log("Friendly Captcha site key is not set. Skipping captcha verification.");
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
				const url = new URL(
					`${process.env.FREESCOUT_API_URL}/api/conversations`,
				);

				const headers = {
					"X-FreeScout-API-Key": getConfigParam("FREESCOUT_API_KEY"),
					"Content-Type": "application/json",
					Accept: "application/json",
				};
				const body = {
					type: "email",
					mailboxId: 3,

					subject: formResult.subject,
					customer: {
						email: formResult.customer_email,
						firstName: formResult.customer_firstname,
						lastName: formResult.customer_lastname,
					},
					threads: [
						{
							text: formResult.message,
							type: "custom",
							customer: {
								email: formResult.email,
							},
						},
					],
				};
				try {
					await fetch(url, {
						method: "POST",
						headers: headers,
						body: JSON.stringify(body),
					});
				} catch (e) {
					console.log(e);
				}
			}

			console.log(`Form submitted`);
		},
	}),
};
