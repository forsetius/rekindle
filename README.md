# ReKindle

ReKindle turns an old Kindle Experimental Browser into a quiet, landscape-oriented
information display. The first release provides:

- a large clock designed to remain readable from a distance;
- current weather and two context-aware forecast periods;
- air quality data;
- local weather and AQI rules combined with official MeteoAlarm warnings;
- detail pages for weather, air quality, alerts, and a monthly calendar.

The frontend is intentionally conservative. It uses server-rendered HTML, plain CSS,
PNG icons, regular links, and a small ES5 clock script. It does not use Bootstrap,
HTMX, CSS Grid, Flexbox, CSS custom properties, or a client-side application
framework.

## Requirements

- Node.js 24 LTS or newer
- npm

ImageMagick is optional. It is needed only when regenerating the committed PNG
icons from their SVG sources.

## Configuration

Copy `.env.example` to `.env` and adjust its values. ReKindle reads this file
automatically when it exists. Variables already defined in the process environment
take precedence, so deployments can also provide configuration without a file.

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `3000`. |
| `LOCATION_NAME` | Yes | Display name used in the UI. |
| `LOCATION_LATITUDE` | Yes | Open-Meteo latitude. |
| `LOCATION_LONGITUDE` | Yes | Open-Meteo longitude. |
| `TIME_ZONE` | Yes | IANA time zone, for example `Europe/Warsaw`. |
| `COUNTRY_CODE` | No | MeteoAlarm country code. Defaults to `PL`. |
| `METEOALARM_EMMA_ID` | Yes | MeteoAlarm region identifier used by the public Atom adapter. |
| `METEOALARM_EDR_TOKEN` | No | Enables the token-based MeteoAlarm EDR adapter. |
| `CUSTOM_FOOTER_MESSAGE` | No | Fallback dashboard footer when no alert is active. |

The default official-warning adapter reads the public Polish MeteoAlarm Atom feed
and filters entries by `EMMA_ID`. If `METEOALARM_EDR_TOKEN` is set, ReKindle uses
MeteoAlarm EDR for the configured country and downloads linked CAP documents.

## Run With Node.js

```sh
npm install --include=dev
npm run build
npm start
```

Open `http://localhost:3000/` in the Kindle Experimental Browser.

## Run With Docker

```sh
docker build -t rekindle .
docker run --rm --env-file .env -p 3000:3000 rekindle
```

## Deploy To MyDevil

The manual `Deploy production` GitHub Actions workflow deploys directly to
`https://rekindle.forseti.pl`. It validates the application, uploads an immutable
release through SSH, installs runtime dependencies with `npm24`, restarts the
MyDevil Node.js domain, and checks `/health`.

Create a GitHub `production` environment with:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `MYDEVIL_SSH_PRIVATE_KEY` | SSH private key used for deployment. |
| Secret | `RUNTIME_ENV` | Production variables in `.env` format. |
| Variable | `MYDEVIL_HOST` | MyDevil SSH host. |
| Variable | `MYDEVIL_USER` | MyDevil SSH user. |
| Variable | `MYDEVIL_KNOWN_HOSTS` | Pinned SSH host key entry. |
| Variable | `MYDEVIL_DOMAIN` | `rekindle.forseti.pl` |
| Variable | `APP_URL` | `https://rekindle.forseti.pl` |

Before the first deployment, configure `rekindle.forseti.pl` in MyDevil as a
Node.js domain using Node.js 24 and enable HTTPS. The workflow creates releases
under `~/apps/rekindle/` and writes the Passenger entry point to
`~/domains/rekindle.forseti.pl/public_nodejs/app.js`.

## Development

```sh
npm test
npm run lint
npm run typecheck
npm run assets
```

`npm run assets` regenerates PNG files in `public/assets/icons/` from
`assets/icon-sources/`. The source SVG files are build inputs only and are never
served to Kindle pages.

## Data Refresh Policy

- weather: every 30 minutes;
- air quality: every hour;
- official warnings: every 15 minutes;
- dashboard HTML: browser refresh every 30 minutes;
- displayed clock: local ES5 update every minute without a page reload;
- detail pages: automatic return to the dashboard after 5 minutes.

An external-service failure does not remove the last successful value or block
other sections. `/health` reports the cache state for each source.

## Kindle Setup

The web application does not require a jailbreak. See
[`docs/kindle-continuous-display.md`](docs/kindle-continuous-display.md) for the
physical-device validation checklist and the policy for documenting optional
continuous-display tweaks.

## HTTP Routes

- `/`
- `/weather`
- `/air-quality`
- `/alerts`
- `/calendar`
- `/health`
