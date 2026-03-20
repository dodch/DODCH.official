/* --- Silk Therapy Mask Interactive Logic --- */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Hair Type Selector Logic
    const typeButtons = document.querySelectorAll('.hair-type-btn');
    const typePanels = document.querySelectorAll('.hair-panel');

    if (typeButtons.length > 0 && typePanels.length > 0) {
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetType = btn.getAttribute('data-type');

                // Update active button
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update active panel
                typePanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `panel-${targetType}`) {
                        panel.classList.add('active');
                    }
                });
            });
        });
    }

    // 2. Buy Now Buttons (Integrate with the global cart from script.js)
    // The script.js handles clicks on elements with specific IDs or logic.
    // We add a custom listener for the silk-mask specific buy buttons if they aren't handled globally.
    const buyButtons = document.querySelectorAll('.buy-now-btn');
    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            // Dispatch a custom event that script.js can listen to, or call a global function if available
            // In script.js, the 'Add to cart' logic is often bound to .cta-button or specific classes.
            // Let's trigger the click on the global cart logic if we can identify how it's bound.
            // Usually, script.js listens for 'Add to Cart' text or specific IDs.

            // If window.addToCart exists (defined in script.js), we can call it.
            if (typeof window.addToCart === 'function') {
                window.addToCart(productId);
            } else {
                // Fallback: If script.js doesn't expose it, we might need to simulate the detail page behavior
                // but since this is a custom product page, we'll ensure script.js is compatible.
                console.log(`Adding ${productId} to cart via silk-mask.js`);
            }
        });
    });

    // 3. Scroll Reveal for custom sections if they aren't marked with .reveal
    // Actually, we've already added .reveal to most sections in the HTML.
    // script.js handles .reveal elements using IntersectionObserver.

    // 4. Hero CTA Smooth Scroll
    const heroBtn = document.querySelector('.hero-mask .cta-button');
    if (heroBtn) {
        heroBtn.addEventListener('click', (e) => {
            const targetId = heroBtn.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    window.scrollTo({
                        top: targetEl.offsetTop - 100, // Adjust for navbar height
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    // 5. Mobile Scroll Hint for Hair Type Tabs
    const tabsContainer = document.querySelector('.hair-type-tabs');
    const tabsGrid = document.querySelector('.hair-type-grid');

    if (tabsContainer && tabsGrid) {
        // Ensure parent is relative for absolute positioning of arrow
        tabsGrid.style.position = 'relative';

        // Create Right Arrow
        const arrowRight = document.createElement('div');
        arrowRight.className = 'scroll-hint-arrow right';
        arrowRight.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;
        
        // Create Left Arrow
        const arrowLeft = document.createElement('div');
        arrowLeft.className = 'scroll-hint-arrow left';
        arrowLeft.style.opacity = '0'; // Hidden initially
        arrowLeft.style.pointerEvents = 'none';
        arrowLeft.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;

        tabsGrid.appendChild(arrowRight);
        tabsGrid.appendChild(arrowLeft);

        // Click Handlers
        arrowRight.addEventListener('click', () => {
            tabsContainer.scrollBy({ left: 150, behavior: 'smooth' });
        });

        arrowLeft.addEventListener('click', () => {
            tabsContainer.scrollBy({ left: -150, behavior: 'smooth' });
        });

        // Scroll Handler to toggle visibility
        const updateArrows = () => {
            const scrollLeft = tabsContainer.scrollLeft;
            const maxScroll = tabsContainer.scrollWidth - tabsContainer.clientWidth;
            const tolerance = 5;

            // Left Arrow Visibility
            if (scrollLeft > tolerance) {
                arrowLeft.style.opacity = '1';
                arrowLeft.style.pointerEvents = 'auto';
            } else {
                arrowLeft.style.opacity = '0';
                arrowLeft.style.pointerEvents = 'none';
            }

            // Right Arrow Visibility
            if (scrollLeft < maxScroll - tolerance) {
                arrowRight.style.opacity = '1';
                arrowRight.style.pointerEvents = 'auto';
            } else {
                arrowRight.style.opacity = '0';
                arrowRight.style.pointerEvents = 'none';
            }
        };

        tabsContainer.addEventListener('scroll', updateArrows);
        
        // Initial check
        setTimeout(updateArrows, 100);
        window.addEventListener('resize', updateArrows);
    }
});
