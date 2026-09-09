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
import DOMPurify from "dompurify";
import type { SurveyCreator } from "survey-creator-js";

// Liste des types exceptionnels qui doivent être multi-lignes. Cette liste peut évoluer en fonction des retours et des besoins.
// Tout le reste sera mono-ligne par défaut.
const MULTI_LINES_TYPES = ["html", "description"];

const quillConfig = {
	TITLE_MODULES: {
		// Cette config de quill permet d'afficher une toolbar simple pour les titres mono-lignes
		toolbar: [["bold", "italic", "underline", "link"]],
		keyboard: {
			bindings: {
				enter: {
					// Permet de désactiver le comportement par défaut de la touche entrée (retour à la ligne), afin de force le mono-ligne
					key: "Enter",
					handler: () => false,
				},
			},
		},
	},
	// Formats supportés par Quill dans pour la config titre mono-ligne (les autres ne le seront pas)
	TITLE_FORMATS: ["bold", "italic", "underline", "link"],
};

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

			// question.name = nom de la propriété SurveyJS éditée ("title", "description", "html"...).
			// Tous les types doivent être par défaut mono-lignes (titre, label...)
			// Les multi-lignes sont des cas spécifiques qu'on ajoutera au fur et à mesure à la liste (description, bloc HTML)
			const isMultiLines = MULTI_LINES_TYPES.includes(question.name);

			// On configure l'éditeur Quill selon le type de question (mono ou multi-lignes)
			// Si mono-ligne, on configure une toolbar simple et on désactive le retour à la ligne
			// Si multi-lignes on laisse la config par défaut
			const editor = new Quill(el, {
				theme: "snow",
				modules: !isMultiLines ? quillConfig.TITLE_MODULES : undefined,
				formats: !isMultiLines ? quillConfig.TITLE_FORMATS : undefined,
			});

			editor.enable(!question.isReadOnly);

			let isValueChanging = false;

			// Dans ce handler, le code est exécuté à chaque évènement 'text-change' de l'éditeur Quill.
			// À chaque frappe, le code HTML produit par Quill est injecté dans la valeur de la question SurveyJS
			editor.on("text-change", () => {
				isValueChanging = true;

				// Gestion du cas si le contenu du canvas Quill est vide. Par défaut, Quill insère un saut de ligne <br>
				// même quand le canvas est vide. On force donc à vider le HTML produit par Quill.
				if (editor.getText().trim().length === 0) {
					question.value = "";
					isValueChanging = false;
					return;
				}

				// Vu qu'on s'apprête à interpréter du HTML venant de Quill pour le rendre dans SurveyJS, on le purifie pour se protéger des injections.
				const safeHTML = _sanitizeHTML(editor.getSemanticHTML());

				// Gestion du cas mono-ligne (exemple Titre de question ou label), on retire les balises <p> qui englobent
				// et on remplace les espaces insécables &nbsp par des espaces classiques
				if (!isMultiLines) {
					const withParagraphStripped = _stripWrappingParagraph(safeHTML);
					question.value = withParagraphStripped.replace(/&nbsp;/g, " ");

					// Dans les autres cas multi-lignes (description, bloc HTML...), on gére les espaces insécables et les sauts de ligne.
					// Les sauts de lignes volontaires <br> ne transparaissent pas dans le semanticHTML. Ils apparaissent comme un paragraphe vide.
					//  Il faut les ré-insérer à la main.
				} else {
					question.value = safeHTML
						.replace(/&nbsp;/g, " ")
						.replace(/<p><\/p>/g, "<br>");
				}

				isValueChanging = false;
			});

			// Ce handler permet l'opération inverse: on prend la valeur de la question pour l'insérer dans le canvas Quill afin de permettre l'édition.
			// if (isValueChanging) return; permet d'éviter une boucle infinie. Si on est en train de modifier la valeur via le canvas on sort de la fonction.
			// Ainsi ce handler ne s'exécute qu'au premier rendu de la question.

			// dangerouslyPasteHTML doit être utilisé dans le cas d'une question de type "html" ou "description" afin que le code html soit rendu
			// correctement par Quill. Mais il est d'abord purifié afin de se protéger d'injection malveillante.
			const updateValueHandler = () => {
				if (isValueChanging) return;

				const safeHTML = _sanitizeHTML(question.value) || "";
				if (isMultiLines) {
					editor.clipboard.dangerouslyPasteHTML(safeHTML);
				} else {
					editor.root.innerHTML = safeHTML;
				}
			};
			question.valueChangedCallback = updateValueHandler;
			question.readOnlyChangedCallback = () => {
				editor.enable(!question.isReadOnly);
			};

			updateValueHandler(); // Hydratation initiale : la toute première fois que ce champ est affiché,
		},

		willUnmount: (_: Question, el: HTMLElement) => {
			el.previousSibling?.remove();
			el.innerHTML = "";
		},
	};

	CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");

	// Rendu en lecture seule. Le code HTML du JSON est rendu dans SurveyJS. On utilise la sous-méthode _applyHTML
	// afin d'avoir un nettoyage dans le cas où des balises <p> englobantes subsistent dans le JSON.
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

function _sanitizeHTML(html: string): string {
	return DOMPurify.sanitize(html);
}

// Convertit la valeur brute stockée en HTML à injecter pour l'affichage.
// On supprime les balises <p> dans le cas d'un titre mono-ligne, on laisse tel quel dans le cas d'un multi-lignes
function _applyHtml(_: SurveyModel, options: TextMarkdownEvent) {
	const safeHTML = _sanitizeHTML(options.text);
	const isMultiLine = MULTI_LINES_TYPES.includes(options.name);

	if (!isMultiLine) {
		options.html = _stripWrappingParagraph(safeHTML);
	} else {
		options.html = safeHTML;
	}
}

// Nettoyage des balises <p> englobantes. Si le html n'a qu'un seul enfant et que celui-ci est un paragraphe, on nettoie.
function _stripWrappingParagraph(html: string): string {
	const doc = new DOMParser().parseFromString(html, "text/html");
	const children = doc.body.children;
	if (children.length === 1 && children[0].tagName === "P") {
		return children[0].innerHTML;
	}
	return html;
}
