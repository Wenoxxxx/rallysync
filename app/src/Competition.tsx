import { useEffect, useState } from "react";
import { api, type Database, type Row } from "./data";

type Props = { data: Database; onChange: () => Promise<void> };
type Mutation = {
  type: "save" | "remove";
  resource: string;
  row: Row;
  original?: Row;
};
type ScoreDraft = [string, string][];
type Score = [number, number];
type Entrant = { entryId?: string; matchId?: string };

const list = (data: Database, resource: string) => data[resource] ?? [];
const text = (value: Row[string] | undefined) =>
  value == null ? "" : String(value);
const same = (a: Row[string] | undefined, b: Row[string] | undefined) =>
  text(a) === text(b);
const label = (value: Row[string] | undefined) =>
  text(value).replaceAll("_", " ");
let identity =
  BigInt(Date.now()) * 1_000_000n +
  BigInt(Math.floor(Math.random() * 1_000_000));
const nextId = () => {
  const now =
    BigInt(Date.now()) * 1_000_000n +
    BigInt(Math.floor(Math.random() * 1_000_000));
  identity = now > identity ? now : identity + 1n;
  return identity.toString();
};
const save = (resource: string, row: Row, original?: Row): Mutation => ({
  type: "save",
  resource,
  row,
  original,
});
const remove = (resource: string, row: Row): Mutation => ({
  type: "remove",
  resource,
  row,
});

function entryName(data: Database, entryId: Row[string] | undefined): string {
  const entry = list(data, "entries").find((row) =>
    same(row.entry_id, entryId),
  );
  if (entry?.entry_name) return text(entry.entry_name);
  const names = list(data, "entry_members")
    .filter((row) => same(row.entry_id, entryId))
    .sort((a, b) => Number(a.member_order) - Number(b.member_order))
    .map((member) =>
      list(data, "player_profiles").find((player) =>
        same(player.player_id, member.player_id),
      ),
    )
    .filter((player): player is Row => Boolean(player))
    .map((player) =>
      `${text(player.first_name)} ${text(player.last_name)}`.trim(),
    );
  return names.join(" / ") || `Entry ${text(entryId)}`;
}

function approvedEntries(data: Database, event: Row): Row[] {
  const registrations = new Set(
    list(data, "registrations")
      .filter(
        (row) =>
          row.status === "approved" &&
          same(row.tournament_id, event.tournament_id),
      )
      .map((row) => text(row.registration_id)),
  );
  const entryIds = new Set(
    list(data, "registration_entries")
      .filter(
        (row) =>
          same(row.event_id, event.event_id) &&
          registrations.has(text(row.registration_id)),
      )
      .map((row) => text(row.entry_id)),
  );
  return list(data, "entries")
    .filter(
      (row) =>
        same(row.event_id, event.event_id) &&
        row.status === "active" &&
        entryIds.has(text(row.entry_id)),
    )
    .sort(
      (a, b) =>
        entryName(data, a.entry_id).localeCompare(
          entryName(data, b.entry_id),
        ) || text(a.entry_id).localeCompare(text(b.entry_id)),
    );
}

function singleElimination(data: Database, event: Row): boolean {
  const format = list(data, "competition_formats").find((row) =>
    same(row.format_id, event.format_id),
  );
  return (
    text(format?.format_code).toLowerCase().replaceAll("-", "_") ===
    "single_elimination"
  );
}

