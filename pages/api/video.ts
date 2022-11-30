import { NextApiRequest, NextApiResponse } from "next";
import download, { DownloadOptions } from "../lib/youtubedl";

interface VideoRequest extends NextApiRequest {
  query: Partial<DownloadOptions>;
}

export default async ({ query }: VideoRequest, res: NextApiResponse) => {
  console.info("Requested URL:", query.url);
  const video = await download(query as DownloadOptions);
  const filename = `${video.info.videoDetails.title}-${query.quality}.${video.format.container}`;
  res.writeHead(200, {
    "Content-Type": "application/octet-stream; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"; filename*="${filename}"`,
  });

  video.stream.pipe(res);
  console.info("sent response");
};
