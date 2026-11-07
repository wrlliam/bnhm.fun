import { beforeEach, describe, expect, test } from "bun:test";
import { haversineKm, parseStops, routeKm } from "@/lib/pub-crawl";
import { getRoom } from "@/lib/rooms/core";
import type { PubState } from "@/lib/rooms/games/pub-crawl";
import { getPhoto, serialize } from "@/lib/rooms/persist";
import { create, photoFor } from "@/lib/rooms/server";
import type { PubGameView } from "@/lib/rooms/registry";
import { reset, setup } from "./helpers";

beforeEach(reset);

const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
// three pubs roughly 500 m apart along a street in London
const SPOTS = [
  { lat: 51.5145, lng: -0.1235, acc: 15 },
  { lat: 51.5145, lng: -0.1163, acc: 15 },
  { lat: 51.5145, lng: -0.1091, acc: 15 },
];

function crawl(names = ["Ann", "Ben"], stops = ["The Lamb", "The Crown", "The Swan"]) {
  const t = setup("pub-crawl", names);
  t.host({ type: "settings", stops });
  t.host({ type: "start" });
  const s = t.room.state as PubState;
  const id = (i: number) => s.stops[i].id;
  const g = (i?: number) => t.view(i).game as PubGameView;
  /** Arrive, post the photo, move on. */
  const doStop = (p: number, stop: number, photo = true) => {
    t.as(p, { type: "arrive", stopId: id(stop), ...SPOTS[stop] });
    t.as(p, photo ? { type: "proof", stopId: id(stop), photo: PHOTO } : { type: "moveOn", stopId: id(stop) });
  };
  return { ...t, s, id, g, doStop };
}

