import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  Output,
  EventEmitter,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface ReportLine {
  text: string;
  status: 'ok' | 'warn' | 'muted';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  /** Emitted when the user wants to start a scan (wire to your upload flow / router). */
  @Output() startScan = new EventEmitter<void>();
  /** Emitted when the user wants to view a sample report. */
  @Output() viewSample = new EventEmitter<void>();

  @ViewChild('revealRoot') revealRoot?: ElementRef<HTMLElement>;

  isNavOpen = false;
  isScrolled = false;
  replayKey = 0; // bump to restart the hero SVG animation

  readonly reportLines: ReportLine[] = [
    { text: '$ prodfalcon scan project.zip', status: 'muted' },
    { text: '1,204 files extracted across 86 folders', status: 'ok' },
    { text: 'Stack detected: Angular 17 · .NET 8 · SQL Server', status: 'ok' },
    { text: '3 files exceed 10MB — review recommended', status: 'warn' },
    { text: 'No exposed secrets or credentials found', status: 'ok' },
    { text: 'Report ready → /reports/project-8841.json', status: 'muted' }
  ];

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const root = this.revealRoot?.nativeElement;
    if (!root || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );

    root.querySelectorAll('[data-reveal]').forEach((el) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 12;
  }

  toggleNav(): void {
    this.isNavOpen = !this.isNavOpen;
  }

  closeNav(): void {
    this.isNavOpen = false;
  }

  replayVisual(): void {
    this.replayKey++;
  }

  onStartScan(): void {
    this.startScan.emit();
  }

  onViewSample(): void {
    this.viewSample.emit();
  }
}