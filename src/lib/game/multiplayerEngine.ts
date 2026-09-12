import type { DifficultyLevel, Game, GameConfig, Player, YearDecisionInput } from "@/types/game";
import { createInitialCompanyState, DEFAULT_STARTING_CONDITIONS } from "../simulation/initialState";
import { rollRandomEvent } from "../simulation/randomEvents";
import { simulateMultiplayerYear } from "../simulation/simulateYear";
import { applyYearResultToPlayer, buildYearDecision } from "./yearResolution";
import { decideBotYear, personalityForBotIndex } from "./botAi";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateMultiplayerGameOptions {
  totalYears: number;
  difficulty: DifficultyLevel;
  maxPlayers: number;
  numBots: number;
  hostUserId: string;
  hostDisplayName: string;
  hostCompanyName?: string;
}

/** Creates a new multiplayer game in the lobby ("setup") state, with the host as the first player. */
export function createMultiplayerGame(options: CreateMultiplayerGameOptions): Game {
  const now = new Date().toISOString();
  const maxPlayers = Math.max(2, Math.min(8, Math.round(options.maxPlayers)));
  const numBots = Math.max(0, Math.min(maxPlayers - 1, Math.round(options.numBots)));

  const config: GameConfig = {
    id: generateId("mp"),
    mode: "multiplayer",
    difficulty: options.difficulty,
    totalYears: options.totalYears,
    randomEventsEnabled: true,
    maxPlayers,
    numBots,
    createdAt: now,
    createdByUserId: options.hostUserId,
  };

  const host: Player = {
    id: generateId("p"),
    userId: options.hostUserId,
    displayName: options.hostDisplayName,
    companyName: options.hostCompanyName,
    joinOrder: 0,
    startingConditions: DEFAULT_STARTING_CONDITIONS,
    companyStates: [createInitialCompanyState(DEFAULT_STARTING_CONDITIONS)],
    decisions: [],
    results: [],
  };

  return {
    config,
    status: "setup",
    currentYear: 0,
    players: [host],
    market: [],
    updatedAt: now,
  };
}

export class MultiplayerGameError extends Error {}

/** Maximum human seats: maxPlayers minus the bot seats reserved at creation. */
export function maxHumanSeats(config: GameConfig): number {
  return config.maxPlayers - config.numBots;
}

/** A human joins an open game via its invite link. Idempotent for a userId already in the game (returns it unchanged). */
export function joinMultiplayerGame(
  game: Game,
  userId: string,
  displayName: string,
  companyName?: string,
): Game {
  if (game.players.some((p) => p.userId === userId)) return game;
  if (game.status !== "setup") {
    throw new MultiplayerGameError("This game has already started.");
  }
  const humanCount = game.players.filter((p) => !p.isBot).length;
  if (humanCount >= maxHumanSeats(game.config)) {
    throw new MultiplayerGameError("This game's human seats are full.");
  }

  const player: Player = {
    id: generateId("p"),
    userId,
    displayName,
    companyName,
    joinOrder: game.players.length,
    startingConditions: DEFAULT_STARTING_CONDITIONS,
    companyStates: [createInitialCompanyState(DEFAULT_STARTING_CONDITIONS)],
    decisions: [],
    results: [],
  };

  return {
    ...game,
    players: [...game.players, player],
    updatedAt: new Date().toISOString(),
  };
}

/** Fills any bot player without a pendingDecision yet, using its personality against its latest state. */
function seedBotDecisions(game: Game): Game {
  const players = game.players.map((p) => {
    if (!p.isBot || p.pendingDecision) return p;
    const latestState = p.companyStates[p.companyStates.length - 1];
    return { ...p, pendingDecision: decideBotYear(p.botPersonality ?? "balanced", latestState) };
  });
  return { ...game, players };
}

/** Host starts the game early or once full: fills remaining seats with bots and moves to "in_progress". */
export function startMultiplayerGame(game: Game): Game {
  if (game.status !== "setup") {
    throw new MultiplayerGameError("This game has already started.");
  }
  if (game.players.length === 0) {
    throw new MultiplayerGameError("No players to start with.");
  }

  const bots: Player[] = [];
  for (let i = 0; i < game.config.numBots; i++) {
    bots.push({
      id: generateId("bot"),
      userId: generateId("bot-user"),
      displayName: `Bot ${i + 1} (${personalityForBotIndex(i)})`,
      joinOrder: game.players.length + i,
      startingConditions: DEFAULT_STARTING_CONDITIONS,
      companyStates: [createInitialCompanyState(DEFAULT_STARTING_CONDITIONS)],
      decisions: [],
      results: [],
      isBot: true,
      botPersonality: personalityForBotIndex(i),
    });
  }

  const started: Game = {
    ...game,
    status: "in_progress",
    players: [...game.players, ...bots],
    updatedAt: new Date().toISOString(),
  };

  return seedBotDecisions(started);
}

/**
 * A human player submits their decision for the current year. If every
 * player (bots already have theirs pre-seeded) now has a pendingDecision,
 * the year resolves immediately and results are applied to everyone at
 * once; otherwise the game just records this player as "in" and waits.
 */
export function submitPlayerDecision(game: Game, playerId: string, decisionInput: YearDecisionInput): Game {
  if (game.status !== "in_progress") {
    throw new MultiplayerGameError("This game isn't in progress.");
  }
  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    throw new MultiplayerGameError("You're not a player in this game.");
  }
  if (player.isBot) {
    throw new MultiplayerGameError("Bots decide for themselves.");
  }

  const players = game.players.map((p) => (p.id === playerId ? { ...p, pendingDecision: decisionInput } : p));
  const withSubmission: Game = { ...game, players, updatedAt: new Date().toISOString() };

  const allReady = withSubmission.players.every((p) => !!p.pendingDecision);
  return allReady ? resolveYear(withSubmission) : withSubmission;
}

/** Builds each player's decision from their pendingDecision, simulates the year, and applies results to everyone. */
function resolveYear(game: Game): Game {
  const year = game.currentYear + 1;
  const globalEvent = game.config.randomEventsEnabled ? rollRandomEvent(year, "global", undefined) : null;
  const globalEvents = globalEvent ? [globalEvent] : [];

  const perPlayer = game.players.map((p) => {
    if (!p.pendingDecision) {
      throw new MultiplayerGameError(`Player ${p.displayName} has no pending decision — this shouldn't happen.`);
    }
    const decision = buildYearDecision(p.id, year, p.pendingDecision);
    const playerEvent = game.config.randomEventsEnabled ? rollRandomEvent(year, "player", p.id) : null;
    return {
      player: p,
      decision,
      openingState: p.companyStates[p.companyStates.length - 1],
      playerEvents: playerEvent ? [playerEvent] : [],
    };
  });

  const { market, results } = simulateMultiplayerYear({
    year,
    players: perPlayer.map(({ decision, openingState, playerEvents }) => ({ decision, openingState, playerEvents })),
    globalEvents,
  });

  const updatedPlayers = perPlayer.map(({ player, decision }, i) =>
    applyYearResultToPlayer(player, decision, results[i], game.config.totalYears),
  );

  const completed = year >= game.config.totalYears;
  const resolved: Game = {
    ...game,
    status: completed ? "completed" : "in_progress",
    currentYear: year,
    players: updatedPlayers,
    market: [...game.market, market],
    updatedAt: new Date().toISOString(),
  };

  return completed ? resolved : seedBotDecisions(resolved);
}
