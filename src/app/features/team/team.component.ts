import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PlatformService, TeamMember } from '../../core/services/platform.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Team"
      subtitle="Invite people into this workspace and give each person only the access they need." />

    <div class="row g-3">
      <div class="col-lg-4">
        <section class="pf-card h-100">
          <h2 class="h6">Roles</h2>
          <ul class="roles">
            <li><strong>Viewer</strong> reads scans, reports, and notes.</li>
            <li><strong>Developer</strong> runs scans and leaves notes.</li>
            <li><strong>Security reviewer</strong> reviews findings with the same scan access.</li>
            <li><strong>Admin</strong> invites people, removes members, and edits the quality gate.</li>
            <li><strong>Owner</strong> keeps the workspace. That role is not reassigned here.</li>
          </ul>
          <p class="small text-muted mb-0">You are signed in as {{ auth.role() || 'Member' }}.</p>
        </section>
      </div>
      <div class="col-lg-8">
        @if (canAdminister()) {
          <form class="pf-card mb-3" [formGroup]="form" (ngSubmit)="invite()">
            <h2 class="h6">Invite a teammate</h2>
            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label" for="invite-name">Name</label>
                <input id="invite-name" class="form-control" formControlName="fullName" />
              </div>
              <div class="col-md-4">
                <label class="form-label" for="invite-email">Email</label>
                <input id="invite-email" class="form-control" type="email" formControlName="email" />
              </div>
              <div class="col-md-4">
                <label class="form-label" for="invite-role">Role</label>
                <select id="invite-role" class="form-select" formControlName="role">
                  <option value="0">Viewer</option>
                  <option value="1">Developer</option>
                  <option value="2">Security reviewer</option>
                  <option value="3">Admin</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primary mt-3" type="submit" [disabled]="busy()">Create invite link</button>
            @if (inviteLink()) {
              <div class="token-box mt-3">
                <p class="small mb-1">Share this link. Email delivery is not configured, and the link expires in 7 days.</p>
                <div class="d-flex gap-2">
                  <code class="flex-grow-1">{{ inviteLink() }}</code>
                  <button class="btn btn-sm btn-outline-primary" type="button" (click)="copy()">Copy</button>
                </div>
              </div>
            }
          </form>
        }

        <section class="pf-card">
          <h2 class="h6">People</h2>
          @for (member of members(); track member.id) {
            <div class="member">
              <div class="min-w-0">
                <strong>{{ member.fullName || member.email }}</strong>
                <p class="small text-muted mb-0">{{ member.email }} · {{ member.status }}</p>
              </div>
              @if (canAdminister() && member.role !== 'Owner') {
                <select class="form-select form-select-sm role-select" [value]="roleValue(member.role)" (change)="changeRole(member, $event)">
                  <option value="0">Viewer</option>
                  <option value="1">Developer</option>
                  <option value="2">Security reviewer</option>
                  <option value="3">Admin</option>
                </select>
                <button class="btn btn-sm btn-outline-danger" type="button" (click)="remove(member)">Remove</button>
              } @else {
                <span class="badge text-bg-light">{{ member.role }}</span>
              }
            </div>
          } @empty {
            <p class="text-muted mb-0">No teammates yet. The workspace owner is added when the account is created.</p>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .roles { padding-left: 1.1rem; margin-bottom: 0.8rem; }
    .roles li { margin-bottom: 0.35rem; }
    .member { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 0; border-top: 1px solid var(--pf-border); }
    .role-select { width: 11rem; }
    .token-box { background: var(--pf-card-hover); border-radius: 12px; padding: 0.8rem; }
    code { overflow-wrap: anywhere; }
  `]
})
export class TeamComponent implements OnInit {
  private readonly platform = inject(PlatformService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly members = signal<TeamMember[]>([]);
  readonly inviteLink = signal('');
  readonly busy = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: [1, Validators.required]
  });

  ngOnInit(): void {
    this.reload();
  }

  canAdminister(): boolean {
    return this.platform.canAdminister();
  }

  invite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.platform.invite(value.email.trim(), value.fullName.trim(), Number(value.role)).subscribe({
      next: (response) => {
        this.busy.set(false);
        const token = response.data?.inviteToken ?? '';
        this.inviteLink.set(`${window.location.origin}/auth/invite?token=${encodeURIComponent(token)}`);
        this.toast.success('Invite link ready. Send it to your teammate.');
        this.reload();
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(this.message(error, 'The invite could not be created.'));
      }
    });
  }

  changeRole(member: TeamMember, event: Event): void {
    const role = Number((event.target as HTMLSelectElement).value);
    this.platform.updateRole(member.id, role).subscribe({
      next: () => {
        this.toast.success('Role updated. They should sign in again.');
        this.reload();
      },
      error: (error) => this.toast.error(this.message(error, 'The role could not be changed.'))
    });
  }

  remove(member: TeamMember): void {
    if (!window.confirm(`Remove ${member.email} from this workspace?`)) return;
    this.platform.removeMember(member.id).subscribe({
      next: () => {
        this.toast.success('Member removed.');
        this.reload();
      },
      error: (error) => this.toast.error(this.message(error, 'The member could not be removed.'))
    });
  }

  copy(): void {
    navigator.clipboard.writeText(this.inviteLink()).then(
      () => this.toast.success('Invite link copied.'),
      () => this.toast.warning('Select the link and copy it manually.')
    );
  }

  roleValue(role: string): string {
    return ({ Viewer: '0', Developer: '1', SecurityReviewer: '2', Admin: '3', Owner: '4' } as Record<string, string>)[role] ?? '1';
  }

  private reload(): void {
    this.platform.members().subscribe({
      next: (response) => this.members.set(response.data ?? [])
    });
  }

  private message(error: unknown, fallback: string): string {
    const body = (error as { error?: { message?: string } })?.error;
    return body?.message || fallback;
  }
}
