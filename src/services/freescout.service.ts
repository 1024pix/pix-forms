import { processBase64Attachment } from "./attachments.service.ts";
import { getConfigParam } from "./config.service.ts";

type Attachment = {
	name: string;
	type: string;
	content: string; // base64 encoded content
};

type FormResult = {
	customer_email: string;
	customer_firstname: string;
	customer_lastname: string;
	subject: string;
	message: string;
	attachments: Attachment[];
	[key: string]: string | number | Attachment[];
};

type FreescoutAttachment = {
	fileName: string;
	mimeType: string;
	data: string;
};

export async function createConversation(
	formResult: FormResult,
	freescoutMailboxId: number,
) {
	const url = new URL(
		`${getConfigParam("FREESCOUT_API_URL")}/api/conversations`,
	);

	const body = {
		type: "email",
		mailboxId: freescoutMailboxId,
		subject: formResult.subject,
		customer: {
			email: formResult.customer_email,
			firstName: formResult.customer_firstname,
			lastName: formResult.customer_lastname,
		},
		customFields: _extractCustomFields(formResult, "custom_field_"),
		threads: [
			{
				text: formResult.message,
				type: "custom",
				customer: {
					email: formResult.customer_email,
				},
				attachments: formResult.attachments?.map(_formatAttachment),
			},
		],
	};

	const response = await fetch(url, {
		method: "POST",
		headers: _getHeaders(),
		body: JSON.stringify(body),
	});

	const result = await response.json();
	if (!result) return;
	if (result.message === "Error occurred") {
		throw new Error(JSON.stringify(result));
	}

	console.log(`Conversation #${result.id} created`);
	const { id: customerId, firstName, lastName } = result.customer;
	if (!customerId) return;

	if (_hasNameChanged(firstName, lastName, formResult)) {
		await _updateCustomer(customerId, formResult);
	}

	const customerFields = _extractCustomFields(formResult, "customer_field_");
	if (_hasCustomerFields(customerFields)) {
		await _updateCustomerFields(customerId, customerFields);
	}
}

function _extractCustomFields(
	formResult: FormResult,
	customFieldPrefix: string,
): { id: number; value: string | number | Attachment[] }[] {
	return Object.entries(formResult)
		.filter(([key]) => key.startsWith(customFieldPrefix))
		.map(([key, value]) => ({
			id: Number(key.replace(customFieldPrefix, "")),
			value,
		}));
}

function _formatAttachment({
	name,
	type,
	content,
}: Attachment): FreescoutAttachment {
	return {
		fileName: name,
		mimeType: type,
		data: processBase64Attachment(content),
	};
}

function _getHeaders() {
	return {
		"X-FreeScout-API-Key": getConfigParam("FREESCOUT_API_KEY"),
		"Content-Type": "application/json",
		Accept: "application/json",
	};
}

function _hasCustomerFields(
	customerFields: { id: number; value: string | number | Attachment[] }[],
): boolean {
	return customerFields.length > 0;
}

function _hasNameChanged(
	firstName: string,
	lastName: string,
	formResult: FormResult,
): boolean {
	return (
		firstName !== formResult.customer_firstname ||
		lastName !== formResult.customer_lastname
	);
}

async function _updateCustomer(customerId: number, formResult: FormResult) {
	const updateUrl = new URL(
		`${getConfigParam("FREESCOUT_API_URL")}/api/customers/${customerId}`,
	);
	await fetch(updateUrl, {
		method: "PUT",
		headers: _getHeaders(),
		body: JSON.stringify({
			firstName: formResult.customer_firstname,
			lastName: formResult.customer_lastname,
		}),
	});
}

async function _updateCustomerFields(
	customerId: number,
	customerFields: { id: number; value: string | number | Attachment[] }[],
) {
	const updateUrl = new URL(
		`${getConfigParam("FREESCOUT_API_URL")}/api/customers/${customerId}/customer_fields`,
	);
	await fetch(updateUrl, {
		method: "PUT",
		headers: _getHeaders(),
		body: JSON.stringify({ customerFields }),
	});
}
