# catchapage

catchapage is an automated page capture toolkit that crawls a curated list of URLs, renders each page in multiple device profiles, and saves both the rendered HTML and a full-page screenshot for every variation. It is built with Bun and Playwright to provide fast, scriptable captures ideal for visual reviews, archival workflows, and regression tracking.

## Highlights

- Multiple device personas (desktop, tablet, mobile) with customisable viewports, locales, and user agents.
- Resilient navigation that retries with fallback strategies and waits for meaningful content before capturing.
- Full artifact bundle per URL: HTML snapshot, PNG screenshot, and synchronized console logs.
- Isolated run folders with timestamped names for easy comparison between capture sessions.
- Single configuration module (`src/config.ts`) to adjust timeouts, DNS rules, and device descriptors.
- Extensible object-oriented design: `PageCaptureRunner`, `DeviceContextFactory`, and `FileLogger` expose clear extension points for custom behaviour.
- Parallel execution.

## Typical Use Cases

- Visual regression baselines for QA teams that need multi-device screenshots on demand.
- Competitive research or content archiving where HTML copies are retained alongside imagery.
- Monitoring marketing or landing pages to ensure deployments render consistently over time.
- Internal documentation that benefits from reproducible, high-fidelity page captures without manual browser work.

## Project Structure

- `index.ts`: Entry point that wires logging, loads URLs from `links.txt`, and orchestrates the capture run.
- `src/pageCaptureRunner.ts`: Core runner that prepares run directories, drives Playwright, and captures each device variant.
- `src/deviceContextFactory.ts`: Builds browser context options for desktop, tablet, and mobile personas, falling back when descriptors are missing.
- `src/loadUrlsFromFile.ts`: Normalises and validates URLs sourced from `links.txt`.
- `src/fileLogger.ts`: Streams console output to `output/<run>/console.log` once the run folder is ready.
- `src/captureOutcome.ts`: Lightweight value object representing success or failure of a capture.
- `src/joinPath.ts`: Normalises path segments for consistent file system output.
- `links.txt`: Input list of URLs (one per line) that will be captured.
- `output/`: Generated artifacts grouped by timestamped run folders.

## Architecture Overview

- **Orchestrator** — `index.ts` bootstraps the session, configures logging hooks, and delegates to the runner.
- **Runner** — `PageCaptureRunner` coordinates folder preparation, navigation retries, and per-device capture.
- **Device providers** — `DeviceContextFactory` delivers browser context options and handles descriptor fallbacks gracefully.
- **I/O utilities** — `loadUrlsFromFile`, `joinPath`, and `FileLogger` isolate file system, path, and logging responsibilities.
- **Outcome channel** — `CaptureOutcome` encapsulates success or failure metadata for downstream processing.

The design follows OOP principles: every class has a single responsibility, collaboration happens through explicit interfaces, and cross-cutting concerns (logging, observers) are injected rather than hard-coded.

## Prerequisites