function drawPlan(data: Database, event: Row): Mutation[] {
  if (list(data, "brackets").some((row) => same(row.event_id, event.event_id)))
    throw new Error(
      "A bracket already exists. Existing draws cannot be regenerated.",
    );
  if (!singleElimination(data, event))
    throw new Error(
      "Draw creation supports single elimination. Select that format in the event settings first.",
    );
  if (event.status === "cancelled" || event.status === "completed")
    throw new Error(
      "A cancelled or completed event cannot receive a new draw.",
    );
  const entries = approvedEntries(data, event);
  if (entries.length < Math.max(2, Number(event.minimum_entries) || 2))
    throw new Error(
      "The draw needs at least two approved active entries and must meet the event minimum.",
    );
  if (event.maximum_entries && entries.length > Number(event.maximum_entries))
    throw new Error("Approved entries exceed this event’s maximum.");
  const size = 2 ** Math.ceil(Math.log2(entries.length));
  const seeds = list(data, "seeds").filter((row) =>
    same(row.event_id, event.event_id),
  );
  const ranked = new Map<number, Row>();
  const seededIds = new Set<string>();
  for (const seed of seeds) {
    const number = Number(seed.seed_number);
    const entry = entries.find((row) => same(row.entry_id, seed.entry_id));
    if (!entry)
      throw new Error(
        `Seed ${number} is not an approved active registered entry.`,
      );
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > entries.length ||
      ranked.has(number) ||
      seededIds.has(text(entry.entry_id))
    )
      throw new Error(
        "Seed numbers and entries must be unique, with ranks inside the approved entry count.",
      );
    ranked.set(number, entry);
    seededIds.add(text(entry.entry_id));
  }
  let nextRank = 1;
  for (const entry of entries.filter(
    (row) => !seededIds.has(text(row.entry_id)),
  )) {
    while (ranked.has(nextRank)) nextRank++;
    ranked.set(nextRank++, entry);
  }
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    order = order.flatMap((rank) => [rank, sum - rank]);
  }
  const bracketId = nextId();
  const operations: Mutation[] = [
    save("brackets", {
      bracket_id: bracketId,
      event_id: event.event_id,
      format_id: event.format_id,
      status: "published",
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    }),
  ];
  const roundIds: string[] = [];
  for (let round = 1; round <= Math.log2(size); round++) {
    const remaining = size / 2 ** (round - 1);
    const roundId = nextId();
    roundIds.push(roundId);
    operations.push(
      save("bracket_rounds", {
        round_id: roundId,
        bracket_id: bracketId,
        round_number: round,
        name:
          remaining === 2
            ? "Final"
            : remaining === 4
              ? "Semifinals"
              : remaining === 8
                ? "Quarterfinals"
                : `Round of ${remaining}`,
      }),
    );
  }
  let level: (Entrant | null)[] = order.map((rank, index) => {
    const entry = ranked.get(rank);
    const seed = seeds.find(
      (row) => entry && same(row.entry_id, entry.entry_id),
    );
    operations.push(
      save("draw_positions", {
        draw_position_id: nextId(),
        bracket_id: bracketId,
        position_number: index + 1,
        entry_id: entry?.entry_id ?? null,
        seed_id: seed?.seed_id ?? null,
      }),
    );
    return entry ? { entryId: text(entry.entry_id) } : null;
  });
  let number = 0;
  for (const roundId of roundIds) {
    const next: (Entrant | null)[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const pair = [level[i], level[i + 1]];
      // A bye advances the occupied branch structurally: no fictitious match or result.
      if (!pair[0] || !pair[1]) {
        next.push(pair[0] || pair[1] || null);
        continue;
      }
      const matchId = nextId();
      operations.push(
        save("matches", {
          match_id: matchId,
          round_id: roundId,
          match_number: ++number,
          status: "scheduled",
        }),
      );
      pair.forEach((entrant, slot) => {
        operations.push(
          save("match_entries", {
            match_id: matchId,
            slot_number: slot + 1,
            entry_id: entrant!.entryId ?? null,
            source_match_id: entrant!.matchId ?? null,
            source_outcome: entrant!.matchId ? "winner" : null,
          }),
        );
        if (entrant!.matchId)
          operations.push(
            save("advancement_links", {
              advancement_link_id: nextId(),
              source_match_id: entrant!.matchId,
              source_outcome: "winner",
              target_match_id: matchId,
              target_slot_number: slot + 1,
            }),
          );
      });
      next.push({ matchId });
    }
    level = next;
  }
  operations.push(save("events", { ...event, status: "ongoing" }, event));
  return operations;
}

function completedGame(score: Score): number | null {
  const high = Math.max(...score);
  const low = Math.min(...score);
  if (high === low) return null;
  const finished =
    (high === 21 && low <= 19) ||
    (high > 21 && high < 30 && high - low === 2) ||
    (high === 30 && (low === 28 || low === 29));
  return finished ? (score[0] > score[1] ? 0 : 1) : null;
}

function readScores(
  draft: ScoreDraft,
  finalNormal = false,
): { scores: Score[]; wins: Score; winner: number | null } {
  const scores: Score[] = [];
  const wins: Score = [0, 0];
  let gap = false;
  let incomplete = false;
  for (let i = 0; i < draft.length; i++) {
    const pair = draft[i];
    if (!pair[0].trim() && !pair[1].trim()) {
      gap = true;
      continue;
    }
    if (!pair[0].trim() || !pair[1].trim())
      throw new Error(`Enter both scores for game ${i + 1}.`);
    if (gap)
      throw new Error(
        "Games must be entered in order, without empty games in between.",
      );
    if (incomplete)
      throw new Error(
        "Finish the preceding game before entering the next game.",
      );
    if (wins.some((wins) => wins === 2))
      throw new Error(
        "The match stops after an entry wins two games. Clear any later game scores.",
      );
    const score: Score = [Number(pair[0]), Number(pair[1])];
    if (
      score.some(
        (points) => !Number.isInteger(points) || points < 0 || points > 30,
      )
    )
      throw new Error(
        `Game ${i + 1}: points must be whole numbers from 0 to 30.`,
      );
    const high = Math.max(...score);
    const low = Math.min(...score);
    if ((high > 21 && high - low > 2) || (high === 30 && low === 30))
      throw new Error(
        `Game ${i + 1}: play must stop at the winning point (21, win by two, capped at 30).`,
      );
    const winner = completedGame(score);
    if (winner == null) {
      if (finalNormal)
        throw new Error(
          `Game ${i + 1} is unfinished or tied. Win at 21 by two points, or at the 30-point cap.`,
        );
      incomplete = true;
    } else wins[winner]++;
    scores.push(score);
  }
  const winner = wins[0] === 2 ? 0 : wins[1] === 2 ? 1 : null;
  if (finalNormal && winner == null)
    throw new Error(
      "A normal result requires two game wins in a best-of-three match.",
    );
  return { scores, wins, winner };
}

function matchSlots(data: Database, matchId: Row[string]): Row[] {
  return list(data, "match_entries")
    .filter((row) => same(row.match_id, matchId))
    .sort((a, b) => Number(a.slot_number) - Number(b.slot_number));
}

