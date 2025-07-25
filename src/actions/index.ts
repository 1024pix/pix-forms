import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { FriendlyCaptchaClient } from "@friendlycaptcha/server-sdk";
import 'dotenv/config';
import getConfigParam from "../services/config.service.ts";

export const server = {
  answer: defineAction({
    input: z.object({
      formId: z.string(),
      formResult: z.any(),
      captchaResponse: z.string(),
      context: z.string(),
    }),

    handler: async ({ formId, formResult, captchaResponse, context }) => {
      const frcClient = new FriendlyCaptchaClient({
        apiKey: getConfigParam('FRIENDLY_CAPTCHA_API_KEY'),
        sitekey: getConfigParam('FRIENDLY_CAPTCHA_SITE_KEY'),
      });
      const result = await frcClient.verifyCaptchaResponse(captchaResponse);
      console.log('url',`${process.env.FREESCOUT_API_URL}/api/conversations`)
      if (result.shouldReject()) {
        throw new Error(
          `Le captcha n'a pas été validé (code erreur ${result.response?.error.detail}. Veuillez réessayer.`
        );
      }
      if(context === 'freescout') {

        const url = new URL(`${process.env.FREESCOUT_API_URL}/api/conversations`);

        let headers = {
          "X-FreeScout-API-Key": getConfigParam('FREESCOUT_API_KEY'),
          "Content-Type": "application/json",
          "Accept": "application/json",
        }
        let body = {
          "type": "email",
          "mailboxId": 3,

          "subject": formResult.subject,
          "customer": {
            "email": formResult.email
          },
          "threads": [
            {
              "text": formResult.message,
              "type": "custom",
              "customer": {
                "email": formResult.email
              },
            },
          ],
        }
        try {
          await fetch(url,
            {
              method: "POST",
              headers: headers,
              body: JSON.stringify(body)
            })
        } catch (e) {
          console.log(e)
        }

      }

      console.log(`Form submitted with ID: ${formId}`);
    },
  }),
};
