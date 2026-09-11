import type {
  CompanyDecision,
  DifficultyLevel,
  Game,
  GameConfig,
  Player,
  ProductDecision,
  ProductId,
  RandomEvent,
  YearDecision,
} from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { createInitialCompanyState, DEFAULT_STARTING_CONDITIONS } from "../simulation/initialState";
import { rollRandomEvent } from "../simulation/randomEvents";
import { computeScore } from "../simulation/scoring";
import { simulateYear } from "../simulation/simulateYear";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateSoloGameOptions {
  totalYears: number;
  difficulty: DifficultyLevel;
  userId: string;
  displayName: string;
  companyName?: string;
}

/** Creates a fresh solo game at year 0, ready to accept a year-1 decision. */
export function createSoloGame(options: CreateSoloGameOptions): Game {
  const now = new Date().toISOString();

  const config: GameConfig = {
    id: generateId("game"),
    mode: "solo",
    difficulty: options.difficulty,
    totalYears: options.totalYears,
    randomEventsEnabled: true,
    maxPlayers: 1,
    createdAt: now,
    createdByUserId: options.userId,
  };

  const player: Player = {
    id: "p1",
    userId: options.userId,
    displayName: options.displayName,
    companyName: options.companyName,
    joinOrder: 0,
    startingConditions: DEFAULT_STARTING_CONDITIONS,
    companyStates: [createInitialCompanyState(DEFAULT_STARTING_CONDITIONS)],
    decisions: [],
    results: [],
  };

  return {
    config,
    status: "in_progress",
    currentYear: 0,
    players: [player],
    market: [],
    updatedAt: now,
  };
}

export type ProductDecisionInput = Omit<ProductDecision, "productId">;

export interface YearDecisionInput {
  company: CompanyDecision;
  products: Record<ProductId, ProductDecisionInput>;
}

/**
 * Simulates the next year of a solo game from a submitted decision (year
 * and product ids/submission timestamp are derived, not supplied by the
 * caller) and returns a new Game with the result applied. Pure function —
 * doesn't touch storage; callers persist the result themselves.
 */
export function advanceSoloYear(game: Game, decisionInput: YearDecisionInput): Game {
  const player = game.players[0];
  const openingState = player.companyStates[player.companyStates.length - 1];
  const year = openingState.year + 1;

  const products = {} as Record<ProductId, ProductDecision>;
  for (const id of PRODUCT_IDS) {
    products[id] = { productId: id, ...decisionInput.products[id] };
  }

  const decision: YearDecision = {
    playerId: player.id,
    year,
    company: decisionInput.company,
    products,
    submittedAt: new Date().toISOString(),
  };

  const events: RandomEvent[] = [];
  if (game.config.randomEventsEnabled) {
    const globalEvent = rollRandomEvent(year, "global", undefined);
    const playerEvent = rollRandomEvent(year, "player", player.id);
    if (globalEvent) events.push(globalEvent);
    if (playerEvent) events.push(playerEvent);
  }

  const result = simulateYear({ decision, openingState, events });

  const updatedPlayer: Player = {
    ...player,
    companyStates: [...player.companyStates, result.closingState],
    decisions: [...player.decisions, decision],
    results: [...player.results, result],
  };

  const status = year >= game.config.totalYears ? "completed" : "in_progress";
  if (status === "completed") {
    updatedPlayer.finalScore = computeScore(updatedPlayer);
  }

  return {
    ...game,
    status,
    currentYear: year,
    players: [updatedPlayer],
    updatedAt: new Date().toISOString(),
  };
}
