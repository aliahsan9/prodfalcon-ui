import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ScanService } from '../../core/services/scan.service';
import { ScanHistoryItem } from '../../core/models/scan.model';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  grounding?: string;
}

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="AI security assistant" subtitle="Answers are grounded in a saved scan. The assistant does not modify your repository." />
    <div class="pf-card mb-3">
      <label class="form-label" for="scan">Scan context</label>
      <select id="scan" class="form-select" [formControl]="scanId">
        <option [ngValue]="0">Select a scan</option>
        @for (item of history(); track item.scanResultId) {
          <option [ngValue]="item.scanResultId">#{{ item.scanResultId }} {{ item.projectName }} · {{ item.score }}/100</option>
        }
      </select>
    </div>

    <div class="pf-card mb-3 chat">
      @for (message of messages(); track $index) {
        <div class="message" [class.user]="message.role === 'user'">
          <p class="mb-1">{{ message.text }}</p>
          @if (message.grounding) { <p class="small text-muted mb-0">{{ message.grounding }}</p> }
        </div>
      } @empty {
        <p class="text-muted mb-0">Ask which issues to fix first, or open a finding and ask for an explanation.</p>
      }
    </div>

    <form class="ask-form" (submit)="ask(); $event.preventDefault()">
      <input class="form-control" [formControl]="question" placeholder="What should I fix first?" aria-label="Question" />
      <button class="btn btn-primary ask-submit" type="submit" [disabled]="pending()">Ask</button>
    </form>
  `,
  styles: [`
    :host { display: block; min-width: 0; max-width: 100%; }
    .chat { display: flex; flex-direction: column; gap: 0.75rem; min-height: 180px; max-width: 100%; }
    .message {
      border: 1px solid var(--pf-border);
      border-radius: 8px;
      padding: 0.75rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-width: 100%;
    }
    .message.user { background: rgba(37, 99, 235, 0.08); }
    .ask-form { display: flex; gap: 0.5rem; align-items: stretch; min-width: 0; }
    .ask-form .form-control { min-width: 0; flex: 1; }
    .ask-submit { min-height: 42px; white-space: nowrap; padding-inline: 1.1rem; font-weight: 700; }
    @media (max-width: 575px) {
      .ask-form { flex-direction: column; }
      .ask-submit { width: 100%; min-height: 44px; }
      .chat { min-height: 140px; }
    }
  `]
})
export class AssistantComponent implements OnInit {
  private readonly scans = inject(ScanService);
  private readonly route = inject(ActivatedRoute);

  readonly history = signal<ScanHistoryItem[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly pending = signal(false);
  readonly scanId = new FormControl(0, { nonNullable: true });
  readonly question = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  private findingId: number | null = null;

  ngOnInit(): void {
    const finding = Number(this.route.snapshot.queryParamMap.get('findingId'));
    this.findingId = Number.isFinite(finding) && finding > 0 ? finding : null;
    const requested = Number(this.route.snapshot.queryParamMap.get('scanResultId'));
    this.scanId.valueChanges.subscribe((id) => {
      if (id) this.loadConversation(id);
    });
    this.scans.getHistory().subscribe({
      next: (response) => {
        const items = response.data?.items ?? [];
        this.history.set(items);
        const chosen = items.some((item) => item.scanResultId === requested)
          ? requested
          : items[0]?.scanResultId ?? 0;
        if (chosen) this.scanId.setValue(chosen);
      }
    });
  }

  private loadConversation(scanResultId: number): void {
    this.scans.getConversation(scanResultId).subscribe({
      next: (response) => {
        this.messages.set((response.data ?? []).map((row) => ({
          role: row.role === 'user' ? 'user' : 'assistant',
          text: row.content
        })));
      }
    });
  }

  ask(): void {
    const text = this.question.value.trim();
    if (!text || !this.scanId.value) return;
    this.messages.update((items) => [...items, { role: 'user', text }]);
    this.question.setValue('');
    this.pending.set(true);
    this.scans.ask(this.scanId.value, text, this.findingId ?? undefined).subscribe({
      next: (response) => {
        this.pending.set(false);
        this.findingId = null;
        this.messages.update((items) => [...items, {
          role: 'assistant',
          text: response.data?.answer || 'No answer was returned.',
          grounding: response.data?.usedExternalModel ? 'External model, grounded in this scan' : response.data?.grounding
        }]);
      },
      error: () => {
        this.pending.set(false);
        this.messages.update((items) => [...items, { role: 'assistant', text: 'The assistant could not answer from this scan.' }]);
      }
    });
  }
}
