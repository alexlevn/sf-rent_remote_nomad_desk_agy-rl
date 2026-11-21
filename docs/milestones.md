# Build milestones

Stages of the automated build pipeline for this project.

| Stage | Kind | Title | Status | Note |
| --- | --- | --- | --- | --- |
| S1 | agent | UI, routes & API map | ✅ |  |
| S2 | agent | Requirements & risks | ✅ |  |
| G1 | gate | Owner review: requirements | ✅ | approved 11-21 12:30 |
| S3 | agent | Static HTML design | ✅ |  |
| G2 | gate | Owner review: design | ✅ | approved 11-21 12:53 |
| S4 | agent | Plan: Frontend (mock UI) | ✅ |  |
| S5 | runner | Build: Frontend (mock UI) | ✅ | 27 tasks |
| S5V | agent | UI vs design check & fixes | ✅ |  |
| G3 | gate | Owner review: UI mock | ✅ | approved 11-21 19:48 |
| S6 | agent | Plan: Backend (local Docker) | ✅ |  |
| S7 | runner | Build: Backend (local Docker) | ✅ | 14 tasks |
| S7A | agent | Plan: Admin | ✅ |  |
| S7B | runner | Build: Admin | ✅ | 11 tasks |
| S7C | agent | Plan: Content entry + image upload | ⏳ | attempt 1 |
| S7D | runner | Build: Content entry + image upload | 🔲 |  |
| S8 | agent | Frontend review & fixes | 🔲 |  |
| S9 | agent | Backend review & fixes | 🔲 |  |
| S10 | agent | Full local run, E2E & final report | 🔲 |  |
| W1 | script | Convert images to WebP | 🔲 |  |

Legend: 🔲 todo · ⏳ running · ✅ done · ⏸ awaiting review · ❌ failed
