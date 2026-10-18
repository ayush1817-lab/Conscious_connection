/**
 * npm run test:podcasts  (client feedback, Oct 2026: Spotify and audio podcasts)
 *
 * Needs the app running. Re-seeds first. Checks: Spotify episode links are read
 * (with or without ?si=), the admin can add a Spotify episode and an uploaded
 * MP3, both play on the public Podcasts page, wrong files are refused, and a
 * replaced audio file is removed from storage.
 */
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spotifyEpisodeId } from "../../lib/content/spotify";
import { env, serviceClient } from "../lib/env";
import { axe } from "./axe";
import { BASE_URL, check, finish, launch } from "./browser";

const service = serviceClient();
const SPOTIFY = "https://open.spotify.com/episode/5LuIfZKKssTiQBRsgqFMVC?si=a1b2c3d4e5f64789";
const EPISODE = "5LuIfZKKssTiQBRsgqFMVC";

// A few bytes that look like an MP3 frame header: enough for upload and serving.
const fakeMp3 = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(4096)]);

async function audioStored(path: string) {
  const { data } = await service.storage.from("podcasts").list("episodes", { limit: 1000 });
  return !!data?.some((f) => `episodes/${f.name}` === path);
}

async function main() {
  console.log("Reading Spotify links");
  check(spotifyEpisodeId(SPOTIFY) === EPISODE, "an episode link with ?si= is read");
  check(spotifyEpisodeId(`https://open.spotify.com/intl-en/episode/${EPISODE}`) === EPISODE, "an international link is read");
  check(spotifyEpisodeId(`spotify:episode:${EPISODE}`) === EPISODE, "a Spotify URI is read");
  check(spotifyEpisodeId("https://open.spotify.com/show/5LuIfZKKssTiQBRsgqFMVC") === null, "a show link (not an episode) is refused");
  check(spotifyEpisodeId("https://evil.example.com/episode/5LuIfZKKssTiQBRsgqFMVC") === null, "other sites are refused");

  execSync("npm run seed", { stdio: "ignore" });
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(env("SEED_ADMIN_EMAIL"));
    await page.getByLabel("Password").fill(env("SEED_ADMIN_PASSWORD"));
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByRole("heading", { name: /Welcome/ }).waitFor();

    console.log("\nSpotify episode");
    await page.goto(`${BASE_URL}/admin/content/podcasts/new`);
    await page.getByLabel("Title").fill("Episode 7: On Spotify");
    await page.getByRole("radio", { name: /Spotify/ }).check();
    await page.getByLabel("Spotify episode link").fill("https://open.spotify.com/show/abc");
    check(await page.getByText("That doesn't look like a Spotify episode link.").isVisible(), "a non-episode link is flagged");
    await page.getByLabel("Spotify episode link").fill(SPOTIFY);
    const preview = await page.locator("iframe").getAttribute("src");
    check(preview === `https://open.spotify.com/embed/episode/${EPISODE}`, "the preview uses the Spotify embed", preview ?? "");
    await axe(page, "podcast editor (Spotify)");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/admin\/content\/podcasts\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Publish" }).click();
    await page.waitForURL(`${BASE_URL}/admin/content/podcasts`);
    const { data: spotify } = await service.from("podcasts").select("source, spotify_url, youtube_url, published").eq("title", "Episode 7: On Spotify").single();
    check(spotify?.source === "spotify" && spotify.published, "saved and published as a Spotify episode");
    check(spotify?.spotify_url === `https://open.spotify.com/episode/${EPISODE}` && spotify.youtube_url === null, "the link is stored without the ?si= code", spotify?.spotify_url ?? "");

    console.log("\nAudio file");
    await page.goto(`${BASE_URL}/admin/content/podcasts/new`);
    await page.getByLabel("Title").fill("Episode 8: Recorded at the meetup");
    await page.getByRole("radio", { name: /Audio file/ }).check();
    const file = page.locator('input[type="file"]');
    await file.setInputFiles({ name: "episode.wav", mimeType: "audio/wav", buffer: Buffer.alloc(1024) });
    check(await page.getByText("Please choose an MP3 or M4A audio file.").isVisible(), "a WAV file is refused");
    const huge = join(mkdtempSync(join(tmpdir(), "podcast-")), "huge.mp3");
    writeFileSync(huge, Buffer.alloc(51 * 1024 * 1024));
    await file.setInputFiles(huge);
    check(await page.getByText(/over 50MB/).isVisible(), "a file over 50MB is refused");
    await file.setInputFiles({ name: "episode-8.mp3", mimeType: "audio/mpeg", buffer: fakeMp3 });
    await page.getByText("episode-8.mp3").waitFor();
    const audioPath = await page.locator('input[name="audio_path"]').inputValue();
    check(/^episodes\/[0-9a-f-]{36}\.mp3$/.test(audioPath) && (await audioStored(audioPath)), "the file uploads to storage under a random name", audioPath);
    check((await page.locator("audio").count()) === 1, "the preview has an audio player");
    await axe(page, "podcast editor (audio)");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/admin\/content\/podcasts\/[0-9a-f-]{36}$/);
    const editUrl = page.url();
    await page.getByRole("button", { name: "Publish" }).click();
    await page.waitForURL(`${BASE_URL}/admin/content/podcasts`);

    console.log("\nPublic Podcasts page");
    const visitor = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await visitor.goto(`${BASE_URL}/podcasts`);
    const spotifyFrame = visitor.locator(`iframe[src="https://open.spotify.com/embed/episode/${EPISODE}"]`);
    check((await spotifyFrame.count()) === 1, "the Spotify episode is embedded");
    check((await spotifyFrame.getAttribute("title")) === "Spotify player: Episode 7: On Spotify", "the Spotify player has a title");
    const audio = visitor.locator("audio");
    check((await audio.count()) === 1 && (await audio.getAttribute("controls")) !== null, "the audio file has a player with controls");
    check((await audio.getAttribute("aria-label")) === "Listen: Episode 8: Recorded at the meetup", "the audio player is labelled");
    check(await visitor.getByRole("link", { name: /Download the episode/ }).first().isVisible(), "there's a download link too");
    const src = await audio.locator("source").getAttribute("src");
    const served = await fetch(src!);
    check(served.status === 200 && served.headers.get("content-type") === "audio/mpeg", "the file is served as MP3", `${served.status} ${served.headers.get("content-type")}`);
    const width = await visitor.evaluate(() => document.documentElement.scrollWidth);
    check(width <= 360, "the page fits a phone", `${width}px`);
    await axe(visitor, "podcasts page with Spotify and audio");

    console.log("\nSwitching the audio episode to YouTube");
    await page.goto(editUrl);
    await page.getByRole("radio", { name: /YouTube/ }).check();
    await page.getByLabel("YouTube link").fill("https://youtu.be/aqz-KE-bpKQ");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved. Your changes are live.").first().waitFor();
    const { data: switched } = await service.from("podcasts").select("source, audio_path").eq("title", "Episode 8: Recorded at the meetup").single();
    check(switched?.source === "youtube" && switched.audio_path === null, "the episode is now YouTube");
    check(!(await audioStored(audioPath)), "the old audio file is removed from storage");
  } finally {
    await browser.close();
  }
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
