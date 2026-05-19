import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
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

export async function sendFormEmail(
	formResult: FormResult,
	recipientAddress: string,
): Promise<void> {
	const sender = `${formResult.customer_firstname} ${formResult.customer_lastname} <forms@pix.digital>`;
	const body = _buildEmailBody(formResult);

	await _sendEmail({
		from: sender,
		replyTo: formResult.customer_email as string,
		to: recipientAddress,
		subject: formResult.subject,
		html: body.replace(/\n/g, "<br>"),
		attachments: formResult.attachments?.map(_formatMailAttachment) ?? [],
	});
}

function _buildEmailBody(formResult: FormResult): string {
	return Object.entries(formResult)
		.filter(([key]) => key !== "attachments")
		.map(([key, value]) => `<strong>${key}</strong><br> ${value}`)
		.join("<br><br>");
}

function _formatMailAttachment(attachment: MailAttachment): Mail.Attachment {
	return {
		filename: attachment.name,
		content: processBase64Attachment(attachment.content),
		contentType: attachment.type,
		encoding: "base64",
	};
}

async function _sendEmail(options: nodemailer.SendMailOptions): Promise<void> {
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
