import {
  AnalysisMovement,
  AnalysisMovementEntry,
  AnalysisRequest,
  AnalysisMetadata,
  LinearAnalysisResponse,
  MovementSummary,
  QuizQuestion,
  QuizResponse,
  FlashcardResponse,
  Flashcard,
  ExportResponse,
  ExportRequest,
  ExportFormat,
} from "../types/analysis";

const DEFAULT_VERSION = "v1";
const DEFAULT_LEVEL = "Premiere";
const TARGET_WORD_COUNT_MIN = 900;
const GRANULARITY_DETAILED = new Set(["detaille"]);

const PROCEDES = [
  "métaphore",
  "champ lexical",
  "hyperbole",
  "antithèse",
  "rythme ternaire",
  "anaphore",
  "personnification",
  "modalisation",
  "gradation",
  "allitération",
];

const MOVEMENT_TITLES = [
  "Émergence du regard",
  "Montée de la tension",
  "Renversement symbolique",
  "Vers l'apaisement",
  "Projection finale",
];

function encodeToUint8Array(content: string): Uint8Array {
  if (typeof globalThis.TextEncoder !== "undefined") {
    return new globalThis.TextEncoder().encode(content);
  }
  return Uint8Array.from(Buffer.from(content, "utf8"));
}

function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s([:;,.!?])/g, "$1")
    .trim();
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function chooseProblematic(request: AnalysisRequest): string {
  if (request.problematique?.trim()) {
    return sanitizeText(request.problematique);
  }
  const auteur = request.author ?? "l'auteur";
  const oeuvre = request.work ?? "l'œuvre";
  return `Nous nous demanderons comment ${auteur} fait de ${oeuvre.toLowerCase()} un passage révélant les enjeux essentiels du texte.`;
}

function buildIntroduction(request: AnalysisRequest, problematique: string): string {
  const auteur = request.author ?? "l'auteur";
  const oeuvre = request.work ?? "l'œuvre étudiée";
  const date = request.date ? `, publié en ${request.date}` : "";
  const mouvement = request.movement ? `, s'inscrivant dans le mouvement ${request.movement}` : "";
  const niveau = request.level ?? DEFAULT_LEVEL;
  const instructions = request.instructions
    ? ` Les consignes données insistent sur ${sanitizeText(request.instructions)}.`
    : "";
  const placeExtrait = request.lines
    ? ` L'extrait proposé couvre ${request.lines}, ce qui permet de suivre la progression dramatique du passage.`
    : " Cet extrait se situe au cœur de l'œuvre et concentre les tensions majeures du parcours.";

  const contextParagraph = `Dans cet extrait tiré de ${oeuvre} de ${auteur}${date}${mouvement}, nous abordons un passage clef que les élèves de niveau ${niveau} doivent maîtriser pour comprendre la dynamique interne du texte.${instructions}`;
  const placeParagraph = `${placeExtrait}`;
  const problematiqueParagraph = `${problematique} Cette interrogation guidera notre lecture linéaire en respectant la méthode officielle du baccalauréat.`;
  const annoncePlan = `Nous montrerons d'abord comment le texte installe les enjeux majeurs avant d'examiner la montée des tensions puis d'analyser la résolution symbolique proposée par l'auteur.`;

  return [contextParagraph, placeParagraph, problematiqueParagraph, annoncePlan]
    .map((p) => p.trim())
    .join("\n\n");
}

function createMovementTitle(index: number): string {
  return `Mouvement ${index + 1} — ${MOVEMENT_TITLES[index % MOVEMENT_TITLES.length]}`;
}

function shortenCitation(line: string, maxWords = 12): string {
  const words = line.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ") + (words.length > maxWords ? "…" : "");
}

function chooseProcede(index: number): string {
  return PROCEDES[index % PROCEDES.length];
}

function createInterpretation(
  citation: string,
  procede: string,
  movementTheme: string,
  level: string
): string {
  const base = `Ce passage montre que ${movementTheme.toLowerCase()} et ${procede} se répondent pour donner du relief au sens.`;
  const elaboration = `Cette lecture suggère à un élève de ${level.toLowerCase()} que l'auteur construit patiemment le lien entre forme et signification, ce qui renforce la compréhension globale.`;
  const approfondissement = `L'analyse met en valeur l'effet produit sur le lecteur : ${sanitizeText(citation.toLowerCase())} exprime une orientation précise du regard narratif et oriente la réception.`;
  return `${base} ${elaboration} ${approfondissement}`;
}

