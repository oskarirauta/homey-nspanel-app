import type { Binding } from '../bindings';

export interface MediaControlContext {
  binding?: Binding;
  set(deviceId: string, capability: string, value: boolean | number): Promise<void>;
  emit(tokens: { action: string; value: number }): void;
}

/** Interpret panel media events; command failures propagate before the success trigger. */
export async function handleMediaControl(context: MediaControlContext, button: string, value: string): Promise<boolean> {
  if (!button.startsWith('media-') && button !== 'volumeSlider') return false;
  const action = button === 'volumeSlider' ? 'volume' : button.slice(6);
  let amount = 0;
  if (action === 'volume') {
    // Missing or malformed input is not a request to mute the player.
    if (!value.trim() || !Number.isFinite(Number(value))) return true;
    amount = Math.max(0, Math.min(100, Math.trunc(Number(value))));
  }
  const binding = context.binding;
  if (binding?.source === 'homey' && binding.deviceId) {
    const commands: Record<string, [string, boolean | number]> = {
      pause: ['speaker_playing', false], play: ['speaker_playing', true],
      next: ['speaker_next', true], back: ['speaker_prev', true], prev: ['speaker_prev', true],
      volume: ['volume_set', amount / 100],
    };
    const command = Object.prototype.hasOwnProperty.call(commands, action) ? commands[action] : undefined;
    if (command) await context.set(binding.deviceId, command[0], command[1]);
  }
  // Custom media actions can still be handled through Flow.
  context.emit({ action, value: amount });
  return true;
}
