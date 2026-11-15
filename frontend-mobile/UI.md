# Public audio parity — S42.2A.2I

- Baseline: Customer Web public listing, AudioGuideModal and publicAudioOptions at 14e563d.
- Museum narration uses public listing only. No personal Library, protected Result or language-variant fallback.
- ORIGINAL_AUDIO and AI_NARRATION use option IDs and distinct Vietnamese labels, including same-language variants.
- Native modal uses scrollable content, safe areas and 48dp controls. Player lifecycle is scoped to the selected option and navigation focus.
- No automatic playback. Readiness comes from native load status, with load timeout and readable error feedback.
- Web/Mobile implementation differs only by platform layout and native player integration. No Backend or shared-token changes.
- Verified: 221 Mobile tests, typecheck, design check, lint (one pre-existing translation warning), offline Android bundle.
- NOT VERIFIED: Android device playback, Pixel 7 appearance, screen reader modal focus and network access to the running Backend.
