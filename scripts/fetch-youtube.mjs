// Runs before dev and build. Reads the channel's public RSS feed (free, no API key), saves the newest video's
// details to src/data/latest-video.json and its thumbnail to public/latest-video.jpg so visitors' browsers never
// contact YouTube/Google just to load the page. On any failure the previous files are kept (or none, hiding the section).
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const CHANNEL_ID = 'UCTXl4uQEGln5MWNxC12VjEQ'; // youtube.com/@baotnguyen8
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

try {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const xml = await res.text();
  const entry = xml.split('<entry>')[1];
  if (!entry) throw new Error('no entries');
  const pick = (re) => entry.match(re)?.[1];
  const id = pick(/<yt:videoId>([^<]+)</);
  const video = {
    id,
    title: decode(pick(/<title>([^<]+)</) ?? ''),
    published: pick(/<published>([^<]+)</),
    url: `https://www.youtube.com/watch?v=${id}`,
  };
  const img = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
  if (!img.ok) throw new Error(`thumb ${img.status}`);
  mkdirSync('public', { recursive: true });
  mkdirSync('src/data', { recursive: true });
  writeFileSync('public/latest-video.jpg', Buffer.from(await img.arrayBuffer()));
  writeFileSync('src/data/latest-video.json', JSON.stringify(video, null, 2));
  console.log(`latest video: ${video.title}`);
} catch (e) {
  console.warn(`fetch-youtube skipped: ${e.message}${existsSync('src/data/latest-video.json') ? ' (keeping previous copy)' : ''}`);
}
