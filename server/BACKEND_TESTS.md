# Backend API manual tests

Use this file to exercise every route. Start the server from this folder:

```bash
npm start
```

Default base URL: `http://localhost:5000` (or whatever you set in `PORT`).

---

## 1. Set variables (bash)

```bash
export BASE="http://localhost:5000"
export TOKEN=""           # fill after login/register
export COMPOUND_ID=""     # fill after creating a compound
```

Optional: [jq](https://jqlang.github.io/jq/) helps parse JSON responses.

---

## 2. Health / root

```bash
curl -s "$BASE/" | jq .
```

Expect JSON with `ok`, `name`, and `routes`.

---

## 3. Auth

### 3.1 Register (first time)

```bash
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin-test@example.com",
    "password": "secret12"
  }' | jq .
```

Copy `token` from the response:

```bash
export TOKEN="paste_jwt_here"
```

Use a **new email** if this one was already registered.

### 3.2 Login

```bash
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin-test@example.com",
    "password": "secret12"
  }' | jq .
```

Again set `TOKEN` from the response.

### 3.3 Current user (protected)

```bash
curl -s "$BASE/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expect `admin` with `id`, `name`, `email`.

### 3.4 Negative cases (optional)

Missing token (expect 401):

```bash
curl -s "$BASE/api/auth/me" | jq .
```

Wrong password on login (expect 401):

```bash
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-test@example.com","password":"wrong"}' | jq .
```

---

## 4. Compounds

### 4.1 List all compounds (public)

```bash
curl -s "$BASE/api/compounds" | jq .
```

### 4.2 My compounds (protected)

```bash
curl -s "$BASE/api/compounds/my" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 4.3 Create compound (protected)

Body matches your Mongoose schema: `buildings[].floors[].locations[]` need `type` (`facility` | `office` | `room` | `service`) and `directions`.

```bash
curl -s -X POST "$BASE/api/compounds" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AAU Main Campus",
    "description": "Demo compound",
    "buildings": [
      {
        "name": "Science Building",
        "latitude": 9.03,
        "longitude": 38.76,
        "floors": [
          {
            "floorNumber": 1,
            "locations": [
              {
                "name": "Physics Lab",
                "type": "facility",
                "description": "Intro physics",
                "directions": "From the main entrance, elevator to floor 1, turn left.",
                "keywords": ["physics", "lab", "science"]
              }
            ]
          }
        ]
      }
    ]
  }' | jq .
```

Set `COMPOUND_ID` from `_id` in the response:

```bash
export COMPOUND_ID="paste_mongodb_object_id_here"
```

### 4.4 Get one compound by ID (public)

```bash
curl -s "$BASE/api/compounds/$COMPOUND_ID" | jq .
```

### 4.5 Update compound (protected, owner only)

```bash
curl -s -X PUT "$BASE/api/compounds/$COMPOUND_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "buildings": [
      {
        "name": "Science Building",
        "latitude": 9.03,
        "longitude": 38.76,
        "floors": [
          {
            "floorNumber": 1,
            "locations": [
              {
                "name": "Physics Lab",
                "type": "facility",
                "directions": "Updated indoor directions.",
                "keywords": ["physics", "lab"]
              }
            ]
          }
        ]
      }
    ]
  }' | jq .
```

### 4.6 Delete compound (protected, owner only)

Skip until you are done testing chat, or use a throwaway compound.

```bash
curl -s -X DELETE "$BASE/api/compounds/$COMPOUND_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 4.7 Negative cases (optional)

Create without token (expect 401):

```bash
curl -s -X POST "$BASE/api/compounds" \
  -H "Content-Type: application/json" \
  -d '{"name":"X"}' | jq .
```

Invalid compound id (expect 400):

```bash
curl -s "$BASE/api/compounds/not-a-valid-id" | jq .
```

---

## 5. Outdoor navigation

### 5.1 Progress (GPS → building pin)

Uses **straight-line** distance and walking ETA to the **building** lat/lng from the compound. `destinationKey` comes from `GET /api/compounds/:id/destinations`.

```bash
curl -s -X POST "$BASE/api/navigation/outdoor-progress" \
  -H "Content-Type: application/json" \
  -d "{
    \"compoundId\": \"$COMPOUND_ID\",
    \"destinationKey\": \"b0-f0-l0\",
    \"latitude\": 9.03,
    \"longitude\": 38.75
  }" | jq .
