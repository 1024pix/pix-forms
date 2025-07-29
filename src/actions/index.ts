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
			freescoutMailboxId: z.number().optional(),
		}),

		handler: async ({  formResult, captchaResponse, saveToFreescout, freescoutMailboxId }) => {
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
					mailboxId: freescoutMailboxId,

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
								email: formResult.customer_email,
							},
							attachments: formResult.attachments .map(formatAttachment)
						},
					],
				};

				let response;
				try {
					response = await fetch(url, {
						method: "POST",
						headers: headers,
						body: JSON.stringify(body),
					});

				} catch (e) {
					console.log(e);
				}

				// update customer


				const customerId = (await response.json())?.customer?.id

				if(!customerId) {
					console.log('pas de customer à update')
					return
				}
				const customerFields = []

				for (let [key, value] of Object.entries(formResult)) {
					const regex = /customer_id(\d+)/g
					const customFieldRegexResult = [...key.matchAll(regex)]
					if(customFieldRegexResult.length) {
						const [_, customerFieldId] = customFieldRegexResult[0]
						customerFields.push({
							id: customerFieldId,
							value
						})
					}
				}

				if(!customerFields.length) {
					console.log('pas de customerFields à update')
					return
				}
				const updateUrl = new URL(
					`${process.env.FREESCOUT_API_URL}/api/customers/${customerId}/customer_fields`,
				);
				const updateBody = JSON.stringify({customerFields})

				try {
					await fetch(updateUrl, {
						method: "PUT",
						headers: headers,
						body: updateBody,
					});
				} catch (e) {
					console.log(e)
				}

			}

			console.log(`Form submitted`);
		},
	}),
};

function formatAttachment({name, type, content}) {
	return {
			fileName: name,
			mimeType: type,
			data: content.split('base64,')[1]
		}
}