# GenArch AI – Setup Guide

## 📁 Folder Structure
```
GenArch-AI/
├── app.py
├── requirements.txt
├── database.db          ← auto-created on first run
├── static/
│   ├── css/
│   │   ├── auth.css
│   │   ├── home.css
│   │   ├── project.css
│   │   ├── designs.css
│   │   └── reports.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── home.js
│   │   ├── project.js
│   │   ├── designs.js
│   │   └── reports.js
│   └── images/
│       ├── bg1.jpg   ← matthew-henry (foggy skyscrapers)
│       ├── bg2.jpg   ← julien-moreau (white building)
│       ├── bg3.jpg   ← alex-wong (orange glass towers)
│       ├── bg4.jpg   ← verne-ho (glass spire)
│       └── bg5.jpg   ← sean-pollock (dark towers)
└── templates/
    ├── login.html
    ├── signup.html
    ├── home.html
    ├── project.html
    ├── designs.html
    └── reports.html
```

## 🖼️ Image Setup
Copy your 5 Unsplash images into `static/images/` and rename them:
- `matthew-henry-VviFtDJakYk-unsplash.jpg`  → `bg1.jpg`
- `julien-moreau-688Fna1pwOQ-unsplash.jpg`   → `bg2.jpg`
- `alex-wong-l5Tzv1alcps-unsplash.jpg`       → `bg3.jpg`
- `verne-ho-0LAJfSNa-xQ-unsplash.jpg`        → `bg4.jpg`
- `sean-pollock-PhYq704ffdA-unsplash.jpg`    → `bg5.jpg`

## 🚀 How to Run

### 1. Install Python (3.10+)
### 2. Install dependencies
```bash
pip install flask
```
### 3. Run the app
```bash
python app.py
```
### 4. Open browser
```
http://127.0.0.1:5000
```

## 🔄 User Flow
1. `/`         → redirects to `/login`
2. `/signup`   → create account → redirects to `/login`
3. `/login`    → enter credentials → redirects to `/home`
4. `/home`     → landing page with animated background carousel
5. `/project`  → enter plot dimensions & room config → Generate
6. `/designs`  → view 2D & 3D floor plans for 2 variations + AI summary
7. `/reports`  → weekly/monthly stats, bar chart, donut charts, PDF export
8. `Logout`    → redirects back to `/login`

## 🎨 Features
- Dark-themed UI matching your screenshots
- Animated hero with 5 rotating background images
- Password strength meter with eye toggle
- Username field blocks numbers (alphabets only)
- Minimum 20×20 ft plot validation
- 2D Canvas floor plan with proportional room layout
- 3D Three.js model with drag-to-rotate + scroll-to-zoom
- AI-generated textual summary per variation
- Reports page with bar chart + donut charts (no external chart lib needed)
- PDF export via jsPDF
- SQLite database (no extra setup)
