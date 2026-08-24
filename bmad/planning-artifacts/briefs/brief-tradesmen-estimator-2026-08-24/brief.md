---
title: Tradesmen Job Estimator & Invoicing (Electrician Prototype)
status: draft
created: 2026-08-24
updated: 2026-08-24
---

# Product Brief: Tradesmen Job Estimator & Invoicing

## Executive Summary

A prototype web app that lets an electrician turn a job description into a materials estimate, a wholesaler shopping list, and — once the job is done — a customer-ready invoice, without leaving one tool. The electrician enters a few job parameters (property type, size, job type), the app estimates the materials required and suggests the best local wholesaler(s) for each item, and the electrician can hand-adjust the list before ordering. The same job then tracks through delivery and completion to a final invoice, with the option to show materials cost or bill labour only. This is a **display prototype**: the goal is to demonstrate the end-to-end flow and interaction design convincingly, not to integrate real wholesaler pricing feeds or process payments.

## The Problem

Electricians currently estimate materials by memory or spreadsheet, call around or drive to two or three wholesalers to compare price and stock, and build invoices manually afterward — often in a separate tool or on paper. This is slow, error-prone (forgotten items, under/over-ordering), and disconnects the estimate from the eventual invoice, so there is no clean record tying "what we quoted" to "what we actually billed." A tradesperson doing several jobs a week loses real time to this admin overhead between paying jobs.

## The Solution

A single tool that walks one job through its whole lifecycle:

1. **Job Details** — capture the job (property type/size, location, job type e.g. full rewire, fuse board upgrade, socket/circuit addition)
2. **Materials Needed** — app estimates a materials list + quantities from the job parameters; electrician can add/remove/adjust items by hand
3. **Wholesaler Selected** — app suggests the best wholesaler(s) per material (mocked pricing/stock/distance data for the prototype); electrician confirms or overrides
4. **Materials Delivered** — mark items received
5. **Job Completed** — close out the job
6. **Invoice** — generate an invoice from the job, choosing to include material costs or bill labour only, for the electrician's own records and the customer

## Who This Serves

**Primary user (prototype persona):** a self-employed or small-crew electrician in Ireland who quotes and runs their own jobs — comfortable on a phone/tablet on-site, wants the estimate-to-invoice loop to take minutes, not a spreadsheet session. Single-user for the prototype; no team/multi-tradesperson accounts.

Success for this user: fewer forgotten materials, faster wholesaler decisions, an invoice that's ready the moment the job is marked complete.

## Scope

**In for the prototype:**
- Job creation with parameters (property type/size, location, job type — full rewire, fuse board upgrade, socket/circuit addition)
- Materials estimate generated from job parameters, fully editable (add/remove/adjust quantity)
- Per-material wholesaler suggestion using mocked-but-plausible pricing, stock, and "local" positioning [ASSUMPTION: no real wholesaler API/scrape — illustrative data styled after real Irish electrical wholesalers such as Chadwicks Electrical, Rexel, CEF, Ellis]
- Job status progression through the six stages above (Job Details → Invoice)
- Invoice generation with a materials-cost toggle (full invoice vs labour-only), EUR currency, 13.5% Irish reduced construction VAT shown as a line item [ASSUMPTION: flat 13.5% VAT applied uniformly; no VAT-registration edge cases for the prototype]
- Web app UI, desktop and mobile-responsive [ASSUMPTION: since the electrician works on-site, the UI should read well on a phone/tablet, not just desktop]

**Explicitly out for the prototype:**
- Real wholesaler integrations (pricing APIs, live stock, ordering)
- Payment processing on invoices
- Multi-user/team accounts, authentication (single-persona demo)
- Native APK build [NOTE: user mentioned APK as a possible target — parking as a future platform, prototype is web-only]
- Historical reporting/analytics across jobs

## Success Criteria (for the prototype)

- A visitor can watch one job move convincingly through all six stages without confusion about what step they're on
- The materials estimate and wholesaler suggestion feel plausible for a real 3-bed rewire in Ireland, even though the underlying data is mocked
- The invoice step clearly demonstrates the materials-cost include/exclude toggle producing two visibly different outputs
- The flow reads as "an electrician's tool," not a generic multi-trade product

## Open Questions

- [ASSUMPTION] Estimate logic (materials quantities per job type/property size) will be simplified/rule-of-thumb for the prototype rather than modeling real electrical-code material calculations — flag if real accuracy matters even at prototype stage.
- [ASSUMPTION] "Best wholesaler" ranking will be presented as price + distance + stock, mocked — confirm if one factor should dominate the demo narrative (e.g. always lead with cheapest).
- Job types beyond the initial three (full rewire, fuse board upgrade, socket/circuit addition) — open to add more if a demo scenario needs it.
