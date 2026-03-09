<div align="center">

# PeerChat

**Private. Instant. Gone.**

A real-time ephemeral group chat powered by Supabase Realtime.
No accounts. No history. Rooms vanish when the host leaves.

[![Built with React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Deployment](#-deployment)

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
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

**PeerChat** is a real-time group chat application powered by **Supabase Realtime**, **Supabase Storage**, and **Supabase Postgres**. Messages are delivered instantly via Postgres Realtime subscriptions. Files are stored temporarily in Supabase Storage. When the host leaves, the entire room — messages, members, and files — is cleaned up automatically.

### Why PeerChat?

| Traditional Chat Apps | PeerChat |
|---|---|
| Messages stored permanently | Rooms are ephemeral — deleted on host leave |
| Accounts required | No signup, no login |
| Complex backend infrastructure | Single Supabase project handles everything |
| Chat history persists indefinitely | Conversations vanish when the room closes |

---

## ✨ Features

### Core
- **👥 Group Chat** — Up to 10 users per room via Supabase Realtime Presence
- **📎 File Sharing** — Send images, documents, audio, and any file type up to 25 MB
- **🔗 PIN-Based Rooms** — 6-digit cryptographically random PINs for room access
- **💨 Ephemeral** — Host leaving destroys the room, all messages, members, and uploaded files
- **📜 Message History** — Late joiners see existing messages from the current session

### User Experience
- **⚡ Instant Start** — One click to create a room, one PIN to join
- **🎨 Dark Theme** — Clean, minimal dark-only UI built with shadcn/ui
- **📱 Responsive** — Works on desktop, tablet, and mobile screens
- **🔔 Toast Notifications** — Real-time feedback for errors and file transfers
- **🖱️ Drag & Drop** — Drop files directly into the chat to send them
- **💬 Auto-linking** — URLs in messages become clickable links automatically
- **🎵 Media Preview** — Audio, video, and image files render inline in chat
- **📜 Smart Scroll** — Auto-scrolls to new messages with a "New messages" indicator when scrolled up

### Reliability
- **🛡️ Channel Error Handling** — Detects `TIMED_OUT` and `CHANNEL_ERROR` with user-facing messages
- **🚪 Room Full Detection** — Graceful handling when room hits the 10-user limit
- **🔄 Unique Labels** — Unique user labels even when users join/leave rapidly
- **🧹 Orphan Cleanup** — Failed file uploads are rolled back from storage
- **✅ Message Deduplication** — Prevents duplicate messages via ID tracking
- **🛡️ Error Boundary** — Global React error boundary prevents white-screen crashes
- **📊 Upload Progress** — Indeterminate progress bar during file uploads
- **🪟 Beforeunload** — Member records cleaned up even on tab close

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 + TypeScript 5.8 |
| **Build Tool** | Vite 5 (SWC) |
| **Styling** | Tailwind CSS 3 + shadcn/ui + Radix UI |
| **Backend** | Supabase (Postgres + Realtime + Storage) |
| **Routing** | React Router v6 |
| **Testing** | Vitest + Testing Library + jsdom |
| **Linting** | ESLint 9 + TypeScript ESLint |
| **Deployment** | Vercel |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (User)                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────────┐ │
│  │  React   │──│ useRoom  │──│  Supabase Realtime          │ │
│  │   UI     │  │ useChat  │  │  (Presence + Postgres CDC)  │ │
│  │          │  │ useFile  │  │                              │ │
│  └──────────┘  └──────────┘  └──────────┬─────────────────┘ │
└─────────────────────────────────────────┼───────────────────┘
                                          │ WebSocket
┌─────────────────────────────────────────┼───────────────────┐
│                     Supabase Cloud                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Postgres   │  │   Realtime   │  │     Storage      │   │
│  │  (rooms,    │  │  (presence,  │  │   (chat-files    │   │
│  │  messages,  │  │   postgres   │  │    bucket)       │   │
│  │  members)   │  │   changes)   │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Room Creation** — Host inserts a row in `rooms` table with a unique PIN
2. **Joining** — Guest queries `rooms` by PIN, inserts into `members`
3. **Presence** — All users track themselves on a Supabase Realtime channel for live user count
4. **Messaging** — Messages are inserted into `messages` table; all users receive them via Postgres Realtime CDC (Change Data Capture)
5. **File Transfer** — Files upload to Supabase Storage, then a `file` message record is created
6. **Cleanup** — When host leaves, all room data (messages, members, files, room record) is deleted

### Database Schema

| Table | Columns | Purpose |
|-------|---------|---------|
| `rooms` | `id`, `pin` (unique), `host_id`, `created_at` | Room registry |
| `messages` | `id`, `room_id`, `sender_id`, `sender_label`, `type`, `content`, `file_*`, `storage_path`, `created_at` | Chat messages |
| `members` | `id`, `room_id`, `user_id`, `user_label`, `joined_at` | Active room members |

**Storage:** `chat-files` bucket (public, 25 MB file size limit)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** — `npm install -g pnpm`
- A **Supabase** project ([free tier](https://supabase.com) works)

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the following SQL in the **SQL Editor** to create tables:

```sql
-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  sender_id TEXT NOT NULL,
  sender_label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'message'
    CHECK (type IN ('message', 'system', 'file')),
  content TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  user_id TEXT NOT NULL,
  user_label TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for anon — rooms are ephemeral)
CREATE POLICY "Allow all on rooms" ON public.rooms
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON public.messages
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on members" ON public.members
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for messages and members
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
```

3. Create a **Storage bucket** named `chat-files`:
   - Public access: **enabled**
   - File size limit: **25 MB** (26214400 bytes)
   - Add storage policies to allow uploads/downloads for anon users

### Installation

```bash
# Clone the repository
git clone https://github.com/Ns81000/PeerChat.git
cd PeerChat

# Install dependencies
pnpm install

# Copy environment template and add your Supabase credentials
cp .env.example .env.local

# Start the development server
pnpm dev
```

The app will be available at **http://localhost:8080**

### Quick Start

1. Open the app and click **"Start"** — creates a room with a random 6-digit PIN
2. Share the PIN with friends
3. Friends click **"Join"** and enter the PIN
4. Chat in real-time, share files up to 25 MB
5. When the host leaves, the room and all data are destroyed

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx          # Global error boundary
│   ├── NavLink.tsx                # Navigation link component
│   ├── chat/
│   │   ├── ChatHeader.tsx         # Room PIN, user count, leave button
│   │   ├── ChatWindow.tsx         # Message list with smart auto-scroll
│   │   ├── FilePreview.tsx        # Inline image/video/audio preview
│   │   ├── MessageBubble.tsx      # Message rendering with auto-links
│   │   └── MessageInput.tsx       # Auto-resizing textarea + file picker + drag-drop
│   └── ui/                        # shadcn/ui primitives
│
├── hooks/
│   ├── useRoom.ts                 # Room creation/joining, presence, cleanup
│   ├── useChat.ts                 # Messages, dedup, realtime, history loading
│   ├── useFileTransfer.ts         # File upload to Storage + message record
│   ├── use-mobile.tsx             # Responsive breakpoint hook
│   └── use-toast.ts               # Toast notification state
│
├── lib/
│   ├── supabase.ts                # Supabase client + constants
│   ├── generatePin.ts             # Cryptographic 6-digit PIN generation
│   ├── messageSchema.ts           # TypeScript types for message types
│   └── utils.ts                   # Tailwind class merge utility
│
├── pages/
│   ├── Index.tsx                   # Landing page
│   ├── JoinPage.tsx                # PIN entry with OTP-style input
│   ├── ChatPage.tsx                # Main chat orchestrator
│   └── NotFound.tsx                # 404 page
│
├── test/                           # Vitest unit tests
├── App.tsx                         # Router + lazy loading + ErrorBoundary
├── main.tsx                        # Entry point
├── vite-env.d.ts                   # Vite + env type declarations
└── index.css                       # Tailwind base + custom CSS variables
```

---

## ⚙️ How It Works

### Room Creation (Host)

```
User clicks "Start"
  → generatePin() creates a crypto-random 6-digit PIN
  → Navigate to /chat/:pin?host=true
  → useRoom inserts room into `rooms` table
  → Host added to `members` as "User 1"
  → Supabase Realtime Presence channel starts tracking
```

### Joining a Room (Guest)

```
User enters PIN on /join page
  → Navigate to /chat/:pin?host=false
  → useRoom queries `rooms` by PIN
  → Checks member count against MAX_USERS (10)
  → Assigns unique "User N" label
  → Inserts into `members` table
  → Subscribes to Presence + Postgres Realtime
  → Loads existing message history
```

### Message Types

| Type | Purpose |
|------|---------|
| `message` | Text chat message from a user |
| `system` | System notifications |
| `file` | File shared via Supabase Storage |

### File Transfer Flow

```
Sender                              Supabase
  │                                    │
  ├── Upload file to Storage ─────────→│  chat-files/{pin}/{id}.{ext}
  │                                    │
  ├── Insert message (type=file) ─────→│  Postgres → Realtime CDC
  │                                    │
  │     Receiver                       │
  │       │←── Realtime INSERT event ──│
  │       │── Get public URL ─────────→│
  │       │←── Render in chat ─────────│
```

---

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | Yes |

Create a `.env.local` file from the template:

```bash
cp .env.example .env.local
```

For **Vercel** deployment, add these as **Environment Variables** in your Vercel project settings.

> **Note:** The anon key is safe to expose in client-side code — it only grants access allowed by your RLS policies.

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch
```

### Test Suite

| Test File | Tests | What's Tested |
|-----------|-------|---------------|
| `generatePin.test.ts` | 3 | PIN format, range, uniqueness |
| `peerConfig.test.ts` | 1 | Supabase config constants |
| `messageSchema.test.ts` | 4 | Message type shapes and union |
| `useChat.test.ts` | 4 | Message state, dedup, cleanup, file messages |
| `example.test.ts` | 1 | Smoke test |

**Total: 13 tests**

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add **Environment Variables** in Vercel project settings:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Vercel auto-detects the `vercel.json` configuration:
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`
5. Deploy!

The included `vercel.json` handles SPA routing with a catch-all rewrite to `index.html`.

### Other Platforms

<details>
<summary><strong>Netlify</strong></summary>

1. Connect on [netlify.com](https://netlify.com)
2. Build command: `pnpm build`, publish directory: `dist`
3. Add environment variables in dashboard
4. Add `_redirects` in `public/`: `/*  /index.html  200`

</details>

<details>
<summary><strong>Cloudflare Pages</strong></summary>

1. Create a Pages project on Cloudflare dashboard
2. Build command: `pnpm build`, output: `dist`
3. Add environment variables in Pages settings

</details>

---

## 🤝 Contributing

Contributions are welcome!

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Guidelines

- Use **TypeScript** with strict types
- Follow existing code style and component patterns
- Write tests for new logic
- Use **pnpm** as the package manager
- Run `pnpm lint` before committing

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with React, Supabase, and the belief that conversations should be ephemeral.**

[⬆ Back to Top](#peerchat)

</div>
