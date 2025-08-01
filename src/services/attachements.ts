export function processBase64Attachement(content: string): string {
	return content.split("base64,")[1];
}
