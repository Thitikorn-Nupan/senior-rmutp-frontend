import {Injectable, OnDestroy, signal} from '@angular/core';

export type AlertStatus = 'success' | 'error' | 'warning' | 'info';

export interface AppAlert {
  header: string;
  detail: string;
  status: AlertStatus;
}

@Injectable({providedIn: 'root'})
export class AlertService implements OnDestroy {
  private readonly activeAlert = signal<AppAlert | null>(null);
  private readonly sound = signal(true);
  private timer?: ReturnType<typeof setTimeout>;
  private audioContext?: AudioContext;

  readonly currentAlert = this.activeAlert.asReadonly();
  readonly soundEnabled = this.sound.asReadonly();

  /** A new alert replaces the previous one and receives a full four seconds. */
  show(alert: AppAlert): void {
    this.dismiss();
    this.activeAlert.set({...alert});
    this.timer = setTimeout(() => this.dismiss(), 4000);
    this.playSound(alert.status);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.activeAlert.set(null);
  }

  /** Called during a click/key press so browsers can allow notification audio. */
  unlockSound(): void {
    if (!this.soundEnabled()) return;
    try {
      this.audioContext ??= new AudioContext();
      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume().catch(() => {
        });
      }
    } catch {
      // Visual alerts remain available when audio is unsupported or blocked.
    }
  }

  toggleSound(): void {
    this.sound.update(enabled => !enabled);
    if (this.soundEnabled()) {
      this.unlockSound();
    }
  }

  private playSound(status: AlertStatus): void {
    const context = this.audioContext;
    if (!this.soundEnabled() || !context || context.state !== 'running') return;
    try {
      const frequencies: Record<AlertStatus, number[]> = {
        success: [660, 880], error: [330, 220], warning: [440, 440], info: [520, 660],
      };
      frequencies[status].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.14;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.14);
      });
    } catch {
      // Audio errors must never prevent an alert from being displayed.
    }
  }

  ngOnDestroy(): void {
    this.dismiss();
    if (this.audioContext) void this.audioContext.close().catch(() => {
    });
  }
}
