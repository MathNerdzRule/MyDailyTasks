# MyDailyTasks Web

A premium, AI-optimized daily task manager. Originally an Android app, now translated to a modern web experience.

## ✨ Features

- **Premium Design**: Dark mode, glassmorphism, and smooth animations.
- **AI Optimization**: Powered by **Gemini 3 Flash** for intelligent schedule analysis.
- **Task Management**: Simple CRUD with overlap detection.
- **Web Notifications**: Alerts for task start times.
- **Vercel Ready**: Optimized for modern static deployment.

## 🚀 Getting Started

1.  **Clone the Repo** (if not already done).
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Set up AI**:
    - Copy `.env.example` to `.env`.
    - Add your [Google AI Studio API Key](https://aistudio.google.com/).
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 🛠 Tech Stack

- **Foundation**: Vanilla HTML/JS/CSS
- **Bundler**: Vite
- **AI**: Google Generative AI (@google/generative-ai)
- **Design**: CSS Grid, Flexbox, Variable-based tokens

## 📱 Translation from Android

The original Android source code remains available in the `android/` directory. See `TRANSLATION_REPORT.md` for technical details on the migration.
