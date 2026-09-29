/* Pogo Hire static table-of-contents enhancement */
(() => {
  const init = () => {
    document.querySelectorAll('nav.pogo-static-toc-nav').forEach((nav) => {
      const links = [...nav.querySelectorAll('a[href^="#"]')];
      if (!links.length) return;
      const items = links.map((link) => ({
        link,
        target: document.getElementById(decodeURIComponent(link.hash.slice(1)))
      })).filter((item) => item.target);
      if (!items.length) return;

      const setActive = (activeLink) => {
        items.forEach(({ link }) => {
          const active = link === activeLink;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      };

      links.forEach((link) => link.addEventListener('click', () => setActive(link)));
      setActive(items[0].link);

      if ('IntersectionObserver' in window) {
        const visible = new Map();
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
          const firstVisible = items.find(({ target }) => visible.get(target));
          if (firstVisible) setActive(firstVisible.link);
        }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
        items.forEach(({ target }) => observer.observe(target));
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* pogo-static-progress: make Elementor progress widgets deterministic in static hosting */
(() => {
  const applyStaticProgress = () => {
    document.querySelectorAll('#browse-opportunities .elementor-progress-bar[data-max]').forEach((bar) => {
      const value = Math.max(0, Math.min(100, Number(bar.dataset.max) || 0));
      bar.style.width = `${value}%`;
      const wrapper = bar.closest('[role="progressbar"]');
      if (wrapper) wrapper.setAttribute('aria-valuenow', String(value));
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyStaticProgress);
  else applyStaticProgress();
})();


/* Legal-page TOC pinning for static Elementor exports.
   Native sticky is unreliable here because the TOC sits inside nested flex wrappers.
   This pins the box while its article row is on screen, then releases it at the row end. */
(() => {
  const DESKTOP_MIN = 768;
  const TOP_GAP = 10;

  const initPinnedToc = () => {
    const items = [...document.querySelectorAll('.pogo-sticky-toc-column')]
      .map((column) => ({
        column,
        box: column.querySelector('.pogo-static-toc-box'),
        row: column.closest('.pogo-legal-content-row')
      }))
      .filter(({ box, row }) => box && row);

    if (!items.length) return;

    const clearPinned = ({ column, box }) => {
      column.style.removeProperty('min-height');
      ['position', 'top', 'left', 'right', 'bottom', 'width', 'max-width', 'max-height',
       'overflow-y', 'z-index', 'transform'].forEach((prop) => box.style.removeProperty(prop));
    };

    let ticking = false;
    const update = () => {
      ticking = false;

      if (window.innerWidth < DESKTOP_MIN) {
        items.forEach(clearPinned);
        return;
      }

      items.forEach((item) => {
        const { column, box, row } = item;
        const rowRect = row.getBoundingClientRect();
        const columnRect = column.getBoundingClientRect();
        const boxHeight = box.getBoundingClientRect().height;

        /* Keep the column's footprint while the child becomes fixed. */
        column.style.setProperty('min-height', `${boxHeight}px`);

        /* Before the article row reaches the pin line, keep normal document flow. */
        if (rowRect.top >= TOP_GAP) {
          clearPinned(item);
          return;
        }

        let top = TOP_GAP;
        /* As the article row ends, slide the TOC upward with the row instead of
           letting it overlap the next section/footer. */
        if (rowRect.bottom < TOP_GAP + boxHeight) {
          top = rowRect.bottom - boxHeight;
        }

        box.style.setProperty('position', 'fixed', 'important');
        box.style.setProperty('top', `${top}px`, 'important');
        box.style.setProperty('left', `${columnRect.left}px`, 'important');
        box.style.setProperty('right', 'auto', 'important');
        box.style.setProperty('bottom', 'auto', 'important');
        box.style.setProperty('width', `${columnRect.width}px`, 'important');
        box.style.setProperty('max-width', `${columnRect.width}px`, 'important');
        box.style.setProperty('max-height', `calc(100vh - ${TOP_GAP + 20}px)`, 'important');
        box.style.setProperty('overflow-y', 'auto', 'important');
        box.style.setProperty('z-index', '30', 'important');
        box.style.setProperty('transform', 'none', 'important');
      });
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('orientationchange', requestUpdate);

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(requestUpdate);
      items.forEach(({ row, box }) => {
        ro.observe(row);
        ro.observe(box);
      });
    }

    requestUpdate();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPinnedToc);
  else initPinnedToc();
})();


/* Pogo Hire static mobile/tablet navigation fallback.
   The exported Elementor nav can fail to initialise outside WordPress, so this
   handles the burger menu directly while preserving Elementor's CSS classes. */
(() => {
  const initStaticNav = () => {
    document.querySelectorAll('.elementor-widget-nav-menu .elementor-menu-toggle').forEach((toggle) => {
      if (toggle.dataset.pogoMenuBound === 'true') return;

      const widget = toggle.closest('.elementor-widget-nav-menu');
      const dropdown = toggle.nextElementSibling && toggle.nextElementSibling.classList.contains('elementor-nav-menu--dropdown')
        ? toggle.nextElementSibling
        : widget?.querySelector('.elementor-menu-toggle + .elementor-nav-menu--dropdown');

      if (!widget || !dropdown) return;
      toggle.dataset.pogoMenuBound = 'true';

      const links = [...dropdown.querySelectorAll('a')];
      const positionedProps = ['position', 'top', 'left', 'right', 'bottom', 'width', 'max-width', 'z-index'];

      const clearPosition = () => {
        positionedProps.forEach((prop) => dropdown.style.removeProperty(prop));
      };

      const positionDropdown = () => {
        if (!toggle.classList.contains('elementor-active') || window.innerWidth > 980) {
          clearPosition();
          return;
        }

        const header = widget.closest('header');
        const anchorRect = (header || toggle).getBoundingClientRect();
        const top = Math.max(0, header ? anchorRect.bottom : toggle.getBoundingClientRect().bottom + 10);
        const availableHeight = Math.max(120, window.innerHeight - top);

        /* Elementor normally stretches this via JS. Static exports lose that
           calculation, so force the dropdown to the viewport width. */
        dropdown.style.setProperty('position', 'fixed', 'important');
        dropdown.style.setProperty('top', `${top}px`, 'important');
        dropdown.style.setProperty('left', '0', 'important');
        dropdown.style.setProperty('right', '0', 'important');
        dropdown.style.setProperty('bottom', 'auto', 'important');
        dropdown.style.setProperty('width', '100vw', 'important');
        dropdown.style.setProperty('max-width', '100vw', 'important');
        dropdown.style.setProperty('z-index', '99999', 'important');
        dropdown.style.setProperty('--menu-height', `${Math.min(dropdown.scrollHeight, availableHeight)}px`);
      };

      const setOpen = (open) => {
        toggle.classList.toggle('elementor-active', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        dropdown.setAttribute('aria-hidden', open ? 'false' : 'true');
        links.forEach((link) => link.setAttribute('tabindex', open ? '0' : '-1'));

        if (open) {
          // Set a real height before/while Elementor's existing CSS transition runs.
          dropdown.style.setProperty('--menu-height', `${Math.max(dropdown.scrollHeight, 1)}px`);
          positionDropdown();
        } else {
          clearPosition();
        }
      };

      // Start from a known closed state regardless of what Elementor left behind.
      setOpen(false);

      const toggleMenu = (event) => {
        event.preventDefault();
        // Stop a partially-initialised Elementor handler from toggling it a second time.
        event.stopImmediatePropagation();
        setOpen(!toggle.classList.contains('elementor-active'));
      };

      toggle.addEventListener('click', toggleMenu, true);
      toggle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') toggleMenu(event);
        if (event.key === 'Escape') setOpen(false);
      }, true);

      links.forEach((link) => link.addEventListener('click', () => setOpen(false)));

      document.addEventListener('click', (event) => {
        if (!widget.contains(event.target) && !dropdown.contains(event.target)) setOpen(false);
      });

      const refreshOpenMenu = () => {
        if (toggle.classList.contains('elementor-active')) positionDropdown();
      };
      window.addEventListener('resize', refreshOpenMenu, { passive: true });
      window.addEventListener('orientationchange', refreshOpenMenu);
      window.addEventListener('scroll', refreshOpenMenu, { passive: true });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStaticNav);
  else initStaticNav();
})();
