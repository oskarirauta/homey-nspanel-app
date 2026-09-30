/** Serializes panel interactions without depending on Homey or the HMI protocol. */
export interface InteractionHooks {
  /** Called when execution starts, not when the interaction is enqueued. */
  canRun(event: string): boolean;
  capture(event: string): () => void;
  onFailure(error: unknown): void;
  afterCommand(): void;
}

class CommandFailure extends Error {
  constructor(readonly originalError: unknown) {
    super('Homey device command failed');
  }
}

export class InteractionQueue {
  private tail: Promise<void> = Promise.resolve();
  private generation = 0;
  private attempted = false;
  private running = false;

  constructor(private readonly hooks: InteractionHooks) {}

  get active(): boolean { return this.running; }

  /** Only command failures are recoverable; programming errors still reject. */
  async command(action: () => Promise<void>): Promise<void> {
    this.attempted = true;
    try {
      await action();
    } catch (error) {
      throw new CommandFailure(error);
    }
  }

  run(action: () => Promise<void>, event = ''): Promise<void> {
    const generation = this.generation;
    const task = this.tail.catch(() => {}).then(async () => {
      if (generation !== this.generation || !this.hooks.canRun(event)) return;
      const restore = this.hooks.capture(event);
      this.attempted = false;
      this.running = true;
      try {
        await action();
      } catch (error) {
        if (!(error instanceof CommandFailure)) throw error;
        restore();
        // Invalidate interactions enqueued before the user sees the failure.
        this.generation++;
        this.hooks.onFailure(error.originalError);
      } finally {
        this.running = false;
        if (this.attempted) this.hooks.afterCommand();
      }
    });
    this.tail = task;
    return task;
  }
}
