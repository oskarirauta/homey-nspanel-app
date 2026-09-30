import type { TimerState } from './models';

export interface TimerSlot {
  val?: unknown;
  value?: unknown;
  durationSeconds?: number;
  color?: string;
  title?: string;
  name?: string;
}

export function initialTimerDuration(slot?: TimerSlot): Pick<TimerState, 'minutes' | 'seconds' | 'initialMinutes' | 'initialSeconds'> {
  const match = String(slot?.val ?? slot?.value ?? '').match(/^(\d{1,2}):(\d{2})$/);
  const duration = Number.isFinite(slot?.durationSeconds) ? slot!.durationSeconds! : match ? Number(match[1]) * 60 + Number(match[2]) : 300;
  const total = Math.max(1, Math.min(3599, Math.round(duration)));
  if (slot && !Number.isFinite(slot.durationSeconds)) slot.durationSeconds = total;
  return { minutes: Math.floor(total / 60), seconds: total % 60, initialMinutes: Math.floor(total / 60), initialSeconds: total % 60 };
}

export function createTimerState(slot?: TimerSlot, useSlotLabels = true): TimerState {
  return {
    ...initialTimerDuration(slot), status: 'idle', editable: 1,
    color: useSlotLabels ? slot?.color || 'white' : 'white',
    label: useSlotLabels ? slot?.title || slot?.name || 'Ajastin' : 'Ajastin',
  };
}

export interface TimerAction {
  entity: string;
  action: 'start' | 'pause' | 'cancel' | 'finish' | 'set';
  minutes: number;
  seconds: number;
}

export interface TimerContext {
  states: Map<string, TimerState>;
  now(): number;
  ensureTicking(): void;
  stopTicking(): void;
  emit(tokens: TimerAction): void;
  finished(tokens: { entity: string; label: string }): void;
  update(entity: string, state: TimerState, text?: string): void;
}

/** Owns countdown transitions; Homey, screen updates and interval ownership stay in the adapter. */
export class TimerController {
  constructor(private readonly context: TimerContext) {}
  async control(entityId: string, action: string, minutes?: number | string, seconds?: number | string): Promise<void> {
    let state = this.context.states.get(entityId);
    if (!state) {
      state = createTimerState();
      this.context.states.set(entityId, state);
    }

    if (minutes !== undefined && minutes !== null && minutes !== '') {
      const m = Number(minutes);
      if (!isNaN(m)) {
        state.minutes = Math.max(0, Math.min(59, m));
        state.initialMinutes = state.minutes;
      }
    }
    if (seconds !== undefined && seconds !== null && seconds !== '') {
      const s = Number(seconds);
      if (!isNaN(s)) {
        state.seconds = Math.max(0, Math.min(59, s));
        state.initialSeconds = state.seconds;
      }
    }

    const act = (action || 'start').toLowerCase().trim();

    if (act === 'start') {
      if (state.minutes === 0 && state.seconds === 0) {
        state.minutes = state.initialMinutes > 0 ? state.initialMinutes : 5;
      }
      state.status = 'running';
      state.endsAt=this.context.now()+(state.minutes*60+state.seconds)*1000;
      this.context.ensureTicking();
      this.context.emit({
        entity: entityId,
        action: 'start',
        minutes: state.minutes,
        seconds: state.seconds
      });
    } else if (act === 'pause') {
      if (state.endsAt) {
        const seconds = Math.max(0, Math.ceil((state.endsAt - this.context.now()) / 1000));
        state.minutes = Math.floor(seconds / 60);
        state.seconds = seconds % 60;
      }
      state.endsAt=undefined;
      state.status = 'paused';
      this.context.emit({
        entity: entityId,
        action: 'pause',
        minutes: state.minutes,
        seconds: state.seconds
      });
    } else if (act === 'cancel') {
      state.status = 'idle';
      state.endsAt = undefined;
      state.minutes = state.initialMinutes;
      state.seconds = state.initialSeconds;
      this.context.emit({
        entity: entityId,
        action: 'cancel',
        minutes: state.minutes,
        seconds: state.seconds
      });
    } else if (act === 'finish') {
      state.status = 'idle';
      state.endsAt = undefined;
      state.minutes = 0;
      state.seconds = 0;

      this.context.finished({
        entity: entityId,
        label: state.label || entityId
      });
      this.context.emit({
        entity: entityId,
        action: 'finish',
        minutes: 0,
        seconds: 0
      });
      state.minutes = state.initialMinutes;
      state.seconds = state.initialSeconds;
    } else if (act === 'set') {
      if(state.status==='running')state.endsAt=this.context.now()+(state.minutes*60+state.seconds)*1000;
      this.context.emit({
        entity: entityId,
        action: 'set',
        minutes: state.minutes,
        seconds: state.seconds
      });
    }

    this.context.update(entityId, state);
  }

  tick(): void {
    let anyRunning = false;

    for (const [entityId, state] of this.context.states.entries()) {
      if (state.status === 'running') {
        anyRunning = true;
        if (state.endsAt === undefined) state.endsAt = this.context.now() + (state.minutes * 60 + state.seconds) * 1000;
        const remaining = Math.max(0, Math.ceil((state.endsAt - this.context.now()) / 1000));
        state.minutes = Math.floor(remaining / 60);
        state.seconds = remaining % 60;
        if(remaining===0) {
          // Timer finished (reached 0:00)!
          state.status = 'idle';
          state.endsAt = undefined;

          this.context.finished({
            entity: entityId,
            label: state.label || entityId
          });

          this.context.emit({
            entity: entityId,
            action: 'finish',
            minutes: 0,
            seconds: 0
          });

          state.minutes = state.initialMinutes;
          state.seconds = state.initialSeconds;
          this.context.update(entityId, state, 'Valmis!');
          continue;
        }
        this.context.update(entityId, state);
      }
    }

    if (!anyRunning) this.context.stopTicking();
  }

}

export async function handleTimerControl(
  states: Map<string, TimerState>, entity: string, slot: TimerSlot | undefined,
  buttonType: string, value: string, control: (action: string) => Promise<void>,
): Promise<boolean> {
  if (!buttonType.startsWith('timer-')) return false;
  const action = buttonType.replace('timer-', '');
  let state = states.get(entity);
  if (!state) { state = createTimerState(slot, false); states.set(entity, state); }
  if (action === 'start') {
    // If value was sent from Nextion edit toggle (e.g. "00:5:0" or "00:05:00")
    if (value && typeof value === 'string' && value.includes(':')) {
      const timeParts = value.split(':');
      if (timeParts.length >= 3) {
        const m = parseInt(timeParts[1], 10);
        const s = parseInt(timeParts[2], 10);
        if (!isNaN(m) && !isNaN(s) && (m > 0 || s > 0)) {
          state.minutes = m;
          state.seconds = s;
          state.initialMinutes = m;
          state.initialSeconds = s;
        }
      }
    }
    await control('start');
  } else if (action === 'pause') {
    await control('pause');
  } else if (action === 'cancel') {
    await control('cancel');
  } else if (action === 'finish') {
    await control('finish');
  }
  return true;
}
