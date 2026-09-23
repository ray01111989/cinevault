# CineVault

A dark-themed movie and TV browser powered by [The Movie Database (TMDB)](https://www.themoviedb.org/). Browse trending, top-rated, and now-playing titles, search across movies and shows, and open a detail card with poster, genres, runtime, and overview.

## Features

- Movies, TV Shows, and Trending tabs, each with three rows of titles and a featured hero banner
- Debounced search across movies and TV
- Detail modal with backdrop, poster, tagline, rating, runtime, genres, and season count
- Season and episode pickers for TV titles
- Responsive layout and loading skeletons

## Tech stack

- Vanilla HTML, CSS, and JavaScript in a single `index.html`
- Vercel serverless function (`api/tmdb.js`) that proxies TMDB requests so the API key stays server-side
- TMDB API

## Setup

1. Get a free API key from [TMDB](https://www.themoviedb.org/settings/api).
2. Deploy to Vercel:

```bash
npm i -g vercel
vercel
```

3. In the Vercel project settings, add the environment variable `TMDB_API_KEY`, then redeploy.

To run locally:

```bash
echo "TMDB_API_KEY=your_key_here" > .env
vercel dev
```

If the page shows "Could not connect to the API", the key is missing or the function has not been redeployed.

## How it works

1. The page asks its own server function (`/api/tmdb?endpoint=...`) for movie and TV data. The function adds the secret TMDB key and returns TMDB's JSON, so the key never reaches the browser.
2. The page draws poster cards from that data. Clicking a card opens its detail modal, and "Watch now" opens the player modal.

## Project structure

```
index.html   UI and client-side logic
api/tmdb.js  Serverless proxy for the TMDB API
```

## Notes

- The player modal loads an external provider in an `<iframe>`, with three selectable servers. Those providers are third parties, and this repository hosts no media. Review the terms and legality of any provider before making a deployment public or promoting it.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