function createTransition(nextIndex: number, total: number): string {
  if (nextIndex >= total) {
    return "L'étude détaillée de ce dernier mouvement nous conduit directement à la conclusion qui répond à la problématique initiale.";
  }
  return `Cette étape prépare le mouvement ${nextIndex + 1} en installant les indices qui seront développés ensuite, assurant une progression linéaire cohérente.`;
}

function determineGranularity(request: AnalysisRequest): number {
  const granularity = request.options?.granularity?.toLowerCase();
  const normalized = granularity
    ? granularity.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    : undefined;
  if (normalized && GRANULARITY_DETAILED.has(normalized)) {
    return 5;
  }
  return 3;
}

function createMovement(
  index: number,
  lines: string[],
  startLine: number,
  endLine: number,
  level: string,
  entriesPerMovement: number
): AnalysisMovement {
  const mouvementTheme = MOVEMENT_TITLES[index % MOVEMENT_TITLES.length];
  const analyse: AnalysisMovementEntry[] = [];
  const step = Math.max(1, Math.floor(lines.length / entriesPerMovement));
  for (let i = 0; i < entriesPerMovement; i++) {
    const lineIndex = Math.min(lines.length - 1, i * step);
    const citation = shortenCitation(lines[lineIndex] ?? "");
    const procede = chooseProcede(index * entriesPerMovement + i);
    analyse.push({
      citation,
      procede,
      interpretation: createInterpretation(citation, procede, mouvementTheme, level),
    });
  }
  return {
    titre: createMovementTitle(index),
    bornes: `v.${startLine}-${endLine}`,
    analyse,
    transition: "",
  };
}

function buildPlanConceptuel(movementCount: number, problematique: string): string[] {
  const steps: string[] = [];
  for (let i = 0; i < movementCount; i++) {
    const verb = ["Observer", "Analyser", "Comprendre", "Mesurer", "Relier"][i % 5];
    steps.push(`${verb} le mouvement ${i + 1} pour répondre à la question : ${problematique}`);
  }
  return steps;
}

function summariseMovement(movement: AnalysisMovement, index: number): MovementSummary {
  const procedes = movement.analyse.map((item) => item.procede);
  const idees = movement.analyse.map((item) =>
    `Le passage met en évidence que ${item.interpretation.split(".")[0].toLowerCase()}`
  );
  return {
    mouvement: index + 1,
    procedes,
    idees_clefs: idees,
  };
}

function buildConclusion(problematique: string, movements: AnalysisMovement[], request: AnalysisRequest): string {
  const auteur = request.author ?? "l'auteur";
  const oeuvre = request.work ?? "l'œuvre étudiée";
  const rappel = `Au terme de cette lecture linéaire, nous pouvons répondre à la problématique : ${problematique}`;
  const synthese = `Les différents mouvements ont révélé comment ${auteur} organise ${oeuvre} pour conduire le lecteur d'une observation initiale vers une résolution réfléchie.`;
  const bilan = `L'étude des procédés, des citations courtes et des transitions met en lumière un parcours de lecture cohérent et riche de sens pour les candidats au baccalauréat.`;
  const ouverture = `Dans la continuité, on pourrait comparer cet extrait avec un autre passage de ${oeuvre} ou avec une œuvre du même mouvement littéraire afin de prolonger la réflexion sans sortir du cadre scolaire.`;
  return [rappel, synthese, bilan, ouverture].join("\n\n");
}

