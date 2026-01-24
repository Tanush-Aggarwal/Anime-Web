# 🎬 Anime Webs

**Anime Webs** is a fully functional, responsive Single Page Application (SPA) built using vanilla JavaScript. It serves as a modern anime discovery platform where users can browse trending titles, search for their favorite shows, watch trailers, and view detailed information—all within a sleek, dark-themed interface.

## ❓ Problem Statement
Anime enthusiasts often have to navigate cluttered, ad-heavy websites just to find basic information or watch trailers for new series. Mobile experiences for these sites are often poor or non-existent.

**Anime Webs solves this by providing:**
1.  A **centralized, clean interface** to discover Popular, New, and Categorized anime.
2.  **Instant access** to trailers and key details (synopsis, rating, episodes) without page reloads.
3.  A **mobile-first design** that offers a native app-like experience on phones and tablets.
4.  **Persistent state** for search history, allowing users to quickly revisit previous queries.

## 🚀 Features Implemented

### 1. Dynamic Content & Navigation
* **Single Page Application (SPA) Architecture:** seamless navigation between Home, Popular, New, Categories, and Detail views without refreshing the page.
* **Hero Slider:** An auto-rotating hero section featuring trending anime with "Watch Now" and "Details" actions.
* **Live API Integration:** Fetches real-time data for "Popular" and "Trending" charts using the **AniList GraphQL API** and **Jikan API**.

### 2. Advanced Search System
* **Live Rich Search:** Displays search results instantly as you type with thumbnail images, ratings, and episode counts.
* **Local History:** Saves the user's last 3 unique search terms using **LocalStorage**. History persists even after the browser is closed.
* **Smart Dropdown:** A glassmorphism-styled dropdown that toggles between "Recent History" (when focused) and "Live Results" (when typing).

### 3. Interactive UI/UX
* **Categories Carousel:** Horizontal scrolling rows for genres (Action, Adventure, etc.) with touch-optimized swiping for mobile devices.
* **Detailed Anime View:** A dedicated details page featuring a large hero backdrop, embedded YouTube trailer player, synopsis, and metadata.
* **Responsive Design:** Fully optimized layouts for Desktop, Tablet (iPad), and Mobile devices using custom Media Queries.

## 🛠️ DOM Concepts Used

This project heavily utilizes **Core JavaScript** and **DOM Manipulation** techniques:

1.  **Element Creation & Injection:**
    * Used `document.createElement()` and `appendChild()` to dynamically generate anime cards, search dropdown items, and category rows based on data arrays.
    * Used `innerHTML` templates for rendering complex card structures efficiently.

2.  **Event Handling:**
    * **Input Events:** `input` and `keyup` listeners on the search bar for live filtering.
    * **Mouse/Touch Events:** Click listeners for navigation and specific `touch-action` CSS properties for mobile swiping.
    * **Focus/Blur:** Managing the visibility of the search dropdown when the user interacts with the input field.

3.  **State Management & Storage:**
    * **LocalStorage API:** Implemented `localStorage.setItem()` and `getItem()` to read and write the user's search history.
    * **History API:** Used `history.pushState()` and the `popstate` event to manage browser back/forward navigation within the SPA.

4.  **Asynchronous Operations:**
    * **Fetch API:** Used `fetch()` with `Promise.all()` to retrieve data from external APIs asynchronously and update the DOM once data is loaded.

5.  **Style Manipulation:**
    * Dynamic application of CSS classes (`.active`, `.visible`) to toggle views and fade-in animations.
    * Conditional styling for "Loading" states and error handling.

## 💻 Steps to Run the Project

This project requires no backend server and can be run directly in the browser.

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/YourUsername/Anime-Webs.git](https://github.com/YourUsername/Anime-Webs.git)
    ```
2.  **Navigate to the folder:**
    ```bash
    cd Anime-Webs
    ```
3.  **Run the Application:**
    * **Option A (Recommended):** Open `index.html` using the **Live Server** extension in VS Code.
    * **Option B:** Simply double-click `index.html` to open it in your default web browser.

## ⚠️ Known Limitations

1.  **API Rate Limits:** The project relies on free public APIs (AniList/Jikan). Heavy usage in a short time might result in temporary data fetching errors.
2.  **External Links:** The "Watch Now" button currently redirects to a placeholder or external URL as we do not host video files directly due to copyright restrictions.
3.  **Browser Compatibility:** Designed for modern browsers (Chrome, Edge, Firefox, Safari). Older versions of Internet Explorer are not supported due to the use of ES6+ features (Arrow functions, Template Literals, Fetch).

---
**Submission for Web Dev II (Batch 2029) Final Project**
