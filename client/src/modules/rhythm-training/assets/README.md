# Recorded piano asset

`piano-c4.wav` is a real recorded Kawai upright piano C4 from FreePats Upright Piano KW, not synthesized oscillator audio. The original was recorded by Gonzalo and Roberto in January2017 and edited by Roberto; publisher version2022-02-21. CC0 1.0 public-domain dedication; full original license is retained in `CC0-1.0.txt`.

Publisher: https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html

Source repository: https://github.com/freepats/upright-piano-KW

Source file: `samples/C4vL.flac` (exact pinned revision recorded below). Original low-velocity stereo recording converted with existing FFmpeg to mono44100Hz16-bit PCM WAV with gain0.8, no generated piano/synth replacement, no additional app dependency. This is a neutral-pitch rhythm reference voice, not a full chromatic piano instrument or MIDI implementation.

Original SFZ sustain loop metadata: frames199374–354248 at44100Hz. Natural recording duration8.033197 seconds. Reference audio still uses canonical onset/gate timing; rests silent and tied continuation has no second source attack. Pattern volume safely bounded in Web Audio; pitch/recording is not part of answer identity. Sample is bundled through Vite, with no live third-party fetch in the learner app.

Source/license/transform checksums are supplied in `provenance.json`.
