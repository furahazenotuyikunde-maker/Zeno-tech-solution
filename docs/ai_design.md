# ZENO Smart Access AI Design

The current AI features are offline, deterministic rule-based demonstrations. They use the typed sample records in `src/data/mockData.json`; they are not machine-learning models and do not make real access-control decisions.

## Phase 1: Rule-based AI (current)

- Flag frequent card taps, duplicate room use, repeated night access, and active cards left after checkout.
- Estimate energy waste when room power stays on while a keycard is out, and flag high air-conditioner draw.
- Estimate lock battery life from recent percentage samples.
- Summarize staff check-in duration, failed-tap response time, and night access frequency.
- Keep each result explainable with a rule-based reason and a confidence/risk score. Dashboard savings are estimates from demo data, not guaranteed savings.

## Phase 2: Machine learning after 10 hotels

After collecting a sufficiently representative and consented dataset from at least 10 hotels, evaluate an Isolation Forest model for access anomalies and Prophet for electricity time-series forecasts. Validate false-positive rates and hotel-by-hotel differences before enabling recommendations. Replace the mock functions through a Supabase Edge Function / Python service boundary; do not make the browser authoritative for physical access decisions.

## Phase 3: Edge AI (future)

Evaluate ESP32-CAM face detection only after a privacy, security, and legal review. Do not retain guest face images or face templates in this design. Face-based access is not implemented or simulated as a current feature.

## Data needed

- Timestamped card taps, card UID pseudonym, room/reader ID, decision, and card lifecycle state.
- Room power state and measured electricity draw over time.
- Lock battery readings with timestamps.
- Wi-Fi/reader connectivity and device health.
- Staff operation event timestamps, using role or pseudonymous staff identifiers where practical.

Collect only what is required, define retention and access controls, obtain appropriate hotel/guest notices, and avoid sending identifiable guest data to model-training pipelines without an approved basis.

## Privacy

No guest face is stored. Current AI demonstrations operate on card and device patterns only. Production telemetry should minimize or pseudonymize card identifiers, restrict staff and guest data by role, establish retention limits, and provide hotel administrators a clear explanation of any alert.