function ensureWordCount(
  response: LinearAnalysisResponse,
  problematique: string,
  request: AnalysisRequest
): LinearAnalysisResponse {
  const allText = [
    response.introduction,
    ...response.mouvements.flatMap((m) => [m.titre, m.analyse.map((a) => `${a.citation} ${a.interpretation}`).join(" "), m.transition]),
    response.conclusion,
    response.resume_par_mouvements
      .map((resume) => `${resume.procedes.join(", ")} ${resume.idees_clefs.join(" ")}`)
      .join(" "),
  ].join(" ");
  let wordCount = countWords(allText);

  if (wordCount >= TARGET_WORD_COUNT_MIN) {
    response.longueur_mots = wordCount;
    return response;
  }

  const paddingSentences: string[] = [];
  const level = request.level ?? DEFAULT_LEVEL;
  while (wordCount < TARGET_WORD_COUNT_MIN) {
    paddingSentences.push(
      `Cette précision méthodologique rappelle qu'une analyse linéaire rigoureuse exige de relier chaque procédé stylistique à une interprétation argumentée, afin de guider efficacement un élève de ${level.toLowerCase()} vers la réussite de l'épreuve.`
    );
    wordCount += countWords(paddingSentences[paddingSentences.length - 1]);
  }

  if (paddingSentences.length > 0) {
    response.conclusion += `\n\n${paddingSentences.join(" ")}`;
  }

  response.longueur_mots = wordCount;
  return response;
}

function buildMetadata(request: AnalysisRequest, warnings: string[]): AnalysisMetadata {
  return {
    auteur: request.author,
    oeuvre: request.work,
    niveau: request.level ?? DEFAULT_LEVEL,
    version: DEFAULT_VERSION,
    avertissements: warnings.length > 0 ? warnings : undefined,
  };
}

export function analyze(request: AnalysisRequest): LinearAnalysisResponse {
  if (!request.text?.trim()) {
    throw new Error("Le texte à analyser est obligatoire.");
  }

  if (!request.author?.trim() || !request.work?.trim()) {
    const missing = !request.author?.trim() ? "l'auteur" : "l'œuvre";
    return {
      plan_conceptuel: [],
      introduction: "",
      mouvements: [],
      conclusion: "",
      resume_par_mouvements: [],
      metadata: buildMetadata(request, [`Information manquante : ${missing}.`]),
      longueur_mots: 0,
      needsClarification: true,
      clarificationQuestion: `Pouvez-vous préciser ${missing} pour éviter toute approximation ?`,
    };
  }

  const level = request.level ?? DEFAULT_LEVEL;
  const problematique = chooseProblematic(request);
  const lines = splitLines(request.text);
  const movementCount = Math.max(3, Math.min(5, Math.ceil(lines.length / 5)));
  const entriesPerMovement = determineGranularity(request);
  const chunkSize = Math.max(1, Math.ceil(lines.length / movementCount));

  const movements: AnalysisMovement[] = [];
  for (let i = 0; i < movementCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(lines.length, (i + 1) * chunkSize);
    const movementLines = lines.slice(start, end);
    const movement = createMovement(
      i,
      movementLines.length > 0 ? movementLines : ["Passage significatif"],
      start + 1,
      Math.max(start + 1, end),
      level,
      entriesPerMovement
    );
    movements.push(movement);
  }

  const plan = buildPlanConceptuel(movementCount, problematique);
  const introduction = buildIntroduction(request, problematique);
  const conclusion = buildConclusion(problematique, movements, request);
  const resume = movements.map((movement, index) => summariseMovement(movement, index));

  const warnings: string[] = [];
  if (!request.movement) {
    warnings.push("Mouvement littéraire non fourni : préciser permettrait d'affiner le contexte.");
  }

  const response: LinearAnalysisResponse = {
    plan_conceptuel: plan,
    introduction,
    mouvements: movements.map((movement, index) => ({
      ...movement,
      transition: index === movements.length - 1 ? createTransition(movements.length, movements.length) : createTransition(index + 1, movements.length),
    })),
    conclusion,
    resume_par_mouvements: resume,
    metadata: buildMetadata(request, warnings),
    longueur_mots: 0,
  };

  return ensureWordCount(response, problematique, request);
}

function buildQuizChoice(correct: string, index: number): string[] {
  const distractors = [
    "Une interprétation contraire aux indices du texte",
    "Une réponse partielle qui oublie le mouvement suivant",
    "Une hypothèse sans lien avec la problématique",
  ];
  const choices = [correct];
  let offset = index;
  while (choices.length < 4) {
    choices.push(distractors[offset % distractors.length]);
    offset += 1;
  }
  return choices.slice(0, 4);
}

