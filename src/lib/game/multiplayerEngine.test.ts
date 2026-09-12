import { describe, expect, it } from "vitest";
import type { YearDecisionInput } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";
import { DEFAULT_STARTING_CONDITIONS } from "../simulation/initialState";
import {
  MultiplayerGameError,
  createMultiplayerGame,
  joinMultiplayerGame,
  maxHumanSeats,
  startMultiplayerGame,
  submitPlayerDecision,
} from "./multiplayerEngine";

function noOpDecision(): YearDecisionInput {
  const products = {} as YearDecisionInput["products"];
  for (const id of PRODUCT_IDS) {
    const p = DEFAULT_STARTING_CONDITIONS.products[id];
    products[id] = {
      price: p.startingPrice,
      productionVolume: 100,
      capacityInvestment: 0,
      qualityInvestment: 0,
      trainingSpend: 0,
      hires: 0,
      fires: 0,
      wageAdjustmentPct: 0,
    };
  }
  return {
    company: { marketingSpend: 0, rndSpend: 0, loanAmountRequested: 0, loanRepayment: 0, capexSpend: 0 },
    products,
  };
}

function newGame(overrides: Partial<Parameters<typeof createMultiplayerGame>[0]> = {}) {
  return createMultiplayerGame({
    totalYears: 3,
    difficulty: "standard",
    maxPlayers: 4,
    numBots: 1,
    hostUserId: "u-host",
    hostDisplayName: "Host",
    ...overrides,
  });
}

describe("createMultiplayerGame", () => {
  it("starts in the lobby with just the host", () => {
    const game = newGame();
    expect(game.status).toBe("setup");
    expect(game.players).toHaveLength(1);
    expect(game.players[0].userId).toBe("u-host");
    expect(game.config.maxPlayers).toBe(4);
    expect(game.config.numBots).toBe(1);
  });

  it("clamps numBots so at least one human seat remains", () => {
    const game = newGame({ maxPlayers: 2, numBots: 5 });
    expect(maxHumanSeats(game.config)).toBeGreaterThanOrEqual(1);
  });
});

describe("joinMultiplayerGame", () => {
  it("adds a new human player to the lobby", () => {
    const game = joinMultiplayerGame(newGame(), "u-2", "Brother");
    expect(game.players).toHaveLength(2);
    expect(game.players[1].displayName).toBe("Brother");
    expect(game.players[1].isBot).toBeFalsy();
  });

  it("is idempotent for a userId already in the game", () => {
    let game = newGame();
    game = joinMultiplayerGame(game, "u-2", "Brother");
    const again = joinMultiplayerGame(game, "u-2", "Brother (renamed attempt)");
    expect(again.players).toHaveLength(2);
    expect(again.players[1].displayName).toBe("Brother"); // unchanged, not re-added
  });

  it("refuses once human seats are full", () => {
    // maxPlayers 2, numBots 1 -> maxHumanSeats = 1, host already fills it
    const game = newGame({ maxPlayers: 2, numBots: 1 });
    expect(() => joinMultiplayerGame(game, "u-2", "Brother")).toThrow(MultiplayerGameError);
  });

  it("refuses once the game has started", () => {
    const started = startMultiplayerGame(newGame());
    expect(() => joinMultiplayerGame(started, "u-2", "Late")).toThrow(MultiplayerGameError);
  });
});

describe("startMultiplayerGame", () => {
  it("adds bots to fill the reserved seats and seeds their decisions", () => {
    const game = startMultiplayerGame(newGame({ numBots: 2 }));
    expect(game.status).toBe("in_progress");
    const bots = game.players.filter((p) => p.isBot);
    expect(bots).toHaveLength(2);
    for (const bot of bots) {
      expect(bot.pendingDecision).toBeDefined();
      expect(bot.botPersonality).toBeDefined();
    }
    // Host has no pending decision yet — waiting on them.
    expect(game.players.find((p) => !p.isBot)!.pendingDecision).toBeUndefined();
  });

  it("refuses to start a game that's already started", () => {
    const started = startMultiplayerGame(newGame());
    expect(() => startMultiplayerGame(started)).toThrow(MultiplayerGameError);
  });
});

describe("submitPlayerDecision", () => {
  it("waits for all humans before resolving the year", () => {
    let game = newGame({ maxPlayers: 4, numBots: 1 });
    game = joinMultiplayerGame(game, "u-2", "Brother");
    game = startMultiplayerGame(game); // host + brother + 1 bot = 3 players, 2 human

    const host = game.players.find((p) => p.userId === "u-host")!;
    const afterHost = submitPlayerDecision(game, host.id, noOpDecision());
    expect(afterHost.currentYear).toBe(0); // not resolved yet — brother hasn't submitted
    expect(afterHost.players.find((p) => p.id === host.id)!.pendingDecision).toBeDefined();

    const brother = afterHost.players.find((p) => p.userId === "u-2")!;
    const afterBrother = submitPlayerDecision(afterHost, brother.id, noOpDecision());
    expect(afterBrother.currentYear).toBe(1); // now resolved
    // Humans' pendingDecision is cleared after resolution; the bot's is
    // immediately re-seeded for the next year (see the dedicated test below).
    expect(afterBrother.players.filter((p) => !p.isBot).every((p) => !p.pendingDecision)).toBe(true);
    expect(afterBrother.players.every((p) => p.results.length === 1)).toBe(true);
  });

  it("completes the game and computes scores after the last configured year", () => {
    let game = newGame({ totalYears: 1, maxPlayers: 2, numBots: 1 });
    game = startMultiplayerGame(game);
    const host = game.players.find((p) => !p.isBot)!;
    game = submitPlayerDecision(game, host.id, noOpDecision());

    expect(game.status).toBe("completed");
    expect(game.currentYear).toBe(1);
    for (const p of game.players) {
      expect(p.finalScore).toBeDefined();
    }
  });

  it("rejects a decision from someone not in the game", () => {
    const game = startMultiplayerGame(newGame());
    expect(() => submitPlayerDecision(game, "nonexistent", noOpDecision())).toThrow(MultiplayerGameError);
  });

  it("rejects submitting before the game has started", () => {
    const game = newGame();
    expect(() => submitPlayerDecision(game, game.players[0].id, noOpDecision())).toThrow(MultiplayerGameError);
  });

  it("seeds the next year's bot decisions immediately after resolving", () => {
    let game = newGame({ totalYears: 3, maxPlayers: 2, numBots: 1 });
    game = startMultiplayerGame(game);
    const host = game.players.find((p) => !p.isBot)!;
    game = submitPlayerDecision(game, host.id, noOpDecision());

    expect(game.status).toBe("in_progress");
    expect(game.players.find((p) => p.isBot)!.pendingDecision).toBeDefined();
    expect(game.players.find((p) => !p.isBot)!.pendingDecision).toBeUndefined();
  });
});
