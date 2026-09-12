import type { DifficultyLevel, Game, GameConfig, Player, RandomEvent } from "@/types/game";
import { createInitialCompanyState, DEFAULT_STARTING_CONDITIONS } from "../simulation/initialState";
import { rollRandomEvent } from "../simulation/randomEvents";
import { simulateYear } from "../simulation/simulateYear";
import { applyYearResultToPlayer, buildYearDecision } from "./yearResolution";

export type { ProductDecisionInput, YearDecisionInput } from "@/types/game";
import type { YearDecisionInput } from "@/types/game";

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
    numBots: 0,
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

  const decision = buildYearDecision(player.id, year, decisionInput);

  const events: RandomEvent[] = [];
  if (game.config.randomEventsEnabled) {
    const globalEvent = rollRandomEvent(year, "global", undefined);
    const playerEvent = rollRandomEvent(year, "player", player.id);
    if (globalEvent) events.push(globalEvent);
    if (playerEvent) events.push(playerEvent);
  }

  const result = simulateYear({ decision, openingState, events });
  const updatedPlayer = applyYearResultToPlayer(player, decision, result, game.config.totalYears);

  return {
    ...game,
    status: updatedPlayer.finalScore ? "completed" : "in_progress",
    currentYear: year,
    players: [updatedPlayer],
    updatedAt: new Date().toISOString(),
  };
}