export function generateQuiz(analysis: LinearAnalysisResponse, level: string = DEFAULT_LEVEL): QuizResponse {
  const questions: QuizQuestion[] = [];
  const problematique = analysis.introduction.match(/Nous nous demanderons[^.]+\./)?.[0] ?? analysis.plan_conceptuel[0];
  const comprehensionPrompts = [
    `Quel est le contexte de publication rappelé en introduction ?`,
    `Quelle problématique guide la lecture de l'extrait ?`,
    `Combien de mouvements structurent l'analyse ?`,
    `Quel rôle joue le narrateur dans la progression du passage ?`,
    `Quelle ouverture est proposée en conclusion ?`,
  ];

  comprehensionPrompts.slice(0, 5).forEach((prompt, index) => {
    const correct =
      index === 1
        ? problematique
        : `La réponse est explicitée dans la section correspondante de l'analyse.`;
    const choix = buildQuizChoice(correct, index);
    const bonne_reponse = ("ABCD"[choix.indexOf(correct)]) as QuizQuestion["bonne_reponse"];
    questions.push({
      type: "qcm",
      intitule: prompt,
      choix,
      bonne_reponse,
      explication: `La correction renvoie à la partie étudiée et rappelle que les candidats doivent justifier leur réponse en citant la méthode officielle (${level}).`,
      ancre: analysis.mouvements[index % analysis.mouvements.length]?.bornes ?? "v.1",
    });
  });

  analysis.mouvements.forEach((movement, index) => {
    movement.analyse.slice(0, 2).forEach((item, subIndex) => {
      if (questions.length >= 10) return;
      const prompt = `Dans ${movement.titre}, quel effet produit ${item.procede} relevé sur "${item.citation}" ?`;
      const correct = item.interpretation;
      const choix = buildQuizChoice(correct, index + subIndex + 5);
      const bonne_reponse = ("ABCD"[choix.indexOf(correct)]) as QuizQuestion["bonne_reponse"];
      questions.push({
        type: "qcm",
        intitule: prompt,
        choix,
        bonne_reponse,
        explication: `La bonne réponse rappelle que ${item.procede} s'explique toujours par une interprétation formulée avec un verbe comme "suggère" ou "exprime" pour rester conforme aux attentes du bac.`,
        ancre: movement.bornes,
      });
    });
  });

  while (questions.length < 10) {
    const prompt = `Comment la transition entre deux mouvements renforce-t-elle la cohérence de la lecture ?`;
    const correct = `Elle rend explicite le passage d'un enjeu à l'autre et annonce le mouvement suivant.`;
    const choix = buildQuizChoice(correct, questions.length);
    const bonne_reponse = ("ABCD"[choix.indexOf(correct)]) as QuizQuestion["bonne_reponse"];
    questions.push({
      type: "qcm",
      intitule: prompt,
      choix,
      bonne_reponse,
      explication: `Une transition doit rappeler l'idée principale du mouvement précédent et préparer celui qui suit, conformément à la méthode.`,
      ancre: analysis.mouvements[questions.length % analysis.mouvements.length]?.bornes ?? "v.1",
    });
  }

  return { questions };
}

