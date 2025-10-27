export type GranularityOption = "standard" | "detaille" | "detaillé" | "détaillé";

export interface AnalysisOptions {
  format?: "markdown" | "html" | "pdf";
  granularity?: GranularityOption;
  include_quiz?: boolean;
  include_flashcards?: boolean;
}

export interface AnalysisRequest {
  text: string;
  lines?: string;
  author?: string;
  work?: string;
  date?: string;
  movement?: string;
  level?: "Seconde" | "Premiere" | "Première";
  instructions?: string;
  problematique?: string;
  options?: AnalysisOptions;
}

export interface AnalysisMovementEntry {
  citation: string;
  procede: string;
  interpretation: string;
}

export interface AnalysisMovement {
  titre: string;
  bornes: string;
  analyse: AnalysisMovementEntry[];
  transition: string;
}

export interface MovementSummary {
  mouvement: number;
  procedes: string[];
  idees_clefs: string[];
}

export interface AnalysisMetadata {
  auteur?: string;
  oeuvre?: string;
  niveau?: string;
  version: string;
  avertissements?: string[];
}

export interface LinearAnalysisResponse {
  plan_conceptuel: string[];
  introduction: string;
  mouvements: AnalysisMovement[];
  conclusion: string;
  resume_par_mouvements: MovementSummary[];
  metadata: AnalysisMetadata;
  longueur_mots: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

export interface QuizQuestion {
  type: "qcm";
  intitule: string;
  choix: string[];
  bonne_reponse: "A" | "B" | "C" | "D";
  explication: string;
  ancre: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
}

export interface Flashcard {
  recto: string;
  verso: string;
}

export interface FlashcardResponse {
  deck: Flashcard[];
}

export type ExportFormat = "markdown" | "html" | "pdf";

export interface ExportRequest {
  analysis: LinearAnalysisResponse;
  format: ExportFormat;
}

export interface ExportResponse {
  format: ExportFormat;
  payload: string | Uint8Array;
  filename: string;
}
