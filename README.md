# MyDay AI ✦

An intelligent daily planner that turns natural-language plans into tasks, tracks progress, and reviews the day against what was originally planned.

## Current MVP

- Natural-language daily planning
- Task extraction for common activities such as English study, exercise, projects, reading, and mosque visits
- Voice input through the browser Speech Recognition API when supported
- Task completion tracking
- Progress ring and progress bar
- End-of-day review flow
- Planned-vs-mentioned comparison with a clarification question for ambiguous tasks
- Local persistence with `localStorage`
- Light/dark mode
- Responsive layout for desktop and mobile browsers

## Run locally

This version is a static web app. Open `index.html` in a browser or serve the folder with any static HTTP server.

For example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Next production milestones

1. Replace client-side task parsing with a real AI service that returns validated structured JSON.
2. Add authentication and cloud sync.
3. Add persistent notifications and scheduled reminders.
4. Add Arabic/English localization and right-to-left UI.
5. Add recurring tasks, calendar integration, and richer history.
6. Add an auditable event timeline so AI never becomes the source of truth.
