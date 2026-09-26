# BCK Digital Library

**Bishop Cipriano Kihangire Secondary School**  
Bbiina / Luzira, Kampala, Uganda

**Developed by VYRNOX / VICt-n3r / MATAA**

A professional digital library and holiday learning platform for secondary students.

---

## Features

- **Login gate** — users sign in before exploring resources
- **Home dashboard** — hero, featured resources, subject browse
- **Digital Library** — search, filters (subject, class, category), sort
- **Open PDF** — opens authorized Google Drive viewer in a new tab
- **My Library** — save resources for later (local device)
- **Online Courses** — book holiday lessons at **50,000 UGX**
  - Payment methods UI: **MTN Mobile Money**, **Airtel Money**, **PayPal**
  - (Demo booking only until school merchant accounts are connected)
- **About** — school identity and developer credits
- **Light / Dark theme**
- **Responsive** — mobile bottom navigation, desktop sidebar
- **Font Awesome icons** (no emoji icons)
- **Animations & transitions**

## Data source (backend workflow)

1. Manage books in the **Resource Spreadsheet** (`BCK-Digital-Library-Spreadsheet.html`)
2. Export JSON → file named `resources.json`
3. Place it in `data/resources.json` in this app
4. Students see and open those PDFs from the library

```
Spreadsheet (admin) → resources.json → BCK Digital Library (students)
```

## Run locally

```bash
cd bck-digital-library-app
python -m http.server 8080
```

Open: http://localhost:8080

## Publish on GitHub Pages

1. Create a GitHub repository
2. Upload the contents of `bck-digital-library-app/`
3. Settings → Pages → Deploy from `main` branch (root or `/docs`)
4. Your site URL will be: `https://USERNAME.github.io/REPO-NAME/`

## Production notes

| Feature | Current | Production needs |
|---------|---------|------------------|
| Login | Demo (any email + password ≥ 4 chars) | Real auth (Firebase / school SSO) |
| Course payment | UI + local booking record | MTN MoMo / Airtel / PayPal merchant APIs |
| Resource data | Static JSON from spreadsheet | Optional API + admin CMS |
| PDF access | Google Drive share links | Keep links authorized by the school |

## Project structure

```
bck-digital-library-app/
├── index.html
├── css/style.css
├── js/app.js
├── data/resources.json
└── README.md
```

---

© Bishop Cipriano Kihangire Secondary School  
Developed by **VYRNOX / VICt-n3r / MATAA**
