import Quill from "quill";
import {
	CustomWidgetCollection,
	ElementFactory,
	type Question,
	Serializer,
	type SurveyModel,
	type TextMarkdownEvent,
} from "survey-core";
import { PropertyGridEditorCollection } from "survey-creator-core";
import "quill/dist/quill.snow.css";
import type { SurveyCreator } from "survey-creator-js";

export default function initQuill(
	creator: SurveyCreator,
	componentName: string,
) {
	const iconId = "icon-editor";
	const widget = {
		name: componentName,
		title: "Quill",
		iconName: iconId,
		widgetIsLoaded: () => Quill !== undefined,
		isFit: (question: Question) => question.getType() === componentName,
		activatedByChanged: () => {
			Serializer.addClass(componentName, [], undefined, "empty");
			const registerQuestion = ElementFactory.Instance.registerCustomQuestion;
			if (registerQuestion) registerQuestion(componentName);
			Serializer.addProperty(componentName, {
				name: "height",
				default: "200px",
				category: "layout",
			});
		},
		htmlTemplate: "<div></div>",
		afterRender: (question: Question, el: HTMLElement) => {
			el.style.height = question.height;
			const editor = new Quill(el, {
				theme: "snow",
			});
			editor.enable(!question.isReadOnly);
			let isValueChanging = false;
			editor.on("text-change", () => {
				isValueChanging = true;
				question.value = _stripWrappingParagraph(editor.root.innerHTML);
				isValueChanging = false;
			});
			const updateValueHandler = () => {
				if (isValueChanging) return;
				editor.root.innerHTML = question.value || "";
			};
			question.valueChangedCallback = updateValueHandler;
			question.readOnlyChangedCallback = () => {
				editor.enable(!question.isReadOnly);
			};
			updateValueHandler();
		},
		willUnmount: (_: Question, el: HTMLElement) => {
			el.previousSibling?.remove();
			el.innerHTML = "";
		},
	};

	CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");

	creator.survey.onTextMarkdown.add(_applyHtml);
	creator.onSurveyInstanceCreated.add((_, options) => {
		options.survey.onTextMarkdown.add(_applyHtml);
	});

	// Register `quill` as an editor for properties of the `text` and `html` types in the Survey Creator's Property Grid
	PropertyGridEditorCollection.register({
		fit: (prop) => prop.type === "text" || prop.type === "html",
		getJSON: () => ({ type: "quill" }),
	});
}

function _applyHtml(_: SurveyModel, options: TextMarkdownEvent) {
	options.html = _stripWrappingParagraph(options.text);
}

function _stripWrappingParagraph(html: string): string {
	if (html.indexOf("<p>") === 0) {
		return html.substring(3, html.length - 4);
	}
	return html;
}
