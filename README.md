# VEIL — private community chat

VEIL combines a React chat client and Node/Express API with Google sign-in, private channels, group-specific invitations, friends, DMs, file/voice messages, real-time notifications, themes, and responsive mobile layouts.

> **Security:** MongoDB and Pusher credentials were previously committed in backend source. Current code reads secrets from environment variables, but old Git history still contains earlier values. Rotate those credentials in their provider consoles. Never commit real `.env` files, Firebase Admin service-account JSON, database URIs, Pusher secrets, or LiveKit secrets.

## Technology stack

- Client: React 16, Create React App 3, React Router v5, Redux Toolkit, Material UI v4, Framer Motion, emoji-picker-react, CSS.
- Authentication: Firebase Authentication client; Firebase Admin verifies backend ID tokens.
- API/data: Node.js, Express 5, Axios, MongoDB Atlas, Mongoose 9.
- Realtime/voice: Pusher client/server SDK, `livekit-client` browser SDK and LiveKit token SDK, browser MediaRecorder. The call UI uses the LiveKit Room API because the published React UI components require React 18 while VEIL currently runs React 16.
- Hosting: Vercel/static frontend and Render API.

## Local setup

Requirements: Node.js 20.19+ (Mongoose 9), npm, Firebase project, MongoDB Atlas. Pusher and LiveKit accounts are needed for those integrations.

### Frontend

From this directory:

```sh
npm install
```

Copy `.env.example` to `.env.local`. Set `REACT_APP_API_URL` to the backend origin if using a different API and `REACT_APP_LIVEKIT_URL` to the LiveKit server URL (for example, `wss://your-project.livekit.cloud`). Configure the Firebase web app in `src/firebase.js`, enable Google sign-in, and add `localhost` and deployed domains under Firebase Authentication → Settings → Authorized domains. Run `npm start` or `npm run build`.

### Backend

```sh
cd ../discord-backend
npm install
npm run dev
```

Copy `discord-backend/.env.example` to `discord-backend/.env`. For Render, set these in the service environment dashboard instead of deploying a `.env` file.

