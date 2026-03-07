<div align="center">

<img src="public/favicon.svg" alt="PeerChat Logo" width="120" height="120" />

# PeerChat

**Private. Instant. Gone.**

A zero-storage, peer-to-peer encrypted group chat that runs entirely in your browser.
No servers store your messages. No accounts. No history. Just ephemeral conversations.

[![Built with React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?logo=webrtc&logoColor=white)](https://webrtc.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live Demo](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Contributing](#-contributing)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

**PeerChat** is a real-time group chat application built on top of **WebRTC** using **PeerJS**. All communication happens directly between browsers—no chat server, no database, no message logs.

When you close the tab, the conversation is gone forever.

### Why PeerChat?

| Traditional Chat Apps | PeerChat |
|---|---|
| Messages stored on servers | Messages never touch a server |
| Accounts required | No signup, no login |
| Chat history persists indefinitely | Conversations vanish when closed |
| Centralized infrastructure | Fully peer-to-peer mesh network |
| Complex backend | Static files only—zero backend |

---

## ✨ Features

### Core
- **🔒 End-to-End Encrypted** — WebRTC DTLS encryption on every data channel
- **👥 Group Chat** — Up to 10 users in a single room via full-mesh P2P topology
- **📎 File Sharing** — Send images, documents, audio, and any file type up to 500 MB
- **🔗 PIN-Based Rooms** — 6-digit cryptographically random PINs for room access
- **💨 Ephemeral** — Zero storage. Nothing persists after the tab closes

### User Experience
- **⚡ Instant Start** — One click to create a room, one PIN to join it
- **🎨 Dark Theme** — Clean, minimal dark-only UI built with shadcn/ui
- **📱 Responsive** — Works on desktop, tablet, and mobile screens
- **🔔 Toast Notifications** — Real-time feedback for joins, disconnections, and errors
- **🖱️ Drag & Drop** — Drop files directly into the chat to send them
- **💬 Auto-linking** — URLs in messages are automatically converted to clickable links
- **🎵 Audio Preview** — Audio files play directly in the chat with inline players
- **🖼️ Image Preview** — Sent images render as inline previews with graceful error handling
- **📜 Smart Scroll** — Auto-scrolls to new messages, with a "New messages" button when scrolled up

### Reliability
- **⏱️ Connection Timeout** — 15-second timeout for guests connecting to rooms
- **🚪 Room Full Detection** — Graceful handling when room hits the 10-user limit
- **🔄 Disconnect Recovery** — Detects signaling server disconnections with user notifications
- **✅ Chunk Validation** — File transfers validate chunk counts before assembly
- **🛡️ Error Boundary** — Global React error boundary prevents white-screen crashes
- **📊 Transfer Progress** — Real-time progress bars for both sending and receiving files

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 + TypeScript 5.8 |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS 3 + shadcn/ui + Radix UI |
| **P2P Networking** | PeerJS (WebRTC) |
| **Routing** | React Router v6 |
| **Validation** | Zod |
| **Testing** | Vitest + Testing Library + jsdom |
| **Linting** | ESLint 9 + TypeScript ESLint |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser A (Host)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │  React   │──│ useChat  │──│      usePeer          │ │
│  │   UI     │  │  Hook    │  │  (WebRTC Mesh)        │ │
│  └──────────┘  └──────────┘  └───────┬───────────────┘ │
│                                      │ DataChannel     │
└──────────────────────────────────────┼─────────────────┘
                                       │
              ┌────────────────────────┼──────────────────────┐
              │  PeerJS Signaling      │  (handshake only)    │
              │  0.peerjs.com          │                      │
              └────────────────────────┼──────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────┐
│                                      │ DataChannel     │
│  ┌──────────┐  ┌──────────┐  ┌───────┴───────────────┐ │
│  │  React   │──│ useChat  │──│      usePeer          │ │
│  │   UI     │  │  Hook    │  │  (WebRTC Mesh)        │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
│                      Browser B (Guest)                   │
└─────────────────────────────────────────────────────────┘
```

### Mesh Topology

Every peer connects to every other peer directly. The **host** acts as the coordination point only during the initial handshake—after that, all peers are equal.

### Data Flow

1. **Signaling** — PeerJS broker server (`0.peerjs.com`) helps establish WebRTC connections (ICE candidates, SDP offers/answers). No message data flows through this server.
2. **Data Channels** — Once connected, all messages and files travel directly between browsers over encrypted WebRTC data channels.
3. **File Transfer** — Files are chunked into 64 KB pieces, sent as binary over data channels, and reassembled on the receiving end.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) — `npm install -g pnpm`

### Installation

```bash
# Clone the repository
git clone https://github.com/Ns81000/PeerChat.git

# Navigate into the project
cd PeerChat

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The app will be available at **http://localhost:5173**

### Quick Start

1. Open the app and click **"Start Chat"** — this creates a room and generates a 6-digit PIN
2. Share the PIN with friends
3. Friends click **"Join Chat"** and enter the PIN
4. Start chatting! Send messages, share files, and enjoy private conversations
5. Close the tab when done — everything is gone

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx          # Global error boundary
│   ├── NavLink.tsx                # Navigation link component
│   ├── chat/
│   │   ├── ChatHeader.tsx         # Room PIN display, user count, leave button
│   │   ├── ChatWindow.tsx         # Message list with smart auto-scroll
│   │   ├── FilePreview.tsx        # Image/audio preview for file messages
│   │   ├── MessageBubble.tsx      # Individual message rendering with auto-links
│   │   └── MessageInput.tsx       # Auto-resizing textarea + file picker + drag-drop
│   └── ui/                        # shadcn/ui primitives (button, dialog, toast, etc.)
│
├── hooks/
│   ├── useChat.ts                 # Message state, dedup, file reassembly, progress tracking
│   ├── useFileTransfer.ts         # File chunking, size validation, send progress
│   ├── usePeer.ts                 # WebRTC mesh networking, connection management
│   ├── use-mobile.tsx             # Responsive breakpoint hook
│   └── use-toast.ts               # Toast notification state
│
├── lib/
│   ├── generatePin.ts             # Cryptographic 6-digit PIN generation
│   ├── messageSchema.ts           # Zod schemas for all message types
│   ├── peerConfig.ts              # PeerJS config, chunk size, room limits
│   └── utils.ts                   # Tailwind class merge utility
│
├── pages/
│   ├── Index.tsx                   # Landing page — create or join a room
│   ├── JoinPage.tsx                # PIN entry page with OTP-style input
│   ├── ChatPage.tsx                # Main chat orchestrator (hooks + UI)
│   └── NotFound.tsx                # 404 page
│
├── test/
│   ├── example.test.ts            # Smoke test
│   ├── generatePin.test.ts        # PIN generation tests
│   ├── messageSchema.test.ts      # Zod schema validation tests
│   ├── peerConfig.test.ts         # Config and peer ID tests
│   └── useChat.test.ts            # Chat hook unit tests
│
├── App.tsx                         # Router + lazy loading + ErrorBoundary
├── main.tsx                        # Entry point
└── index.css                       # Tailwind base + custom CSS variables
```

---

## ⚙️ How It Works

### Room Creation (Host)

```
User clicks "Start Chat"
  → generatePin() creates a crypto-random 6-digit PIN
  → Navigate to /chat/:pin?host=true
  → usePeer creates a PeerJS peer with ID: pc-{pin}-host
  → Peer listens for incoming connections
```

### Joining a Room (Guest)

```
User enters PIN on /join page
  → Navigate to /chat/:pin
  → usePeer creates a PeerJS peer with ID: pc-{pin}-{random}
  → Guest connects to pc-{pin}-host
  → Host broadcasts "User joined" system message
  → 15-second timeout if connection fails
```

### Message Protocol

All messages are validated against Zod schemas. Seven message types:

| Type | Purpose |
|------|---------|
| `message` | Text chat message |
| `system` | Join/leave notifications |
| `file-meta` | File transfer metadata (name, size, MIME, chunk count) |
| `file-chunk` | Binary file chunk (64 KB) |
| `file-end` | Signals file transfer completion |
| `file-message` | Assembled file for display |
| `hello` | Guest introduction to host |

### File Transfer Pipeline

```
Sender                                          Receiver
  │                                                │
  ├── file-meta (name, size, mime, totalChunks) ──→│ Store metadata
  │                                                │ Initialize progress
  ├── file-chunk[0] (64KB ArrayBuffer) ──────────→│ Store chunk, update %
  ├── file-chunk[1] ─────────────────────────────→│ Store chunk, update %
  ├── ...                                          │
  ├── file-chunk[n] ─────────────────────────────→│ Store chunk, update %
  │                                                │
  ├── file-end ──────────────────────────────────→│ Validate chunk count
  │                                                │ Assemble Blob
  │                                                │ Create Object URL
  │                                                │ Display in chat
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Test Coverage

| Test File | Tests | What's Tested |
|-----------|-------|---------------|
| `generatePin.test.ts` | 3 | PIN format, range, uniqueness |
| `peerConfig.test.ts` | 4 | Config constants, peer ID generation |
| `messageSchema.test.ts` | 10 | All 7 message types, Zod union schemas |
| `useChat.test.ts` | 8 | Send, dedup, system msgs, file progress, assembly, cleanup |
| `example.test.ts` | 1 | Smoke test |

**Total: 26 tests**

---

## 🌐 Deployment

PeerChat is a **static site** — no backend needed. Deploy the `dist/` folder to any static host.

```bash
# Build for production
pnpm build

# Preview the production build locally
pnpm preview
```

### Deploy to Popular Platforms

<details>
<summary><strong>Vercel</strong></summary>

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Set:
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
4. Deploy

</details>

<details>
<summary><strong>Netlify</strong></summary>

1. Push to GitHub
2. Connect the repo on [netlify.com](https://netlify.com)
3. Set:
   - **Build Command:** `pnpm build`
   - **Publish Directory:** `dist`
4. Add a `_redirects` file in `public/`:
   ```
   /*    /index.html   200
   ```
5. Deploy

</details>

<details>
<summary><strong>Cloudflare Pages</strong></summary>

1. Push to GitHub
2. Create a Pages project on [dash.cloudflare.com](https://dash.cloudflare.com)
3. Set:
   - **Build Command:** `pnpm build`
   - **Build Output Directory:** `dist`
4. Deploy

</details>

<details>
<summary><strong>GitHub Pages</strong></summary>

1. Install: `pnpm add -D gh-pages`
2. Add to `package.json`:
   ```json
   "scripts": { "deploy": "pnpm build && gh-pages -d dist" }
   ```
3. Run: `pnpm deploy`

</details>

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Use **TypeScript** with strict types — no `any` unless absolutely necessary
- Follow the existing code style and component patterns
- Write tests for new logic (hooks, utilities)
- Use **pnpm** as the package manager
- Run `pnpm lint` before committing

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ using React, WebRTC, and the belief that conversations should be ephemeral.**

[⬆ Back to Top](#peerchat)
