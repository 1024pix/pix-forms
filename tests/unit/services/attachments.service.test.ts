import { processBase64Attachment } from "../../../src/services/attachments.service";

describe("Unit | Services | Attachments", () => {
	describe("#processBase64Attachment", () => {
		test("Returns second part of base64 encoded URL", () => {
			// given
			const fileContent: string = "data:application/pdf;base64,ABC123";

			// when
			const result = processBase64Attachment(fileContent);

			// then
			expect(result).to.equal("ABC123");
		});
	});
});
