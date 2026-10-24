# Knot — two-minute product demo

**Deliverable:** `deliverables/Knot_Demo.mp4`  
**Format:** Silent, captioned H.264 MP4 · 1280×720 · 30 fps · exactly 120.000 seconds  
**Mode:** Real browser-local product workflow; sample destinations and local accounts are not presented as production services.

## Timestamped path

| Time | Caption and on-screen workflow |
|---|---|
| **00:00–00:10** | **Discover without a login wall.** Public search and explicit interest/locality filters. |
| **00:10–00:20** | **Every event keeps its source and confidence.** Sample labelling and the source/freshness ledger. |
| **00:20–00:35** | **Publish a real participation flow.** Adult account creation and Quick Post for an all-ages native hackathon. |
| **00:35–00:50** | **One studio for the full event lifecycle.** Required private registration question, four-part minor-safety checklist and reusable FAQ. |
| **00:50–01:10** | **Minor Mode is restrictive by design.** 16–17 account creation, local guardian attestation and successful gated registration with a private answer. |
| **01:10–01:25** | **Participation continues beyond registration.** Attendee question and repository-backed project submission. |
| **01:25–01:42** | **Organizers close the loop.** Organizer answer, rubric score/feedback and targeted in-app announcement ledger. |
| **01:42–01:52** | **Participants return to one honest plan.** Notification receipt and My Plan. |
| **01:52–02:00** | **Discovery → participation → community.** Closing verification caption: 46 domain tests, 135 Chromium checks, local-first and honest states. |

## Accessibility and honesty notes

- Captions carry the narration content; audio is not required to understand the demonstration.
- Guardian attestation is a local test workflow, not production-verified parental consent.
- “Sent” means an in-app record was written, not external delivery or reading.
- Sample events and `example.com` destinations are not live event coverage or platform conversion evidence.
- The video demonstrates implemented local workflows; it does not claim production cloud, live source federation or internet-scale coverage.

## Reproduce

With the dev server running on port 5174 and Playwright Chromium installed:

```bash
node scripts/record-demo.mjs
```

The recorder writes `artifacts/knot-demo-raw.webm`. Export and normalize it to exactly 120 seconds:

```bash
duration=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 artifacts/knot-demo-raw.webm)

ffmpeg -y -i artifacts/knot-demo-raw.webm \
  -vf "setpts=PTS*120/${duration},fps=30,format=yuv420p" \
  -t 120 -c:v libx264 -preset medium -crf 22 \
  -movflags +faststart -an deliverables/Knot_Demo.mp4
```

Validate the deliverable:

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,avg_frame_rate \
  -of json deliverables/Knot_Demo.mp4
ffmpeg -v error -i deliverables/Knot_Demo.mp4 -f null -
```