- [Bun](https://bun.sh/) 1.1 or newer.
- Playwright browser binaries. Install once with `bunx playwright install`.

> The project uses Bun for dependency management and scripting; avoid substituting Node.js tooling.

## Installation

```bash
bun install
```

## Usage

1. **Prepare URLs**  
   Edit `links.txt` and place one URL per line. Bare domains are acceptable; they are normalised to `https://`.

2. **Run the capture**  

   ```bash
   bun start
   ```

   or execute the entry point directly:

   ```bash
   bun run index.ts
   ```

3. **Inspect results**  
   - Artifacts are written to `output/<timestamp>/`.
   - Each URL generates a slugged subfolder containing:
     - `page.desktop.html`, `page.tablet.html`, `page.mobile.html`
     - `page.desktop.png`, `page.tablet.png`, `page.mobile.png`
   - `console.log` stores combined stdout/stderr output for the run.

Run folders are created once per execution and stamped using the `en-GB` date format (`DD-MM-YYYY-HH-MM-SS`).

### Output Layout

The generated run directory resembles the following structure:

```tree
output/
└── 21-02-2025-09-30-12/
    ├── console.log
    ├── example-com/
    │   ├── page.desktop.html
    │   ├── page.desktop.png
    │   ├── page.tablet.html
    │   ├── page.tablet.png
    │   ├── page.mobile.html
    │   └── page.mobile.png
    └── sametcc-me/
        ├── page.desktop.html
        ├── page.desktop.png
        ├── page.tablet.html
        ├── page.tablet.png
        ├── page.mobile.html
        └── page.mobile.png
```

`console.log` contains every console message emitted during the run (including Bun-side warnings and errors), formatted with timestamps and severity labels.

## Configuration

`src/config.ts` centralises every tunable. It builds a `zod` schema that reads from `Bun.env`, validates types, and materialises a frozen `RuntimeConfiguration` instance on first import. Each value has a default, so the app starts with no `.env`, while malformed input fails fast with clear error messages.

### Setting Environment Values

1. Copy `.env.example` to `.env`.
2. Override any variables you need. Bun automatically loads `.env` for `bun start`, `bun run`, and `bunx` scripts, so no extra flags are required.
3. Re-run `bun start`. If a value cannot be parsed, the configuration loader explains which variable is invalid and why.

Alternatively, export variables in your shell or CI job—`RuntimeConfiguration` always reads from `Bun.env`.

### Validation Rules

- Numeric fields must contain valid numbers; otherwise `zod` throws with the original string.
- Boolean fields accept only `"true"` or `"false"`.
- Comma-separated lists (for example `CHROMIUM_HOST_RESOLVER_RULES`) are split, trimmed, and filtered for empties.
- `*_COLOR_SCHEME` accepts `dark`, `light`, `no-preference`, `null`, or `undefined`.
- Device descriptor names are trimmed. When a descriptor is missing, `DeviceContextFactory` logs a one-time warning and falls back to the manual viewport and screen dimensions.

### Common Adjustments

- **Device profiles**: Swap Playwright descriptor names (e.g., `DESKTOP_DEVICE_DESCRIPTOR`) or customise viewports, scale factors, and user agents.
- **Locales & timezones**: Adjust locale/timezone constants to emulate regional behaviour.
- **Timeouts**: Modify navigation, idle waits, and content readiness thresholds to suit slower sites.
- **Networking**: Supply host resolver rules or custom DNS servers when captures run in isolated environments.

### Environment-Specific Tweaks

- **Air-gapped environments**: Populate `CHROMIUM_DNS_SERVERS` or `CHROMIUM_HOST_RESOLVER_RULES` so Chromium resolves domains via internal infrastructure.
- **High-latency sites**: Increase `PRIMARY_NAVIGATION_TIMEOUT_MS`, `FALLBACK_NAVIGATION_TIMEOUT_MS`, or `CONTENT_READY_TIMEOUT_MS`.
- **Minimal waiting**: Reduce `CAPTURE_STABILIZATION_DELAY_MS` when pages are lightweight and deterministic.
- **Light mode captures**: Switch `*_COLOR_SCHEME` to `"light"` to simulate alternative themes.

### Configuration Reference

The tables below show how environment variables map to the exported configuration and the defaults applied when no override is provided. Refer to `.env.example` for the full strings (for example, user-agent headers).

#### Core Paths & Toggles

| Environment variable        | Config property                      | Default     | Notes                                   |
|-----------------------------|--------------------------------------|-------------|-----------------------------------------|
| `DEFAULT_OUTPUT_DIR`        | `config.DEFAULT_OUTPUT_DIR`          | `output`    | Root directory for timestamped runs.    |
| `LINKS_FILE`                | `config.LINKS_FILE`                  | `links.txt` | File containing URLs to capture.        |
| `PARALLEL_CAPTURE_ENABLED`  | `config.PARALLEL_CAPTURE_ENABLED`    | `true`      | Enables multi-page concurrency.         |

#### Navigation & Timing

| Environment variable                | Config property                               | Default | Notes                                                      |
|-------------------------------------|------------------------------------------------|---------|------------------------------------------------------------|
| `PRIMARY_NAVIGATION_TIMEOUT_MS`     | `config.PRIMARY_NAVIGATION_TIMEOUT_MS`         | `45000` | Timeout when waiting for `networkidle`.                    |
| `FALLBACK_NAVIGATION_TIMEOUT_MS`    | `config.FALLBACK_NAVIGATION_TIMEOUT_MS`        | `60000` | Timeout for the `domcontentloaded` fallback strategy.      |
| `POST_NAVIGATION_IDLE_MS`           | `config.POST_NAVIGATION_IDLE_MS`               | `1000`  | Delay before stability checks run.                         |
| `CAPTURE_STABILIZATION_DELAY_MS`    | `config.CAPTURE_STABILIZATION_DELAY_MS`        | `2000`  | Additional wait before screenshots are taken.              |
| `CONTENT_READY_TIMEOUT_MS`          | `config.CONTENT_READY_TIMEOUT_MS`              | `10000` | Max time to wait for meaningful DOM content.               |

#### Desktop Profile

| Environment variable            | Config property                                  | Default value            | Notes                                       |
|---------------------------------|--------------------------------------------------|--------------------------|---------------------------------------------|
| `DESKTOP_DEVICE_DESCRIPTOR`     | `config.DESKTOP_DEVICE_DESCRIPTOR`               | `Desktop Chrome`         | Playwright preset name.                     |
| `DESKTOP_VIEWPORT_WIDTH`        | `config.DESKTOP_VIEWPORT.width`                  | `1280`                   | Pixels.                                     |
| `DESKTOP_VIEWPORT_HEIGHT`       | `config.DESKTOP_VIEWPORT.height`                 | `720`                    | Pixels.                                     |
| `DESKTOP_SCREEN_WIDTH`          | `config.DESKTOP_SCREEN.width`                    | `1920`                   | Reported `window.screen.width`.            |
| `DESKTOP_SCREEN_HEIGHT`         | `config.DESKTOP_SCREEN.height`                   | `1080`                   | Reported `window.screen.height`.           |
| `DESKTOP_DEVICE_SCALE_FACTOR`   | `config.DESKTOP_DEVICE_SCALE_FACTOR`             | `1.5`                    | Pixels per device-independent pixel.        |
| `DESKTOP_LOCALE`                | `config.DESKTOP_LOCALE`                          | `en-US`                  | Locale passed via context options.          |
| `DESKTOP_TIMEZONE_ID`           | `config.DESKTOP_TIMEZONE_ID`                     | `Europe/Istanbul`        | IANA timezone identifier.                   |
| `DESKTOP_COLOR_SCHEME`          | `config.DESKTOP_COLOR_SCHEME`                    | `dark`                   | Media emulation for `prefers-color-scheme`. |
| `DESKTOP_USER_AGENT`            | `config.DESKTOP_USER_AGENT`                      | Chrome on Windows 10 UA  | Full string in `.env.example`.              |

#### Mobile Profile

| Environment variable            | Config property                                  | Default value            | Notes                                       |
|---------------------------------|--------------------------------------------------|--------------------------|---------------------------------------------|
| `MOBILE_DEVICE_DESCRIPTOR`      | `config.MOBILE_DEVICE_DESCRIPTOR`                | `Pixel 5`                | Playwright preset name.                     |
| `MOBILE_VIEWPORT_WIDTH`         | `config.MOBILE_VIEWPORT.width`                   | `390`                    | Pixels.                                     |
| `MOBILE_VIEWPORT_HEIGHT`        | `config.MOBILE_VIEWPORT.height`                  | `844`                    | Pixels.                                     |
| `MOBILE_SCREEN_WIDTH`           | `config.MOBILE_SCREEN.width`                     | `1080`                   | Reported `window.screen.width`.            |
| `MOBILE_SCREEN_HEIGHT`          | `config.MOBILE_SCREEN.height`                    | `2340`                   | Reported `window.screen.height`.           |
| `MOBILE_DEVICE_SCALE_FACTOR`    | `config.MOBILE_DEVICE_SCALE_FACTOR`              | `3`                      | Pixels per device-independent pixel.        |
| `MOBILE_LOCALE`                 | `config.MOBILE_LOCALE`                           | `en-US`                  | Locale passed via context options.          |
| `MOBILE_TIMEZONE_ID`            | `config.MOBILE_TIMEZONE_ID`                      | `America/Los_Angeles`    | IANA timezone identifier.                   |
| `MOBILE_COLOR_SCHEME`           | `config.MOBILE_COLOR_SCHEME`                     | `dark`                   | Media emulation for `prefers-color-scheme`. |
| `DEFAULT_MOBILE_USER_AGENT`     | `config.DEFAULT_MOBILE_USER_AGENT`               | Chrome on Android UA     | Full string in `.env.example`.              |

#### Tablet Profile

| Environment variable            | Config property                                  | Default value            | Notes                                       |
|---------------------------------|--------------------------------------------------|--------------------------|---------------------------------------------|
| `TABLET_DEVICE_DESCRIPTOR`      | `config.TABLET_DEVICE_DESCRIPTOR`                | `iPad (gen 7)`           | Playwright preset name.                     |
| `TABLET_VIEWPORT_WIDTH`         | `config.TABLET_VIEWPORT.width`                   | `1024`                   | Pixels.                                     |
| `TABLET_VIEWPORT_HEIGHT`        | `config.TABLET_VIEWPORT.height`                  | `1366`                   | Pixels.                                     |
| `TABLET_SCREEN_WIDTH`           | `config.TABLET_SCREEN.width`                     | `1620`                   | Reported `window.screen.width`.            |
| `TABLET_SCREEN_HEIGHT`          | `config.TABLET_SCREEN.height`                    | `2160`                   | Reported `window.screen.height`.           |
| `TABLET_DEVICE_SCALE_FACTOR`    | `config.TABLET_DEVICE_SCALE_FACTOR`              | `2`                      | Pixels per device-independent pixel.        |
| `TABLET_LOCALE`                 | `config.TABLET_LOCALE`                           | `en-US`                  | Locale passed via context options.          |
| `TABLET_TIMEZONE_ID`            | `config.TABLET_TIMEZONE_ID`                      | `America/Los_Angeles`    | IANA timezone identifier.                   |
| `TABLET_COLOR_SCHEME`           | `config.TABLET_COLOR_SCHEME`                     | `dark`                   | Media emulation for `prefers-color-scheme`. |
| `DEFAULT_TABLET_USER_AGENT`     | `config.DEFAULT_TABLET_USER_AGENT`               | Safari on iPad UA        | Full string in `.env.example`.              |

#### Chromium Networking

| Environment variable              | Config property                         | Default value                | Notes                                                      |
|-----------------------------------|-----------------------------------------|------------------------------|------------------------------------------------------------|
| `CHROMIUM_HOST_RESOLVER_RULES`    | `config.CHROMIUM_HOST_RESOLVER_RULES`   | *(empty list)*               | Comma-separated host resolver rules.                       |
| `CHROMIUM_USE_CUSTOM_DNS`         | `config.CHROMIUM_USE_CUSTOM_DNS`        | `false`                      | Enables custom DNS routing when `true`.                    |
| `CHROMIUM_DNS_SERVERS`            | `config.CHROMIUM_DNS_SERVERS`           | `["94.140.14.14","94.140.14.15"]` | Comma-separated DNS servers applied when enabled. |

## How It Works

1. `index.ts` loads and validates URLs, sets up the `FileLogger`, and hands control to `PageCaptureRunner`.
2. `PageCaptureRunner` prepares a run folder, then for each link:
   - Creates a unique directory name.
   - Captures desktop, tablet, and mobile variants via `captureVariant`.
   - Uses `navigateWithFallback` to retry navigation (`networkidle` → `domcontentloaded`) and waits for DOM stability before saving HTML and PNG artifacts.
3. After processing all URLs, a summary report prints to the console and the process exits with a non-zero status if any capture failed.

### Execution Lifecycle

- **Bootstrap**: Console methods are wrapped so logs are buffered until the run folder is available.
- **Preparation**: Timestamped output folder is created, observers attach, and directories for each URL are provisioned.
- **Navigation**: Primary and fallback strategies attempt to load content reliably while validating HTTP status codes.
- **Capture**: HTML content and full-page screenshots are produced for desktop, tablet, and mobile contexts.
- **Reporting**: `CaptureOutcome` aggregates statuses, the runner prints a summary, and `process.exitCode` is set when failures occur.

## Development Scripts

- `bun start` — Run the capture pipeline.
- `bun lint` — Lint the project with Biome.
- `bun format` — Format sources in-place.

## Extending the Pipeline

- **Custom artefacts**: Subclass `PageCaptureRunner` or wrap `captureVariant` to add PDF exports or additional device profiles. The `withContext` helper provides an isolated Playwright context ready for further actions (network tracing, accessibility snapshots, etc.).
- **Augmented logging**: Extend `FileLogger` to stream logs to external systems (e.g., S3, HTTP endpoints) or enrich entries with run metadata.
- **Dynamic URL sources**: Replace `loadUrlsFromFile` with a drop-in function that fetches URLs from APIs, databases, or CI artifacts before invoking the runner.
- **CI integration**: Combine with cron or CI pipelines to schedule captures and archive the `output` directory as a build artifact.

## Logging & Observability

- **Console interception**: `FileLogger` takes over `console.log`, `console.warn`, and `console.error`, emitting identical lines to stdout and to `console.log` on disk.
- **Buffered writes**: Messages are buffered until the run folder exists, ensuring no output is lost during bootstrap.
- **Structured formatting**: Each entry contains timestamp, severity, and serialized payloads so log processors can parse them easily.
- **Observer pattern**: `RunFolderLoggingObserver` demonstrates how additional observers (metrics, notifications) can be attached without modifying `PageCaptureRunner`.

## FAQ

- **Can I capture only a subset of devices?**  
  Yes. Remove the unnecessary `captureVariant` calls inside `capturePage` or guard them behind feature flags.

- **How do I inject authentication headers or cookies?**  
  Extend `captureVariant` to set `page.context().addCookies(...)` or configure extra HTTP headers before calling `navigateWithFallback`.

- **What is required to run behind a proxy?**  
  Update `buildChromiumLaunchOptions` to append `--proxy-server=` and, if needed, configure `context.setExtraHTTPHeaders` for authentication.

- **Is parallel execution safe?**  
  Yes. Each run writes to its own timestamped directory and opens isolated Playwright contexts, so concurrent processes do not collide.

Happy capturing!
