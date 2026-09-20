# Sectors Hackathon readiness

Based on rules supplied by the user on 18 September 2026. This is a preparation checklist, not organizer approval. User confirmed no submission yet, all members onboarded before project code, and code created specifically within the build period. Verify portal/account records before submission.

## Positioning

Track: **03 — Market Intelligence**.

Problem statement: **FlowPhase membantu periset saham IDX menyusun shortlist berbasis struktur free float dan partisipasi broker dari Sectors, lalu memeriksa konteks harga tanpa menganggap transaksi broker sebagai kepemilikan atau rekomendasi investasi.**

Workflow: filter Sectors companies → compare subsector free float → inspect broker participation → review TradingView phases → save shortlist. Sectors is indispensable to the universe and non-chart research evidence. Do not describe this as an AI agent: an LLM is not at the product's core. AI-assisted coding is permitted by the supplied rules.

## Eligibility and submission checklist

- [ ] All participants are eligible Indonesian citizens/residents, outside excluded organizer/employee/family categories; guardian consent for anyone under 18.
- [ ] Sectors onboarding completed before project coding and verified before **22 September 2026, 23:59 WIB**.
- [ ] One team per person, one project per team, 1–4 members; representative and roster confirmed.
- [ ] Repository created/first commit within **19 August–30 September 2026**; no prior-project code. Never backdate or fabricate history. Public frameworks/templates are allowed.
- [ ] Project exclusive to this competition; no extra accounts to obtain credits.
- [ ] Public repository reviewed for secrets, remaining public at least 90 days after the 9 October winner announcement.
- [ ] One-minute public teaser video.
- [ ] Accessible judging video, maximum three minutes, showing problem, audience and real end-to-end workflow.
- [ ] One-sentence problem, Track 03, all participant names.
- [ ] Social post on an allowed platform, tagging official Sectors account with official thumbnail template. Obtain exact handle/template from portal; do not guess.
- [ ] Submit via portal before **30 September 2026, 23:59 WIB**.
- [ ] Immediately freeze repository AND application at submission/deadline, whichever is earlier. No subsequent bug fixes. Credential-leak exception: notify organizers, revoke/rotate first, then removal-only commit.

Local Git setup is not public hosting, registration, submission or proof of onboarding. Publishing, video uploads and social posts remain team actions. No automated order execution or investment recommendations are implemented. Keep analysis disclaimers visible in the recording.

## Judging video draft — 3 minutes

| Time      | What to show                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:20 | Audience and problem: IDX researchers comparing fragmented ownership-structure and broker information.                               |
| 0:20–0:50 | Real Sectors universe, fetch date, sector and free-float filter. A research set, not a buy list.                                     |
| 0:50–1:25 | Open a current result. Compare free float to subsector peers, including missing data limitations.                                    |
| 1:25–2:00 | Broker participation and top-three gross-buy concentration, underlying rows/dates. No ownership or smart-money claim.                |
| 2:00–2:30 | TradingView chart/phase boxes/timeframe change; confidence is heuristic, chart complements Sectors evidence.                         |
| 2:30–2:50 | Save stock, reopen watchlist, explain reproducible research. Show a real unavailable state only if encountered; never fabricate one. |
| 2:50–3:00 | Repository/source boundaries and research-only disclaimer.                                                                           |

Teaser: problem 10s → filter 15s → Sectors peer/broker evidence 20s → chart/watchlist 10s → title/track 5s. Real screen capture; no fabricated performance or testimonials.

Social draft (not published): “Kami membangun FlowPhase untuk membantu riset saham IDX: mulai dari klasifikasi dan free float, membaca partisipasi broker dari Sectors, hingga memeriksa konteks harga. Alat informasi dan analisis, bukan rekomendasi investasi. [tautan proyek/video] [tag resmi dari portal].”

## Remaining scoring priorities

**Usability, 40%:** have 2–3 intended users complete the workflow and record real task completion/confusing labels. No user study has been claimed. Validate whether these metrics answer a real research question.

**Storytelling, 30%:** record clear production data, readable text and narration within time. Judging is asynchronous; the repository/video must stand alone.

**Engineering, 30%:** keep CI/tests, source boundaries and formulas visible. Exercise production search, filtering, details, broker availability, chart, replay and watchlist. Automated browser execution was blocked in this Windows environment; manual checks do not substitute for an automated pass. Phase heuristics are not independently validated predictive models.

Public deployment is optional. It would need shared rate limits/access control to protect credits. The third-party TradingView connection has no guaranteed SLA and sessions last 55 seconds. Localhost demonstration is acceptable under the supplied rules.
