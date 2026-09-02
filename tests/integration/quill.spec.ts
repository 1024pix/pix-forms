import { expect, type Page, test } from "@playwright/test";

const FORM_SLUG = "[E2E]-quill";

async function _getSavedSurveyJson(page: Page): Promise<any | null> {
	const raw = await page.evaluate(() =>
		window.localStorage.getItem("survey-json"),
	);
	return raw ? JSON.parse(raw) : null;
}

function _findQuestion(json: any, questionName: string) {
	return json?.pages?.[0]?.elements?.find(
		(el: { name: string }) => el.name === questionName,
	);
}

async function _getSavedTitle(
	page: Page,
	questionName: string,
): Promise<string | undefined> {
	const json = await _getSavedSurveyJson(page);
	return _findQuestion(json, questionName)?.title;
}

async function _getSavedDescription(
	page: Page,
	questionName: string,
): Promise<string | undefined> {
	const json = await _getSavedSurveyJson(page);
	return _findQuestion(json, questionName)?.description;
}

async function _getSavedHtml(
	page: Page,
	questionName: string,
): Promise<string | undefined> {
	const json = await _getSavedSurveyJson(page);
	return _findQuestion(json, questionName)?.html;
}

test.describe("Integration | quill config", () => {
	test.describe("Question title", () => {
		test("it should strip the wrapping <p> and block a second line", async ({
			page,
		}) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page.getByRole("tab", { name: "Éditeur de sondage" }).click();
			await page.getByText("Titre initial", { exact: true }).click();

			const titleEditor = page.locator('[data-name="title"] .ql-editor');

			// when
			await titleEditor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await page.keyboard.type("Nouveau titre");
			await page.keyboard.press("Enter");
			await page.keyboard.type("Deuxième ligne");

			// then (check quill editor content)
			const paragraphCount = await titleEditor.locator("p").count();
			expect(paragraphCount).toBeLessThanOrEqual(1);
			await expect(titleEditor).toHaveText("Nouveau titreDeuxième ligne");

			// when (exiting Quill editor)
			await page.getByText("[E2E] Test Quill", { exact: true }).click(); // blur
			await expect
				.poll(() => _getSavedTitle(page, "question1"))
				.toBe("Nouveau titreDeuxième ligne");

			// then (check saved JSON)
			const savedTitle = await _getSavedTitle(page, "question1");
			expect(savedTitle).not.toContain("<p>");
		});
	});

	test.describe("Question description", () => {
		test("it should not save a break line when the editor is emptied", async ({
			page,
		}) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page.getByRole("tab", { name: "Éditeur de sondage" }).click();
			await page.getByText("Titre initial", { exact: true }).click();

			const descriptionEditor = page.locator(
				'[data-name="description"] .ql-editor',
			);

			// when
			await descriptionEditor.click();
			await page.keyboard.type("Texte temporaire");
			await page.getByText("[E2E] Test Quill", { exact: true }).click(); // blur
			await expect
				.poll(() => _getSavedDescription(page, "question1"))
				.toContain("Texte temporaire");

			await page.getByText("Titre initial", { exact: true }).click();
			await descriptionEditor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await page.keyboard.press("Backspace");

			// then (check quill editor content)
			await expect(descriptionEditor).toHaveText("");

			// when (exiting Quill editor)
			await page.getByText("[E2E] Test Quill", { exact: true }).click(); // blur
			await expect
				.poll(() => _getSavedDescription(page, "question1"))
				.toBeUndefined();

			// then (check saved JSON)
			const json = await _getSavedSurveyJson(page);
			const question = _findQuestion(json, "question1");
			expect(question).not.toHaveProperty("description");
		});

		test("it should have a multi-line behavior", async ({ page }) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page.getByRole("tab", { name: "Éditeur de sondage" }).click();
			await page.getByText("Titre initial", { exact: true }).click();

			const descriptionEditor = page.locator(
				'[data-name="description"] .ql-editor',
			);

			// when
			await descriptionEditor.click();
			await page.keyboard.type("Ligne un");
			await page.keyboard.press("Enter");
			await page.keyboard.type("Ligne deux");

			// then
			const paragraphCount = await descriptionEditor.locator("p").count();
			expect(paragraphCount).toBeGreaterThanOrEqual(2);
		});
	});

	test.describe("Question html block", () => {
		test("it should have a multi-line behavior", async ({ page }) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page.getByRole("tab", { name: "Éditeur de sondage" }).click();
			await page.getByText("Contenu initial", { exact: true }).click();

			const htmlEditor = page.locator('[data-name="html"] .ql-editor');

			// when
			await htmlEditor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await page.keyboard.type("Ligne un");
			await page.keyboard.press("Enter");
			await page.keyboard.type("Ligne deux");

			// then
			const paragraphCount = await htmlEditor.locator("p").count();
			expect(paragraphCount).toBeGreaterThanOrEqual(2);
		});
	});

	test.describe("Multi-line behavior", () => {
		test("it should save a semantic <ul><li> list, not Quill's internal markup", async ({
			page,
		}) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page.getByRole("tab", { name: "Éditeur de sondage" }).click();
			await page.getByText("Contenu initial", { exact: true }).click();

			const htmlField = page.locator('[data-name="html"]');
			const htmlEditor = htmlField.locator(".ql-editor");

			// when
			await htmlEditor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await page.keyboard.press("Backspace");
			await htmlField.getByRole("button", { name: "list: bullet" }).click();
			await page.keyboard.type("Item un");
			await page.keyboard.press("Enter");
			await page.keyboard.type("Item deux");

			// then
			await page.getByText("[E2E] Test Quill", { exact: true }).click(); // blur
			await expect
				.poll(() => _getSavedHtml(page, "question2"))
				.toContain("Item deux");

			const savedHtml = await _getSavedHtml(page, "question2");
			expect(savedHtml).toContain("<ul>");
			expect(savedHtml).toContain("<li>Item un</li>");
			expect(savedHtml).toContain("<li>Item deux</li>");
			expect(savedHtml).not.toContain("<ol>");
			expect(savedHtml).not.toContain("data-list");
			expect(savedHtml).not.toContain("ql-ui");
		});

		test("it should keep an existing list intact when the field is reopened and edited", async ({
			page,
		}) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page.getByRole("tab", { name: "Éditeur de sondage" }).click();
			await page.getByText("Contenu initial", { exact: true }).click();

			const htmlField = page.locator('[data-name="html"]');
			const htmlEditor = htmlField.locator(".ql-editor");

			await htmlEditor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await page.keyboard.press("Backspace");
			await page.keyboard.type("Voici les solutions :");
			await page.keyboard.press("Enter");
			await htmlField.getByRole("button", { name: "list: bullet" }).click();
			await page.keyboard.type("Item un");
			await page.keyboard.press("Enter");
			await page.keyboard.type("Item deux");
			await page.getByText("[E2E] Test Quill", { exact: true }).click(); // blur
			await expect
				.poll(() => _getSavedHtml(page, "question2"))
				.toContain("Item deux");

			// when (reopening the field)
			await page.getByText("Item un", { exact: true }).click();

			// then
			const reopenedHtml = await htmlEditor.innerHTML();
			expect(reopenedHtml).not.toContain("<br>");
			await expect(htmlEditor).toContainText("Voici les solutions :");
			await expect(htmlEditor.locator("li")).toHaveCount(2);

			// when (editing again after reopening)
			await htmlEditor.click();
			await page.keyboard.press("End");
			await page.keyboard.press("Enter");
			await page.keyboard.type("Item trois");

			// then
			await expect(htmlEditor.locator("li")).toHaveCount(3);
			await expect(htmlEditor).toContainText("Voici les solutions :");
			await expect(htmlEditor).toContainText("Item un");
			await expect(htmlEditor).toContainText("Item deux");
			await expect(htmlEditor).toContainText("Item trois");
		});

		test("it should keep a voluntary blank line between two paragraphs", async ({
			page,
		}) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page.getByRole("tab", { name: "Éditeur de sondage" }).click();
			await page.getByText("Contenu initial", { exact: true }).click();

			const htmlEditor = page.locator('[data-name="html"] .ql-editor');

			// when
			await htmlEditor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await page.keyboard.type("Premier paragraphe.");
			await page.keyboard.press("Enter");
			await page.keyboard.press("Enter");
			await page.keyboard.type("Second paragraphe.");
			await page.getByText("[E2E] Test Quill", { exact: true }).click(); // blur
			await expect
				.poll(() => _getSavedHtml(page, "question2"))
				.toContain("Second paragraphe.");

			// then
			const savedHtml = await _getSavedHtml(page, "question2");
			expect(savedHtml).toContain(
				"<p>Premier paragraphe.</p><br><p>Second paragraphe.</p>",
			);
		});
	});

	test.describe("Security", () => {
		test("it should sanitize a malicious payload already present in the survey JSON", async ({
			page,
		}) => {
			// given
			await page.goto(`/creator/${encodeURIComponent(FORM_SLUG)}`);
			await page
				.locator(".svc-tabbed-menu-item", { hasText: "Éditeur JSON" })
				.click();

			const maliciousSurvey = {
				pages: [
					{
						name: "page1",
						elements: [
							{
								type: "text",
								name: "question1",
								title: "Titre initial",
								description: '<img src="x" onerror="window.__xssFired = true">',
							},
							{
								type: "html",
								name: "question2",
								html: "<p>Contenu initial</p>",
							},
						],
					},
				],
			};
			const jsonEditor = page.locator("textarea").first();
			await jsonEditor.click();
			await page.keyboard.press("ControlOrMeta+a");
			await page.keyboard.type(JSON.stringify(maliciousSurvey));

			// when
			await page
				.locator(".svc-tabbed-menu-item", { hasText: "Éditeur de sondage" })
				.click();
			await page.getByText("Titre initial", { exact: true }).click();

			// then
			const descriptionEditor = page.locator(
				'[data-name="description"] .ql-editor',
			);
			const html = await descriptionEditor.innerHTML();
			expect(html).not.toContain("onerror");

			const xssFired = await page.evaluate(() => (window as any).__xssFired);
			expect(xssFired).toBeUndefined();
		});
	});
});