| Environment variable                                             | Purpose                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `PORT`                                                           | API HTTP port; defaults to 8002.                                       |
| `MONGO_URI`                                                      | MongoDB connection string; required for data routes.                   |
| `FIREBASE_SERVICE_ACCOUNT_JSON`                                  | Firebase Admin service-account JSON for the same project; secret.      |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | Pusher server configuration; keep secret private.                      |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`                          | LiveKit server token signing; keep secret private.                     |
| `CHANNEL_MIGRATION_OWNER_UID`                                    | Temporary UID allowed to migrate old channels; remove after migration. |

The backend loads local `.env` values with dotenv. Hosting providers should use environment settings.

Set `REACT_APP_LIVEKIT_URL` in the frontend deployment environment as well. Only the LiveKit server URL belongs in the browser configuration; the LiveKit API secret must remain backend-only.

## Browser routes

| Route               | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `/`                 | Signed-in app home.                               |
| `/chat/:roomId`     | Channel conversation; API checks access.          |
| `/dm/:roomId`       | Participant-only direct message.                  |
| `/invite/:token`    | Preview/accept a seven-day invite to one channel. |
| `/join/:inviteCode` | Preview/accept a specific group invitation.       |
| `/groups/:groupId`  | Member-only group directory and invite actions.   |
| `/settings`         | View/edit Firebase profile display name.          |

Static hosting must rewrite these deep paths to `index.html`.

## Features and access model

### Sign-in and profile

Google sign-in uses Firebase Authentication. Axios attaches the current Firebase ID token as a Bearer token. The backend verifies it with Firebase Admin and uses the verified UID for identity and authorization. Settings shows avatar, display name, email, and UID; name edits update Firebase Auth and Redux state.

### Private channels

New channels are invite-only and owned by their creator. The owner creates a random seven-day link. The recipient signs in, previews `/invite/:token`, and accepts; only that channel membership is added. Lists, reads, writes, and private Pusher subscriptions require explicit public access or owner/member access. Knowing a channel ID does not grant access. Unclassified legacy channels remain denied until migrated.

### Groups and group-specific invitations

Creating a group makes the authenticated user its creator and first member. `GET /groups` returns only groups that include the authenticated UID. Every group has its own `/join/:inviteCode` link and `/groups/:groupId` page. Accepting an invite adds membership only to the referenced group. Group detail reads require membership; only its creator can add an existing Firebase account by UID/email. This does not grant access to channels, DMs, or other groups.

Group invites are bearer invitations: anyone holding the link can request to join that one group. Existing short codes are upgraded to high-entropy codes when a member next loads their group list; old links then stop working, so share the updated link. Manual invite rotation/revocation UI is not implemented yet.

Groups currently provide a separate member directory, invite management, and call launch, but no persisted group text-message history. Google Meet is external, so VEIL does not control access inside that meeting. LiveKit tokens are separately checked against VEIL room membership.

### Friends and DMs

Every user has a `FRIEND-XXXXXXXX` code. Send a friend request with that code; the recipient accepts it. A DM can be created only after mutual friendship. DM list/read/write operations are restricted to the two participant UIDs.

### Messaging and media

Text, voice-note data, and attachment metadata/data URLs are stored in MongoDB conversation records. The file picker allows common documents, images, videos, audio, and archives up to 8 MiB (Express JSON limit: 10 MiB). Files currently live as data URLs in MongoDB; production-scale deployments should use object storage. Media panels are derived from the active conversation's actual attachments and image/video/general links. Voice notes use MediaRecorder and require microphone permission plus HTTPS (localhost is allowed). Pusher events contain room identifiers, not message bodies; the client refetches via authorized APIs.

Ephemeral timers require authenticated room membership and participant agreement; messages receive expiry metadata and a background sweeper removes expired entries.

### Themes, search, mobile

Light is the default; Violet and Midnight are persisted in browser local storage. Search filters the loaded messages by text, author, attachment name, and link. Mobile Channels and Shared files drawers are independent. Sidebar list, chat messages, media panel, and page each have isolated scrolling.

## API routes

Except the health route and channel invite preview, routes require `Authorization: Bearer <Firebase ID token>`. Sender UID comes from the verified token, not the request body.

### Channels

| Method / path                         | Purpose / access                                                         |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `GET /`                               | Public health response.                                                  |
| `POST /new/channel`                   | Create private channel owned by caller; body `{ "channelName": "..." }`. |
| `GET /get/channelList`                | Explicit public and caller-owned/member channels only.                   |
| `GET /get/data`                       | Caller-accessible channel data only.                                     |
| `GET /get/conversation?id=:channelId` | Read accessible channel conversation.                                    |
| `POST /new/message?id=:channelId`     | Send text/voice/attachment to accessible channel.                        |
| `POST /channels/:id/invites`          | Owner-only, seven-day channel invite.                                    |
| `GET /channel-invites/:token`         | Public invite preview; does not join.                                    |
| `POST /channel-invites/:token/accept` | Add caller to that invited channel only.                                 |
| `POST /channels/migrate-legacy`       | Configured legacy-channel owner migration.                               |

### Groups and friends

| Method / path                      | Purpose / access                                                      |
| ---------------------------------- | --------------------------------------------------------------------- |
| `POST /groups`                     | Create group with caller as creator/member; body `{ "name": "..." }`. |
| `GET /groups`                      | Membership-filtered group list.                                       |
| `GET /groups/:id`                  | Group member only; get one group directory.                           |
| `GET /group-invites/:inviteCode`   | Authenticated invite preview; no member list.                         |
| `POST /groups/join`                | Join only code-matched group; body `{ "inviteCode": "..." }`.         |
| `POST /groups/:id/members`         | Group creator adds an existing Firebase account by UID/email.         |
| `GET /friends`                     | Own friend code, accepted friends, incoming requests.                 |
| `POST /friend-requests`            | Send using `{ "friendCode": "FRIEND-..." }`.                          |
| `POST /friend-requests/:id/accept` | Recipient accepts pending request.                                    |

### DMs, realtime, voice, timers

| Method / path                          | Purpose / access                                                            |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `GET /dm`                              | List caller's DMs.                                                          |
| `POST /dm`                             | Start/find DM after mutual friendship; `{ "recipient": "UID or email" }`.   |
| `GET /dm/:id`                          | Participant-only DM read.                                                   |
| `POST /dm/:id/messages`                | Participant-only DM message write.                                          |
| `POST /pusher/auth`                    | Authorize private subscription for room member/DM participant.              |
| `POST /api/voice/token`                | Membership-checked LiveKit token; body `{ "roomName": "room/group ID" }`.   |
| `POST /api/channels/:id/timer`         | Member proposes/accepts/disables timer (0–86400 seconds).                   |
| `POST /api/messages/new?id=:channelId` | Authenticated legacy timer-aware channel send route; prefer `/new/message`. |

## Security and migration

- Channel records without explicit access metadata are denied. An ObjectId is not an access grant.
- Group lists and detail are membership-scoped; member additions are creator-only. Group and channel invites are distinct scopes.
- DMs are participant-scoped and require mutual friendship to create.
- Rotate credentials ever committed to Git; a later deletion does not erase old Git history.
- To migrate old channels, set `CHANNEL_MIGRATION_OWNER_UID` in Render, sign in as that account, use **Secure old** once, then remove the variable.
- Firebase browser config is public client config; restrict its API key/domains. Never expose Firebase Admin JSON.

## Scripts and checks

- `npm start` — frontend development server.
- `npm test` — Create React App test runner.
- `npm run build` — optimized frontend build.
- Backend `npm start` / `npm run dev` — production server / nodemon.
- `node --check server.js` — backend syntax check.
- Backend automated tests are not implemented; its current `npm test` is a placeholder.
