import {
  Component,
  AfterViewInit,
  Input,
  ViewChild,
  ElementRef,
  OnChanges,
  OnDestroy
} from '@angular/core';
import { fromEvent, Subject, Subscription, combineLatest } from 'rxjs';
import {
  tap,
  pluck,
  map,
  delay,
  filter,
  takeUntil,
  throttleTime
} from 'rxjs/operators';
import { BrowserWindowRef } from '../services/windowref.service';
import * as polyfills from '../polyfills/path';

@Component({
  selector: 'ngx-cursor',
  template: `
    <div id="ngx-cursor" #ngxCursor>
      <span #ngxCursorEl></span>
    </div>
  `,
  styleUrls: ['./ngx-cursor.component.scss']
})
export class NgxCursorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cursor = true;
  @Input() color = '#000';
  @Input() txtcolor = '#FFF';
  @Input() size = '30px';
  @Input() opacity = 0.4;
  @Input() delay = 50;
  @Input() zindex = 999;
  @Input() words: string[] = [];
  @Input() selectors: string[] = [];
  @Input() chekNParents = 4;

  @ViewChild('ngxCursor') ngxCursor: ElementRef;
  @ViewChild('ngxCursorEl') ngxCursorEl: ElementRef;

  public merge$: Subscription;
  private componentDestroy$ = new Subject<boolean>();

  public firstColor: string;
  public cursorType = [
    'cursor-active',
    'cursor-color',
    'cursor-opacity',
    'href',
    'routerlink'
  ];

  constructor(private wr: BrowserWindowRef) {}

  ngOnChanges() {
    this.setStyles();
  }

  ngAfterViewInit() {
    if (this.wr.nativeWindow) {
      this.init();
      const mousemove$ = fromEvent(this.wr.nativeWindow, 'mousemove');

      const deplaceCursor$ = mousemove$.pipe(
        delay(this.delay),
        tap((e: MouseEvent) => {
          this.deplaceCursor(e.clientX, e.clientY);
        })
      );

      const getElementsFamilly$ = mousemove$.pipe(
        throttleTime(70),
        pluck('path'),
        filter((familly: HTMLElement[]) => familly && familly.length > 0),
        map((familly: HTMLElement[]) => familly.slice(0, this.chekNParents))
      );

      const getElementsAttrs$ = getElementsFamilly$.pipe(
        map((data: HTMLElement[]) =>
          data.map((item: HTMLElement) => {
            if (item.attributes) {
              return Object.values(item.attributes).filter((attr: any) => {
                const isStandard = this.cursorType.indexOf(attr.name) !== -1;
                const isCustom = this.customType().indexOf(attr.name) !== -1;
                return isStandard || isCustom;
              });
            }
          })
        )
      );

      const applyStylesFromAttr$ = getElementsAttrs$.pipe(
        tap(_ => this.removeClass()),
        map((data: any) => data.flat()),
        filter((arrayAttr: any[]) => arrayAttr.length > 0),
        tap((arrayAttr: any[]) => {
          arrayAttr.map(item => {
            if (item) {
              this.HoverInElement(item, this.customType().indexOf(item.name));
            }
          });
        })
      );

      this.merge$ = combineLatest(
        deplaceCursor$,
        getElementsAttrs$,
        applyStylesFromAttr$
      )
        .pipe(takeUntil(this.componentDestroy$))
        .subscribe();
    }
  }

  private init(): void {
    polyfills.path();
    this.firstColor = this.color;
  }

  private HoverInElement(item: any, i: number): void {
    if (
      item.name === 'href' ||
      item.name === 'routerlink' ||
      item.name === 'cursor-active'
    ) {
      this.addClass('active');
    } else if (item.name === 'cursor-color') {
      this.color = item.value;
      this.setStyles();
    } else {
      this.addClass('active');
      this.customTxtStyles(this.words[i]);
    }
  }

  private addClass(className: string): void {
    this.ngxCursor.nativeElement.classList.add(className);
  }

  private removeClass(): void {
    this.color = this.firstColor;
    this.ngxCursor.nativeElement.classList.remove('active');
    this.ngxCursorEl.nativeElement.innerHTML = '';
    this.setStyles();
  }

  private deplaceCursor(x: number, y: number): void {
    this.ngxCursor.nativeElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  private setStyles(): void {
    if (this.wr.nativeWindow) {
      this.wr.nativeWindow.document.body.style.setProperty(
        '--ngx-cursor-color',
        this.color
      );
      this.wr.nativeWindow.document.body.style.setProperty(
        '--ngx-cursor-opacity',
        `${this.opacity}`
      );
      this.wr.nativeWindow.document.body.style.setProperty(
        '--ngx-cursor-size',
        this.size
      );
      this.wr.nativeWindow.document.body.style.setProperty(
        '--ngx-cursor-zindex',
        `${this.zindex}`
      );
      this.wr.nativeWindow.document.body.style.setProperty(
        '--ngx-cursor-txtcolor',
        `${this.txtcolor}`
      );
    }
    this.isCursor(this.cursor);
  }

  private customType(): string[] {
    return this.selectors.map(selector => `cursor-${selector}`);
  }

  private isCursor(iscursor: boolean): void {
    if (this.wr.nativeWindow) {
      if (iscursor) {
        this.wr.nativeWindow.document.body.style.setProperty(
          '--ngx-cursor',
          'auto'
        );
      } else {
        this.wr.nativeWindow.document.body.style.setProperty(
          '--ngx-cursor',
          'none'
        );
      }
    }
  }

  private customTxtStyles(word: string): void {
    if (this.wr.nativeWindow) {
      if (word) {
        this.ngxCursorEl.nativeElement.innerHTML = word;
      }
      this.wr.nativeWindow.document.body.style.setProperty(
        '--ngx-cursor-opacity',
        `0.9`
      );
      this.wr.nativeWindow.document.body.style.setProperty(
        '--ngx-cursor',
        'none'
      );
    }
  }

  ngOnDestroy() {
    this.componentDestroy$.next();
    this.componentDestroy$.complete();
    this.isCursor(true);
  }
}
