# Blossom



## 📄 License

Copyright © 2026 — All Rights Reserved.

This software and its source code are proprietary. No part of this project may be copied, modified, distributed, sublicensed, or used in any form without explicit written permission from the owner.

Unauthorized use, sale, reproduction, or distribution of this software, in whole or in part, is strictly prohibited.

-----

Free-forever dev platform for coding, managing API keys, building pipelines, and deploying — all for $0.

# 🌸 Blossom — Free Dev Platform

> **Your own development platform. Code, store API keys, build pipelines, and deploy — all for free, forever.**

[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)](#license)
[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()
[![Cost](https://img.shields.io/badge/price-%240-success.svg)]()

-----

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Dependencies](#-dependencies)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Project Structure](#-project-structure)
- [API Keys & Secrets Management](#-api-keys--secrets-management)
- [Pipelines](#-pipelines)
- [Deployment](#-deployment)
- [License](#-license)

-----

## 🌟 Overview

**Blossom** is a free-forever development platform that gives developers a personal space to write and run code, securely store API keys and secrets, construct automated pipelines, and deploy projects — all without spending a single dollar.

The goal of Blossom is to eliminate the financial barrier that comes with most modern development platforms. Whether you’re a hobbyist, a student, or an independent developer, Blossom provides a fully-featured environment that lets you build and ship real software without worrying about billing tiers, credit limits, or paywalls.

Blossom is open source and designed to be self-hosted for free. Whether you’re a hobbyist, a student, or an independent developer, Blossom provides a fully-featured environment that lets you build and ship real software without worrying about billing tiers, credit limits, or paywalls.

-----

## 🚀 Live Demo

🔗 **Coming soon** — the app is being migrated off its original host to a permanent self-hosted deployment.

Once live, the URL will be updated here.

-----

## ✨ Features

### 💻 Code Editor

- Write, edit, and run code directly in the browser
- Syntax highlighting and language support for popular languages
- No installation required — everything runs in the cloud

### 🔑 API Key & Secrets Manager

- Securely store API keys, tokens, and environment variables
- Keys are encrypted and never exposed in plaintext to the frontend
- Reference secrets inside your pipelines and scripts without hardcoding credentials

### 🔁 Pipeline Builder

- Build and automate multi-step workflows (pipelines) visually or via configuration
- Chain together code execution, API calls, and data transformations
- Run pipelines on demand or schedule them to trigger automatically

### 🚀 One-Click Deployment

- Deploy your projects and pipelines directly from the platform
- No need to configure servers, cloud providers, or DevOps infrastructure
- Projects go live instantly with a shareable URL

### 💸 Free Forever

- The entire platform operates at **$0** — no hidden costs, no freemium tier
- No credit card required
- Built with sustainability in mind so that the free tier is the full tier

-----

## 🛠 Tech Stack

> **Note:** The following reflects the inferred stack based on the live platform. Update these to match your actual implementation.

|Layer          |Technology                                                  |
|---------------|------------------------------------------------------------|
|Frontend       |`<!-- e.g. React / Vue / Svelte / Vanilla JS -->`           |
|Styling        |`<!-- e.g. Tailwind CSS / CSS Modules / SCSS -->`           |
|Backend        |`<!-- e.g. Node.js / Express / FastAPI / Flask -->`         |
|Database       |`<!-- e.g. PostgreSQL / SQLite / MongoDB / Supabase -->`    |
|Auth           |`<!-- e.g. Clerk / Auth0 / NextAuth / Custom JWT -->`       |
|Secrets Storage|`<!-- e.g. Encrypted DB column / Vault / Replit Secrets -->`|
|Pipeline Engine|`<!-- e.g. Custom scheduler / BullMQ / Temporal -->`        |
|Hosting        |`<!-- e.g. Render / Railway / Fly.io / Self-hosted VPS -->` |
|Language       |`<!-- e.g. JavaScript / TypeScript / Python -->`            |

-----

## 📦 Dependencies

> **Note:** Replace the placeholders below with the actual contents of your `package.json` or `requirements.txt`.

### JavaScript / Node.js

```json
{
  "dependencies": {
    "<!-- package-name -->": "<!-- version -->"
  },
  "devDependencies": {
    "<!-- dev-package-name -->": "<!-- version -->"
  }
}
```

To install all dependencies after cloning:

```bash
npm install
```

-----

### Python (if applicable)

```txt
# requirements.txt
# paste your dependencies here
# e.g.
# fastapi==0.110.0
# uvicorn==0.29.0
# sqlalchemy==2.0.0
# python-dotenv==1.0.1
```

To install:

```bash
pip install -r requirements.txt
```

-----

## 🏁 Getting Started

### Prerequisites

Before running Blossom locally, make sure you have the following installed:

- [Node.js](https://nodejs.org/) `>= 18.x` (if using a JS/TS stack)
- [Python](https://www.python.org/) `>= 3.10` (if using a Python stack)
- [Git](https://git-scm.com/)
- A package manager: `npm`, `yarn`, `pnpm`, or `pip`

-----

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

1. **Install dependencies**

```bash
# Node.js
npm install

# or Python
pip install -r requirements.txt
```

-----

### Environment Variables

Blossom uses environment variables to keep secrets secure. Create a `.env` file in the root of the project:

```bash
cp .env.example .env
```

Then fill in the required values:

```env
# .env

# Application
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=<!-- your database connection string -->

# Auth
AUTH_SECRET=<!-- your auth secret key -->

# Encryption (for API key storage)
ENCRYPTION_KEY=<!-- a long random string used to encrypt stored secrets -->

# Any third-party API keys your platform itself uses
EXAMPLE_SERVICE_API_KEY=<!-- optional -->
```

> ⚠️ **Never commit your `.env` file.** It is already included in `.gitignore`.

-----

### Running Locally

```bash
# Start the development server
npm run dev

# or for Python
uvicorn main:app --reload
```

The app will be available at `http://localhost:3000` (or whichever port you configured).

-----

## 📁 Project Structure

> Update this to reflect your actual folder layout.

```
blossom/
├── public/               # Static assets (images, icons, fonts)
├── src/
│   ├── components/       # UI components
│   ├── pages/            # Page-level views or routes
│   ├── api/              # Backend API routes or handlers
│   ├── pipelines/        # Pipeline engine logic
│   ├── secrets/          # Secrets manager module
│   ├── utils/            # Shared helper functions
│   └── styles/           # Global styles or Tailwind config
├── .env.example          # Template for environment variables
├── .gitignore
├── package.json          # Node.js dependencies and scripts
├── README.md
└── <!-- other config files e.g. vite.config.ts, tsconfig.json -->
```

-----

## 🔑 API Keys & Secrets Management

Blossom includes a built-in secrets manager so you never have to hardcode sensitive credentials into your code.

**How it works:**

1. Navigate to the **Secrets** section of the platform
1. Add a key-value pair (e.g. `OPENAI_API_KEY` → `sk-...`)
1. Your secret is encrypted before being stored
1. Reference the key inside your pipelines or scripts using the provided variable name

Secrets are scoped to your account and are never exposed in plaintext through the UI after initial entry.

-----

## 🔁 Pipelines

Pipelines are the core automation feature of Blossom. They allow you to chain together steps — such as making API requests, running scripts, processing data, or triggering deployments — into a single repeatable workflow.

**Pipeline features:**

- **Multi-step execution** — define as many steps as you need in sequence
- **Secrets injection** — reference your stored API keys at runtime without exposing them
- **Conditional logic** — branch based on step output (`<!-- if supported -->`)
- **Error handling** — configure retry behavior and failure notifications
- **Manual or scheduled triggers** — run a pipeline on demand or on a set schedule

Pipelines can be defined via the visual builder in the UI or, optionally, through a configuration file (`<!-- e.g. pipeline.yaml or pipeline.json -->`).

-----

## ☁️ Deployment

Blossom is designed to be self-hosted and run for free on a variety of platforms. Below are the best options depending on your needs.

-----

### 🆓 Free Hosting Options

|Platform                                                    |Best For             |Notes                                                                 |
|------------------------------------------------------------|---------------------|----------------------------------------------------------------------|
|[Render](https://render.com)                                |Full-stack apps      |Free tier for web services; spins down after inactivity on free plan  |
|[Railway](https://railway.app)                              |Quick deploys        |$5/mo free credit — effectively free for small projects               |
|[Fly.io](https://fly.io)                                    |Always-on apps       |Generous free tier; requires `flyctl` CLI setup                       |
|[Vercel](https://vercel.com)                                |Frontend / serverless|Free tier; best if your backend is serverless functions               |
|[Netlify](https://netlify.com)                              |Static + functions   |Free tier; great for frontend-heavy builds                            |
|[Supabase](https://supabase.com)                            |Database + backend   |Free Postgres DB + Edge Functions; pairs well with any frontend host  |
|[Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)|Self-hosted VPS      |Permanently free ARM VMs with 4 CPU / 24 GB RAM — best free VPS option|
|[Google Cloud Run](https://cloud.google.com/run)            |Containerized apps   |Free tier; scales to zero when not in use                             |

-----

### 🚢 Deploying on Render (Recommended for beginners)

1. Push this repo to GitHub
1. Go to [render.com](https://render.com) and create a new **Web Service**
1. Connect your GitHub repository
1. Set your environment variables under **Environment**
1. Set the build command (e.g. `npm install && npm run build`)
1. Set the start command (e.g. `npm start`)
1. Click **Deploy** — your app will be live at a `*.onrender.com` URL

-----

### 🚀 Deploying on Fly.io (Recommended for always-on)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Log in
fly auth login

# Launch the app (run from project root)
fly launch

# Set environment variables
fly secrets set KEY=value

# Deploy
fly deploy
```

Your app will be live at `https://your-app-name.fly.dev`.

-----

### 🖥 Self-Hosting on a VPS (Full control)

If you want zero vendor dependency, deploy on any Linux server (Ubuntu recommended):

```bash
# Clone the repo on your server
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Build for production
npm run build

# Start with pm2 (keeps it alive after logout)
npm install -g pm2
pm2 start npm --name "blossom" -- start
pm2 save
pm2 startup
```

Use [Nginx](https://nginx.org/) as a reverse proxy and [Let’s Encrypt](https://letsencrypt.org/) (via Certbot) for a free SSL certificate.

-----

### 🔧 Environment Variables for Production

Regardless of host, make sure the following are set in your deployment environment:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<!-- your production database URL -->
AUTH_SECRET=<!-- strong random string -->
ENCRYPTION_KEY=<!-- strong random string for secrets encryption -->
```

-----

<p align="center">
  Built with ❤️ — free forever, self-hosted, yours to own.
</p>
