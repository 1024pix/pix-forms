import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { FriendlyCaptchaClient } from "@friendlycaptcha/server-sdk";
import 'dotenv/config';

export const server = {
  answer: defineAction({
    input: z.object({
      formId: z.string(),
      captchaResponse: z.string(),
    }),
    handler: async ({ formId, captchaResponse }) => {
      const frcClient = new FriendlyCaptchaClient({
        apiKey: process.env.FRIENDLY_CAPTCHA_API_KEY,
        sitekey: process.env.FRIENDLY_CAPTCHA_SITE_KEY,
      });
      const result = await frcClient.verifyCaptchaResponse(captchaResponse);

      if (result.shouldReject()) {
        throw new Error(
          `Le captcha n'a pas été validé (code erreur ${result.response?.error.detail}. Veuillez réessayer.`
        );
      }

      console.log(`Form submitted with ID: ${formId}`);
    },
  }),
};
