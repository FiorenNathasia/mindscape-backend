# MindScape Backend 🧠✏️

Backend API for the MindScape journaling application with built-in sketching tools.
This service handles user authentication, journal entry management, image storage, and serves data to the frontend.

**Project's Frontend:** https://github.com/FiorenNathasia/mindscape-frontend

---

## 🚀 Features

- RESTful API built with Express.js
- User authentication using JWT and OAuth
- PostgreSQL database for storing journal entries and base64-encoded sketches
- Supports creation, updating, and deletion of text and sketch entries
- Handles storage and retrieval of sketch images embedded within journal entries
- Secure user data management and session handling

---

## Endpoints

- `POST /api/entries` – Creates a new journal entry
- `GET /api/entries` – Returns all journal entries for the current user
- `GET /api/entries/:id` – Returns a specific journal entry by ID
- `PUT /api/entries/:id` – Updates a specific journal entry
- `DELETE /api/entries/:id` – Deletes a specific journal entry

---
## 🛠️ Tech Stack

- **Node.js**
- **Express.js**
- **PostgreSQL**
- **JWT (OAuth)** for secure authentication

---
