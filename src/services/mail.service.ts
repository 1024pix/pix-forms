import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { processBase64Attachment } from "./attachments.service.ts";
import { getConfigParam } from "./config.service.ts";

type MailAttachment = {
	name: string;
	type: string;
	content: string;
};

type FormResult = {
	customer_firstname: string;
	customer_lastname: string;
	customer_email: string;
	subject: string;
	attachments?: MailAttachment[];
	[key: string]: unknown;
};

export function buildEmailBody(formResult: FormResult): string {
	return Object.entries(formResult)
		.filter(([key]) => key !== "attachments")
		.map(([key, value]) => `<strong>${key}</strong><br> ${value}`)
		.join("<br><br>");
}

export function formatMailAttachment(
	attachment: MailAttachment,
): nodemailer.Attachment {
	return {
		filename: attachment.name,
		content: processBase64Attachment(attachment.content),
		contentType: attachment.type,
		encoding: "base64",
	};
}

async function sendEmail(options: nodemailer.SendMailOptions): Promise<void> {
	const smtpOptions: SMTPTransport.Options = {
		host: getConfigParam("SMTP_HOST"),
		port: Number(getConfigParam("SMTP_PORT")),
		secure: getConfigParam("SMTP_SECURE") === "true",
		auth: {
			user: getConfigParam("SMTP_USER"),
			pass: getConfigParam("SMTP_PASS"),
		},
	};
	const transporter = nodemailer.createTransport(smtpOptions);
	const info = await transporter.sendMail(options);
	console.log("Message sent:", info.messageId);
}

export async function sendFormEmail(
	formResult: FormResult,
	recipientAddress: string,
): Promise<void> {
	const sender = `${formResult.customer_firstname} ${formResult.customer_lastname} <forms@pix.digital>`;
	const body = buildEmailBody(formResult);

	await sendEmail({
		from: sender,
		replyTo: formResult.customer_email as string,
		to: recipientAddress,
		subject: formResult.subject,
		html: body.replace(/\n/g, "<br>"),
		attachments: formResult.attachments?.map(formatMailAttachment) ?? [],
	});
}
