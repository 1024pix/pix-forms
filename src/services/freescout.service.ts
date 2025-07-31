import getConfigParam from "./config.service.ts";


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

export async function sendForm( formResult: FormResult, freescoutMailboxId: number ) {
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

	const customerId = result?.customer?.id;
	await updateCustomerFields(customerId, formResult);
}

async function updateCustomerFields(customerId: number, formResult: FormResult) {
	if (!customerId) {
		console.log("pas de customer à update");
		return;
	}
	const customerFields = [];

	for (const [key, value] of Object.entries(formResult)) {
		const regex = /customer_field_(\d+)/g;
		const customerFieldRegexResult = [...key.matchAll(regex)];
		if (customerFieldRegexResult.length) {
			const [_, customerFieldId] = customerFieldRegexResult[0];
			customerFields.push({
				id: customerFieldId,
				value,
			});
		}
	}

	if (!customerFields.length) {
		console.log("pas de customerFields à update");
		return;
	}
	const updateUrl = new URL(
		`${process.env.FREESCOUT_API_URL}/api/customers/${customerId}/customer_fields`,
	);
	const updateBody = JSON.stringify({ customerFields });

	await fetch(updateUrl, {
		method: "PUT",
		headers,
		body: updateBody,
	});
}

function formatAttachment({ name, type, content }: Attachement) {
	const data = content.split("base64,")[1];
	return {
		fileName: name,
		mimeType: type,
		data,
	};
}
