# API Contract: Revenue Recovery System

This document outlines the API endpoints available in the Revenue Recovery System.

## Health Check

### GET `/health`
Health check endpoint to verify the API is running.

**Method:** `GET`
**Path:** `/health`
**Query Parameters:** None

**Example Request:**
```http
GET /health
```

**Example Response:**
```json
{
  "status": "ok",
  "version": "2.0.0"
}
```

**Status Codes:**
- `200 OK`: Successful response

---

## Defaulters

### GET `/defaulters/summary/ward`
Ward-level aggregation summary. Reads from the `mv_ward_summary` materialized view. The view is refreshed concurrently on every API call. Optionally filter by `ward_number`.

**Method:** `GET`
**Path:** `/defaulters/summary/ward`
**Query Parameters:**
- `ward_number` (optional, int, >= 1): Filter by ward number (e.g., 101, 201). Omit for all wards.

**Example Request:**
```http
GET /defaulters/summary/ward?ward_number=101
```

**Example Response:**
```json
[
  {
    "ward_number": 101,
    "total_outstanding": 5000000.0,
    "defaulter_count": 150
  }
]
```

**Status Codes:**
- `200 OK`: Successful response
- `422 Unprocessable Entity`: Invalid query parameters

---

### GET `/defaulters/top`
Returns the top-n defaulters sorted by total outstanding descending across all districts.

**Method:** `GET`
**Path:** `/defaulters/top`
**Query Parameters:**
- `limit` (optional, int, >= 1, <= 20, default: 5): Number of results to return.

**Example Request:**
```http
GET /defaulters/top?limit=3
```

**Example Response:**
```json
[
  {
    "property_id": 12345,
    "owner_name": "John Doe",
    "ward_id": 5,
    "total_outstanding": 150000.0,
    "district": "Pune"
  }
]
```

**Status Codes:**
- `200 OK`: Successful response
- `422 Unprocessable Entity`: Invalid query parameters

---

### GET `/defaulters/{property_id}`
Lookup a single defaulter by `property_id`.

**Method:** `GET`
**Path:** `/defaulters/{property_id}`
**Path Parameters:**
- `property_id` (required, int): The ID of the property.

**Example Request:**
```http
GET /defaulters/12345
```

**Example Response:**
```json
{
  "property_id": 12345,
  "owner_name": "John Doe",
  "ward_id": 5,
  "total_outstanding": 150000.0,
  "district": "Pune"
}
```

**Status Codes:**
- `200 OK`: Successful response
- `404 Not Found`: Property ID not found
- `422 Unprocessable Entity`: Invalid path parameter

---

### GET `/defaulters`
Returns defaulters ordered by `total_outstanding DESC`. Can filter by `ward_id`.

**Method:** `GET`
**Path:** `/defaulters`
**Query Parameters:**
- `ward_id` (optional, int, >= 1, <= 20): Filter by ward ID. Omit to return all wards.

**Example Request:**
```http
GET /defaulters?ward_id=5
```

**Example Response:**
```json
[
  {
    "property_id": 12345,
    "owner_name": "John Doe",
    "ward_id": 5,
    "total_outstanding": 150000.0,
    "district": "Pune"
  },
  {
    "property_id": 67890,
    "owner_name": "Jane Smith",
    "ward_id": 5,
    "total_outstanding": 120000.0,
    "district": "Pune"
  }
]
```

**Status Codes:**
- `200 OK`: Successful response
- `422 Unprocessable Entity`: Invalid query parameters

---

## Notices

### POST `/notices/generate`
Generate a tax notice via LLM. Looks up the defaulter by `property_id`, builds a prompt, and streams the LLM-generated notice via Server-Sent Events (SSE). The complete notice is also saved to `notices/{property_id}.txt`.

**Method:** `POST`
**Path:** `/notices/generate`
**Body Parameters:**
- `property_id` (required, int): The ID of the property to generate a notice for.
- `notice_type` (required, string): The type of notice. Must be one of: `Reminder`, `Payment Due`, `Final Demand`.

**Example Request:**
```http
POST /notices/generate
Content-Type: application/json

{
  "property_id": 12345,
  "notice_type": "Reminder"
}
```

**Example Response (Server-Sent Events):**
```text
data: Dear
data:  John
data:  Doe
data: ,
data: \n
...
```

**Status Codes:**
- `200 OK`: Successful streaming response
- `404 Not Found`: Property ID not found
- `422 Unprocessable Entity`: Invalid request body (e.g., invalid notice_type)

---

### GET `/notices/{property_id}/pdf`
Downloads a legally formatted PDF notice for a given `property_id`.
If a notice text file (`notices/{property_id}.txt`) has already been generated (e.g., via the streaming generation endpoint), this endpoint loads that text, converts its markdown to HTML, renders it within a professional Jinja2 template, and returns the PDF.
If no saved notice text exists for this property, the endpoint invokes the LLM dynamically (defaulting to the `Reminder` type) to generate the notice text, saves it, and compiles it into the downloadable PDF.

**Method:** `GET`
**Path:** `/notices/{property_id}/pdf`
**Path Parameters:**
- `property_id` (required, int): The ID of the property.

**Example Request:**
```http
GET /notices/12345/pdf
```

**Example Response:**
A binary PDF stream. In the browser, this will prompt a file download named `Reminder_Notice_12345.pdf`.

**Status Codes:**
- `200 OK`: Successful download response.
- `404 Not Found`: Property ID not found.
- `500 Internal Server Error`: PDF compilation or template rendering error.

---

## AI Assistant

### GET `/ai/status`
Returns whether the LangGraph agent is initialized and ready.

**Method:** `GET`
**Path:** `/ai/status`

**Example Response:**
```json
{
  "ready": true,
  "status": "online"
}
```

### POST `/ai/chat`
Sends a user message to the AI agent and streams the response via Server-Sent Events (SSE).

**Method:** `POST`
**Path:** `/ai/chat`
**Body Parameters:**
- `message` (required, string): User query
- `session_id` (required, string): Client-generated UUID

**Example Request:**
```http
POST /ai/chat
Content-Type: application/json

{
  "message": "Who are the top defaulters?",
  "session_id": "abc-123"
}
```

### DELETE `/ai/chat/{session_id}`
Removes stored conversation history for a given session.

**Method:** `DELETE`
**Path:** `/ai/chat/{session_id}`

---

## Authentication & Users

### POST `/auth/login`
Authenticates a user.

**Method:** `POST`
**Path:** `/auth/login`
**Body Parameters:**
- `username` (required, string)
- `password` (required, string)

**Example Response:**
```json
{
  "status": "success",
  "role": "admin",
  "username": "admin"
}
```

### GET `/auth/users`
Lists all non-admin users in the system.

**Method:** `GET`
**Path:** `/auth/users`

### POST `/auth/users/add`
Registers a new user (admin cannot be added).

**Method:** `POST`
**Path:** `/auth/users/add`
**Body Parameters:**
- `username` (required, string)
- `password` (required, string)

### POST `/auth/users/remove`
Removes an existing user.

**Method:** `POST`
**Path:** `/auth/users/remove`
**Body Parameters:**
- `username` (required, string)

### POST `/auth/users/recover-password`
Initiates password recovery email.

**Method:** `POST`
**Path:** `/auth/users/recover-password`
**Body Parameters:**
- `username` (required, string)
- `user_mail` (required, string)
