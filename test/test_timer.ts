import assert from 'assert';
import { TimerController, createTimerState, handleTimerControl } from '../lib/panel/timer-control';
import type { TimerState } from '../lib/panel/models';

async function run() {
  let now = 100000, ticking = false;
  const states = new Map<string, TimerState>();
  const finished: string[] = [], actions: string[] = [];
  const controller = new TimerController({
    states, now: () => now,
    ensureTicking: () => { ticking = true; }, stopTicking: () => { ticking = false; },
    emit: event => { actions.push(`${event.entity}:${event.action}`); },
    finished: event => { finished.push(event.entity); }, update: () => {},
  });
  const slot = { val: '12:34', title: 'Keittiö', durationSeconds: undefined as number | undefined };
  const initial = createTimerState(slot);
  assert.equal(initial.minutes, 12);assert.equal(initial.seconds, 34);assert.equal(initial.label, 'Keittiö');
  slot.val = '00:10';assert.equal(createTimerState(slot).minutes, 12, 'Displayed countdown must not change the configured duration');
  states.set('first', createTimerState({ durationSeconds: 10 }));
  states.set('second', createTimerState({ durationSeconds: 30 }));
  await controller.control('first', 'start');await controller.control('second', 'start');assert(ticking);
  now += 4200;controller.tick();assert.equal(states.get('first')!.seconds, 6);
  await controller.control('first', 'pause');assert.equal(states.get('first')!.endsAt, undefined);
  now += 20000;controller.tick();assert.equal(states.get('first')!.seconds, 6);assert.equal(states.get('second')!.seconds, 6);
  await controller.control('first', 'start');
  now += 10000;controller.tick();controller.tick();
  assert.deepEqual(finished, ['first', 'second'], 'Each completion fires once even after a delayed tick');
  assert.equal(ticking, false);assert.equal(states.get('first')!.endsAt, undefined);
  await controller.control('first', 'start');now += 2000;await controller.control('first', 'cancel');
  assert.equal(states.get('first')!.seconds, 10);assert.equal(states.get('first')!.endsAt, undefined);
  now += 3000;await controller.control('first', 'pause');assert.equal(states.get('first')!.seconds, 10, 'Pause after cancel cannot reuse a stale deadline');
  await controller.control('first', 'start');await controller.control('first', 'set', 0, 20);
  assert.equal(states.get('first')!.endsAt, now + 20000);
  await controller.control('first', 'finish');controller.tick();
  assert.equal(finished.filter(entity => entity === 'first').length, 2);assert.equal(states.get('first')!.seconds, 20);
  assert.equal(states.get('first')!.endsAt, undefined);
  const panelStates = new Map<string, TimerState>(), panelActions: string[] = [];
  const action = async (value: string) => { panelActions.push(value); };
  assert.equal(await handleTimerControl(panelStates, 'panel', undefined, 'bExit', '', action), false);
  assert.equal(panelStates.size, 0);
  await handleTimerControl(panelStates, 'panel', { durationSeconds: 60 }, 'timer-start', '00:02:15', action);
  assert.equal(panelStates.get('panel')!.minutes, 2);assert.equal(panelStates.get('panel')!.initialSeconds, 15);
  await handleTimerControl(panelStates, 'panel', undefined, 'timer-pause', '', action);
  assert.deepEqual(panelActions, ['start', 'pause']);
  console.log('Timer module: duration, concurrent timers, pause/resume, delayed completion, deadline cleanup, Flow set and panel events passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
