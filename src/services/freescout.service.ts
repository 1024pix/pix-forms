import getConfigParam from "./config.service.ts";
import {processBase64Attachement} from "./attachements.ts";

type Attachement = {
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
	attachments: Attachement[];
	[key: string]: string | number | Attachement[];
}

const headers = {
	"X-FreeScout-API-Key": getConfigParam("FREESCOUT_API_KEY"),
	"Content-Type": "application/json",
	Accept: "application/json",
};

export async function createConversation(formResult: FormResult, freescoutMailboxId: number ) {
	const url = new URL(`${process.env.FREESCOUT_API_URL}/api/conversations`);

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
				attachments: formResult.attachments?.map(formatAttachment),
			},
		],
	};

	const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});

	const result = await response.json();
	if (result.message === 'Error occurred') {
		throw new Error(JSON.stringify(result));
	}

	console.log(`Conversation #${result.id} created`);

	const { id: customerId, lastName, firstName } = result?.customer;
	await updateCustomerAndCustomerFields(
		customerId,
		firstName,
		lastName,
		formResult,
	);
}

async function updateCustomerAndCustomerFields(
	customerId: number,
	firstName: string,
	lastName: string,
	formResult: FormResult,
) {
	if (!customerId) {
		console.log("pas de customer à update");
		return;
	}
	await updateCustomer(customerId, firstName, lastName, formResult);
	await updateCustomerFields(customerId, formResult);
}

async function updateCustomer(customerId: number, firstName: string, lastName: string, formResult: FormResult) {
	if(firstName === formResult.customer_firstname && lastName === formResult.customer_lastname) {
		return
	}
	const updateUrl = new URL(
		`${process.env.FREESCOUT_API_URL}/api/customers/${customerId}`,
	);

	const body = JSON.stringify({
		firstName: formResult.customer_firstname,
		lastName: formResult.customer_lastname,
	});

	await fetch(updateUrl, {
		method: "PUT",
		headers,
		body,
	});
}

async function updateCustomerFields(
	customerId: number,
	formResult: FormResult,
) {
	const customerFields = _extractCustomFields(formResult, "customer_field_");

	if (!customerFields.length) {
		console.log("pas de customerFields à update");
		return;
	}

	const updateUrl = new URL(
		`${process.env.FREESCOUT_API_URL}/api/customers/${customerId}/customer_fields`,
	);
	const body = JSON.stringify({ customerFields });

	await fetch(updateUrl, {
		method: "PUT",
		headers,
		body,
	});
}

function formatAttachment({ name, type, content }: Attachement) {
	return {
		fileName: name,
		mimeType: type,
		data: processBase64Attachement(content),
	};
}

function _extractCustomFields(
	formResult: FormResult,
	customFieldPrefix: string,
) {
	return Object.entries(formResult)
		.map(([key, value]) => {
			if (key.startsWith(customFieldPrefix)) {
				const customerFieldId = Number(key.replace(customFieldPrefix, ""));
				return { id: customerFieldId, value };
			}
			return null;
		})
		.filter((field) => field !== null);
}
