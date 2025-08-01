import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { FriendlyCaptchaClient } from "@friendlycaptcha/server-sdk";
import "dotenv/config";
import nodemailer from "nodemailer";
import { processBase64Attachement } from "../services/attachements.ts";
import getConfigParam from "../services/config.service.ts";
import { createConversation } from "../services/freescout.service.ts";

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

				if (result.shouldReject()) {
					throw new Error(
						`Le captcha n'a pas été validé (code erreur ${result.response?.error.detail}. Veuillez réessayer.`,
					);
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
				const sender = `${formResult.customer_firstname} ${formResult.customer_lastname} <forms@pix.digital>`;
				const subject = formResult.subject;

				const transporter = nodemailer.createTransport({
					host: getConfigParam("SMTP_HOST"),
					port: getConfigParam("SMTP_PORT"),
					secure: getConfigParam("SMTP_SECURE") === "true",
					auth: {
						user: getConfigParam("SMTP_USER"),
						pass: getConfigParam("SMTP_PASS"),
					},
				});

				const message = Object.entries(formResult)
					.map(([key, value]) => {
						if (key !== "attachments") {
							return `<strong>${key}</strong><br> ${value}`;
						}
						return null;
					})
					.join("<br><br>");

				const email = {
					from: sender,
					replyTo: formResult.customer_email,
					to: emailRecipientAddress,
					subject,
					html: message.replace(/\n/g, "<br>"),
					attachments: [],
				};

				if (formResult.attachments && formResult.attachments.length > 0) {
					email.attachments = formResult.attachments.map((attachment: any) => {
						return {
							filename: attachment.name,
							content: processBase64Attachement(attachment.content),
							contentType: attachment.type,
							encoding: "base64",
						};
					});
				}

				const info = await transporter.sendMail(email);

				console.log("Message sent:", info.messageId);
			}

			console.log(`Form submitted`);
		},
	}),
};
