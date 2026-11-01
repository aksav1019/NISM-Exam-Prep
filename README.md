# 🎓 NISM Exam Prep

Colourful study notes, CBT-style mock tests and a study roadmap for **13 NISM certifications**, built from the official 2026 NISM workbooks.

**Live site:** https://aksav1019.github.io/NISM-Exam-Prep/

| Group | Certifications |
|---|---|
| Investment Advisory | X-A Investment Adviser L1 · X-B Investment Adviser L2 · X-C IA Renewal |
| Research | XV Research Analyst |
| Mutual Funds & SIF | V-B Mutual Fund Foundation · V-D MF – Specialized Investment Fund Distributors |
| Derivatives | VIII Equity Derivatives |
| Alternative Investment Funds | XIX-A AIF Cat I & II Distributors · XIX-B AIF Cat III Distributors · XIX-C AIF Managers |
| Portfolio Management | XXI-A PMS Distributors · XXI-B Portfolio Managers |
| Retirement | XVII Retirement Adviser |

## What's inside each certification
- **Overview**: what the certificate is (in plain English), who must hold it, the exact exam pattern (marks, duration, pass %, negative marking, caselets), fees and validity.
- **Study notes**: every workbook chapter as a colourful card with a summary, a "make it stick" story, key points, must-remember numbers, an exam tip and a trap. Notes are searchable.
- **Downloadable notes**: a full-colour PDF (`downloads/<id>-notes.pdf`) and a printable HTML version (`notes/<id>.html`).
- **Formulas & numbers**: worked formulas, numbers to remember and a glossary.
- **Flashcards & quick revision**: flip cards plus 25–40 one-liners for the night before.
- **Study plan**: a day-by-day plan for that exam.
- **7 mock tests**: 5 easy (25 Q) + 2 tough (30 Q, with caselets where the real exam has them), each with a per-option explanation of why it's right or wrong.
- **Full-length simulator**: the real question count, timer, pass mark and negative marking, drawn fresh from the bank on every attempt.

Site-wide pages: **Roadmap** (recommended exam order), **How to Prepare** (researched strategy and negative-marking maths), **Exam Day & Updates** (rules, fees, regulatory notifications) and **My Progress** (scores saved in your browser, with export/import).

## Running it
It's a static site with no build step. Open it on GitHub Pages, or run it locally:
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
(Opening `index.html` directly from disk won't work, because browsers block loading the JSON data files from `file://`.)

### Turn on GitHub Pages
Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**. The site goes live at `https://<user>.github.io/NISM-Exam-Prep/` within a minute or two.

## Project layout
```
index.html            app shell
assets/app.js         single-page app (routing, notes, CBT engine, scoring, progress)
assets/styles.css     design system (light + dark)
data/exams.json       list of certifications
data/<id>/notes.json  study notes + exam pattern for one certification
data/<id>/mock-N.json mock tests 1–7
data/guide.json       researched exam rules, fees, notifications, prep strategy
data/roadmap.json     recommended exam order
notes/<id>.html       standalone printable notes
downloads/<id>-notes.pdf  downloadable notes
scripts/build-notes.mjs   regenerates notes HTML + PDFs from the JSON
scripts/validate.py       checks the question banks
```
Rebuild the notes after editing JSON: `node scripts/build-notes.mjs` (needs `npm i playwright`).

## Disclaimer
This is an independent study aid. It is not affiliated with NISM or SEBI. Questions are original practice items written from the workbooks. Always use the latest official workbook from https://www.nism.ac.in and check current notices before your exam.