function scorePlan(
  data: Database,
  match: Row,
  entries: Row[],
  scores: Score[],
): Mutation[] {
  const games = list(data, "match_games").filter((row) =>
    same(row.match_id, match.match_id),
  );
  if (
    games.some(
      (game) => Number(game.game_number) < 1 || Number(game.game_number) > 3,
    )
  )
    throw new Error(
      "This match contains game records outside best-of-three. Correct those records before scoring.",
    );
  const operations: Mutation[] = [];
  for (let index = 0; index < 3; index++) {
    const original = games.find(
      (game) => Number(game.game_number) === index + 1,
    );
    const existingScores = original
      ? list(data, "game_scores").filter((row) =>
          same(row.game_id, original.game_id),
        )
      : [];
    if (!scores[index]) {
      for (const score of existingScores)
        operations.push(remove("game_scores", score));
      if (original) operations.push(remove("match_games", original));
      continue;
    }
    const game = original ?? {
      game_id: nextId(),
      match_id: match.match_id,
      game_number: index + 1,
    };
    if (!original) operations.push(save("match_games", game));
    for (const score of existingScores.filter(
      (row) => !entries.some((entry) => same(entry.entry_id, row.entry_id)),
    ))
      operations.push(remove("game_scores", score));
    entries.forEach((entry, side) => {
      const oldScore = existingScores.find((row) =>
        same(row.entry_id, entry.entry_id),
      );
      operations.push(
        save(
          "game_scores",
          {
            game_id: game.game_id,
            entry_id: entry.entry_id,
            points: scores[index][side],
          },
          oldScore,
        ),
      );
    });
  }
  return operations;
}

function destinations(data: Database, match: Row): Row[] {
  const links = list(data, "advancement_links").filter((row) =>
    same(row.source_match_id, match.match_id),
  );
  const result = [...links];
  for (const slot of list(data, "match_entries").filter((row) =>
    same(row.source_match_id, match.match_id),
  )) {
    if (
      !result.some(
        (link) =>
          same(link.target_match_id, slot.match_id) &&
          same(link.target_slot_number, slot.slot_number),
      )
    )
      result.push({
        source_match_id: match.match_id,
        source_outcome: slot.source_outcome,
        target_match_id: slot.match_id,
        target_slot_number: slot.slot_number,
      });
  }
  return result;
}

function assertUnstarted(data: Database, matchId: Row[string]): Row {
  const match = list(data, "matches").find((row) =>
    same(row.match_id, matchId),
  );
  if (!match)
    throw new Error("An advancement link references a missing match.");
  const hasResults = list(data, "match_results").some((row) =>
    same(row.match_id, matchId),
  );
  const hasGames = list(data, "match_games").some((row) =>
    same(row.match_id, matchId),
  );
  if (
    hasResults ||
    hasGames ||
    !["scheduled", "postponed"].includes(text(match.status))
  )
    throw new Error(
      `Match ${text(match.match_number)} downstream has already started or has scores/results. Resolve its dependent records before changing this result.`,
    );
  return match;
}

function isFinal(data: Database, match: Row, event: Row): boolean {
  if (!singleElimination(data, event)) return false;
  const round = list(data, "bracket_rounds").find((row) =>
    same(row.round_id, match.round_id),
  );
  if (!round) return false;
  const rounds = list(data, "bracket_rounds").filter((row) =>
    same(row.bracket_id, round.bracket_id),
  );
  return (
    Number(round.round_number) ===
      Math.max(...rounds.map((row) => Number(row.round_number))) &&
    list(data, "matches").filter((row) => same(row.round_id, round.round_id))
      .length === 1 &&
    !destinations(data, match).some((link) => link.source_outcome === "winner")
  );
}

function audit(
  actor: string,
  action: string,
  entity: string,
  entityId: Row[string],
  oldRow: Row | undefined,
  newRow: Row,
): Mutation {
  return save("audit_logs", {
    actor_user_id: actor,
    action,
    entity_type: entity,
    entity_id: entityId,
    old_value: oldRow ? JSON.stringify(oldRow) : null,
    new_value: JSON.stringify(newRow),
    created_at: new Date().toISOString(),
  });
}

