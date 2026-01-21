<p align="center">
  <h1 align="center">🌐 Web Crawler</h1>
  <p align="center">
    A modern, production-ready web application for creating offline archives of websites.
    <br />
    Built with <strong>Next.js</strong> and <strong>Node.js</strong>
    <br />
    <br />
    <a href="#-quick-start">Quick Start</a>
    ·
    <a href="#-api-reference">API Docs</a>
    ·
    <a href="#-features">Features</a>
    ·
    <a href="#%EF%B8%8F-legal-disclaimer">Legal</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg" alt="Node" />
  <img src="https://img.shields.io/badge/typescript-5.x-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/next.js-14.x-black.svg" alt="Next.js" />
  <img src="https://img.shields.io/badge/docker-ready-2496ED.svg" alt="Docker" />
</p>

---

## 📋 Table of Contents

- [⚠️ Legal Disclaimer](#%EF%B8%8F-legal-disclaimer)
- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🏗️ Architecture](#%EF%B8%8F-architecture)
- [📡 API Reference](#-api-reference)
- [⚙️ Configuration](#%EF%B8%8F-configuration)
- [🚫 Limitations](#-limitations)
- [📁 Project Structure](#-project-structure)
- [📄 License & Legal](#-license--legal)
- [🤝 Contributing](#-contributing)

---

## ⚠️ Legal Disclaimer

> **⛔ THE DEVELOPERS OF THIS SOFTWARE ARE NOT RESPONSIBLE FOR ANY MISUSE OF THIS TOOL.**

This tool is provided **strictly for educational and legitimate purposes** such as:

| ✅ Permitted Uses | ❌ Prohibited Uses |
|-------------------|-------------------|
| Creating offline backups of **your own websites** | Copying websites you don't own |
| Archiving publicly available content for personal use | Violating Terms of Service |
| Web development and testing purposes | Copyright/trademark infringement |
| Academic research and study | Circumventing access controls |
| | Redistributing copied content |

### 🔒 User Responsibility

By using this software, you acknowledge:

1. **You are solely responsible** for ensuring compliance with all applicable laws
2. **Copying websites without permission may constitute copyright infringement**
3. **The developers disclaim all liability** for any damages or legal consequences
4. **You will respect `robots.txt`** and rate limits

📖 **Read the full disclaimer:** [DISCLAIMER.md](DISCLAIMER.md)

---

## ✨ Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| 🌐 **Complete Website Mirroring** | Download entire websites with all assets for offline browsing |
| 🔗 **Intelligent Link Rewriting** | All internal links automatically rewritten to work locally |
| 📦 **Asset Preservation** | Preserves HTML, CSS, JavaScript, images, fonts, and media files |
| ⚡ **Real-time Progress** | WebSocket-based live updates, logging, and progress tracking |
| 📥 **ZIP Download** | Download complete archives ready for offline use |

### Security Features

| Feature | Description |
|---------|-------------|
| 🛡️ **SSRF Protection** | Blocks internal IPs, localhost, and cloud metadata endpoints |
| 🔒 **DNS Rebinding Prevention** | Validates resolved IPs before fetching |
| ⏱️ **Rate Limiting** | Per-user request throttling to prevent abuse |
| ✅ **Input Validation** | All inputs validated using Zod schemas |
| 📁 **Path Traversal Prevention** | Sanitized filenames and directory paths |
| 📊 **Configurable Limits** | Max file size, total size, depth, and page limits |

### Technical Highlights

- 🐳 **Docker Ready** - Production deployment with Docker Compose
- 🔄 **BFS Crawling** - Breadth-first search with URL deduplication
- 🤖 **robots.txt Support** - Optional compliance with robots.txt directives  
- 🔄 **Retry Logic** - Automatic retry with exponential backoff
- 📝 **Comprehensive Logging** - Detailed crawl logs for debugging

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **Docker** (optional, for containerized deployment)

### Option 1: Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/itxRishabh/webcrawler.git
cd webcrawler

# Start with Docker Compose
docker-compose up --build

# Access the UI at http://localhost:3000
```

### Option 2: Manual Development Setup

```bash
# Clone the repository
git clone https://github.com/itxRishabh/webcrawler.git
cd webcrawler

# Setup Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Setup Frontend (in a new terminal)
cd frontend
npm install
npm run dev

# Access the UI at http://localhost:3000
# Backend API at http://localhost:3001
```

---

## 🏗️ Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│      Frontend       │  HTTP   │       Backend       │
│     (Next.js)       │────────▶│     (Node.js)       │
│    Port: 3000       │◀────────│    Port: 3001       │
│                     │   WS    │                     │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
                    ┌──────────┐    ┌──────────┐    ┌──────────┐
                    │  Queue   │    │ Fetcher  │    │ Storage  │
                    │  (BFS)   │    │ (HTTP)   │    │  (ZIP)   │
                    └──────────┘    └──────────┘    └──────────┘
```

### Backend Components

| Component | File | Description |
|-----------|------|-------------|
| **API Routes** | `src/api/routes.ts` | REST endpoints for job management |
| **WebSocket** | `src/api/websocket.ts` | Real-time progress updates |
| **Crawl Engine** | `src/crawler/engine.ts` | Main crawling orchestrator |
| **Queue** | `src/crawler/queue.ts` | BFS URL queue with deduplication |
| **Fetcher** | `src/crawler/fetcher.ts` | HTTP client with retry logic |
| **HTML Parser** | `src/crawler/parsers/html.ts` | Link extraction using Cheerio |
| **CSS Parser** | `src/crawler/parsers/css.ts` | URL extraction using PostCSS |
| **Rewriter** | `src/crawler/rewriter.ts` | URL to filesystem path conversion |
| **Storage** | `src/storage/filesystem.ts` | File writing with collision handling |
| **Archiver** | `src/storage/archiver.ts` | ZIP archive creation |
| **SSRF Protection** | `src/security/ssrf.ts` | IP validation and blocking |
| **Validation** | `src/security/validation.ts` | Input sanitization with Zod |

### Frontend Components

| Component | Description |
|-----------|-------------|
| **UrlInput** | URL entry form with validation |
| **AdvancedOptions** | Crawl configuration settings |
| **CrawlProgress** | Real-time progress display |
| **LogViewer** | Live crawl log streaming |
| **DownloadPanel** | Archive download interface |

---

## 📡 API Reference

Base URL: `http://localhost:3001/api`

### Jobs

#### Create a New Job

```http
POST /api/jobs
Content-Type: application/json
```

**Request Body:**

```json
{
  "url": "https://example.com",
  "maxDepth": 5,
  "maxPages": 500,
  "scope": "same-domain",
  "respectRobotsTxt": true,
  "concurrency": 5,
  "delayMs": 100,
  "fileTypes": {
    "html": true,
    "css": true,
    "js": true,
    "images": true,
    "fonts": true,
    "media": true
  }
}
```

**Request Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *required* | Target URL to crawl (http/https only) |
| `maxDepth` | number | 50 | Maximum crawl depth (1-1000) |
| `maxPages` | number | 10000 | Maximum pages to crawl (1-1000000) |
| `scope` | string | "same-domain" | Crawl scope: `same-domain`, `same-host`, `subdomains` |
| `respectRobotsTxt` | boolean | false | Honor robots.txt directives |
| `concurrency` | number | 5 | Concurrent requests (1-50) |
| `delayMs` | number | 100 | Delay between requests in ms (0-10000) |
| `timeoutMs` | number | 60000 | Request timeout in ms (1000-300000) |
| `userAgent` | string | - | Custom User-Agent header |
| `cookies` | string | - | Cookies to send with requests |
| `unlimitedMode` | boolean | false | Remove most crawl limits |

**Response:**

```json
{
  "success": true,
  "job": {
    "id": "uuid-string",
    "url": "https://example.com",
    "status": "pending",
    "progress": { "pagesProcessed": 0, "totalPages": 0 },
    "createdAt": "2026-01-21T10:00:00Z"
  }
}
```

---

#### List All Jobs

```http
GET /api/jobs
```

**Response:**

```json
{
  "success": true,
  "jobs": [
    {
      "id": "uuid-string",
      "url": "https://example.com",
      "status": "completed",
      "hasArchive": true
    }
  ]
}
```

---

#### Get Job Status

```http
GET /api/jobs/:id
```

**Response:**

```json
{
  "success": true,
  "job": {
    "id": "uuid-string",
    "url": "https://example.com",
    "status": "running",
    "progress": {
      "pagesProcessed": 50,
      "totalPages": 100,
      "bytesDownloaded": 5242880
    },
    "createdAt": "2026-01-21T10:00:00Z",
    "startedAt": "2026-01-21T10:00:05Z"
  }
}
```

**Job Status Values:**

| Status | Description |
|--------|-------------|
| `pending` | Job created, waiting to start |
| `running` | Actively crawling |
| `paused` | Temporarily paused |
| `completed` | Successfully finished |
| `failed` | Encountered an error |
| `cancelled` | Manually cancelled |

---

#### Start Job

```http
POST /api/jobs/:id/start
```

---

#### Pause Job

```http
POST /api/jobs/:id/pause
```

---

#### Resume Job

```http
POST /api/jobs/:id/resume
```

---

#### Cancel Job

```http
POST /api/jobs/:id/cancel
```

---

#### Delete Job

```http
DELETE /api/jobs/:id
```

---

#### Get Job Logs

```http
GET /api/jobs/:id/logs?since=0
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `since` | number | Return logs after this timestamp |

---

#### Download Archive

```http
GET /api/jobs/:id/download
```

**Response:** ZIP file download

---

#### Preview File

```http
GET /api/jobs/:id/preview/:path
```

Example: `GET /api/jobs/abc123/preview/index.html`

---

### WebSocket Events

Connect to `ws://localhost:3001/ws`

**Subscribe to Job:**
```json
{ "type": "subscribe", "jobId": "uuid-string" }
```

**Event Types:**

| Event | Description |
|-------|-------------|
| `job:progress` | Progress update with current stats |
| `job:log` | New log entry |
| `job:complete` | Job finished successfully |
| `job:failed` | Job failed with error |

---

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=3001
NODE_ENV=development

# Job Limits
MAX_CONCURRENT_JOBS=5
MAX_PAGES_PER_JOB=10000
MAX_FILE_SIZE_BYTES=52428800      # 50MB
MAX_TOTAL_SIZE_BYTES=1073741824   # 1GB
MAX_DEPTH=50

# Timeouts
DEFAULT_TIMEOUT_MS=60000

# Cleanup
CLEANUP_INTERVAL_MS=3600000       # 1 hour
JOB_TTL_MS=86400000               # 24 hours

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000        # 1 minute
RATE_LIMIT_MAX=10                 # 10 requests per window

# Crawler Defaults
DEFAULT_CONCURRENCY=5
DEFAULT_DELAY_MS=100
DEFAULT_USER_AGENT=WebCrawler/1.0

# Storage
JOBS_DIR=./jobs
TEMP_DIR=./temp

# Security
ALLOWED_PROTOCOLS=http,https
BLOCKED_HOSTS=
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

## 🚫 Limitations

| Feature | Status | Notes |
|---------|:------:|-------|
| Static HTML websites | ✅ | Full support |
| CSS stylesheets | ✅ | Including @import and url() |
| JavaScript files | ✅ | Downloaded as static files |
| Images & media | ✅ | All common formats |
| Fonts | ✅ | WOFF, WOFF2, TTF, etc. |
| JavaScript SPAs | ❌ | React/Vue/Angular require JS execution |
| Login-protected pages | ❌ | Credentials not supported |
| Dynamic/AJAX content | ❌ | Snapshot-based only |
| Infinite scroll | ❌ | Requires JS execution |
| WebSocket content | ❌ | Real-time data not captured |
| PDF/document generation | ❌ | Only existing files |

---

## 📁 Project Structure

```
webcrawler/
├── backend/
│   ├── src/
│   │   ├── api/              # REST & WebSocket handlers
│   │   │   ├── routes.ts     # API endpoints
│   │   │   └── websocket.ts  # Real-time updates
│   │   ├── config/           # Environment config
│   │   ├── crawler/          # Core crawling logic
│   │   │   ├── engine.ts     # Main orchestrator
│   │   │   ├── fetcher.ts    # HTTP client
│   │   │   ├── queue.ts      # URL queue
│   │   │   ├── rewriter.ts   # Link rewriting
│   │   │   ├── robots.ts     # robots.txt parser
│   │   │   └── parsers/      # HTML/CSS parsers
│   │   ├── security/         # Security utilities
│   │   │   ├── ssrf.ts       # SSRF protection
│   │   │   └── validation.ts # Input validation
│   │   ├── storage/          # File management
│   │   │   ├── archiver.ts   # ZIP creation
│   │   │   └── filesystem.ts # File operations
│   │   └── utils/            # Helpers
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   │   ├── page.tsx      # Main page
│   │   │   ├── layout.tsx    # Root layout
│   │   │   ├── disclaimer/   # Legal pages
│   │   │   ├── dmca/
│   │   │   ├── privacy/
│   │   │   └── terms/
│   │   ├── components/       # React components
│   │   │   ├── UrlInput.tsx
│   │   │   ├── AdvancedOptions.tsx
│   │   │   ├── CrawlProgress.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   └── DownloadPanel.tsx
│   │   └── lib/              # Utilities
│   │       └── api.ts        # API client
│   ├── public/               # Static assets
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── README.md
├── LICENSE
├── DISCLAIMER.md
├── SECURITY.md
└── CODE_OF_CONDUCT.md
```

---

## 📄 License & Legal

| Document | Description |
|----------|-------------|
| [LICENSE](LICENSE) | MIT License with additional disclaimer |
| [DISCLAIMER.md](DISCLAIMER.md) | Comprehensive legal disclaimer |
| [SECURITY.md](SECURITY.md) | Security policy & built-in protections |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community guidelines |

**This software is provided "AS IS" without warranty of any kind. Use at your own risk.**

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 👨‍💻 Author

**Rishabh**

- GitHub: [@itxRishabh](https://github.com/itxRishabh)

---

<p align="center">
  <strong>⚠️ Always obtain proper authorization before crawling any website.</strong>
  <br />
  When in doubt, don't crawl.
  <br />
  <em>The developers are not liable for any misuse of this tool.</em>
</p>
