import type { Binding } from '../bindings';

/** The handlers receive only the services needed for this one control. */
export interface ControlSlot {
  binding?: Binding;
  val?: unknown;
  value?: unknown;
}

export interface ControlContext<State, Tokens> {
  entity: string;
  states: Map<string, State>;
  slot?: ControlSlot;
  supports(capability: string): boolean;
  set(deviceId: string, capability: string, value: unknown): Promise<void>;
  emit(tokens: Tokens): void;
  render(): void;
}
