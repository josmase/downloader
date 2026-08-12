<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-08-13 -->

# Technical Domain

**Purpose**: Tech stack, architecture, and development patterns for `downloader` (YouTube video downloader web app).
**Last Updated**: 2026-08-13

## Quick Reference

**Update Triggers**: Stack changes | New patterns | Architecture decisions
**Audience**: Developers, AI agents

## Primary Stack

| Layer        | Technology                | Version  | Rationale                                              |
| ------------ | ------------------------- | -------- | ------------------------------------------------------ |
| Framework    | Next.js (Pages Router)    | 16.1.6   | SSR + API routes; `output: 'standalone'` for Docker    |
| UI           | React                     | 19.2.5   | component UI via `pages/index.tsx`                     |
| Language     | TypeScript                | 5.9.3    | strict mode; `@types/wicg-file-system-access`          |
| Data fetching| SWR                       | ^2.0.0   | client cache/revalidation (dependency, currently unused)|
| Downloading  | ytdl-core                 | ^4.11.2  | server-side YouTube stream resolution + format select  |
| Linting      | ESLint + eslint-config-next| 9.39.4 / 16.2.4 | `next/core-web-vitals`                          |
| Package mgr  | Yarn                      | (yarn.lock) | `yarn --frozen-lockfile` in Docker build           |
| Runtime      | Node.js (alpine)          | 23       | base image `artifactory.local.hejsan.xyz/docker/node`  |
| Deploy       | GitLab CI + Flux          | —        | ci-templates `standard.yml` → flux `downloader` app    |

## Code Patterns

### API Route (pages/api/video.ts)

```typescript
import { NextApiRequest, NextApiResponse } from "next";
import download, { DownloadOptions } from "./lib/youtubedl";

interface VideoRequest extends NextApiRequest {
  query: Partial<DownloadOptions>;
}

export default async function ({ query }: VideoRequest, res: NextApiResponse) {
  const video = await download(query as DownloadOptions);
  const filename = `${video.info.videoDetails.title}-${query.quality}.${video.format.container}`;
  res.writeHead(200, {
    "Content-Type": "application/octet-stream; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"; filename*="${filename}"`,
  });
  video.stream.pipe(res);
};
```

### ytdl-core format selection (pages/api/lib/youtubedl.ts)

```typescript
export type Quality = "high" | "medium" | "low";
export type Format = "audio" | "video" | "audiovideo";

export default async function download({ url, format, quality }: DownloadOptions) {
  const info = await ytdl.getInfo(url);
  const bestMatch = bestFormat(info, format, quality);
  if (bestMatch && bestMatch.mimeType) {
    const stream = ytdl.downloadFromInfo(info, { format: bestMatch });
    return { stream, info, format: bestMatch };
  }
  throw new Error("No format with audio and video was found");
}
```

### Page form (pages/index.tsx)

```tsx
export default function Home() {
  return (
    <div className={styles.container}>
      <form action="/api/video" method="GET">
        <input type="test" id="url" name="url" required />  {/* note: type="test" is a typo */}
        <select id="format" name="format" required>
          <option value="audiovideo">Video and audio</option>
          <option value="audio">Audio only</option>
          <option value="video">Video only</option>
        </select>
        <button type="submit">Start download</button>
      </form>
    </div>
  );
}
```

## Naming Conventions

| Type       | Convention  | Example                                    |
| ---------- | ----------- | ------------------------------------------ |
| Files      | kebab-case  | `pages/api/lib/youtubedl.ts`               |
| Components | PascalCase  | `Home`, `App`                              |
| Functions  | camelCase   | `download()`, `bestFormat()`, `isFormatAMatch()` |
| Types      | PascalCase  | `DownloadOptions`, `Quality`, `Format`     |
| CSS Modules| *.module.css| `styles/Home.module.css`, `styles/globals.css` |

## Code Standards

- Next.js Pages Router: pages in `pages/`, API routes in `pages/api/` (mapped to `/api/*`)
- TypeScript `strict: true`; `moduleResolution: "node"`, `jsx: "preserve"`
- CSS Modules for styling (`Home.module.css` + `globals.css`), imported as `styles`
- ESLint extends `next/core-web-vitals`
- API routes stream responses via `res.writeHead(...)` + `video.stream.pipe(res)` (no buffering)
- Quality selection: formats sorted by `bitrate`, `low`=first, `medium`=mid, `high`=last

## Security Requirements

- Validate/trust `query.url` carefully — raw YouTube URL flows directly into `ytdl.getInfo(url)` (SSRF/arbitrary-URL risk; no URL validation or allowlist currently)
- No auth or rate limiting on `/api/video` — public unauthenticated download endpoint
- Input from `<form>` GET params (`url`, `format`, `quality`) is unvalidated; `format`/`quality` enum types exist in code but are not runtime-checked
- `Content-Disposition` filename built from `videoDetails.title` — must sanitize to prevent header injection
- Image runs as non-root `nextjs` user (`USER nextjs`, uid 1001)
- No secrets in repo; deploy config via Flux/ExternalSecrets

## 📂 Codebase References

**Implementation**:

- `pages/index.tsx` — single-page form (URL + format + quality) posting GET to `/api/video`
- `pages/api/video.ts` — API route; resolves video, streams it as `application/octet-stream` download
- `pages/api/lib/youtubedl.ts` — ytdl-core wrapper: `getInfo`, format/quality selection, `downloadFromInfo`
- `pages/_app.tsx` — minimal `App` wrapper (no providers)
- `styles/{globals.css,Home.module.css}` — global + component CSS Modules
- `next.config.js` — `reactStrictMode`, `swcMinify`, `output: 'standalone'`
- `tsconfig.json` — strict TS, `types: ["@types/wicg-file-system-access"]`
- `Dockerfile` — multi-stage (deps → builder → runner), Node 23-alpine, `yarn --frozen-lockfile`, standalone output, `EXPOSE 3000`
- `.gitlab-ci.yml` — includes ci-templates `pipelines/standard.yml` (v3.1.0), tag-release, flux manifest `apps/base/downloader/deployment.yaml`
- `package.json` — name `youtube-download`, scripts `dev/build/start/lint`

## Potential Improvements

- Validate/allowlist the `url` query param before passing it to `ytdl.getInfo()` (SSRF exposure)
- Fix the form input type typo (`type="test"` → `type="url"`)
- Move `@types/*`, `eslint`, and `typescript` from `dependencies` to `devDependencies`
- Remove the unused `swr` dependency (or wire it up)

## Related Files

- Deploy manifest: `josmase/infrastructure/flux` → `apps/base/downloader/deployment.yaml`
- CI pipeline: `josmase/infrastructure/ci-templates` → `pipelines/standard.yml`
- Navigation: `.opencode/context/project-intelligence/navigation.md`
