# Build milestones

Stages of the automated build pipeline for this project.

| Stage | Kind | Title | Status | Note |
| --- | --- | --- | --- | --- |
| S1 | agent | UI, routes & API map | ✅ |  |
| S2 | agent | Requirements & risks | ⏳ | attempt 1 |
| G1 | gate | Owner review: requirements | 🔲 |  |
| S3 | agent | Static HTML design | 🔲 |  |
| G2 | gate | Owner review: design | 🔲 |  |
| S4 | agent | Plan: Frontend (mock UI) | 🔲 |  |
| S5 | runner | Build: Frontend (mock UI) | 🔲 |  |
| S5V | agent | UI vs design check & fixes | 🔲 |  |
| G3 | gate | Owner review: UI mock | 🔲 |  |
| S6 | agent | Plan: Backend (local Docker) | 🔲 |  |
| S7 | runner | Build: Backend (local Docker) | 🔲 |  |
| S7A | agent | Plan: Admin | 🔲 |  |
| S7B | runner | Build: Admin | 🔲 |  |
| S7C | agent | Plan: Content entry + image upload | 🔲 |  |
| S7D | runner | Build: Content entry + image upload | 🔲 |  |
| S8 | agent | Frontend review & fixes | 🔲 |  |
| S9 | agent | Backend review & fixes | 🔲 |  |
| S10 | agent | Full local run, E2E & final report | 🔲 |  |
| W1 | script | Convert images to WebP | 🔲 |  |

Legend: 🔲 todo · ⏳ running · ✅ done · ⏸ awaiting review · ❌ failed
