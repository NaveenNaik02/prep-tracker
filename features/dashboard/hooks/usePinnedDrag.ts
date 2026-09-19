import { useState, useRef, useCallback } from 'react';

const DRAG_THRESHOLD = 6;

interface Indicator {
  left: number;
  top: number;
  height: number;
}

interface UsePinnedDragOptions {
  slugs: string[];
  onReorder: (slugs: string[]) => void;
}

// Reordering for the dashboard's Pinned grid. Same technique as
// useSectionDrag — pointer events, a movement threshold, a floating clone —
// but the grid is two-dimensional, so the drop slot comes from the nearest
// card center rather than a single Y midpoint, and the indicator is a
// vertical rule between columns.
export function usePinnedDrag({ slugs, onReorder }: UsePinnedDragOptions) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const dragSlugRef = useRef<string | null>(null);
  const activeSlotRef = useRef<number | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const shadowRef = useRef<HTMLElement | null>(null);

  const otherCardEls = useCallback(() => {
    if (!gridRef.current) return [] as HTMLElement[];
    return [
      ...gridRef.current.querySelectorAll<HTMLElement>('.topic-card'),
    ].filter((el) => el.dataset.slug !== dragSlugRef.current);
  }, []);

  // Cards sit in a grid, so "before card i" means the pointer is up-and-left
  // of its center. Comparing row first keeps a drag along one row from
  // jumping to the row above.
  const slotForPoint = useCallback(
    (x: number, y: number) => {
      const cards = otherCardEls();
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        const above = y < r.top + r.height / 2;
        const sameRow = y >= r.top && y <= r.bottom;
        if (above || (sameRow && x < r.left + r.width / 2)) return i;
      }
      return cards.length;
    },
    [otherCardEls],
  );

  const updateIndicator = useCallback(
    (slot: number) => {
      const grid = gridRef.current;
      const cards = otherCardEls();
      if (!grid || cards.length === 0) return setIndicator(null);

      const gridRect = grid.getBoundingClientRect();
      const edgeCard = cards[Math.min(slot, cards.length - 1)];
      const r = edgeCard.getBoundingClientRect();
      const trailing = slot >= cards.length;

      setIndicator({
        left: (trailing ? r.right : r.left) - gridRect.left,
        top: r.top - gridRect.top,
        height: r.height,
      });
    },
    [otherCardEls],
  );

  const handlePointerDown = useCallback(
    (slug: string) => (e: React.PointerEvent) => {
      // Mouse only, matching useSectionDrag — a touch drag would fight the
      // page's scroll gesture.
      if (e.pointerType !== 'mouse') return;
      // The pin toggle and the card's link keep their own click behaviour.
      if ((e.target as HTMLElement).closest('.tc-pin')) return;

      const cardEl = (e.currentTarget as HTMLElement).closest<HTMLElement>(
        '.topic-card',
      );
      if (!cardEl) return;
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      let shadow: HTMLElement | null = null;
      let engaged = false;

      const engage = () => {
        engaged = true;
        const rect = cardEl.getBoundingClientRect();
        dragOffsetRef.current = { x: startX - rect.left, y: startY - rect.top };

        shadow = cardEl.cloneNode(true) as HTMLElement;
        shadow.className = `drag-shadow ${cardEl.className}`;
        shadow.style.width = `${rect.width}px`;
        shadow.style.height = `${rect.height}px`;
        shadow.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
        document.body.appendChild(shadow);
        shadowRef.current = shadow;

        dragSlugRef.current = slug;
        activeSlotRef.current = slugs.indexOf(slug);
        setDragSlug(slug);
        updateIndicator(activeSlotRef.current);
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (!engaged) {
          const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY);
          if (moved < DRAG_THRESHOLD) return;
          engage();
        }
        const { x, y } = dragOffsetRef.current;
        shadow!.style.transform = `translate(${ev.clientX - x}px, ${ev.clientY - y}px)`;
        const slot = slotForPoint(ev.clientX, ev.clientY);
        if (slot !== activeSlotRef.current) {
          activeSlotRef.current = slot;
          updateIndicator(slot);
        }
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        const finalSlug = dragSlugRef.current;
        const finalSlot = activeSlotRef.current;

        // The whole card is a link, and preventDefault on pointerdown does not
        // stop the click that follows pointerup — so a drop would navigate.
        // Swallow that one click; the timeout clears the listener when the
        // drag ended somewhere that never produces one.
        if (engaged) {
          const swallowClick = (ce: Event) => {
            ce.preventDefault();
            ce.stopPropagation();
          };
          document.addEventListener('click', swallowClick, {
            capture: true,
            once: true,
          });
          setTimeout(
            () => document.removeEventListener('click', swallowClick, true),
            0,
          );
        }

        if (engaged && finalSlug != null && finalSlot != null) {
          const next = slugs.filter((s) => s !== finalSlug);
          next.splice(finalSlot, 0, finalSlug);
          if (next.some((s, i) => s !== slugs[i])) onReorder(next);
        }
        shadowRef.current?.remove();
        shadowRef.current = null;
        dragSlugRef.current = null;
        activeSlotRef.current = null;
        setDragSlug(null);
        setIndicator(null);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    },
    [slugs, slotForPoint, updateIndicator, onReorder],
  );

  return { gridRef, dragSlug, indicator, handlePointerDown };
}
