# Sectors Hackathon readiness

Based on rules supplied by the user on 18 September 2026. This is a preparation checklist, not organizer approval. User confirmed no submission yet, all members onboarded before project code, and code created specifically within the build period. Verify portal/account records before submission.

## Positioning

Track: **03 — Market Intelligence**.

Problem statement: **FlowPhase mengubah broker flow, ownership, free float, dan company intelligence dari Sectors menjadi kandidat fase pasar IDX yang explainable, lalu menggabungkannya dengan price-volume context untuk menunjukkan bukan hanya “fase apa”, tetapi “kenapa model menilainya begitu” dan bukti apa yang masih hilang.**

Workflow: scan analysed IDX subset → open a candidate → inspect **SECTORS-BACKED vs PRICE-VOLUME-ONLY evidence basis** → compare phase scores/supporting/opposing evidence → inspect Sectors broker/ownership context → replay causally. Sectors is indispensable to the full FlowPhase evidence signal: without Sectors broker evidence the product deliberately downgrades output to **PRICE-VOLUME CANDIDATE ONLY**. Do not describe this as an AI agent: an LLM is not at the product's core. AI-assisted coding is permitted by the supplied rules.

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
| 0:00–0:20 | Problem: price charts can show movement, but researchers still need explainable evidence for what market-cycle phase a stock may be entering. |
| 0:20–0:45 | Dashboard/scanner: show only the **analysed subset**, phase candidates, confidence, coverage, and the new **evidence basis** column. |
| 0:45–1:25 | Open a stock and show the chart plus **FlowPhase Evidence**: Sectors-backed status, four phase scores, supporting evidence, evidence against, coverage and data quality. |
| 1:25–1:55 | Open broker rows for the selected phase. Explain observed net lots, crossing-risk penalty, and why broker aggregates are not beneficial ownership. |
| 1:55–2:20 | Show ownership / foreign-flow / free-float context from Sectors. Make clear that these support research but do not prove manipulation or future return. |
| 2:20–2:45 | Replay the chart causally. Regions are generated from revealed history; no future candle is fed into the classifier. |
| 2:45–3:00 | Close with source boundary: Sectors powers the full evidence signal; without broker evidence FlowPhase visibly downgrades to **PRICE-VOLUME CANDIDATE ONLY**. Research tool, not a recommendation. |

Teaser: problem 10s → scanner/evidence-basis 10s → FlowPhase Evidence panel 20s → Sectors broker/ownership context 15s → title/track 5s. Real screen capture; no fabricated performance or testimonials.

Social draft (not published): “Kami membangun FlowPhase untuk mengubah data broker, ownership, free float, dan company intelligence dari Sectors menjadi kandidat fase pasar IDX yang explainable, lengkap dengan alasan pendukung, bukti yang berlawanan, dan konteks price-volume. Alat informasi dan analisis, bukan rekomendasi investasi. [tautan proyek/video] [tag resmi dari portal].”

## Remaining scoring priorities

**Usability, 40%:** have 2–3 intended users complete the workflow and record real task completion/confusing labels. No user study has been claimed. Validate whether these metrics answer a real research question.

**Storytelling, 30%:** record clear production data, readable text and narration within time. Judging is asynchronous; the repository/video must stand alone.

**Engineering, 30%:** keep CI/tests, source boundaries and formulas visible. Exercise production search, filtering, details, broker availability, chart, replay and watchlist. Automated browser execution was blocked in this Windows environment; manual checks do not substitute for an automated pass. Phase heuristics are not independently validated predictive models.

Public deployment is optional. It would need shared rate limits/access control to protect credits. The third-party TradingView connection has no guaranteed SLA and sessions last 55 seconds. Localhost demonstration is acceptable under the supplied rules.
