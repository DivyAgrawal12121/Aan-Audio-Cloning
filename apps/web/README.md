# 🎙️ Resound Studio — Frontend

This is the Next.js frontend for Resound Studio.

## 🚀 Getting Started

1.  **Install dependencies** (if you haven't already):
    ```bash
    pnpm install
    ```

2.  **Run the development server**:
    ```bash
    pnpm dev
    ```

3.  **Open the application**:
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Configuration

Ensure the backend is running on `http://localhost:8000`. You can configure the backend URL in `apps/web/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## 🏗️ Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Components**: Radix UI / Shadcn UI
