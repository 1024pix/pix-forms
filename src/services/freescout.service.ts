import getConfigParam from "./config.service.ts";

export async function sendForm({ formResult, freescoutMailboxId }) {
	const url = new URL(`${process.env.FREESCOUT_API_URL}/api/conversations`);

	const headers = {
		"X-FreeScout-API-Key": getConfigParam("FREESCOUT_API_KEY"),
		"Content-Type": "application/json",
		Accept: "application/json",
	};
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
				attachments: formResult.attachments.map(formatAttachment),
			},
		],
	};

	const response = await fetch(url, {
		method: "POST",
		headers: headers,
		body: JSON.stringify(body),
	});

	const customerId = (await response.json())?.customer?.id;

	await updateCustomer({ customerId, headers, formResult });
}

async function updateCustomer({ customerId, headers, formResult }) {
	if (!customerId) {
		console.log("pas de customer à update");
		return;
	}
	const customerFields = [];

	for (const [key, value] of Object.entries(formResult)) {
		const regex = /customer_id(\d+)/g;
		const customFieldRegexResult = [...key.matchAll(regex)];
		if (customFieldRegexResult.length) {
			const [_, customerFieldId] = customFieldRegexResult[0];
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
		headers: headers,
		body: updateBody,
	});
}

function formatAttachment({ name, type, content }) {
	const data = content.split("base64,")[1];
	return {
		fileName: name,
		mimeType: type,
		data,
	};
}
