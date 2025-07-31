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
				question.value = editor.root.innerHTML;
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
			el.previousSibling && el.previousSibling.remove();
			el.innerHTML = "";
		},
	};

	CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");

	function applyHtml(_: SurveyModel, options: TextMarkdownEvent) {
		let str = options.text;
		if (str.indexOf("<p>") === 0) {
			// Remove root paragraphs <p></p>
			str = str.substring(3);
			str = str.substring(0, str.length - 4);
		}
		// Set HTML markup to render
		options.html = str;
	}

	creator.survey.onTextMarkdown.add(applyHtml);
	creator.onSurveyInstanceCreated.add((_, options) => {
		options.survey.onTextMarkdown.add(applyHtml);
	});

	// Register `quill` as an editor for properties of the `text` and `html` types in the Survey Creator's Property Grid
	PropertyGridEditorCollection.register({
		fit: (prop) => prop.type == "text" || prop.type == "html",
		getJSON: () => ({ type: "quill" }),
	});
}