describe("Pub Crawl", () => {
  test("the setup page's stop list becomes the route", () => {
    const { code } = create("pub-crawl", { stops: ["The Lamb", "  The Crown  ", "", "The Lamb"] });
    expect((getRoom(code).state as PubState).stops.map((x) => x.name)).toEqual(["The Lamb", "The Crown"]);
    expect(parseStops("A\n\n b \na\nC")).toEqual(["A", "b", "C"]);
  });

  test("can't start without stops; only the host edits the route", () => {
    const { host, as } = setup("pub-crawl", ["Ann"]);
    expect(() => host({ type: "start" })).toThrow("at least one stop");
    expect(() => as(0, { type: "addStop", name: "The Lamb" })).toThrow("Only the host");
    host({ type: "addStop", name: "The Lamb" });
    expect(() => host({ type: "addStop", name: "the lamb" })).toThrow("already on the list");
    expect(() => host({ type: "start" })).not.toThrow();
  });

  test("arrive, then proof ticks the stop off, counts a drink and moves you on", () => {
    const { as, id, g, room, code } = crawl();
    expect(() => as(0, { type: "proof", stopId: id(0), photo: PHOTO })).toThrow("I'm here");
    as(0, { type: "arrive", stopId: id(0), ...SPOTS[0] });
    expect(() => as(0, { type: "arrive", stopId: id(1) })).toThrow("Finish up at The Lamb");
    as(0, { type: "proof", stopId: id(0), photo: PHOTO });
    const me = g(0).me!;
    expect(me.visits[id(0)].doneAt).not.toBeNull();
    expect(me.visits[id(0)].drinks).toBe(1);
    expect(me.currentStop).toBe(id(1));
    expect(room.stats[me.playerId].sips).toBe(1);
    // the view carries a URL, never the image itself
    const url = me.visits[id(0)].photo!;
    expect(url).toMatch(new RegExp(`^/api/rooms/${code}/photo/[0-9a-f]{16}$`));
    expect(JSON.stringify(g(1))).not.toContain("base64");
    expect(serialize(room)).not.toContain("base64");
  });

  test("photos are served by id and removed with the stop", async () => {
    const { as, id, g, host, code } = crawl();
    as(0, { type: "arrive", stopId: id(0) });
    as(0, { type: "proof", stopId: id(0), photo: PHOTO });
    const photoId = g(0).me!.visits[id(0)].photo!.split("/").pop()!;
    expect((await photoFor(code, photoId)).type).toBe("image/jpeg");
    host({ type: "removeStop", id: id(0) });
    expect(await getPhoto(code, photoId)).toBeNull();
  });

  test("drink counter goes up and down at the current stop, never below zero", () => {
    const { as, id, g, room, players } = crawl();
    as(0, { type: "drink", delta: 1 });
    as(0, { type: "drink", delta: 1 });
    as(0, { type: "drink", delta: -1 });
    as(0, { type: "drink", delta: -1 });
    as(0, { type: "drink", delta: -1 });
    expect(g(0).me!.visits[id(0)].drinks).toBe(0);
    as(0, { type: "drink", delta: 1, stopId: id(2) });
    expect(g(0).me!.drinks).toBe(1);
    expect(g().totalDrinks).toBe(1);
    expect(room.stats[players[0].id].sips).toBe(1);
  });

  test("first to tick off every stop wins; the crawl ends when everyone's done", () => {
    const { doStop, g, players, as, id } = crawl();
    doStop(1, 0);
    doStop(1, 1, false);
    doStop(0, 0);
    doStop(0, 1);
    doStop(0, 2);
    expect(g().status).toBe("crawling");
    expect(g().ranking[0]).toBe(players[0].id);
    as(1, { type: "skip", stopId: id(2) });
    const view = g();
    expect(view.status).toBe("finished");
    expect(view.ranking).toEqual([players[0].id, players[1].id]);
    expect(view.people.find((p) => p.playerId === players[1].id)!.complete).toBe(false);
    expect(view.totalPhotos).toBe(4);
  });

  test("distance comes from where phones checked in at each stop", () => {
    const { doStop, g } = crawl(["Ann"]);
    doStop(0, 0);
    doStop(0, 1);
    doStop(0, 2);
    const v = g();
    const crow = haversineKm(SPOTS[0], SPOTS[1]) + haversineKm(SPOTS[1], SPOTS[2]);
    expect(crow).toBeGreaterThan(0.9);
    expect(crow).toBeLessThan(1.1);
    expect(v.routeKm).toBeCloseTo(routeKm(SPOTS), 5);
    expect(v.people[0].km).toBeCloseTo(v.routeKm, 5);
    expect(v.stops.every((x) => x.spot)).toBe(true);
  });

  test("a bad GPS fix doesn't move the stop when good ones exist", () => {
    const { as, id, g } = crawl();
    as(0, { type: "arrive", stopId: id(0), ...SPOTS[0] });
    as(1, { type: "arrive", stopId: id(0), lat: 52, lng: 0, acc: 5000 });
    expect(g().stops[0].spot).toEqual({ lat: SPOTS[0].lat, lng: SPOTS[0].lng });
  });

  test("undo steps back; host can end, reopen and take photos down", () => {
    const { as, id, g, host, players } = crawl();
    as(0, { type: "arrive", stopId: id(0) });
    as(0, { type: "undo", stopId: id(0) });
    expect(g(0).me!.visits[id(0)].arrivedAt).toBeNull();
    as(0, { type: "arrive", stopId: id(0) });
    as(0, { type: "proof", stopId: id(0), photo: PHOTO });
    host({ type: "removePhoto", playerId: players[0].id, stopId: id(0) });
    expect(g(0).me!.visits[id(0)].photo).toBeNull();
    expect(g(0).me!.visits[id(0)].doneAt).not.toBeNull();
    host({ type: "end" });
    expect(() => as(1, { type: "arrive", stopId: id(0) })).toThrow("over");
    host({ type: "resume" });
    expect(() => as(1, { type: "arrive", stopId: id(0) })).not.toThrow();
  });

  test("rejects junk photos", () => {
    const { as, id } = crawl();
    as(0, { type: "arrive", stopId: id(0) });
    expect(() => as(0, { type: "proof", stopId: id(0), photo: "javascript:alert(1)" })).toThrow();
    expect(() => as(0, { type: "proof", stopId: id(0), photo: `data:image/jpeg;base64,${"A".repeat(200_000)}` })).toThrow("too large");
  });

  test("starting again clears progress but keeps the route", () => {
    const { doStop, host, g, s } = crawl();
    doStop(0, 0);
    host({ type: "start" });
    expect(g().totalPhotos).toBe(0);
    expect(g().totalDrinks).toBe(0);
    expect(s.stops).toHaveLength(3);
  });
});