```

### 5.2 Walking route (OSRM polyline)

Returns a **path along roads/paths** (foot profile) for the map line + route distance/duration. Public demo: `router.project-osrm.org` (override with `OSRM_BASE_URL` in production).

```bash
curl -s -X POST "$BASE/api/navigation/outdoor-route" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": 9.03,
    \"longitude\": 38.75,
    \"destinationLatitude\": 9.04,
    \"destinationLongitude\": 38.76
  }" | jq .
```

Expect `coordinates` (array of `[lat, lng]`), `distanceMeters`, `durationSeconds`. On failure, **502**.

---

## 6. Chat (Gemini + compound data)

Requires `GEMINI_API_KEY` in `.env`. Default model is `gemini-2.5-flash` (older names like `gemini-1.5-flash` may return 404). Use [Google’s model list](https://ai.google.dev/gemini-api/docs/models/gemini) or set `GEMINI_MODEL` / `GEMINI_MODEL_FALLBACK`. The model receives the compound directory as JSON; layout facts must match that data.

Optional body field `history`: array of `{ "role": "user" | "model", "text": "..." }` for multi-turn chat (last ~20 turns on the client).

```bash
curl -s -X POST "$BASE/api/chat/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Where is the physics lab?\",
    \"compoundId\": \"$COMPOUND_ID\"
  }" | jq .
```

Expect `reply`, `replySource` (`gemini`), `compoundName`, and `matches` (keyword search hints for the map UI).

Without `GEMINI_API_KEY`, expect **503** with a message about configuration.

### Negative cases (optional)

Missing message:

```bash
curl -s -X POST "$BASE/api/chat/query" \
  -H "Content-Type: application/json" \
  -d "{\"compoundId\":\"$COMPOUND_ID\"}" | jq .
```

Unknown compound id:

```bash
curl -s -X POST "$BASE/api/chat/query" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","compoundId":"507f1f77bcf86cd799439011"}' | jq .
```

---

## 7. Quick full flow (bash one-liner chain)

After setting `BASE`, registers a random email, creates a compound, and asks the chatbot (requires `jq`):

```bash
BASE="http://localhost:5000" \
EMAIL="demo-$(date +%s)@example.com" && \
TOKEN=$(curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Demo\",\"email\":\"$EMAIL\",\"password\":\"secret12\"}" | jq -r .token) && \
CID=$(curl -s -X POST "$BASE/api/compounds" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campus","buildings":[{"name":"Hall A","latitude":9,"longitude":38,"floors":[{"floorNumber":1,"locations":[{"name":"Gym","type":"facility","directions":"End of hall","keywords":["gym","fitness"]}]}]}]}' | jq -r ._id) && \
curl -s -X POST "$BASE/api/chat/query" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"where is gym\",\"compoundId\":\"$CID\"}" | jq .
```

---

## Checklist

| Endpoint | Method | Auth |
|----------|--------|------|
| `/` | GET | No |
| `/api/auth/register` | POST | No |
| `/api/auth/login` | POST | No |
| `/api/auth/me` | GET | Bearer |
| `/api/compounds` | GET | No |
| `/api/compounds/my` | GET | Bearer |
| `/api/compounds/:id` | GET | No |
| `/api/compounds` | POST | Bearer |
| `/api/compounds/:id` | PUT | Bearer |
| `/api/compounds/:id` | DELETE | Bearer |
| `/api/navigation/outdoor-progress` | POST | No |
| `/api/navigation/outdoor-route` | POST | No |
| `/api/chat/query` | POST | No |

Ensure `.env` has `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY` for chat, and optionally `PORT` / `MONGO_DB_NAME` / `GEMINI_MODEL`.