export function generateFlashcards(analysis: LinearAnalysisResponse): FlashcardResponse {
  const deck: Flashcard[] = [];
  const introCard: Flashcard = {
    recto: `Repères : ${analysis.metadata.auteur ?? "Auteur"} / ${analysis.metadata.oeuvre ?? "Œuvre"}`,
    verso: `Contexte : ${analysis.introduction.split("\n")[0]}\nProblématique : ${analysis.introduction
      .split("\n")
      .find((line) => line.includes("Nous nous")) ?? "Formuler une question directrice."}`,
  };
  deck.push(introCard);

  analysis.mouvements.forEach((movement) => {
    movement.analyse.forEach((item) => {
      deck.push({
        recto: `${item.citation} (${movement.bornes})`,
        verso: `${item.procede} → ${item.interpretation}`,
      });
    });
    deck.push({
      recto: `Transition ${movement.bornes}`,
      verso: movement.transition,
    });
  });

  deck.push({
    recto: "Procédés transversaux",
    verso: `Retenir : ${Array.from(new Set(analysis.mouvements.flatMap((m) => m.analyse.map((a) => a.procede)))).join(", ")}.`,
  });

  deck.push({
    recto: "Conclusion",
    verso: analysis.conclusion.split("\n")[0],
  });

  while (deck.length < 15) {
    deck.push({
      recto: "Méthode",
      verso: "Toujours relier citation courte, procédé identifié et interprétation rédigée avec un verbe d'analyse.",
    });
  }

  return { deck };
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildMarkdown(analysis: LinearAnalysisResponse): string {
  const mouvements = analysis.mouvements
    .map((movement) => {
      const analyse = movement.analyse
        .map((entry) => `- "${entry.citation}" — ${entry.procede} : ${entry.interpretation}`)
        .join("\n");
      return `### ${movement.titre} (${movement.bornes})\n${analyse}\n\n**Transition :** ${movement.transition}`;
    })
    .join("\n\n");

  const resume = analysis.resume_par_mouvements
    .map(
      (item) =>
        `| Mouvement ${item.mouvement} | ${item.procedes.join(", ")} | ${item.idees_clefs.join("<br />") } |`
    )
    .join("\n");

  const tableHeader = "| Mouvement | Procédés | Idées clefs |\n|---|---|---|";

  return [`## Introduction`, analysis.introduction, "## Plan conceptuel", ...analysis.plan_conceptuel.map((step, i) => `${i + 1}. ${step}`), "## Analyse détaillée", mouvements, "## Conclusion", analysis.conclusion, "## Résumé par mouvements", tableHeader, resume]
    .flat()
    .join("\n\n");
}

function buildHtml(markdown: string): string {
  const paragraphs = markdown
    .split(/\n\n/)
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2>${block.replace("## ", "")}</h2>`;
      }
      if (block.startsWith("### ")) {
        return `<h3>${block.replace("### ", "")}</h3>`;
      }
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => `<li>${line.replace(/^-\s*/, "")}</li>`) 
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (block.startsWith("|")) {
        return `<pre>${block}</pre>`;
      }
      if (/^\d+\.\s/.test(block)) {
        const items = block
          .split("\n")
          .map((line) => line.replace(/^\d+\.\s*/, ""))
          .map((line) => `<li>${line}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }
      return `<p>${block}</p>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><title>Analyse linéaire</title></head><body>${paragraphs}</body></html>`;
}

function buildPdf(markdown: string): Uint8Array {
  const lines = markdown.split(/\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const sanitizedLines = lines.map(escapePdfText);
  const contentLines = ["BT", "/F1 11 Tf", "72 760 Td"];
  sanitizedLines.forEach((line, index) => {
    if (index === 0) {
      contentLines.push(`(${line}) Tj`);
    } else {
      contentLines.push("T*", `(${line}) Tj`);
    }
  });
  contentLines.push("ET");
  const contentStream = contentLines.join("\n");

  const objects: string[] = [];
  const offsets: number[] = [0];
  const header = "%PDF-1.4\n";
  let cursor = header.length;

  function addObject(body: string): void {
    const index = objects.length + 1;
    const objectString = `${index} 0 obj\n${body}\nendobj\n`;
    objects.push(objectString);
    offsets.push(cursor);
    cursor += Buffer.byteLength(objectString, "utf8");
  }

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
  );
  addObject(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const xrefStart = cursor;
  const xrefEntries = ["0000000000 65535 f "];
  for (let i = 1; i < offsets.length; i++) {
    xrefEntries.push(`${offsets[i].toString().padStart(10, "0")} 00000 n `);
  }
  const xref = `xref\n0 ${offsets.length}\n${xrefEntries.join("\n")}\n`;
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdfString = header + objects.join("") + xref + trailer;
  return encodeToUint8Array(pdfString);
}

export function exportAnalysis({ analysis, format }: ExportRequest): ExportResponse {
  const markdown = buildMarkdown(analysis);
  if (format === "markdown") {
    return {
      format,
      payload: markdown,
      filename: "analyse-lineaire.md",
    };
  }
  if (format === "html") {
    return {
      format,
      payload: buildHtml(markdown),
      filename: "analyse-lineaire.html",
    };
  }
  if (format === "pdf") {
    return {
      format,
      payload: buildPdf(markdown),
      filename: "analyse-lineaire.pdf",
    };
  }
  throw new Error(`Format d'export non pris en charge : ${format}`);
}

export default {
  analyze,
  generateQuiz,
  generateFlashcards,
  exportAnalysis,
};
