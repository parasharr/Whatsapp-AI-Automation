# Grox WhatsApp AI

A Node.js service integrating WhatsApp with a local Ollama AI model (e.g. Qwen3) and Firebase.

## Features
- **WhatsApp Integration**: Built with `@whiskeysockets/baileys` for fast, lightweight multi-device WhatsApp protocol implementation.
- **AI Chatbot**: Utilizes Ollama local LLMs (Qwen3) for generating intelligent responses.
- **Firebase Store**: Persists session and configuration data.
- **Docker Support**: Easy deployment using Docker and Docker Compose.

## Project Structure
```text
grox-whatsapp-ai/
├── src/
│   ├── app.js               # Express application setup
│   ├── server.js            # Server entry point and initializers
│   ├── config/
│   │     firebase.js        # Firebase config & initialization
│   │     ollama.js          # Ollama client configuration
│   ├── whatsapp/
│   │     client.js          # Baileys client initialization & auth
│   │     events.js          # WhatsApp events handler (message incoming, QR)
│   ├── ai/
│   │     ai.service.js      # AI model inference service
│   │     prompt.js          # Prompt formatting and system instructions
│   ├── routes/
│   │     health.route.js    # Express health check routes
│   ├── controllers/         # Request controllers (empty placeholder)
│   ├── services/            # Custom application services (empty placeholder)
│   ├── utils/               # Utility functions (empty placeholder)
│   └── middleware/          # Express middlewares (empty placeholder)
├── auth/                    # Baileys authentication credentials state storage
├── Dockerfile               # Production Docker image build file
├── docker-compose.yml       # Docker Compose setup
├── .env                     # Environment variables configuration
├── package.json             # Node dependencies and scripts
└── README.md                # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- [Ollama](https://ollama.com) running locally with `qwen3` model
- Docker (optional)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables in `.env`:
   ```env
   PORT=3000
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen3:8b
   ```

### Running Locally
To run the server in development mode with hot-reloading:
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```
Upon start, scan the QR code printed in the terminal with your WhatsApp app to link the device.

### Running with Docker
```bash
docker-compose up -d
```
