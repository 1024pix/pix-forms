export function processBase64Attachment(content: string): string {
	return content.split("base64,")[1];
}
