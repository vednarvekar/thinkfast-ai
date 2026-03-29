# ThinkFast AI

ThinkFast AI is a full-stack AI chat application with authentication, persistent chat history, and file-assisted prompts. The repository is split into a Next.js frontend in `client/` and an Express + TypeScript API in `server/`.

## What the app does

- User registration and login with JWT stored in an HTTP-only cookie
- Authenticated chat UI backed by MongoDB chat history
- AI responses generated through OpenRouter
- Image and PDF uploads for chat prompts
- OCR/text extraction using Tesseract.js and `pdf-parse`
- Profile image upload to Cloudinary

## Tech stack

### Client

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Axios
- React Markdown
- React Toastify

### Server

- Express 5
- TypeScript
- MongoDB with Mongoose
- JWT + cookie-based auth
- Cloudinary
- Multer
- Tesseract.js
- `pdf-parse`
- OpenRouter API

## Repository structure

```text
.
├── client/   # Next.js frontend
├── server/   # Express API and AI/file-processing logic
├── LICENSE
└── README.md
```

### Client highlights

- `client/src/app/page.tsx`: landing page
- `client/src/app/login/page.tsx`: login screen
- `client/src/app/register/page.tsx`: registration screen
- `client/src/app/chat/page.tsx`: authenticated chat page
- `client/src/components/chat/chatPanel.tsx`: chat UI, markdown rendering, file upload flow
- `client/src/components/layout/Navbar.tsx`: chat history menu and navigation
- `client/src/context/AuthContext.tsx`: client-side auth state
- `client/src/lib/axios.ts`: API client configured for cookie credentials

### Server highlights

- `server/src/server.ts`: bootstraps env, DB connection, and HTTP server
- `server/src/app.ts`: Express app setup, CORS, cookies, rate limit, routes
- `server/src/controllers/auth.controller.ts`: register/login/logout
- `server/src/controllers/chat.controller.ts`: send prompt, create chat, load history
- `server/src/controllers/upload.controller.ts`: Cloudinary upload + OCR/PDF extraction
- `server/src/controllers/user.controller.ts`: current user and profile endpoints
- `server/src/ai/ai.service.ts`: prompt shaping and response constraints
- `server/src/ai/provider/openrouter.ts`: OpenRouter API integration

## How it works

1. A user registers or logs in from the client.
2. The server creates a JWT and stores it in a secure HTTP-only cookie.
3. Authenticated requests use that cookie for `/api/chat`, `/api/upload`, and `/api/user` routes.
4. Chat prompts are sent to OpenRouter through the server.
5. Messages are stored in MongoDB so previous chats can be reopened.
6. If the user uploads an image or PDF, the server uploads the file to Cloudinary and extracts text before sending it into the chat flow.

## API overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Chat

- `POST /api/chat/ask`
- `GET /api/chat/history`
- `POST /api/chat/new`
- `GET /api/chat/:id`

### Uploads

- `POST /api/upload`
- `POST /api/upload/profile`

### User

- `GET /api/user/me`
- `GET /api/user/settings`
- `PUT /api/user/settings/profile-pic`

### Health

- `GET /api/health`

## Environment variables

Create `server/.env` from `server/.env.template`.

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/ai-chatbot
JWT_SECRET=replace_with_a_long_random_secret

OPENROUTER_API_KEY=replace_with_openrouter_api_key

CLOUDINARY_CLOUD_NAME=replace_with_cloudinary_cloud_name
CLOUDINARY_API_KEY=replace_with_cloudinary_api_key
CLOUDINARY_API_SECRET=replace_with_cloudinary_api_secret
```

## Local development

Install dependencies separately for the client and server.

### Server

```bash
cd server
npm install
npm run dev
```

The server code currently defaults to port `5000` through `PORT`, although the frontend is calling `http://localhost:4004/api` directly in multiple places. In practice, either:

- run the API on port `4004`, or
- update the frontend API URLs and axios base URL to match the server port you use

### Client

```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:4064`.

## Current implementation notes

- CORS is explicitly configured for `http://localhost:4064` and `http://127.0.0.1:4064`.
- Authentication is cookie-based; the client sends credentials with requests.
- Chat responses are intentionally constrained to stay short.
- Uploaded chat files are processed in memory and limited to 25 MB.
- There is no root workspace script yet; `client/` and `server/` are run independently.
- `client/src/app/settings/page.tsx` is still a placeholder.

## Known codebase quirks

- The frontend mostly targets port `4004`, while `server/.env.template` defaults to `5000`.
- The root `package-lock.json` exists, but there is no root `package.json` or root scripts.
- Some chat records are written with a `title`, but the current chat schema does not define that field.

## Suggested next improvements

- Add a root `package.json` with combined dev scripts
- Move API base URLs into environment variables for the client
- Finish the settings page
- Add validation and automated tests
- Align the chat schema with the stored chat title behavior

## License

This repository includes an MIT-style `LICENSE` file at the root. Check that file for the exact terms used in this project.
