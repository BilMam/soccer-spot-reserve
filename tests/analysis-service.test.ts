import {
  analyze,
  generateQuiz,
  generateFlashcards,
  exportAnalysis,
} from "../src/lib/analysis-service";
import { AnalysisRequest } from "../src/types/analysis";

describe("analysis-service", () => {
  const baseText = Array.from({ length: 30 }, (_, index) =>
    `Vers ${index + 1}. Le narrateur décrit un paysage changeant qui évolue vers une idée symbolique.`
  ).join("\n");

  const baseRequest: AnalysisRequest = {
    text: baseText,
    author: "Victor Hugo",
    work: "Les Contemplations",
    date: "1856",
    movement: "Romantisme",
    level: "Premiere",
    lines: "v.1-30",
    problematique: "Nous nous demanderons comment la progression du texte met en scène un voyage intérieur.",
    options: {
      granularity: "détaillé",
    },
  };

  it("produces a fully structured analysis with sufficient length", () => {
    const analysis = analyze(baseRequest);

    expect(analysis.needsClarification).toBeUndefined();
    expect(analysis.plan_conceptuel.length).toBeGreaterThanOrEqual(3);
    expect(analysis.introduction).toMatch(/Nous nous demanderons/);
    expect(analysis.mouvements.length).toBeGreaterThanOrEqual(3);
    analysis.mouvements.forEach((movement) => {
      expect(movement.analyse.length).toBeGreaterThanOrEqual(5);
      movement.analyse.forEach((entry) => {
        expect(entry.interpretation).toMatch(/suggère|exprime|renforce/);
      });
      expect(movement.transition.length).toBeGreaterThan(0);
    });
    expect(analysis.conclusion).toMatch(/problématique/);
    expect(analysis.resume_par_mouvements.length).toBe(analysis.mouvements.length);
    expect(analysis.longueur_mots).toBeGreaterThanOrEqual(900);
  });

  it("demands clarification when author is missing", () => {
    const { needsClarification, clarificationQuestion } = analyze({
      ...baseRequest,
      author: undefined,
    });

    expect(needsClarification).toBe(true);
    expect(clarificationQuestion).toContain("auteur");
  });

  it("generates a compliant quiz", () => {
    const analysis = analyze(baseRequest);
    const quiz = generateQuiz(analysis, baseRequest.level);

    expect(quiz.questions).toHaveLength(10);
    quiz.questions.forEach((question) => {
      expect(question.choix).toHaveLength(4);
      expect(["A", "B", "C", "D"]).toContain(question.bonne_reponse);
      expect(question.explication.length).toBeGreaterThan(0);
    });
  });

  it("creates at least fifteen flashcards", () => {
    const analysis = analyze(baseRequest);
    const flashcards = generateFlashcards(analysis);

    expect(flashcards.deck.length).toBeGreaterThanOrEqual(15);
    flashcards.deck.forEach((card) => {
      expect(card.recto.length).toBeGreaterThan(0);
      expect(card.verso.length).toBeGreaterThan(0);
    });
  });

  it("exports to markdown, html and pdf", () => {
    const analysis = analyze(baseRequest);
    const markdown = exportAnalysis({ analysis, format: "markdown" });
    const html = exportAnalysis({ analysis, format: "html" });
    const pdf = exportAnalysis({ analysis, format: "pdf" });

    expect(typeof markdown.payload).toBe("string");
    expect(typeof html.payload).toBe("string");
    expect(pdf.payload).toBeInstanceOf(Uint8Array);
    const pdfBytes = pdf.payload as Uint8Array;
    const prefix =
      typeof TextDecoder !== "undefined"
        ? new TextDecoder().decode(pdfBytes.slice(0, 4))
        : Buffer.from(pdfBytes.slice(0, 4)).toString("utf8");
    expect(prefix).toBe("%PDF");
  });
});
