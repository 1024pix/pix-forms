import { createConversation } from "../../../src/services/freescout.service";

const defaultFormResult = {
	customer_email: "john@example.com",
	customer_firstname: "John",
	customer_lastname: "Doe",
	subject: "Help",
	message: "I need help",
	attachments: [],
};

function mockFetch(customer = { id: 1, firstName: "John", lastName: "Doe" }) {
	const fetchMock = vi
		.fn()
		.mockResolvedValueOnce({
			json: () => Promise.resolve({ id: 42, customer }),
		})
		.mockResolvedValue({ json: () => Promise.resolve({}) });
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

describe("Unit | Services | Freescout", () => {
	describe("#createConversation", () => {
		beforeEach(() => {
			vi.stubEnv("FREESCOUT_API_KEY", "test-api-key");
			vi.stubEnv("FREESCOUT_API_URL", "https://freescout.test");
			vi.spyOn(console, "log").mockImplementation(() => {});
		});

		describe("When the API call succeeds", () => {
			test("it should POST the conversation with the correct body and log its id", async () => {
				// given
				const fetchMock = mockFetch();

				// when
				await createConversation(defaultFormResult, 3);

				// then
				const [postUrl, postOptions] = fetchMock.mock.calls[0];
				expect(postUrl.href).toContain("/api/conversations");
				expect(postOptions.method).toBe("POST");
				expect(JSON.parse(postOptions.body)).toMatchObject({
					type: "email",
					mailboxId: 3,
					subject: "Help",
					customer: {
						email: "john@example.com",
						firstName: "John",
						lastName: "Doe",
					},
				});
				expect(vi.mocked(console.log)).toHaveBeenCalledWith(
					"Conversation #42 created",
				);
			});
		});

		describe("When the API returns an error", () => {
			test("it should throw an error", async () => {
				// given
				vi.stubGlobal(
					"fetch",
					vi.fn().mockResolvedValue({
						json: () =>
							Promise.resolve({
								message: "Error occurred",
								errors: ["invalid mailbox"],
							}),
					}),
				);

				// when / then
				await expect(
					createConversation(defaultFormResult, 3),
				).rejects.toThrow();
			});
		});

		describe("Regarding customer name update", () => {
			describe("When both names differ from the returned ones", () => {
				test("it should call the customer update endpoint with the new names", async () => {
					// given
					const fetchMock = mockFetch({
						id: 7,
						firstName: "Old",
						lastName: "Name",
					});

					// when
					await createConversation(defaultFormResult, 3);

					// then
					const putCalls = fetchMock.mock.calls.filter(
						([url]) =>
							(url as URL).href.includes("/api/customers/7") &&
							!(url as URL).href.includes("customer_fields"),
					);
					expect(putCalls).toHaveLength(1);
					expect(putCalls[0][1].method).toBe("PUT");
					expect(JSON.parse(putCalls[0][1].body)).toEqual({
						firstName: "John",
						lastName: "Doe",
					});
				});
			});

			describe("When only one name differs from the returned one", () => {
				test("it should call the customer update endpoint", async () => {
					// given
					const fetchMock = mockFetch({
						id: 1,
						firstName: "Old",
						lastName: "Doe",
					});

					// when
					await createConversation(defaultFormResult, 3);

					// then
					const customerUpdateCalls = fetchMock.mock.calls.filter(
						([url]) =>
							(url as URL).href.includes("/api/customers/1") &&
							!(url as URL).href.includes("customer_fields"),
					);
					expect(customerUpdateCalls).toHaveLength(1);
				});
			});

			describe("When names match the returned ones", () => {
				test("it should not call the customer update endpoint", async () => {
					// given
					const fetchMock = mockFetch({
						id: 1,
						firstName: "John",
						lastName: "Doe",
					});

					// when
					await createConversation(defaultFormResult, 3);

					// then
					const customerUpdateCalls = fetchMock.mock.calls.filter(
						([url]) =>
							(url as URL).href.includes("/api/customers/1") &&
							!(url as URL).href.includes("customer_fields"),
					);
					expect(customerUpdateCalls).toHaveLength(0);
				});
			});
		});

		describe("Regarding customer fields update", () => {
			describe("When the form has customer fields", () => {
				test("it should call the customer fields update endpoint", async () => {
					// given
					const formResult = {
						...defaultFormResult,
						customer_field_5: "important value",
					};
					const fetchMock = mockFetch({
						id: 1,
						firstName: "John",
						lastName: "Doe",
					});

					// when
					await createConversation(formResult, 3);

					// then
					const customerFieldsCalls = fetchMock.mock.calls.filter(([url]) =>
						(url as URL).href.includes("/api/customers/1/customer_fields"),
					);
					expect(customerFieldsCalls).toHaveLength(1);
					expect(customerFieldsCalls[0][1].method).toBe("PUT");
					expect(JSON.parse(customerFieldsCalls[0][1].body)).toEqual({
						customerFields: [{ id: 5, value: "important value" }],
					});
				});
			});

			describe("When the form has no customer fields", () => {
				test("it should not call the customer fields update endpoint", async () => {
					// given
					const fetchMock = mockFetch();

					// when
					await createConversation(defaultFormResult, 3);

					// then
					const customerFieldsCalls = fetchMock.mock.calls.filter(([url]) =>
						(url as URL).href.includes("/api/customers/1/customer_fields"),
					);
					expect(customerFieldsCalls).toHaveLength(0);
				});
			});
		});
	});
});