// Workflow mutations form one transaction, not independent HTTP saves. The remote
// /transactions implementation must authorize the actor, lock affected records,
// enforce original-row concurrency checks, and commit/roll back the entire batch.
// Workflow IDs are string BIGINTs; PostgreSQL GENERATED ALWAYS inserts need
// OVERRIDING SYSTEM VALUE (or server remapping of all IDs and references together).
export default function Competition({ data, onChange }: Props) {
  const [tournamentSelection, setTournamentSelection] = useState("");
  const [eventSelection, setEventSelection] = useState("");
  const [matchSelection, setMatchSelection] = useState("");
  const [scores, setScores] = useState<ScoreDraft>([
    ["", ""],
    ["", ""],
    ["", ""],
  ]);
  const [resultType, setResultType] = useState("normal");
  const [winner, setWinner] = useState("");
  const [reason, setReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [actor, setActor] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const tournaments = list(data, "tournaments");
  const tournament =
    tournaments.find((row) => same(row.tournament_id, tournamentSelection)) ??
    tournaments[0];
  const events = list(data, "events").filter(
    (row) => tournament && same(row.tournament_id, tournament.tournament_id),
  );
  const event =
    events.find((row) => same(row.event_id, eventSelection)) ?? events[0];
  const bracket = list(data, "brackets").find(
    (row) => event && same(row.event_id, event.event_id),
  );
  const rounds = list(data, "bracket_rounds")
    .filter((row) => bracket && same(row.bracket_id, bracket.bracket_id))
    .sort((a, b) => Number(a.round_number) - Number(b.round_number));
  const roundIds = new Set(rounds.map((row) => text(row.round_id)));
  const matches = list(data, "matches")
    .filter((row) => roundIds.has(text(row.round_id)))
    .sort((a, b) => Number(a.match_number) - Number(b.match_number));
  const match =
    matches.find((row) => same(row.match_id, matchSelection)) ??
    matches.find((row) => row.status === "in_progress") ??
    matches[0];
  const matchId = text(match?.match_id);
  const slots = match ? matchSlots(data, match.match_id) : [];
  const ready =
    slots.length === 2 &&
    slots.every((slot) => Boolean(slot.entry_id)) &&
    !same(slots[0]?.entry_id, slots[1]?.entry_id);
  const result = list(data, "match_results").find(
    (row) => match && same(row.match_id, match.match_id),
  );
  const locked = result?.state === "final";
  const users = list(data, "users").filter(
    (row) => row.account_status === "active",
  );
  const eligible = event ? approvedEntries(data, event) : [];
  const positions = list(data, "draw_positions")
    .filter((row) => bracket && same(row.bracket_id, bracket.bracket_id))
    .sort((a, b) => Number(a.position_number) - Number(b.position_number));
  const placements = list(data, "event_results")
    .filter((row) => event && same(row.event_id, event.event_id))
    .sort((a, b) => Number(a.placement) - Number(b.placement));

  useEffect(() => {
    setMatchSelection(matchId);
    const current = list(data, "match_results").find((row) =>
      same(row.match_id, matchId),
    );
    const entries = matchSlots(data, matchId);
    const games = list(data, "match_games").filter((row) =>
      same(row.match_id, matchId),
    );
    setScores(
      [1, 2, 3].map((number) => {
        const game = games.find((row) => Number(row.game_number) === number);
        return [0, 1].map((side) => {
          const score =
            game && entries[side]
              ? list(data, "game_scores").find(
                  (row) =>
                    same(row.game_id, game.game_id) &&
                    same(row.entry_id, entries[side].entry_id),
                )
              : undefined;
          return score ? text(score.points) : "";
        }) as [string, string];
      }),
    );
    setResultType(text(current?.result_type) || "normal");
    setWinner(text(current?.winner_entry_id));
    setReason(text(current?.result_reason));
    setReopenReason("");
    setStatus(
      text(
        list(data, "matches").find((row) => same(row.match_id, matchId))
          ?.status,
      ) || "scheduled",
    );
    setActor((previous) => {
      const active = list(data, "users").filter(
        (row) => row.account_status === "active",
      );
      return active.some((row) => same(row.user_id, previous))
        ? previous
        : text(active[0]?.user_id);
    });
  }, [data, matchId]);

  function actorId(fresh: Database): string {
    if (
      !list(fresh, "users").some(
        (row) => same(row.user_id, actor) && row.account_status === "active",
      )
    )
      throw new Error("Select an active recording account first.");
    return actor;
  }

  async function run(
    name: string,
    action: () => Promise<void>,
    success: string,
  ) {
    setBusy(name);
    setError("");
    setNotice("");
    try {
      await action();
      await onChange();
      setNotice(success);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The operation could not be completed.",
      );
    } finally {
      setBusy("");
    }
  }

  function currentMatch(
    fresh: Database,
    needsEntries = true,
  ): { current: Row; entries: Row[]; oldResult: Row | undefined } {
    const current = list(fresh, "matches").find((row) =>
      same(row.match_id, matchId),
    );
    if (!current)
      throw new Error("This match no longer exists. Reload the bracket.");
    const oldResult = list(fresh, "match_results").find((row) =>
      same(row.match_id, matchId),
    );
    const entries = matchSlots(fresh, matchId);
    if (
      needsEntries &&
      (entries.length !== 2 ||
        entries.some((entry) => !entry.entry_id) ||
        same(entries[0]?.entry_id, entries[1]?.entry_id))
    )
      throw new Error(
        "Both distinct competitors must be assigned before scoring.",
      );
    if (
      needsEntries &&
      entries.some(
        (entry, index) => !same(entry.entry_id, slots[index]?.entry_id),
      )
    )
      throw new Error(
        "The competitors changed. Reload and review the match before saving.",
      );
    return { current, entries, oldResult };
  }

  async function createDraw() {
    if (!event) return;
    await run(
      "draw",
      async () => {
        const fresh = await api.load();
        const currentEvent = list(fresh, "events").find((row) =>
          same(row.event_id, event.event_id),
        );
        if (!currentEvent)
          throw new Error("The selected event no longer exists.");
        const operations = drawPlan(fresh, currentEvent);
        operations.push(
          audit(
            actorId(fresh),
            "draw.published",
            "events",
            currentEvent.event_id,
            currentEvent,
            {
              event_id: currentEvent.event_id,
              approved_entries: approvedEntries(fresh, currentEvent).length,
            },
          ),
        );
        await api.transaction(operations);
      },
      "Draw published. Byes advance directly; no artificial matches were created.",
    );
  }

  async function updateStatus() {
    await run(
      "status",
      async () => {
        const fresh = await api.load();
        const { current, oldResult } = currentMatch(
          fresh,
          ["called", "in_progress"].includes(status),
        );
        if (oldResult?.state === "final")
          throw new Error(
            "Final results are locked. Reopen the result before changing its match.",
          );
        if (
          ![
            "scheduled",
            "called",
            "in_progress",
            "postponed",
            "cancelled",
          ].includes(status)
        )
          throw new Error(
            "Completed match states are set by submitting or publishing a result.",
          );
        if (oldResult?.state === "submitted")
          throw new Error(
            "A result is submitted. Save revised scores first to return it to draft before changing status.",
          );
        const updated = { ...current, status };
        await api.transaction([
          save("matches", updated, current),
          audit(
            actorId(fresh),
            "match.status_changed",
            "matches",
            current.match_id,
            current,
            updated,
          ),
        ]);
      },
      "Match status updated.",
    );
  }

  async function persist(state: "draft" | "submitted" | "final") {
    if (!event) return;
    await run(
      state,
      async () => {
        const fresh = await api.load();
        const recordedBy = actorId(fresh);
        const { current, entries, oldResult } = currentMatch(fresh);
        if (oldResult?.state === "final")
          throw new Error(
            "This result is final and locked. Use the reason-required reopen action.",
          );
        const parsed = readScores(
          scores,
          state !== "draft" && resultType === "normal",
        );
        const operations = scorePlan(fresh, current, entries, parsed.scores);
        const currentEvent = list(fresh, "events").find((row) =>
          same(row.event_id, event.event_id),
        );
        if (!currentEvent) throw new Error("The event no longer exists.");
        if (state === "draft") {
          if (oldResult)
            operations.push(
              save(
                "match_results",
                {
                  ...oldResult,
                  state: oldResult.state === "reopened" ? "reopened" : "draft",
                  winner_entry_id: null,
                  finalized_at: null,
                },
                oldResult,
              ),
            );
          operations.push(
            save(
              "matches",
              {
                ...current,
                status: parsed.scores.length ? "in_progress" : "scheduled",
              },
              current,
            ),
          );
          operations.push(
            audit(
              recordedBy,
              "match.scores_saved",
              "matches",
              current.match_id,
              undefined,
              { scores: JSON.stringify(parsed.scores) },
            ),
          );
        } else {
          if (
            ![
              "normal",
              "walkover",
              "retirement",
              "disqualification",
              "no_show",
            ].includes(resultType)
          )
            throw new Error("Choose a supported result type.");
          const winnerId =
            resultType === "normal"
              ? text(entries[parsed.winner!].entry_id)
              : winner;
          if (!entries.some((entry) => same(entry.entry_id, winnerId)))
            throw new Error(
              "The winner must be one of this match’s competitors.",
            );
          if (resultType !== "normal" && !reason.trim())
            throw new Error("Record a reason for an exceptional result.");
          const loserId = text(
            entries.find((entry) => !same(entry.entry_id, winnerId))!.entry_id,
          );
          const now = new Date().toISOString();
          const updated: Row = {
            result_id: oldResult?.result_id ?? nextId(),
            match_id: current.match_id,
            winner_entry_id: winnerId,
            result_type: resultType,
            result_reason: reason.trim() || null,
            state,
            recorded_by_user_id: recordedBy,
            recorded_at: now,
            finalized_at: state === "final" ? now : null,
          };
          operations.push(
            save(
              "matches",
              {
                ...current,
                status:
                  resultType === "retirement"
                    ? "retired"
                    : ["walkover", "no_show"].includes(resultType)
                      ? "walkover"
                      : "completed",
              },
              current,
            ),
          );
          operations.push(save("match_results", updated, oldResult));
          if (state === "final") {
            for (const link of destinations(fresh, current)) {
              assertUnstarted(fresh, link.target_match_id);
              if (!["winner", "loser"].includes(text(link.source_outcome)))
                throw new Error("An advancement link has an invalid outcome.");
              const target = list(fresh, "match_entries").find(
                (row) =>
                  same(row.match_id, link.target_match_id) &&
                  same(row.slot_number, link.target_slot_number),
              );
              const advancedId =
                link.source_outcome === "winner" ? winnerId : loserId;
              if (target?.entry_id && !same(target.entry_id, advancedId))
                throw new Error(
                  "An advancement slot already contains a different entry. Resolve the bracket conflict first.",
                );
              operations.push(
                save(
                  "match_entries",
                  {
                    match_id: link.target_match_id,
                    slot_number: link.target_slot_number,
                    entry_id: advancedId,
                    source_match_id: current.match_id,
                    source_outcome: link.source_outcome,
                  },
                  target,
                ),
              );
            }
            if (isFinal(fresh, current, currentEvent)) {
              for (const placement of list(fresh, "event_results").filter(
                (row) =>
                  same(row.event_id, currentEvent.event_id) &&
                  (Number(row.placement) <= 2 ||
                    same(row.entry_id, winnerId) ||
                    same(row.entry_id, loserId)),
              ))
                operations.push(remove("event_results", placement));
              [winnerId, loserId].forEach((entryId, index) =>
                operations.push(
                  save("event_results", {
                    event_result_id: nextId(),
                    event_id: currentEvent.event_id,
                    entry_id: entryId,
                    placement: index + 1,
                  }),
                ),
              );
              operations.push(
                save(
                  "events",
                  { ...currentEvent, status: "completed" },
                  currentEvent,
                ),
              );
              const currentBracket = list(fresh, "brackets").find((row) =>
                same(row.event_id, currentEvent.event_id),
              );
              if (currentBracket)
                operations.push(
                  save(
                    "brackets",
                    { ...currentBracket, status: "completed" },
                    currentBracket,
                  ),
                );
            }
          }
          operations.push(
            audit(
              recordedBy,
              state === "final" ? "result.finalized" : "result.submitted",
              "match_results",
              updated.result_id,
              oldResult,
              updated,
            ),
          );
        }
        await api.transaction(operations);
      },
      state === "draft"
        ? "Game scores saved. The result is not yet final."
        : state === "submitted"
          ? "Result submitted for review. Publish it to lock scores and advance the bracket."
          : "Result published and locked. Bracket advancement and final placements are up to date.",
    );
  }

  async function reopen() {
    if (!event) return;
    await run(
      "reopen",
      async () => {
        if (!reopenReason.trim())
          throw new Error("A reason is required to reopen a final result.");
        const fresh = await api.load();
        const recordedBy = actorId(fresh);
        const { current, oldResult } = currentMatch(fresh);
        if (oldResult?.state !== "final")
          throw new Error("Only a final result can be reopened.");
        const operations: Mutation[] = [];
        for (const link of destinations(fresh, current)) {
          assertUnstarted(fresh, link.target_match_id);
          const target = list(fresh, "match_entries").find(
            (row) =>
              same(row.match_id, link.target_match_id) &&
              same(row.slot_number, link.target_slot_number),
          );
          if (target)
            operations.push(
              save(
                "match_entries",
                {
                  ...target,
                  entry_id: null,
                  source_match_id: current.match_id,
                  source_outcome: link.source_outcome,
                },
                target,
              ),
            );
        }
        const currentEvent = list(fresh, "events").find((row) =>
          same(row.event_id, event.event_id),
        );
        if (currentEvent && isFinal(fresh, current, currentEvent)) {
          for (const placement of list(fresh, "event_results").filter(
            (row) =>
              same(row.event_id, currentEvent.event_id) &&
              Number(row.placement) <= 2,
          ))
            operations.push(remove("event_results", placement));
          operations.push(
            save(
              "events",
              { ...currentEvent, status: "ongoing" },
              currentEvent,
            ),
          );
          const currentBracket = list(fresh, "brackets").find((row) =>
            same(row.event_id, currentEvent.event_id),
          );
          if (currentBracket)
            operations.push(
              save(
                "brackets",
                { ...currentBracket, status: "published" },
                currentBracket,
              ),
            );
        }
        const updated = {
          ...oldResult,
          state: "reopened",
          finalized_at: null,
          result_reason: [
            text(oldResult.result_reason),
            `Reopened: ${reopenReason.trim()}`,
          ]
            .filter(Boolean)
            .join("\n"),
        };
        operations.unshift(save("match_results", updated, oldResult));
        operations.push(
          save("matches", { ...current, status: "in_progress" }, current),
        );
        operations.push(
          audit(
            recordedBy,
            "result.reopened",
            "match_results",
            oldResult.result_id,
            oldResult,
            { ...updated, reopen_reason: reopenReason.trim() },
          ),
        );
        await api.transaction(operations);
      },
      "Result reopened and reason audited. Unplayed advancement slots and final placements have been withdrawn.",
    );
  }

  function slotName(slot: Row | undefined): string {
    if (slot?.entry_id) return entryName(data, slot.entry_id);
    const source = list(data, "matches").find(
      (row) => slot && same(row.match_id, slot.source_match_id),
    );
    return source
      ? `${label(slot?.source_outcome)} of match ${text(source.match_number)}`
      : "Awaiting entrant";
  }

  let scoreSummary = "Best of 3 · 21 points · cap 30";
  try {
    const parsed = readScores(scores);
    if (parsed.scores.length)
      scoreSummary = `${parsed.wins[0]} – ${parsed.wins[1]} games${parsed.winner != null && slots[parsed.winner] ? ` · ${entryName(data, slots[parsed.winner].entry_id)} wins` : ""}`;
  } catch {
    scoreSummary = "Review scores before saving";
  }

  return (
    <div className="competition-workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">COMPETITION DESK</p>
          <h1>Draws & scoring</h1>
          <p className="muted">
            Follow the bracket, record each game, and publish the next winner.
          </p>
        </div>
        {bracket && <span className="badge">{label(bracket.status)} draw</span>}
      </div>
      <section className="panel">
        <div className="form-grid">
          <label className="field">
            Tournament
            <select
              value={text(tournament?.tournament_id)}
              disabled={Boolean(busy)}
              onChange={(e) => {
                setTournamentSelection(e.target.value);
                setEventSelection("");
                setMatchSelection("");
                setError("");
                setNotice("");
              }}
            >
              {!tournaments.length && <option value="">No tournaments</option>}
              {tournaments.map((row) => (
                <option
                  key={text(row.tournament_id)}
                  value={text(row.tournament_id)}
                >
                  {text(row.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Event
            <select
              value={text(event?.event_id)}
              disabled={Boolean(busy)}
              onChange={(e) => {
                setEventSelection(e.target.value);
                setMatchSelection("");
                setError("");
                setNotice("");
              }}
            >
              {!events.length && <option value="">No events</option>}
              {events.map((row) => (
                <option key={text(row.event_id)} value={text(row.event_id)}>
                  {text(row.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Recording account
            <select
              value={actor}
              disabled={Boolean(busy)}
              onChange={(e) => setActor(e.target.value)}
            >
              <option value="">Select an active account</option>
              {users.map((row) => (
                <option key={text(row.user_id)} value={text(row.user_id)}>
                  {text(row.email)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          Actions are attributed to the recording account. Connected servers
          must authorize the signed-in official or organizer.
        </p>
      </section>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {busy && (
        <p className="muted" role="status">
          Saving {label(busy)}…
        </p>
      )}
      {!event ? (
        <section className="panel empty-state">
          <h2>No event selected</h2>
          <p className="muted">
            Create a tournament and event in Records to start a competition.
          </p>
        </section>
      ) : !bracket ? (
        <section className="panel empty-state">
          <span className="badge">DRAW PREPARATION</span>
          <h2>Give this event its first draw</h2>
          <p>
            {eligible.length} approved, registered active entries are eligible.
          </p>
          <p className="muted">
            Single elimination honors configured seeds, places remaining entries
            alphabetically, and advances byes without fake matches. Existing
            brackets are never regenerated.
          </p>
          {eligible.length >= 2 && (
            <p className="muted">
              {2 ** Math.ceil(Math.log2(eligible.length))} draw positions ·{" "}
              {2 ** Math.ceil(Math.log2(eligible.length)) - eligible.length}{" "}
              byes · {eligible.length - 1} played matches
            </p>
          )}
          <button
            className="button"
            disabled={
              Boolean(busy) ||
              !actor ||
              eligible.length < 2 ||
              !singleElimination(data, event) ||
              ["completed", "cancelled"].includes(text(event.status))
            }
            onClick={() => void createDraw()}
          >
            Create & publish draw
          </button>
          {!singleElimination(data, event) && (
            <p className="muted">
              This event uses another format. Automatic draw creation is
              available for single elimination only.
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="panel">
            <div className="page-heading">
              <div>
                <h2>{text(event.name)}</h2>
                <p className="muted">
                  {matches.length} matches ·{" "}
                  {
                    list(data, "match_results").filter(
                      (row) =>
                        row.state === "final" &&
                        matches.some((match) =>
                          same(match.match_id, row.match_id),
                        ),
                    ).length
                  }{" "}
                  final results
                  {positions.length
                    ? ` · ${positions.filter((row) => !row.entry_id).length} structural byes`
                    : ""}
                </p>
              </div>
              <span className="badge">{label(event.entry_type)}</span>
            </div>
            {!matches.length ? (
              <p className="muted">
                This bracket has no matches yet. Its existing records are
                preserved; add rounds and matches in Records.
              </p>
            ) : (
              <div className="bracket-grid" aria-label="Tournament bracket">
                {rounds.map((round) => (
                  <section className="bracket-round" key={text(round.round_id)}>
                    <h3>{text(round.name)}</h3>
                    {matches
                      .filter((row) => same(row.round_id, round.round_id))
                      .map((row) => {
                        const participants = matchSlots(data, row.match_id);
                        const outcome = list(data, "match_results").find(
                          (result) => same(result.match_id, row.match_id),
                        );
                        const games = list(data, "match_games")
                          .filter((game) => same(game.match_id, row.match_id))
                          .sort(
                            (a, b) =>
                              Number(a.game_number) - Number(b.game_number),
                          );
                        return (
                          <button
                            type="button"
                            className={`match-card${same(row.match_id, matchId) ? " selected" : ""}`}
                            key={text(row.match_id)}
                            disabled={Boolean(busy)}
                            onClick={() => {
                              setMatchSelection(text(row.match_id));
                              setError("");
                              setNotice("");
                            }}
                            aria-pressed={same(row.match_id, matchId)}
                          >
                            <span className="match-card-heading">
                              <span>Match {text(row.match_number)}</span>
                              <span className="badge">
                                {outcome?.state === "final"
                                  ? "final"
                                  : label(row.status)}
                              </span>
                            </span>
                            {[0, 1].map((side) => (
                              <span
                                className={`match-side${outcome?.state === "final" && participants[side]?.entry_id && same(outcome.winner_entry_id, participants[side].entry_id) ? " winner" : ""}`}
                                key={side}
                              >
                                <span>{slotName(participants[side])}</span>
                                <span>
                                  {games
                                    .map((game) => {
                                      const score =
                                        participants[side] &&
                                        list(data, "game_scores").find(
                                          (score) =>
                                            same(score.game_id, game.game_id) &&
                                            same(
                                              score.entry_id,
                                              participants[side].entry_id,
                                            ),
                                        );
                                      return score ? text(score.points) : "–";
                                    })
                                    .join("  ")}
                                </span>
                              </span>
                            ))}
                          </button>
                        );
                      })}
                  </section>
                ))}
              </div>
            )}
            {positions.length > 0 && (
              <details>
                <summary>Draw positions & seeds</summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Entry</th>
                        <th>Seed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => {
                        const seed = list(data, "seeds").find((row) =>
                          same(row.seed_id, position.seed_id),
                        );
                        return (
                          <tr key={text(position.draw_position_id)}>
                            <td>{text(position.position_number)}</td>
                            <td>
                              {position.entry_id
                                ? entryName(data, position.entry_id)
                                : "Bye — empty branch"}
                            </td>
                            <td>{seed ? text(seed.seed_number) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>
          {match && (
            <section className="panel scoreboard" aria-busy={Boolean(busy)}>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    MATCH {text(match.match_number)} ·{" "}
                    {text(
                      rounds.find((round) =>
                        same(round.round_id, match.round_id),
                      )?.name,
                    )}
                  </p>
                  <h2>Match scoring</h2>
                  <p className="muted">{scoreSummary}</p>
                </div>
                <span className="badge">
                  {locked
                    ? "Final · locked"
                    : result
                      ? label(result.state)
                      : label(match.status)}
                </span>
              </div>
              {!ready && (
                <p className="notice">
                  Waiting for both competitors. Publish the feeder results to
                  assign their winners here.
                </p>
              )}
              {locked && (
                <p className="notice">
                  Final result:{" "}
                  <strong>{entryName(data, result.winner_entry_id)}</strong> ·{" "}
                  {label(result.result_type)}
                  {result.finalized_at
                    ? ` · ${new Date(text(result.finalized_at)).toLocaleString()}`
                    : ""}
                  . Scores are locked.
                </p>
              )}
              <fieldset disabled={Boolean(busy) || locked}>
                <legend className="muted">Match controls</legend>
                <div className="form-grid">
                  <label className="field">
                    Match status
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {[
                        "scheduled",
                        "called",
                        "in_progress",
                        "postponed",
                        "cancelled",
                      ].map((value) => (
                        <option key={value} value={value}>
                          {label(value)}
                        </option>
                      ))}
                      {![
                        "scheduled",
                        "called",
                        "in_progress",
                        "postponed",
                        "cancelled",
                      ].includes(status) && (
                        <option value={status}>
                          {label(status)} · result controlled
                        </option>
                      )}
                    </select>
                  </label>
                  <div className="field">
                    <span>Operational state</span>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={!actor}
                      onClick={() => void updateStatus()}
                    >
                      Update status
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Game</th>
                        <th>{slotName(slots[0])}</th>
                        <th>{slotName(slots[1])}</th>
                        <th>Game state</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((pair, index) => {
                        const complete = pair.every((value) => value !== "")
                          ? completedGame([Number(pair[0]), Number(pair[1])])
                          : null;
                        return (
                          <tr key={index}>
                            <th scope="row">Game {index + 1}</th>
                            {pair.map((value, side) => (
                              <td key={side}>
                                <input
                                  className="score-input"
                                  type="number"
                                  min="0"
                                  max="30"
                                  step="1"
                                  inputMode="numeric"
                                  value={value}
                                  disabled={!ready}
                                  aria-label={`Game ${index + 1}, ${slotName(slots[side])} points`}
                                  onChange={(e) =>
                                    setScores((current) =>
                                      current.map((game, gameIndex) =>
                                        gameIndex === index
                                          ? (game.map((points, entryIndex) =>
                                              entryIndex === side
                                                ? e.target.value
                                                : points,
                                            ) as [string, string])
                                          : game,
                                      ),
                                    )
                                  }
                                />
                              </td>
                            ))}
                            <td className="muted">
                              {pair.every((value) => value === "")
                                ? "Not played"
                                : complete != null
                                  ? `${slotName(slots[complete])} wins`
                                  : "In progress"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="muted">
                  Leave unplayed games empty. Normal results require two wins,
                  21 points with a two-point lead, or 30–28 / 30–29. No game may
                  follow the second win. Live scores may be unfinished.
                </p>
                <div className="form-grid">
                  <label className="field">
                    Result type
                    <select
                      value={resultType}
                      onChange={(e) => setResultType(e.target.value)}
                    >
                      {[
                        "normal",
                        "walkover",
                        "retirement",
                        "disqualification",
                        "no_show",
                      ].map((value) => (
                        <option key={value} value={value}>
                          {label(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Winner
                    {resultType === "normal" ? (
                      <input readOnly value="Determined from game scores" />
                    ) : (
                      <select
                        value={winner}
                        onChange={(e) => setWinner(e.target.value)}
                      >
                        <option value="">Select winning competitor</option>
                        {slots
                          .filter((slot) => slot.entry_id)
                          .map((slot) => (
                            <option
                              key={text(slot.entry_id)}
                              value={text(slot.entry_id)}
                            >
                              {entryName(data, slot.entry_id)}
                            </option>
                          ))}
                      </select>
                    )}
                  </label>
                  <label className="field">
                    {resultType === "normal"
                      ? "Result notes (optional)"
                      : "Outcome reason (required)"}
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                    />
                  </label>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!ready || !actor}
                    onClick={() => void persist("draft")}
                  >
                    Save game scores
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!ready || !actor}
                    onClick={() => void persist("submitted")}
                  >
                    Submit result
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={!ready || !actor}
                    onClick={() => void persist("final")}
                  >
                    Publish final result
                  </button>
                </div>
              </fieldset>
              {locked && (
                <div className="reopen-result">
                  <h3>Correct a final result</h3>
                  <p className="muted">
                    Reopening is audited and withdraws unplayed advancement
                    slots. A dependent match with scores or results must be
                    resolved first. Reopening the final also withdraws the
                    champion and runner-up.
                  </p>
                  <label className="field">
                    Reason for reopening
                    <textarea
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      rows={2}
                      disabled={Boolean(busy)}
                      placeholder="Explain why this final result needs correction"
                    />
                  </label>
                  <button
                    className="button secondary"
                    disabled={Boolean(busy) || !actor || !reopenReason.trim()}
                    onClick={() => void reopen()}
                  >
                    Reopen for correction
                  </button>
                </div>
              )}
            </section>
          )}
          {placements.length > 0 && (
            <section className="panel">
              <h2>Event placements</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Place</th>
                      <th>Entry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.map((row) => (
                      <tr key={text(row.event_result_id)}>
                        <td>
                          <span className="badge">
                            {Number(row.placement) === 1
                              ? "Champion"
                              : Number(row.placement) === 2
                                ? "Runner-up"
                                : `#${text(row.placement)}`}
                          </span>
                        </td>
                        <td>{entryName(data, row.entry_id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
