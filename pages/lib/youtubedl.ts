import { Readable } from "stream";
import ytdl from "ytdl-core";

export type Quality = "high" | "medium" | "low";
export type Format = "audio" | "video" | "audiovideo";
export type DownloadOptions = {
  quality: Quality;
  url: string;
  format: Format;
};

export type Downloaded = {
  stream: Readable;
  info: ytdl.videoInfo;
  forma: ytdl.videoFormat;
};

export default async function download({
  url,
  format,
  quality,
}: DownloadOptions) {
  const info = await ytdl.getInfo(url);
  const bestMatch = bestFormat(info, format, quality);
  if (bestMatch && bestMatch.mimeType) {
    console.info("Starting download of", info.videoDetails.title);
    const stream = ytdl.downloadFromInfo(info, { format: bestMatch });

    return {
      stream,
      info,
      format: bestMatch,
    };
  }
  throw new Error("No format with audio and video was found");
}
function bestFormat(info: ytdl.videoInfo, format: Format, quality: Quality) {
  const matchingFormats = toMatchingFormats(info, format);
  const bestMatch = formatForQuality(matchingFormats, quality);

  return bestMatch;
}

function toMatchingFormats(info: ytdl.videoInfo, format: string) {
  const matchingFormats = info.formats.filter((f) => isFormatAMatch(f, format));
  console.info(
    `Found ${matchingFormats.length} matching formats for '${format}'`
  );
  return matchingFormats;
}

function formatForQuality(formats: ytdl.videoFormat[], quality: Quality) {
  if (formats.length === 0) {
    console.info(`Quality: ${quality}, bitrate: no match }`);
    return undefined;
  }

  const sortedByQuality = formats.sort(
    (f1, f2) => (f1.bitrate ?? 0) - (f2.bitrate ?? 0)
  );

  let position = sortedByQuality.length - 1;

  if (quality === "low") {
    position = 0;
  } else if (quality === "medium") {
    position = Math.floor((sortedByQuality.length - 1) / 2);
  }

  const selected = sortedByQuality.at(position);
  console.info(
    `Quality: ${quality}, bitrate: ${
      selected?.bitrate
    }, qualities: ${sortedByQuality
      .map((q) => q.bitrate)
      .join(", ")}, selected: ${position}`
  );
  return selected;
}

function isFormatAMatch(
  actualFormat: ytdl.videoFormat,
  wantedFormat: Format
): boolean {
  if (wantedFormat === "video") {
    return actualFormat.hasVideo && !actualFormat.hasAudio;
  } else if (wantedFormat === "audio") {
    return !actualFormat.hasVideo && actualFormat.hasAudio;
  }

  return actualFormat.hasAudio && actualFormat.hasVideo;
}
