import { useState, useRef, useCallback } from 'react';

interface UsePinnedDragOptions {
  slugs: string[];
  onReorder: (slugs: string[]) => void;
}

// Reordering for the dashboard's Pinned grid. Same technique as
// useSectionDrag — pointer events and a floating clone — but the grid is
// two-dimensional, so the dragged card takes the place of whichever card is
// under the pointer rather than landing in a slot between two rows, and the
// drag starts from the card's grip handle instead of its body.
export function usePinnedDrag({ slugs, onReorder }: UsePinnedDragOptions) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [dropSlug, setDropSlug] = useState<string | null>(null);
  const dragSlugRef = useRef<string | null>(null);
  const dropSlugRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const shadowRef = useRef<HTMLElement | null>(null);

  // Containment first, nearest center as the fallback, so the target never
  // blanks out while the pointer crosses a gap between cards.
  const cardUnderPoint = useCallback((x: number, y: number) => {
    if (!gridRef.current) return null;
    const cards = [
      ...gridRef.current.querySelectorAll<HTMLElement>('.topic-card'),
    ].filter((el) => el.dataset.slug !== dragSlugRef.current);

    let nearest: string | null = null;
    let nearestDist = Infinity;
    for (const el of cards) {
      const r = el.getBoundingClientRect();
      const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      if (inside) return el.dataset.slug ?? null;
      const dist =
        (x - (r.left + r.width / 2)) ** 2 + (y - (r.top + r.height / 2)) ** 2;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = el.dataset.slug ?? null;
      }
    }
    return nearest;
  }, []);

  const handlePointerDown = useCallback(
    (slug: string) => (e: React.PointerEvent) => {
      // Mouse only, matching useSectionDrag — a touch drag would fight the
      // page's scroll gesture.
      if (e.pointerType !== 'mouse') return;

      const cardEl = (e.currentTarget as HTMLElement).closest<HTMLElement>(
        '.topic-card',
      );
      if (!cardEl) return;
      e.preventDefault();

      const rect = cardEl.getBoundingClientRect();
      dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const shadow = cardEl.cloneNode(true) as HTMLElement;
      shadow.className = `drag-shadow ${cardEl.className}`;
      shadow.style.width = `${rect.width}px`;
      shadow.style.height = `${rect.height}px`;
      const place = (x: number, y: number) => {
        shadow.style.transform = `translate(${x}px, ${y}px) rotate(-1deg) scale(1.02)`;
      };
      place(rect.left, rect.top);
      document.body.appendChild(shadow);
      shadowRef.current = shadow;

      dragSlugRef.current = slug;
      dropSlugRef.current = null;
      setDragSlug(slug);
      setDropSlug(null);

      const onPointerMove = (ev: PointerEvent) => {
        const { x, y } = dragOffsetRef.current;
        place(ev.clientX - x, ev.clientY - y);
        const over = cardUnderPoint(ev.clientX, ev.clientY);
        if (over !== dropSlugRef.current) {
          dropSlugRef.current = over;
          setDropSlug(over);
        }
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        const finalSlug = dragSlugRef.current;
        const overSlug = dropSlugRef.current;

        // The handle sits inside the card's link, and preventDefault on
        // pointerdown does not stop the click that follows pointerup — so a
        // drop would navigate. Swallow that one click; the timeout clears the
        // listener when the gesture ended somewhere that never produces one.
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

        if (finalSlug != null && overSlug != null) {
          // Dropped onto a card ahead of the dragged one, it lands after that
          // card; behind, before it. Inserting before either way would make
          // the last slot unreachable and a drop on the next card a no-op.
          const forward = slugs.indexOf(overSlug) > slugs.indexOf(finalSlug);
          const next = slugs.filter((s) => s !== finalSlug);
          const targetIdx = next.indexOf(overSlug);
          next.splice(forward ? targetIdx + 1 : targetIdx, 0, finalSlug);
          if (next.some((s, i) => s !== slugs[i])) onReorder(next);
        }

        shadowRef.current?.remove();
        shadowRef.current = null;
        dragSlugRef.current = null;
        dropSlugRef.current = null;
        setDragSlug(null);
        setDropSlug(null);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    },
    [slugs, cardUnderPoint, onReorder],
  );

  return { gridRef, dragSlug, dropSlug, handlePointerDown };
}
