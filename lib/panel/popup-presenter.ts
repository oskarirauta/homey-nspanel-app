export type DetailPopup = 'popupFan' | 'popupInSel' | 'popupTimer' | 'popupLight' | 'popupShutter' | 'popupThermo';

interface PopupPresenterHooks {
  sendPage(page: DetailPopup): void;
  schedule(action: () => void, delay: number): void;
  isCurrent(page: DetailPopup, entity: string): boolean;
}

/** Only the latest opening may send its delayed detail payload. */
export class PopupPresenter {
  private generation = 0;
  constructor(private readonly hooks: PopupPresenterHooks) {}

  invalidate(): void { this.generation++; }

  show(page: DetailPopup, entity: string, sendPage: boolean, render: () => void): void {
    const generation = ++this.generation;
    const update = () => {
      if (generation === this.generation && this.hooks.isCurrent(page, entity)) render();
    };
    if (sendPage) {
      this.hooks.sendPage(page);
      this.hooks.schedule(update, 100);
    } else {
      update();
    }
  }
}
