import {
	extractCustomFields,
	formatAttachment,
} from "../../src/services/freescout.service";

describe("Unit | Services | Freescout", () => {
	describe("#extractCustomFields", () => {
		describe("When properties are matching `custom_field_` prefix", () => {
			test("it should return an array of custom fields with their ids and values", () => {
				// given
				const form = {
					customer_email: "robloche@example.net",
					customer_firstname: "Rob",
					customer_lastname: "Lochon",
					subject: "Sujet",
					message: "My message",
					attachments: [],
					custom_field_123: "Value for 123",
					custom_field_456: "Value for 456",
				};

				// when
				const result = extractCustomFields(form, "custom_field_");

				// then
				expect(result).toEqual([
					{ id: 123, value: "Value for 123" },
					{ id: 456, value: "Value for 456" },
				]);
			});
		});

		describe("When passing `customer_field` prefix", () => {
			test("it should return an array of `customer fields` with their ids and values", () => {
				// given
				const form = {
					customer_email: "robloche@example.net",
					customer_firstname: "Rob",
					customer_lastname: "Lochon",
					subject: "Sujet",
					message: "My message",
					attachments: [],
					customer_field_1: "Value for customer field 1",
					customer_field_2: "Value for customer field 2",
				};

				// when
				const result = extractCustomFields(form, "customer_field_");

				// then
				expect(result).toEqual([
					{ id: 1, value: "Value for customer field 1" },
					{ id: 2, value: "Value for customer field 2" },
				]);
			});
		});

		describe("When no custom fields are matching the prefix", () => {
			test("it should return an empty array", () => {
				// given
				const form = {
					customer_email: "robloche@example.net",
					customer_firstname: "Rob",
					customer_lastname: "Lochon",
					subject: "Sujet",
					message: "My message",
					attachments: [],
					custom_field_1: "Value for 123",
					custom_field_2: "Value for 456",
				};

				// when
				const result = extractCustomFields(form, "foo");

				// then
				expect(result).toEqual([]);
			});
		});
	});

	describe("#formatAttachment", () => {
		test("it should return an object matching required interface for Freescout", () => {
			// given
			const attachment = {
				name: "document.pdf",
				type: "application/pdf",
				content: "data:application/pdf;base64,ABC123",
			};

			// when
			const result = formatAttachment(attachment);

			// then
			expect(result).toEqual({
				fileName: "document.pdf",
				mimeType: "application/pdf",
				data: "ABC123",
			});
		});
	});
});
