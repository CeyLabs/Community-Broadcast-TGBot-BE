# Community Broadcast Telegram Bot

A Telegram bot built with NestJS for broadcasting messages to multiple community groups.

## 📢 About

This bot serves as a broadcast management system for Telegram communities. It allows administrators to send messages to all registered community groups at once, making it easy to share announcements, updates, and important information across multiple groups.

## 🚀 Features

- **Global Broadcasting**
  - Send messages to all registered community groups
  - Support for text, photos, videos, documents, and animations
  - Variable replacement for dynamic content
  - URL buttons support
  - Message pinning option

- **Group Management**
  - Automatic group registration when bot is added
  - Group name updates on title changes
  - Automatic unregistration when bot is removed

- **Admin Controls**
  - Admin-only access to broadcast features
  - Preview messages before sending
  - Detailed broadcast logs with CSV export
  - Progress tracking during broadcasts

- **Variables Support**
  - `{group}` - Group name
  - `{event_name}` - Event name
  - `{start_date}`, `{end_date}` - Event dates
  - `{start_time}`, `{end_time}` - Event times
  - `{timezone}`, `{location}`, `{address}` - Event details
  - `{unlock_link}` - Unlock Protocol event link

## 🛠 Tech Stack

- NestJS
- Telegraf (Telegram Bot Framework)
- PostgreSQL with Knex.js
- Docker Support

## 📋 Prerequisites

- Node.js v22
- Docker
- Telegram Bot Token

## ⚙️ Environment Variables

Create a `.env` file with the following variables:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_IDS=123456789,987654321  # Comma-separated Telegram user IDs of admins
LOG_GROUP_ID=-1001234567890    # Group ID for logging broadcasts
LOG_THREAD_ID=1                # Thread ID for log messages (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/CeyLabs/Community-Broadcast-TGBot-BE.git
cd Community-Broadcast-TGBot-BE
```

2. Create `.env` file:
```bash
cp .env.example .env
# Update .env file with your configuration
```

3. Install dependencies:
```bash
pnpm install
```

4. Start the PostgreSQL database using Docker:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
pnpm run migrate
```

6. Start the development server:
```bash
pnpm run serve:local
```

## 📱 Bot Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/start` | Start the bot and see welcome message | Everyone |
| `/broadcast` | Create a new broadcast message | Admins only |
| `/groups` | List all registered groups | Admins only |

## 📊 Database Schema

### Groups Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Group name |
| group_id | BIGINT | Telegram group ID (unique) |
| telegram_link | VARCHAR | Telegram invite link |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| telegram_id | BIGINT | Telegram user ID (unique) |
| telegram_username | VARCHAR | Telegram username |
| telegram_name | VARCHAR | Telegram display name |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## 🔧 Scripts

```bash
pnpm run serve:local    # Start development server
pnpm run build          # Build for production
pnpm run migrate        # Run database migrations
pnpm run fixtures       # Load fixture data
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
