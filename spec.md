# Anonychat

## Current State
Full anonymous chat app with P2P marketplace, AnonCash rewards, modular architecture. ChatView handles text + voice messages. VoiceRecorder records audio via MediaRecorder API. Backend has `isGhost: boolean` and `ghostDeleteAt?: bigint` fields on `Message` type. `sendMessage(receiverAnonId, content, isGhost)` already accepts ghost flag.

## Requested Changes (Diff)

### Add
1. **Hayalet Mesaj (Ghost Message)** — When composing a message, user can toggle a 👻 ghost icon. Ghost messages show a timer selector (10s / 30s / 60s). After the recipient reads (opens) the message, a visible countdown starts. When countdown hits 0, message fades out with a smoke/dissolve animation and is removed from the local conversation list.
2. **Burn After Read (Yak ve Unut)** — Separate toggle 🔥 for "burn" mode. After recipient opens the message, a dramatic 3-2-1 countdown appears over the message with red glow, then an animated fire/burn effect destroys the message. Sender sees "🔥 Yakıldı" confirmation.
3. **Ghost Voice Message with Voice Masking** — In VoiceRecorder, add a mask selector panel (shown before/during recording). 5 options with icons: Normal (mic icon), Deep Voice (bass icon, pitch -5 semitones), Robot (circuit icon, ring modulation via oscillator), Alien (alien icon, pitch +7 semitones + vibrato), Echo (wave icon, delay 0.3s). Processing done via Web Audio API (OfflineAudioContext) on the recorded Blob before sending. Show selected mask with colored indicator.

### Modify
- `VoiceRecorder.tsx` — add voice mask selector UI + Web Audio processing pipeline
- `ChatView.tsx` — add ghost/burn toggle buttons near send button, countdown display on ghost messages, burn animation on burn messages

### Remove
- Nothing removed

## Implementation Plan
1. Create `GhostMessage.tsx` component: renders message bubble with countdown overlay, smoke-out animation via framer-motion, auto-removes after timer
2. Create `BurnMessage.tsx` component: renders message with 3-2-1 countdown + CSS fire animation, then removes
3. Modify `VoiceRecorder.tsx`: add `VoiceMask` type (Normal/Deep/Robot/Alien/Echo), mask selector panel in idle+preview phase, `applyVoiceMask(blob, mask)` function using OfflineAudioContext
4. Modify `ChatView.tsx`: add ghost/burn toggle icons (👻/🔥) near send button, pass `isGhost=true` to sendMessage when ghost/burn active, render ghost messages with GhostMessage component
5. Ghost/burn state is frontend-only for the countdown/animation — message is sent with `isGhost: true` flag, local timer tracks read time
