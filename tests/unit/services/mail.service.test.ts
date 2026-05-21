import { sendFormEmail } from "../../../src/services/mail.service.ts";

const sendMailMock = vi
	.fn()
	.mockResolvedValue({ messageId: "test-message-id" });
vi.mock("nodemailer", () => ({
	default: {
		createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
	},
}));

const defaultFormResult = {
	customer_firstname: "John",
	customer_lastname: "Doe",
	customer_email: "john@example.com",
	subject: "Demande d'aide",
	message: "Bonjour",
	attachments: [],
};

describe("Unit | Services | Mail", () => {
	describe("#sendFormEmail", () => {
		beforeEach(() => {
			sendMailMock.mockClear();
			vi.stubEnv("SMTP_HOST", "localhost");
			vi.stubEnv("SMTP_PORT", "1025");
			vi.stubEnv("SMTP_SECURE", "false");
			vi.stubEnv("SMTP_USER", "user");
			vi.stubEnv("SMTP_PASS", "pass");
		});

		describe("When sending an email without attachments", () => {
			test("it should call sendMail with the correct recipient, subject, sender, replyTo and body", async () => {
				// when
				await sendFormEmail(defaultFormResult, "contact@example.com");

				// then
				expect(sendMailMock).toHaveBeenCalledOnce();
				const emailArg = sendMailMock.mock.calls[0][0];
				expect(emailArg.to).toBe("contact@example.com");
				expect(emailArg.subject).toBe("Demande d'aide");
				expect(emailArg.from).toBe("John Doe <forms@pix.digital>");
				expect(emailArg.replyTo).toBe("john@example.com");
				expect(emailArg.attachments).toEqual([]);
				expect(emailArg.html).toContain("<strong>message</strong><br> Bonjour");
				expect(emailArg.html).not.toContain("attachments");
			});
		});

		describe("When sending an email with attachments", () => {
			test("it should include formatted attachments", async () => {
				// given
				const formResult = {
					...defaultFormResult,
					attachments: [
						{
							name: "document.pdf",
							type: "application/pdf",
							content: "data:application/pdf;base64,JVBERi0x",
						},
					],
				};

				// when
				await sendFormEmail(formResult, "contact@example.com");

				// then
				const emailArg = sendMailMock.mock.calls[0][0];
				expect(emailArg.attachments).toHaveLength(1);
				expect(emailArg.attachments[0]).toMatchObject({
					filename: "document.pdf",
					contentType: "application/pdf",
					encoding: "base64",
					content: "JVBERi0x",
				});
			});
		});
	});
});
