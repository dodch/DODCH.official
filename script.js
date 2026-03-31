import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp, updateDoc, limit, orderBy, startAfter, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";


const ADMIN_UID = '4JAqYb2fnEhpqaBv7xWwsFDUXun2';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);



// Initialize App Check
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Lf90p8sAAAAACNMF--viq1OaJ8dmrrik05kJubx'),
    isTokenAutoRefreshEnabled: true
});

// Verify App Check Connection & Log Status
getToken(appCheck)
    .then((token) => {
        console.log("🛡️ App Check: Highly Secure Connection Established");
        console.log("App Check Token Status: Valid & Exchangeable");
    })
    .catch((err) => {
        console.warn("⚠️ App Check: Token Exchange Failed. Verification Required.", err);
    });

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
const provider = new GoogleAuthProvider();

// Global Catalog Reference
let productCatalog = {};

// Global utility for XSS Prevention
const escapeHTML = (str) => {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
};

document.addEventListener('DOMContentLoaded', () => {
    const initialHash = window.location.hash;

    // --- Custom UI Helpers (Toast & Confirm) ---
    let _lastToastMsg = '';
    let _lastToastTime = 0;
    window.showToast = (message, type = 'info', duration = 3500) => {
        // Deduplication guard: suppress identical messages within 600ms
        const now = Date.now();
        if (message === _lastToastMsg && now - _lastToastTime < 600) return;
        _lastToastMsg = message;
        _lastToastTime = now;

        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;

        let icon = '';
        if (type === 'success') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        else if (type === 'error') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        else icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

        toast.innerHTML = `${icon} <span>${message}</span>`;

        // Get or create the shared toast container
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        // FLIP: (F)irst — snapshot positions of existing toasts before DOM change
        const existingToasts = [...container.querySelectorAll('.custom-toast')];
        const firstRects = existingToasts.map(t => t.getBoundingClientRect());

        // (L)ast — insert new toast at top (DOM changes, existing toasts jump)
        container.prepend(toast);

        // (I)nvert — read new positions of existing toasts, apply inverse offset
        // so they appear to still be where they were visually
        existingToasts.forEach((t, i) => {
            const lastRect = t.getBoundingClientRect();
            const dy = firstRects[i].top - lastRect.top;
            if (dy !== 0) {
                // Instantly snap back visually (no transition)
                t.style.transition = 'none';
                t.style.transform = `translateX(0) translateY(${dy}px)`;
            }
        });

        // (P)lay — on next frame, animate everything to its natural position
        requestAnimationFrame(() => {
            existingToasts.forEach(t => {
                t.style.transition = '';
                t.style.transform = 'translateX(0) translateY(0)';
            });

            // Slide new toast in from the right
            setTimeout(() => toast.classList.add('active'), 10);
        });

        // Helper: remove a toast with context-aware exit animation + FLIP collapse
        const removeToast = (t) => {
            const container = document.getElementById('toast-container');
            if (!container || !t.parentNode) return;

            const allToasts = [...container.querySelectorAll('.custom-toast')];
            const isTop = allToasts[0] === t;

            // Snapshot positions of all OTHER toasts before removing
            const others = allToasts.filter(x => x !== t);
            const beforeRects = others.map(x => x.getBoundingClientRect());

            if (isTop) {
                // Slide out to the right
                t.classList.remove('active');
                setTimeout(() => {
                    if (t.parentNode) t.remove();
                    // FLIP: slide remaining toasts up
                    const afterRects = others.map(x => x.getBoundingClientRect());
                    others.forEach((x, i) => {
                        const dy = beforeRects[i].top - afterRects[i].top;
                        if (dy !== 0) {
                            x.style.transition = 'none';
                            x.style.transform = `translateX(0) translateY(${dy}px)`;
                            requestAnimationFrame(() => {
                                x.style.transition = '';
                                x.style.transform = 'translateX(0) translateY(0)';
                            });
                        }
                    });
                }, 450);
            } else {
                // Blur + fade + scale down for older toasts
                t.classList.add('toast-exit-blur');
                setTimeout(() => {
                    if (t.parentNode) t.remove();
                    // FLIP: slide remaining toasts up
                    const afterRects = others.map(x => x.getBoundingClientRect());
                    others.forEach((x, i) => {
                        const dy = beforeRects[i].top - afterRects[i].top;
                        if (dy !== 0) {
                            x.style.transition = 'none';
                            x.style.transform = `translateX(0) translateY(${dy}px)`;
                            requestAnimationFrame(() => {
                                x.style.transition = '';
                                x.style.transform = 'translateX(0) translateY(0)';
                            });
                        }
                    });
                }, 550);
            }
        };

        // Schedule removal
        setTimeout(() => removeToast(toast), duration);
    };



    window.showConfirm = (message, title = "Confirm Action") => {
        return new Promise((resolve) => {
            document.body.style.overflow = 'hidden'; // Lock scroll
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-box">
                    <h3 class="confirm-title">${title}</h3>
                    <p class="confirm-message">${message}</p>
                    <div class="confirm-actions">
                        <button class="confirm-btn cancel">Cancel</button>
                        <button class="confirm-btn confirm">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Trigger animation
            setTimeout(() => overlay.classList.add('active'), 10);

            const close = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
                // Only restore scroll if no other modals are active
                if (!document.querySelector('#cart-drawer.active, #desktop-sidebar.active, #qv-modal.active, #contact-popup.active')) {
                    document.body.style.overflow = '';
                }
                resolve(result);
            };

            overlay.querySelector('.confirm-btn.confirm').addEventListener('click', () => close(true));
            overlay.querySelector('.confirm-btn.cancel').addEventListener('click', () => close(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });
        });
    };

    // Override native alert for consistency (optional, but good for catching stray alerts)
    // window.alert = (msg) => window.showToast(msg);



    // 0. Force Page to Top on Load & Clear Hash
    // This prevents the browser from jumping to #story on reload
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // Temporarily disable smooth scroll to ensure instant jump to top
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    if (window.location.hash) {
        history.replaceState(null, null, window.location.pathname);
    }
    setTimeout(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
    }, 50);

    // 1. Sticky Navbar Effect
    const navbar = document.getElementById('navbar');
    const hero = document.getElementById('hero') || document.querySelector('.foam-hero') || document.getElementById('hero-silk') || document.querySelector('.pro-v-hero');
    const heroOverlay = document.querySelector('.hero-overlay');
    const heroBgParallax = document.querySelector('.hero-bg-parallax');
    const experienceImageContainers = document.querySelectorAll('.experience-image');
    const promiseIcons = document.querySelectorAll('.promise-icon');
    const progressBar = document.getElementById('scroll-progress');
    const stickyCTA = document.getElementById('sticky-cta');
    const footer = document.querySelector('footer');
    const staticCTA = document.querySelector('#purchase .add-to-cart-btn') ||
        document.querySelector('#purchase-cta .buy-now-btn') ||
        document.querySelector('.product-info .add-to-cart-btn');

    const updateNavbar = () => {
        const scrollY = window.scrollY;
        const isSerumPage = document.body.classList.contains('serum-page');
        const serumHero = document.querySelector('.scrollytelling-container');

        if (isSerumPage && serumHero) {
            // Serum Page: Stay transparent until past the animation container
            // We expand near the end of the scrollytelling sequence
            const threshold = serumHero.offsetHeight - 80;
            if (scrollY > threshold) {
                navbar.classList.add('scrolled');
                navbar.classList.remove('text-dark');
            } else {
                navbar.classList.remove('scrolled');
                navbar.classList.remove('text-dark');
            }
        } else if (hero) {
            // Home Page: Transparent/White at top, Solid/Dark when scrolled
            if (scrollY > 50) {
                navbar.classList.add('scrolled');
                navbar.classList.remove('text-dark');
            } else {
                navbar.classList.remove('scrolled');
                navbar.classList.remove('text-dark');
            }
        } else {
            // Other Pages: Transparent/Dark at top, Solid/Dark when scrolled
            if (scrollY > 50) {
                navbar.classList.add('scrolled');
                navbar.classList.remove('text-dark');
            } else {
                navbar.classList.remove('scrolled');
                navbar.classList.add('text-dark');
            }
        }
    };

    // 2. Scroll Reveal Animation
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Stop observing once revealed to save resources
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        updateNavbar();

        // Hero Fade to Black & Blur Logic
        if (hero && heroOverlay) {
            const heroHeight = hero.offsetHeight;
            // Calculate ratio: 0 at top, 1 when scrolled 80% down the hero
            let ratio = scrollY / (heroHeight * 0.8);
            if (ratio > 1) ratio = 1;

            heroOverlay.style.opacity = ratio;
            heroOverlay.style.backdropFilter = `blur(${ratio * 10}px)`;
            heroOverlay.style.webkitBackdropFilter = `blur(${ratio * 10}px)`; // Safari support
        }

        // Sticky CTA Logic
        if (stickyCTA && hero) {
            const footerRect = footer ? footer.getBoundingClientRect() : null;
            const isFooterVisible = footerRect ? footerRect.top < window.innerHeight : false;

            let isStaticBtnVisible = false;
            if (staticCTA) {
                const btnRect = staticCTA.getBoundingClientRect();
                // Check if static button is in viewport (or about to be)
                isStaticBtnVisible = btnRect.top < window.innerHeight && btnRect.bottom > 0;
            }

            if (scrollY > hero.offsetHeight && !isFooterVisible && !isStaticBtnVisible) {
                stickyCTA.classList.add('visible');
            } else {
                stickyCTA.classList.remove('visible');
            }
        }

        // Parallax Effect
        if (heroBgParallax && scrollY < hero.offsetHeight) {
            heroBgParallax.style.transform = `translateY(${scrollY * 0.4}px)`;
        }

        // Experience Section Image Parallax
        if (experienceImageContainers.length > 0) {
            experienceImageContainers.forEach(container => {
                const rect = container.getBoundingClientRect();
                const windowHeight = window.innerHeight;

                // Check if the container is in the viewport
                if (rect.top < windowHeight && rect.bottom > 0) {
                    // Calculate the center of the element relative to the viewport top
                    const elementCenter = rect.top + rect.height / 2;

                    // Calculate the difference between the screen center and the element center
                    const difference = (windowHeight / 2) - elementCenter;

                    // Define a factor to control the parallax speed. A smaller number is a more subtle effect.
                    const parallaxFactor = 0.1;

                    // Apply the transform to the container, moving it vertically
                    container.style.transform = `translateY(${difference * parallaxFactor}px)`;
                }
            });
        }

        // Clean Promise Icons Parallax
        if (promiseIcons.length > 0) {
            promiseIcons.forEach(icon => {
                const rect = icon.getBoundingClientRect();
                const windowHeight = window.innerHeight;

                // Check if the icon is in the viewport
                if (rect.top < windowHeight && rect.bottom > 0) {
                    // Calculate the center of the element relative to the viewport top
                    const elementCenter = rect.top + rect.height / 2;
                    const difference = (windowHeight / 2) - elementCenter;

                    // A very subtle factor for the icons. Negative moves it against scroll direction.
                    const parallaxFactor = -0.08;

                    // Apply the transform to the icon
                    icon.style.transform = `translateY(${difference * parallaxFactor}px)`;
                }
            });
        }

        // Scroll Progress Bar Logic
        if (progressBar) {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollY / docHeight) * 100;
            progressBar.style.width = `${scrollPercent}%`;
        }

        // Call other scroll-based functions
        runCounterAnimation();
    });

    // Trigger once on load to show hero content immediately
    updateNavbar();

    // Initialize observer on existing elements
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // 3. Mobile Sidebar Toggle
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.getElementById('desktop-sidebar');

    // Add class to body if sidebar exists (for desktop layout spacing)
    if (sidebar) {
        document.body.classList.add('has-sidebar');
    }

    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');

    const closeSidebar = () => {
        document.body.style.overflow = ''; // Restore scroll
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        if (navbar) navbar.classList.remove('menu-open');
    };

    const openSidebar = () => {
        document.body.style.overflow = 'hidden'; // Lock scroll
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        if (hamburger) hamburger.classList.add('active');
        if (navbar) navbar.classList.add('menu-open');

        // Scroll active item into view
        setTimeout(() => {
            const activeLink = sidebar.querySelector('.sidebar-menu a.active');
            if (activeLink) {
                activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    };

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            if (sidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
        if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

        // Close when clicking a link in sidebar
        const links = sidebar.querySelectorAll('a');
        links.forEach(link => link.addEventListener('click', closeSidebar));
    }

    // 4. Testimonial Slider
    const sliderContainer = document.querySelector('.testimonial-slider-container');
    if (sliderContainer) {
        const sliderWrapper = document.querySelector('.testimonial-slider-wrapper');
        const slides = document.querySelectorAll('.testimonial-slide');
        const prevButton = document.querySelector('.slider-nav.prev');
        const nextButton = document.querySelector('.slider-nav.next');
        const paginationContainer = document.querySelector('.slider-pagination');

        let currentIndex = 0;
        const totalSlides = slides.length;
        let autoPlayInterval; // To hold the interval ID
        let isHovering = false; // Track hover state
        let paginationDots = [];

        function createPaginationDots() {
            if (!paginationContainer) return;
            for (let i = 0; i < totalSlides; i++) {
                const dot = document.createElement('div');
                dot.classList.add('pagination-dot');
                dot.addEventListener('click', () => {
                    currentIndex = i;
                    updateSliderPosition();
                    startAutoPlay();
                });
                paginationContainer.appendChild(dot);
                paginationDots.push(dot);
            }
        }

        function updatePagination() {
            paginationDots.forEach((dot, index) => {
                // Remove 'active' from all dots to reset their animation state
                dot.classList.remove('active');
            });

            const activeDot = paginationDots[currentIndex];
            if (activeDot) {
                // Forcing a reflow is a trick to ensure the CSS animation restarts
                void activeDot.offsetWidth;
                activeDot.classList.add('active');
            }
        }

        function updateSliderPosition() {
            sliderWrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
            // Update active class on slides for text fade effect
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === currentIndex);
            });
            if (paginationContainer) updatePagination();
        }

        function goToNextSlide() {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateSliderPosition();
        }

        function goToPrevSlide() {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSliderPosition();
        }

        function startAutoPlay() {
            clearInterval(autoPlayInterval);
            if (!isHovering) {
                autoPlayInterval = setInterval(goToNextSlide, 5000); // 5 seconds
            }
        }

        nextButton.addEventListener('click', () => {
            goToNextSlide();
            startAutoPlay();
        });

        prevButton.addEventListener('click', () => {
            goToPrevSlide();
            startAutoPlay();
        });

        // Pause on hover, resume on leave
        sliderContainer.addEventListener('mouseenter', () => {
            isHovering = true;
            clearInterval(autoPlayInterval);
        });
        sliderContainer.addEventListener('mouseleave', () => {
            isHovering = false;
            startAutoPlay();
        });

        // Swipe Gestures for Mobile
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        const swipeThreshold = 50; // Min distance for a swipe
        let isSwipeGesture = false; // Flag to track if the current touch is a swipe

        sliderContainer.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            isSwipeGesture = false; // Reset for each new touch
        }, { passive: true });

        sliderContainer.addEventListener('touchmove', e => {
            if (isSwipeGesture) return; // Already determined to be a swipe

            const touchCurrentX = e.changedTouches[0].screenX;
            const touchCurrentY = e.changedTouches[0].screenY;
            const deltaX = Math.abs(touchCurrentX - touchStartX);
            const deltaY = Math.abs(touchCurrentY - touchStartY);

            // Only if horizontal movement is dominant, we consider it a swipe
            // and pause the autoplay. A small tolerance prevents firing on tiny movements.
            if (deltaX > deltaY && deltaX > 10) {
                isSwipeGesture = true;
                clearInterval(autoPlayInterval); // It's a swipe, so pause autoplay
            }
        }, { passive: true });

        sliderContainer.addEventListener('touchend', e => {
            // If it wasn't a swipe (e.g., a simple tap or vertical scroll), do nothing.
            if (!isSwipeGesture) {
                // The autoplay was never paused.
                return;
            }

            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;

            if (Math.abs(swipeDistance) > swipeThreshold) {
                if (swipeDistance > 0) { goToPrevSlide(); } else { goToNextSlide(); }
            }
            // Whether a slide changed or not, the gesture is over.
            isHovering = false;
            startAutoPlay(); // Restart autoplay after swipe gesture ends
        });

        // Initialize
        createPaginationDots();
        updateSliderPosition(); // To set initial slide and active dot
        startAutoPlay();
    }

    // 5. Mobile Tap-to-Hover Fallback
    const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (isTouchDevice()) {
        const tappableElements = document.querySelectorAll('.action-card, .promise-item, .pillar-card, .inci-list span');

        tappableElements.forEach(el => {
            el.addEventListener('click', function (e) {
                // For tooltips, prevent any strange click behavior
                if (el.matches('.inci-list span')) {
                    e.preventDefault();
                }

                const isAlreadyActive = this.classList.contains('mobile-hover');

                // Remove active class from all other tappable elements
                tappableElements.forEach(otherEl => {
                    if (otherEl !== this) {
                        otherEl.classList.remove('mobile-hover');
                    }
                });

                // Toggle the class on the clicked element
                this.classList.toggle('mobile-hover');

                // Stop the event from bubbling up to the document handler
                e.stopPropagation();
            });
        });

        // Add a listener to the document to close any active elements when tapping outside
        document.addEventListener('click', function (e) {
            tappableElements.forEach(el => {
                el.classList.remove('mobile-hover');
            });
        });
    }

    // 6. Number Counter Animation
    const counters = document.querySelectorAll('.counter');

    const runCounterAnimation = () => {
        counters.forEach(counter => {
            const rect = counter.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Trigger when the element is visible
            if (rect.top < windowHeight - 50 && rect.bottom > 0) {
                if (counter.classList.contains('counted')) return;

                counter.classList.add('counted');

                const target = +counter.getAttribute('data-target');
                const duration = 3500; // 3.5 seconds for a gentler effect
                const startTime = performance.now();

                const step = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    // Ease out expo - much softer landing
                    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

                    const current = Math.floor(ease * target);
                    counter.innerText = current.toLocaleString('en-US');

                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        counter.innerText = target.toLocaleString('en-US');
                        // Add shine class to trigger animation after counting
                        counter.classList.add('shine');
                    }
                };

                requestAnimationFrame(step);
            }
        });
    };

    runCounterAnimation(); // Initial check on load

    // 7. Dynamic Title (Tab Switch)
    let docTitle = document.title;
    window.addEventListener('blur', () => {
        document.title = "Come back to radiance... ✨";
    });
    window.addEventListener('focus', () => {
        document.title = docTitle;
    });

    // 9. Magnetic Button Effect
    const heroCTA = document.querySelector('#hero .cta-button');
    const heroSection = document.getElementById('hero');

    if (heroCTA && heroSection && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const magnetism = 0.4; // How strong the pull is (0 to 1)
        const distanceThreshold = 120; // Radius in pixels to activate effect

        heroSection.addEventListener('mousemove', (e) => {
            const rect = heroCTA.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;

            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance < distanceThreshold) {
                // Move the button towards the cursor
                const moveX = deltaX * magnetism;
                const moveY = deltaY * magnetism;
                heroCTA.style.transform = `translate(${moveX}px, ${moveY}px)`;
            } else {
                heroCTA.style.transform = 'translate(0, 0)';
            }
        });

        heroSection.addEventListener('mouseleave', () => {
            heroCTA.style.transform = 'translate(0, 0)';
        });
    }

    // 10. Button Click Sound (Subtle Glass Tap)
    if (heroCTA) {
        heroCTA.addEventListener('click', () => {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Sound profile: Softer, more tactile "tap"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);

            // Clean up AudioContext to prevent resource leaks (browsers limit active contexts)
            setTimeout(() => {
                ctx.close();
            }, 200);
        });
    }

    // --- PRODUCT CATALOG (Single Source of Truth) ---
    const defaultProductCatalog = {

        'glass-glow-shampoo': {
            name: "Glass Glow Shampoo",
            category: "hair-care",
            subCategory: "shampoo",
            subtitle: "The Elixir of 10,000 Seeds",
            price: "24.00",
            image: "/IMG_3357.jpg",
            description: "A high-performance treatment formulated around the rarest, most expensive cosmetic oil on the planet: Pure Cold-Pressed Prickly Pear Seed Oil. Experience the 'Solar-Floral' journey with notes of Tunisian Orange Blossom and Tropical Vanilla.",
            style: "", // CSS filter if needed
            storyUrl: "glass-glow-shampoo.html",
            orderIndex: 0,
            sizes: [
                { label: '50ml', price: '24.00' },
                { label: '100ml', price: '44.00' },
                { label: '250ml', price: '95.00', originalPrice: '105.00' }
            ]
        },
        'dodchmellow-pro-v': {
            name: "DODCHmellow",
            category: "hair-care",
            subCategory: "shampoo",
            subtitle: "The Marshmallow Cloud Shampoo",
            price: "24.50",
            image: "IMG_3490.jpg",
            description: "Imagine a lather so dense and soft it feels like a whipped cloud. Sulfate-Free | Silk-Polymer Infusion | pH 5.5. Fragrance: Néroli-Sucre.",
            style: "",
            storyUrl: "dodchmellow-pro-v.html",
            orderIndex: 1,
            sizes: [
                { label: '250ml', price: '24.50' }
            ]
        },
        'foaming-cleanser': {
            name: "DODCH Foaming Cleanser",
            category: "face-care",
            subCategory: "cleansers",
            subtitle: "Luminous Purity",
            price: "45.00",
            image: "IMG_3352.PNG",
            description: "A gentle yet powerful daily cleanser with AHA + BHA exfoliation, hydrating Panthenol & Glycerin, and soothing Allantoin.",
            style: "filter: brightness(1.05);",
            storyUrl: "face-foam.html",
            orderIndex: 3,
            sizes: []
        },
        'silk-therapy-mask': {
            name: "DODCH Pro-V Silk Therapy Mask",
            category: "hair-care",
            subCategory: ["masks", "conditioners", "leave-in"],
            subtitle: "Deep Repair & Glass Shine",
            price: "39.00",
            image: "F188A04D-4AA7-4D98-9EEB-14861B10D468.PNG",
            description: "Infused with Pro-Vitamin B5 and hydrolyzed silk for deep conditioning, hydration, and strength. Use as a rinse-off mask or lightweight leave-in for silky, frizz-free hair.",
            style: "",
            storyUrl: "silk-mask.html",
            orderIndex: 2,
            sizes: [
                { label: '250ml', price: '39.00' }
            ]
        },
        'advanced-ha-serum': {
            name: "Advanced HA Serum",
            category: "face-care",
            subCategory: "serums",
            subtitle: "Radiance & Deep Hydration",
            price: "89.00",
            image: "IMG_3407.jpeg",
            description: "A concentrated Hyaluronic Acid serum that penetrates deep layers for instant plumping and long-lasting hydration.",
            style: "",
            storyUrl: "face-serum.html",
            orderIndex: 4,
            sizes: [
                { label: '30ml', price: '89.00' }
            ]
        }
    };

    // Mutable catalog that will be updated with Firestore data
    productCatalog = { ...defaultProductCatalog };

    // Function to render Shop Page grid dynamically
    let shopTransitionTimeout;

    const initShopPage = (animate = false) => {
        // Only run on shop page (where product detail container is absent)
        if (document.querySelector('.product-detail-container')) return;

        const shopLayout = document.querySelector('.shop-layout');
        if (!shopLayout) return;

        const renderContent = () => {
            // Sort by orderIndex
            const sortedCatalog = Object.entries(productCatalog).sort(([, a], [, b]) => {
                const orderDiff = (a.orderIndex || 0) - (b.orderIndex || 0);
                if (orderDiff !== 0) return orderDiff;
                return a.name.localeCompare(b.name);
            });

            // Filter Logic based on URL params
            const urlParams = new URLSearchParams(window.location.search);
            const activeCat = urlParams.get('cat');
            const activeSub = urlParams.get('sub');

            // Helper to generate Card HTML
            const generateCardHTML = (id, product, index = 0) => {
                const staggerDelay = `${(index % 4) * 0.15}s`;
                let displayPrice = product.price;
                let hasDiscount = false;
                if (product.sizes && product.sizes.length > 0) {
                    const prices = product.sizes.map(s => parseFloat(s.price));
                    displayPrice = Math.min(...prices).toFixed(2);
                    hasDiscount = product.sizes.some(s => s.originalPrice && parseFloat(s.originalPrice) > parseFloat(s.price));
                }
                let targetUrl = product.storyUrl || `product.html?id=${id}`;
                let linkAttributes = `href="${targetUrl}"`;

                if (id === 'glass-glow-shampoo') {
                    linkAttributes = `href="#" onclick="window.showToast('This product is no longer available.', 'error'); return false;"`;
                }

                let badgeHTML = '';
                if (product.outOfStock) {
                    badgeHTML = '<span class="product-badge out-of-stock" style="position: absolute; top: 10px; left: 10px; background: #2D2D2D; color: white; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 30px;">OUT OF STOCK</span>';
                } else if (hasDiscount) {
                    badgeHTML = '<span class="product-badge sale" style="position: absolute; top: 10px; left: 10px; background: #d4af37; color: white; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 30px;">ONLINE OFFER</span>';
                }
                return `
                    <div class="product-card reveal" style="--anim-delay: ${staggerDelay}; ${product.outOfStock ? 'opacity: 0.8;' : ''}">
                        <a ${linkAttributes}>
                            <div class="product-image-wrapper">
                                ${badgeHTML}
                                <img src="${product.image}" alt="${product.name}" class="product-card-img" style="${product.style || ''}">
                                <button class="quick-view-btn" data-id="${id}" data-title="${product.name}" data-price="${displayPrice}" data-img="${product.image}" data-style="${product.style || ''}" data-desc="${product.description}">Quick View</button>
                            </div>
                            <div class="product-card-info">
                                <h3 class="product-card-title">${product.name}</h3>
                                <p class="product-card-price">${displayPrice} TND</p>
                            </div>
                        </a>
                    </div>`;
            };

            // Clear Layout
            shopLayout.innerHTML = '';

            // Define Sections Order
            const allSections = [
                { id: 'hair-care', title: 'Hair Care' },
                { id: 'face-care', title: 'Face Care' },
                { id: 'sets', title: 'Sets & Bundles' }
            ];

            // Subcategory Display Names
            const subCatDisplay = {
                'shampoo': 'Shampoos',
                'conditioners': 'Conditioners',
                'masks': 'Masks & Treatments',
                'leave-in': 'Leave-In Treatments',
                'cleansers': 'Cleansers',
                'serums': 'Serums',
                'sets': 'Sets'
            };

            // Determine which sections to show
            let sectionsToShow = allSections;
            if (activeCat && activeCat !== 'all') {
                sectionsToShow = allSections.filter(s => s.id === activeCat);
            }

            const isSpecificSub = activeSub && activeSub !== 'all';

            if (!isSpecificSub) {
                let hasProducts = false;
                sectionsToShow.forEach(section => {
                    // Filter products for this section
                    const sectionProducts = sortedCatalog.filter(([, p]) => p.category === section.id);

                    if (sectionProducts.length > 0) {
                        hasProducts = true;

                        // Create a single horizontal grid for all products in the section
                        const contentHTML = `
                            <div class="shop-grid horizontal-scroll">
                                ${sectionProducts.map(([id, p], i) => generateCardHTML(id, p, i)).join('')}
                            </div>
                        `;

                        const sectionHTML = `
                            <div class="shop-category-section" style="padding-top: 60px;">
                                <h2 class="shop-category-title">${section.title}</h2>
                                ${contentHTML}
                            </div>
                        `;
                        shopLayout.insertAdjacentHTML('beforeend', sectionHTML);
                    }
                });

                if (!hasProducts) {
                    shopLayout.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; opacity: 0.6; font-family: var(--font-sans);">No products found in this category.</div>`;
                }
            } else {
                // Render Single Grid
                const filteredProducts = sortedCatalog.filter(([, p]) => {
                    const matchesCat = !activeCat || activeCat === 'all' || p.category === activeCat;
                    const matchesSub = !activeSub || activeSub === 'all' || (Array.isArray(p.subCategory) ? p.subCategory.includes(activeSub) : p.subCategory === activeSub);
                    return matchesCat && matchesSub;
                });

                if (filteredProducts.length > 0) {
                    const gridHTML = `
                        <div class="shop-category-section" style="padding-top: 60px;">
                            <h2 class="shop-category-title">${subCatDisplay[activeSub] || (activeSub.charAt(0).toUpperCase() + activeSub.slice(1))}</h2>
                            <div class="shop-grid">
                                ${filteredProducts.map(([id, p], i) => generateCardHTML(id, p, i)).join('')}
                            </div>
                        </div>
                    `;
                    shopLayout.innerHTML = gridHTML;
                } else {
                    shopLayout.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; opacity: 0.6; font-family: var(--font-sans);">No products found in this category.</div>`;
                }
            }

            // After rendering grid dynamically, attach observers to them so they animate on scroll
            document.querySelectorAll('.shop-layout .product-card.reveal').forEach(el => {
                if (typeof revealObserver !== 'undefined') {
                    revealObserver.observe(el);
                }
            });
        };

        if (animate) {
            shopLayout.classList.add('fade-out');
            if (shopTransitionTimeout) clearTimeout(shopTransitionTimeout);

            shopTransitionTimeout = setTimeout(() => {
                renderContent();
                shopLayout.classList.remove('fade-out');
            }, 300);
        } else {
            renderContent();
        }
    };

    // Function to fetch product overrides (price, stock) from Firestore
    const loadProductCatalog = async () => {
        try {
            console.log("Loading catalog from Firestore...");
            const querySnapshot = await getDocs(collection(db, "products"));

            // If DB is not empty, we treat it as the source of truth
            if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const productId = doc.id;

                    // Handle soft-deleted products
                    if (data.deleted) {
                        delete productCatalog[productId];
                        return;
                    }

                    // Merge Firestore data into catalog
                    if (productCatalog[productId]) {
                        // Crucial: We don't want Firestore to overwrite the category/subCategory if we've hardcoded a fix
                        // Unless the change came from Firestore itself in the future.
                        // For now, let's preserve the local category/subCategory to fix the user's "glitch"
                        const preservedCat = productCatalog[productId].category;
                        const preservedSub = productCatalog[productId].subCategory;

                        productCatalog[productId] = { ...productCatalog[productId], ...data };

                        // Re-apply correct categories if they are part of the "fix"
                        if (productId === 'dodchmellow-pro-v' || productId === 'silk-therapy-mask') {
                            productCatalog[productId].category = preservedCat;
                            productCatalog[productId].subCategory = preservedSub;
                        }
                    } else {
                        productCatalog[productId] = data;
                    }
                });
            }

            // Re-run product page init to reflect changes if we are on a product page
            initProductPage();
            // Re-render shop grid if we are on shop page
            initShopPage();

            // Re-initialize Search Engine with loaded catalog
            if (window.dodchSearchEngine) {
                window.dodchSearchEngine.init(productCatalog);
            }
            // Re-render related products
            loadRelatedProducts();

            // Refresh Admin Dashboard if active (fixes race condition where admin loads before firestore data)
            if (typeof window.refreshAdminProducts === 'function') {
                window.refreshAdminProducts();
            }
        } catch (error) {
            console.error("Error loading product catalog:", error);
        }
    };

    // 11. Product Page & Cart Logic
    const CART_VERSION = 6; // Increment to force reset and clear stale/buggy data
    let cart = JSON.parse(localStorage.getItem('dodch_cart')) || [];
    const storedVersion = parseInt(localStorage.getItem('dodch_cart_version') || '0');

    // Force clear cart if version is old to remove any "Gloss Shampoo" bugs or stale data
    if (storedVersion < CART_VERSION) {
        console.warn("Cart version mismatch. Clearing old data to ensure accuracy.");
        cart = [];
        localStorage.setItem('dodch_cart', JSON.stringify(cart));
        localStorage.setItem('dodch_cart_version', CART_VERSION);
    }

    let currentUser = null;

    const cartToggle = document.getElementById('cart-toggle');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartCountBadge = document.getElementById('cart-count-badge');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartEmptyMsg = document.querySelector('.cart-empty');

    const sizeBtns = document.querySelectorAll('.size-btn');
    const priceDisplay = document.getElementById('product-price');
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');

    // Auth Logic
    const loginBtn = document.getElementById('login-btn');

    const handleLogin = async () => {
        const googleIcon = `<svg width="24" height="24" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 10px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path><path fill="none" d="M1 1h22v22H1z"></path></svg>`;
        const confirmed = await window.showConfirm(`${googleIcon} Continue with Google Sign In?`, "Login");
        if (!confirmed) return;

        try {
            // The onAuthStateChanged observer will handle the UI update without a reload.
            await signInWithPopup(auth, provider);
            window.showToast("Successfully logged in!", "success");
        } catch (error) {
            console.error("Login failed", error);
            window.showToast("Login failed. Please try again.", "error");
        }
    };

    const handleLogout = async () => {
        const confirmed = await window.showConfirm("Are you sure you want to log out?", "Logout");
        if (!confirmed) return;

        try {
            await signOut(auth);
            window.showToast("Successfully logged out.", "success");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // Logic to claim guest orders upon login
    const claimGuestOrders = async (userId) => {
        const guestOrders = JSON.parse(localStorage.getItem('dodch_guest_orders') || '[]');
        if (guestOrders.length === 0) return;

        console.log(`Checking for ${guestOrders.length} guest orders to claim...`);
        let claimedCount = 0;

        for (const orderId of guestOrders) {
            try {
                const orderRef = doc(db, "orders", orderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const orderData = orderSnap.data();
                    // SECURITY: Only claim if it's currently marked as 'guest'
                    // This prevents guessing IDs of already registered orders.
                    if (orderData.userId === 'guest') {
                        await updateDoc(orderRef, {
                            userId: userId,
                            hasUnseenUpdate: true // Mark as new for their account
                        });
                        claimedCount++;
                    }
                }
            } catch (err) {
                console.warn(`Could not claim order ${orderId}:`, err);
            }
        }

        if (claimedCount > 0) {
            window.showToast(`Successfully linked ${claimedCount} previous order(s) to your account!`, "success");
        }

        // Clear the local list regardless of success to avoid repeat attempts
        localStorage.removeItem('dodch_guest_orders');
    };


    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                handleLogout();
            } else {
                handleLogin();
            }
        });
    }

    // --- Login Page Logic ---
    const loginForm = document.getElementById('login-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    let isSignUp = false;

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = loginForm.querySelector('button');

            btn.innerText = "Processing...";
            btn.disabled = true;

            try {
                if (isSignUp) {
                    await createUserWithEmailAndPassword(auth, email, password);
                    window.showToast("Account created successfully!", "success");
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                    window.showToast("Welcome back!", "success");
                }
                // Redirect to shop or account after delay
                setTimeout(() => window.location.href = 'my-account.html', 1500);
            } catch (error) {
                console.error(error);
                window.showToast(error.message, "error");
                btn.innerText = isSignUp ? "Sign Up" : "Sign In";
                btn.disabled = false;
            }
        });
    }

    if (googleLoginBtn) {
        googleLoginBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" style="margin-right: 12px; vertical-align: middle;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path><path fill="none" d="M1 1h22v22H1z"></path></svg> Sign In with Google`;
        googleLoginBtn.addEventListener('click', handleLogin);
    }

    if (toggleAuthMode) toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        document.querySelector('.auth-header h1').textContent = isSignUp ? "Create Account" : "Welcome Back";
        document.querySelector('.auth-header p').textContent = isSignUp ? "Join the inner circle." : "Sign in to access your account.";
        document.querySelector('.auth-btn').textContent = isSignUp ? "Sign Up" : "Sign In";
        toggleAuthMode.textContent = isSignUp ? "Sign In" : "Sign Up";
        toggleAuthMode.parentElement.innerHTML = isSignUp ? `Already have an account? <a href="#" id="toggle-auth-mode" style="text-decoration: underline; color: var(--accent-gold);">Sign In</a>` : `Don't have an account? <a href="#" id="toggle-auth-mode" style="text-decoration: underline; color: var(--accent-gold);">Sign Up</a>`;

        // Re-attach listener since we replaced innerHTML
        document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
            // Simple reload to toggle back for simplicity in this snippet, or extract logic to function
            location.reload();
        });
    });

    // Checkout Page Logic
    const checkoutItemsContainer = document.getElementById('checkout-items-container');
    const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
    const checkoutTotalEl = document.getElementById('checkout-total');

    const updateCheckoutUI = () => {
        if (!checkoutItemsContainer) return;

        checkoutItemsContainer.innerHTML = '';
        let subtotal = 0;

        cart.forEach((item, index) => {
            let priceVal = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
            if (isNaN(priceVal)) priceVal = 0;
            const itemTotal = priceVal * item.quantity;
            subtotal += itemTotal;

            const el = document.createElement('div');
            el.classList.add('summary-item');
            el.innerHTML = `
                <div class="summary-item-info">
                    <img src="${item.image}" alt="${item.name}">
                    <div>
                        <h4>${item.name}</h4>
                        <p>Size: ${item.size} | Qty: ${item.quantity}</p>
                        <button class="checkout-remove-btn" data-index="${index}" style="color: #ff4d4d; background: none; border: none; padding: 0; font-size: 0.8rem; text-decoration: underline; cursor: pointer; margin-top: 5px;">Remove</button>
                    </div>
                </div>
                <div class="summary-item-price">${itemTotal.toFixed(2)} TND</div>
            `;
            checkoutItemsContainer.appendChild(el);
        });

        const SHIPPING_FEE = 7;
        const FREE_SHIPPING_THRESHOLD = 100;
        const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
        const currentShipping = isFreeShipping ? 0 : SHIPPING_FEE;
        const total = subtotal + currentShipping;

        if (checkoutSubtotalEl) checkoutSubtotalEl.innerText = `${subtotal.toFixed(2)} TND`;

        const shippingEl = document.getElementById('checkout-shipping');
        if (shippingEl) {
            shippingEl.innerText = isFreeShipping ? 'Free' : `${SHIPPING_FEE.toFixed(2)} TND`;
        }

        if (checkoutTotalEl) checkoutTotalEl.innerText = `${total.toFixed(2)} TND`;

        // Reminder on Checkout Page
        const summaryTotals = document.querySelector('.summary-totals');
        if (summaryTotals) {
            let checkoutPromo = summaryTotals.querySelector('.checkout-promo-msg');
            if (!checkoutPromo) {
                checkoutPromo = document.createElement('p');
                checkoutPromo.className = 'checkout-promo-msg';
                checkoutPromo.style.cssText = 'font-size: 0.75rem; color: #888; margin-top: 1rem; text-align: left; font-style: italic;';
                summaryTotals.appendChild(checkoutPromo);
            }
            checkoutPromo.innerText = subtotal >= FREE_SHIPPING_THRESHOLD
                ? "Your order qualifies for Free Shipping."
                : `Free shipping on orders over ${FREE_SHIPPING_THRESHOLD} TND.`;
        }

        // Add listeners for checkout remove buttons
        document.querySelectorAll('.checkout-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                cart.splice(index, 1);
                updateCartUI();
            });
        });
    };

    const openCart = () => {
        document.body.style.overflow = 'hidden'; // Lock scroll
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
    };

    const closeCart = () => {
        document.body.style.overflow = ''; // Restore scroll
        cartDrawer.classList.remove('active');
        cartOverlay.classList.remove('active');
    };

    const updateCartUI = () => {
        // Save to storage whenever UI updates
        localStorage.setItem('dodch_cart', JSON.stringify(cart));
        localStorage.setItem('dodch_cart_version', CART_VERSION);

        if (currentUser) {
            setDoc(doc(db, "carts", currentUser.uid), { items: cart });
        }

        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            if (cartEmptyMsg) cartItemsContainer.appendChild(cartEmptyMsg);
        } else {
            cart.forEach((item, index) => {
                const cartItemEl = document.createElement('div');
                cartItemEl.classList.add('cart-item');
                cartItemEl.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${item.name}</h4>
                        <p class="cart-item-details">Size: ${item.size}</p>
                        <div class="cart-item-quantity">
                            <button class="qty-btn minus" data-index="${index}">-</button>
                            <span class="qty-display">${item.quantity}</span>
                            <button class="qty-btn plus" data-index="${index}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <p class="cart-item-price">${item.price}</p>
                        <button class="cart-item-remove-btn" data-index="${index}">Remove</button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemEl);
            });
        }

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCountBadge) {
            cartCountBadge.textContent = totalItems;
            cartCountBadge.classList.toggle('visible', totalItems > 0);
        }

        const subtotal = cart.reduce((sum, item) => {
            let priceVal = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
            if (isNaN(priceVal)) priceVal = 0;
            return sum + (priceVal * item.quantity);
        }, 0);
        const FREE_SHIPPING_THRESHOLD = 100;
        if (cartSubtotalEl) cartSubtotalEl.textContent = `${subtotal.toFixed(2)} TND`;

        // Free Shipping Progress in Cart Drawer
        const cartFooter = document.querySelector('.cart-footer');
        if (cartFooter) {
            let shippingMsg = cartFooter.querySelector('.shipping-promo-msg');
            if (!shippingMsg) {
                shippingMsg = document.createElement('p');
                shippingMsg.className = 'shipping-promo-msg';
                shippingMsg.style.cssText = 'font-size: 0.75rem; text-align: center; margin-bottom: 1rem; color: #666; border-top: 1px solid #f5f5f5; padding-top: 1rem;';
                cartFooter.prepend(shippingMsg);
            }

            const isUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD;
            // Only trigger a transition if the unlocked state actually changed
            const currentlyUnlocked = shippingMsg.classList.contains('shipping-promo-unlocked');

            if (isUnlocked !== currentlyUnlocked) {
                shippingMsg.classList.add('exit');
                setTimeout(() => {
                    if (isUnlocked) {
                        const text = "✨ You've unlocked Free Shipping!";
                        const wrappedText = text.split('').map((char, i) =>
                            `<span style="animation-delay: ${i * 0.02}s; display: inline-block; white-space: pre;">${char}</span>`
                        ).join('');
                        shippingMsg.innerHTML = wrappedText;
                        shippingMsg.classList.add('shipping-promo-unlocked');
                    } else {
                        const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
                        shippingMsg.innerHTML = `Add <strong>${remaining.toFixed(2)} TND</strong> more for <strong>Free Shipping</strong>`;
                        shippingMsg.classList.remove('shipping-promo-unlocked');
                    }
                    shippingMsg.classList.remove('exit');
                }, 400); // Wait for blur-out
            } else {
                // If the state hasn't changed but the value has, just update the numbers (don't exit)
                if (!isUnlocked) {
                    const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
                    shippingMsg.innerHTML = `Add <strong>${remaining.toFixed(2)} TND</strong> more for <strong>Free Shipping</strong>`;
                }
            }
        }

        document.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemIndex = parseInt(e.target.getAttribute('data-index'));
                cart.splice(itemIndex, 1);
                updateCartUI();
            });
        });

        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                cart[index].quantity++;
                updateCartUI();
            });
        });

        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (cart[index].quantity > 1) {
                    cart[index].quantity--;
                } else {
                    cart.splice(index, 1);
                }
                updateCartUI();
            });
        });

        // Also update checkout UI if we are on that page
        updateCheckoutUI();
    };

    // Expose addToCart globally for custom product pages (like silk-mask.html)
    window.addToCart = (productId, sizeLabel = null) => {
        const product = productCatalog[productId];
        if (!product) {
            console.error("Product not found in catalog:", productId);
            window.showToast("Product not found.", "error");
            return;
        }

        // Determine size and price
        let size = sizeLabel;
        let price = product.price;

        if (product.sizes && product.sizes.length > 0) {
            // If no size specified, default to the first one
            if (!size) {
                size = product.sizes[0].label;
                price = product.sizes[0].price;
            } else {
                const sizeObj = product.sizes.find(s => s.label === size);
                if (sizeObj) {
                    price = sizeObj.price;
                }
            }
        } else {
            size = "Standard";
        }

        const newItemId = `${product.name}-${size}`;
        const existingItem = cart.find(item => item.id === newItemId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: newItemId,
                productId: productId,
                name: product.name,
                size: size,
                price: `${parseFloat(price).toFixed(2)} TND`,
                image: product.image,
                quantity: 1
            });
        }

        updateCartUI();
        openCart();
        window.showToast(`Added ${product.name} to cart`, 'success');
    };

    if (cartToggle) cartToggle.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
    });
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // Helper to find the correct product container
    const findProductContainer = (element) => {
        // 1. Try explicit classes first
        let container = element.closest('.product-card, .product-item, .product-info, .collection-item, .item, .single-product-wrapper');

        // 2. If not found, traverse up to find a container with title and image
        if (!container) {
            let parent = element.parentElement;
            // Traverse up to 10 levels to find a wrapper
            for (let i = 0; i < 10; i++) {
                if (!parent || parent.tagName === 'BODY') break;

                const hasTitle = parent.querySelector('.product-title, .product-name, h1, h2, h3, h4, h5');
                const hasImg = parent.querySelector('img');
                const hasPrice = parent.querySelector('.product-price, .price, .money, #product-price');

                // Heuristic: A card shouldn't contain too many add-to-cart buttons (unless it's the wrapper for the whole page)
                // If we are in a grid, the row might have 3 buttons. The card has 1.
                const buttonsInParent = parent.querySelectorAll('.add-to-cart-btn');

                // If it has a title and (image or price) and isn't a massive container (like the whole grid)
                // We check if the parent is a 'section' or 'main' only if it seems to be a single product page
                if (hasTitle && (hasImg || hasPrice) && buttonsInParent.length === 1) {
                    container = parent;
                    break;
                }

                // If we are on a single product page, the section/main might contain the button
                if ((parent.tagName === 'SECTION' || parent.tagName === 'MAIN') && hasTitle && hasPrice) {
                    container = parent;
                    break;
                }

                parent = parent.parentElement;
            }
        }

        // 3. Fallback to closest section or body (last resort)
        // IMPORTANT: Do NOT fallback to document.body if there are multiple add-to-cart buttons on the page
        if (!container) {
            const allButtons = document.querySelectorAll('.add-to-cart-btn');
            if (allButtons.length === 1) {
                return document.body;
            }
            // If multiple buttons, fallback to the direct parent to avoid global scope pollution
            return element.parentElement;
        }

        return container;
    };

    if (sizeBtns.length > 0) {
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clickedBtn = e.currentTarget;
                // Find the specific product container for this button
                const container = findProductContainer(clickedBtn);

                // Remove active class from sibling buttons in this container only
                if (container) {
                    const containerBtns = container.querySelectorAll('.size-btn');
                    containerBtns.forEach(b => b.classList.remove('active'));
                }

                // Add active to clicked button
                clickedBtn.classList.add('active');

                // Update Price within this container
                // Try to find a price element with class first, then ID as fallback
                if (container) {
                    let localPrice = container.querySelector('.product-price, .price, #product-price');
                    if (localPrice) {
                        const newPrice = clickedBtn.getAttribute('data-price');
                        localPrice.innerText = `${newPrice} TND`;
                    }
                }
            });
        });
    }

    if (addToCartBtns.length > 0) {
        addToCartBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clickedBtn = e.currentTarget;
                // Attempt to find a container for the product (card, section, or wrapper)
                const container = findProductContainer(clickedBtn);

                // Find Product Name
                // We search strictly within the container to avoid grabbing the first product's title
                let productName = clickedBtn.dataset.title;

                if (!productName) {
                    let nameEl = container ? container.querySelector('.product-title, .product-name, h1, h2, h3, h4, h5') : null;
                    productName = nameEl ? nameEl.textContent.trim() : "Unknown Product";
                }

                if (productName === "Unknown Product") {
                    console.error("Could not detect product name. Container:", container);
                    window.showToast("Error adding to cart. Please refresh.", "error");
                    return;
                }

                let size = "Standard";
                let price = "0.00";

                // Find Active Size Button within the container
                const sizeBtnsInContainer = container ? container.querySelectorAll('.size-btn') : [];

                if (sizeBtnsInContainer.length > 0) {
                    let activeSizeBtn = Array.from(sizeBtnsInContainer)
                        .filter(b => b.classList.contains('active'))
                        .find(b => !b.closest('.qv-modal-content'));

                    if (!activeSizeBtn) {
                        window.showToast("Please select a size.", "error");
                        return;
                    }
                    size = activeSizeBtn.dataset.size;
                    price = activeSizeBtn.dataset.price;
                } else {
                    // Fallback for products without size buttons
                    const priceEl = container ? container.querySelector('.product-price, .price, #product-price') : null;
                    if (priceEl) {
                        price = priceEl.textContent.replace(/[^0-9.]/g, '');
                    } else if (clickedBtn.dataset.price) {
                        price = clickedBtn.dataset.price;
                    }
                }

                // Find Image
                let imageSrc = clickedBtn.dataset.img || '';

                if (!imageSrc) {
                    // Prioritize image in container
                    const imgEl = container ? container.querySelector('img.product-image, img') : null;
                    if (imgEl) {
                        imageSrc = imgEl.src;
                    } else {
                        // Fallback only if we are sure it's a single product page
                        const mainImg = document.getElementById('main-product-image');
                        if (mainImg) imageSrc = mainImg.src;
                    }
                }

                const newItemId = `${productName}-${size}`;
                const existingItem = cart.find(item => item.id === newItemId);

                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    const newItem = {
                        id: newItemId,
                        productId: clickedBtn.dataset.productId || clickedBtn.dataset.id, // Pass ID for server verification
                        name: productName,
                        size: size,
                        price: `${parseFloat(price).toFixed(2)} TND`,
                        image: imageSrc,
                        quantity: 1
                    };
                    cart.push(newItem);
                }

                updateCartUI();
                openCart();

                const originalText = clickedBtn.innerText;
                clickedBtn.innerText = "Added";
                setTimeout(() => clickedBtn.innerText = originalText, 2000);
            });
        });
    }

    // --- DYNAMIC PRODUCT PAGE LOGIC ---
    const initProductPage = () => {
        const productDetailContainer = document.querySelector('.product-detail-container');
        if (!productDetailContainer) return; // Not on product page

        // Get Product ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        // Default to shampoo if no ID provided (or handle 404)
        const product = productCatalog[productId] || productCatalog['glass-glow-shampoo'];

        // Update DOM Elements
        let titleEl = document.getElementById('product-title');
        // Fallback: Try finding h1 in product-info if ID is missing
        if (!titleEl) {
            const info = document.querySelector('.product-info');
            if (info) titleEl = info.querySelector('h1');
        }

        let subtitleEl = document.getElementById('product-subtitle');
        if (!subtitleEl) {
            const info = document.querySelector('.product-info');
            if (info) subtitleEl = info.querySelector('.product-subtitle, h2');
        }

        const priceEl = document.getElementById('product-price');
        const descEl = document.getElementById('product-description-text');
        const imgEl = document.getElementById('main-product-image');

        // Define addToCartBtn early to avoid ReferenceError
        const productInfo = document.querySelector('.product-info');
        const addToCartBtn = productInfo ? productInfo.querySelector('.add-to-cart-btn') : null;

        if (titleEl) titleEl.textContent = product.name;
        if (subtitleEl) subtitleEl.textContent = product.subtitle;

        // Calculate lowest price from sizes if available
        let displayPrice = product.price;
        if (product.sizes && product.sizes.length > 0) {
            const prices = product.sizes.map(s => parseFloat(s.price));
            displayPrice = Math.min(...prices).toFixed(2);
        }
        if (priceEl) priceEl.textContent = `${displayPrice} TND`;

        // Handle Out of Stock
        if (product.outOfStock) {
            if (priceEl) priceEl.textContent = "Out of Stock";
            if (priceEl) priceEl.style.color = "#ff4d4d";
        }

        if (descEl) descEl.textContent = product.description;

        if (imgEl) {
            imgEl.src = product.image;
            if (product.style) imgEl.style = product.style;
        }

        // Attach Product ID to Add to Cart button for server verification
        if (addToCartBtn) {
            addToCartBtn.dataset.productId = productId || 'glass-glow-shampoo';
        }

        // Update Page Title
        document.title = `${product.name} | DODCH`;

        // Dynamic Size Buttons for Product Page
        const sizeOptionsContainer = productDetailContainer.querySelector('.size-options');
        if (sizeOptionsContainer && product.sizes) {
            sizeOptionsContainer.innerHTML = ''; // Clear existing hardcoded buttons

            if (product.sizes.length > 0) {
                // Ensure selector is visible
                const selector = productDetailContainer.querySelector('.size-selector');
                if (selector) selector.style.display = 'block';

                // Find index of lowest price
                const prices = product.sizes.map(s => parseFloat(s.price));
                const minPrice = Math.min(...prices);
                const minIndex = product.sizes.findIndex(s => parseFloat(s.price) === minPrice);

                product.sizes.forEach((sizeObj, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'size-btn';
                    if (index === minIndex) {
                        btn.classList.add('active');
                        if (priceEl) {
                            if (sizeObj.originalPrice) {
                                priceEl.innerHTML = `<span style="text-decoration: line-through; color: #bbb; margin-right: 8px; font-size: 0.8em;">${sizeObj.originalPrice} TND</span> ${sizeObj.price} TND <span style="background: #d4af37; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; vertical-align: middle; margin-left: 8px;">ONLINE OFFER</span>`;
                            } else {
                                priceEl.textContent = `${sizeObj.price} TND`;
                            }
                        }

                        // Initial check for default selected size
                        const addToCartBtn = document.querySelector('.product-info .add-to-cart-btn');
                        if (addToCartBtn && !product.outOfStock) {
                            if (sizeObj.outOfStock) {
                                addToCartBtn.disabled = true;
                                addToCartBtn.textContent = "Out of Stock";
                                addToCartBtn.style.backgroundColor = "#ccc";
                            } else {
                                addToCartBtn.disabled = false;
                                addToCartBtn.textContent = "Add to Cart";
                                addToCartBtn.style.backgroundColor = "";
                            }
                        }
                    }
                    btn.dataset.size = sizeObj.label;
                    btn.dataset.price = sizeObj.price;
                    btn.textContent = sizeObj.label;

                    // Re-attach click listener logic locally or rely on global delegation if set up correctly
                    // Here we attach locally for safety
                    btn.addEventListener('click', () => {
                        sizeOptionsContainer.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        if (priceEl) {
                            if (sizeObj.originalPrice) {
                                priceEl.innerHTML = `<span style="text-decoration: line-through; color: #bbb; margin-right: 8px; font-size: 0.8em;">${sizeObj.originalPrice} TND</span> ${sizeObj.price} TND <span style="background: #d4af37; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; vertical-align: middle; margin-left: 8px;">ONLINE OFFER</span>`;
                            } else {
                                priceEl.textContent = `${sizeObj.price} TND`;
                            }
                        }

                        // Update Add to Cart button based on size stock
                        const addToCartBtn = document.querySelector('.product-info .add-to-cart-btn');
                        if (addToCartBtn && !product.outOfStock) {
                            if (sizeObj.outOfStock) {
                                addToCartBtn.disabled = true;
                                addToCartBtn.textContent = "Out of Stock";
                                addToCartBtn.style.backgroundColor = "#ccc";
                            } else {
                                addToCartBtn.disabled = false;
                                addToCartBtn.textContent = "Add to Cart";
                                addToCartBtn.style.backgroundColor = "";
                            }
                        }
                    });

                    if (product.outOfStock) {
                        btn.disabled = true;
                        btn.style.opacity = "0.5";
                    } else if (sizeObj.outOfStock) {
                        // Visual indication for single size OOS
                        btn.style.textDecoration = "line-through";
                        btn.style.opacity = "0.6";
                    }

                    sizeOptionsContainer.appendChild(btn);
                });
            } else {
                // Hide size selector if no sizes (e.g. Set)
                const selector = productDetailContainer.querySelector('.size-selector');
                if (selector) selector.style.display = 'none';
            }
        }

        // Add "Learn More" link if storyUrl exists
        const existingStoryBtn = document.getElementById('product-story-link');
        if (existingStoryBtn) existingStoryBtn.remove();

        // Ensure OOS logic runs for all products
        if (product.outOfStock && addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.innerText = "Out of Stock";
            addToCartBtn.style.backgroundColor = "#ccc";
        }

        if (addToCartBtn && product.storyUrl) {
            const storyBtn = document.createElement('a');

            storyBtn.id = 'product-story-link';
            storyBtn.href = product.storyUrl;
            storyBtn.textContent = 'Learn More';
            storyBtn.style.display = 'block';
            storyBtn.style.textAlign = 'center';
            storyBtn.style.marginTop = '1rem';
            storyBtn.style.textDecoration = 'underline';
            storyBtn.style.color = 'var(--text-charcoal)';
            storyBtn.style.fontSize = '0.85rem';

            addToCartBtn.after(storyBtn);
        }
    };

    // Load catalog then init page
    // Initialize immediately with default data to prevent content flash/fallback
    initProductPage();
    initShopPage();
    loadProductCatalog();

    // Sidebar Logic
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarLoginBtn = document.getElementById('sidebar-login-btn');
    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');

    if (sidebarLoginBtn) {
        sidebarLoginBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Login`;
        sidebarLoginBtn.addEventListener('click', () => handleLogin());
    }

    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Logout`;
        sidebarLogoutBtn.addEventListener('click', () => {
            handleLogout();
        });
    }

    // Auth State Observer
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

        if (user) {
            // Claim any guest orders made before logging in
            claimGuestOrders(user.uid);

            // If the guest-convert-banner is visible on the checkout confirmation page,
            // swap it to a 'View Your Orders' success card
            const guestBanner = document.getElementById('guest-convert-banner');
            if (guestBanner) {
                guestBanner.style.opacity = '0';
                guestBanner.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    guestBanner.innerHTML = `
                        <svg style="width:40px;height:40px;color:#4CAF50;margin-bottom:0.75rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <h4 style="margin-bottom:0.4rem;color:var(--text-charcoal);font-size:1.05rem;">You're all set!</h4>
                        <p style="font-size:0.85rem;color:#666;margin-bottom:1.1rem;">Your order has been linked to your account.</p>
                        <a href="my-account.html#orders" class="cta-button cta-button-primary" style="width:auto;padding:0.65rem 1.6rem;font-size:0.9rem;display:inline-block;">View Your Orders</a>
                    `;
                    guestBanner.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    guestBanner.style.opacity = '1';
                    guestBanner.style.transform = 'scale(1)';
                }, 350);
            }
        }

        // Re-query elements to ensure we catch them on all pages (fixes Guest Mode bug)
        const loginBtn = document.getElementById('login-btn');
        const sidebarUserName = document.getElementById('sidebar-user-name');
        const sidebarLoginBtn = document.getElementById('sidebar-login-btn');
        const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');

        // Update Navbar Login Button Text
        if (loginBtn) {
            if (user) {
                loginBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg><span class="login-text">Logout</span>`;
            } else {
                loginBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg><span class="login-text">Login</span>`;
            }
        }

        // Update Sidebar UI
        if (sidebarUserName) {
            const profileIcon = document.querySelector('.profile-icon');
            if (user) {
                sidebarUserName.textContent = user.displayName || user.email || "Member";
                if (profileIcon && user.photoURL) {
                    profileIcon.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else if (profileIcon) {
                    profileIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 30px; height: 30px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                }

                if (sidebarLoginBtn) sidebarLoginBtn.style.display = 'none';
                if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'block';

                // Add My Account button under username
                let myAccountBtn = document.getElementById('sidebar-my-account-btn');
                if (!myAccountBtn) {
                    myAccountBtn = document.createElement('a');
                    myAccountBtn.id = 'sidebar-my-account-btn';
                    myAccountBtn.href = 'my-account.html';
                    myAccountBtn.textContent = 'My Account';

                    // Style to match the login button
                    myAccountBtn.style.marginTop = '1rem';
                    myAccountBtn.style.background = 'transparent';
                    myAccountBtn.style.border = '1px solid var(--accent-gold)';
                    myAccountBtn.style.color = 'var(--accent-gold)';
                    myAccountBtn.style.padding = '0.5rem 1.5rem';
                    myAccountBtn.style.cursor = 'pointer';
                    myAccountBtn.style.textTransform = 'uppercase';
                    myAccountBtn.style.fontSize = '0.8rem';
                    myAccountBtn.style.letterSpacing = '1px';
                    myAccountBtn.style.textDecoration = 'none';
                    myAccountBtn.style.transition = 'all 0.3s ease';
                    myAccountBtn.style.display = 'inline-block';
                    myAccountBtn.style.borderRadius = '6px';

                    myAccountBtn.addEventListener('mouseenter', () => {
                        myAccountBtn.style.backgroundColor = 'var(--accent-gold)';
                        myAccountBtn.style.color = '#fff';
                    });
                    myAccountBtn.addEventListener('mouseleave', () => {
                        myAccountBtn.style.backgroundColor = 'transparent';
                        myAccountBtn.style.color = 'var(--accent-gold)';
                    });

                    sidebarUserName.after(myAccountBtn);

                    // Add Admin Dashboard button if user is admin
                    if (user.uid === ADMIN_UID) {
                        let adminBtn = document.getElementById('sidebar-admin-btn');
                        if (!adminBtn) {
                            adminBtn = myAccountBtn.cloneNode(true);
                            adminBtn.id = 'sidebar-admin-btn';
                            adminBtn.href = 'admin.html';
                            adminBtn.textContent = 'Admin Dashboard';
                            adminBtn.style.position = 'relative';
                            adminBtn.style.marginTop = '0.5rem';
                            adminBtn.style.borderColor = 'var(--text-charcoal)';
                            adminBtn.style.color = 'var(--text-charcoal)';
                            myAccountBtn.after(adminBtn);
                        } else {
                            adminBtn.style.display = 'inline-block';
                        }
                        // Start listening for admin notifications
                        listenForAdminNotifications();
                    }
                } else {
                    myAccountBtn.style.display = 'inline-block';
                    const adminBtn = document.getElementById('sidebar-admin-btn');
                    if (adminBtn) adminBtn.style.display = 'inline-block';
                }

                // Start listening for user notifications if not admin
                if (user.uid !== ADMIN_UID) {
                    listenForUserNotifications(user.uid);
                }

                // Sync Cart from Firestore
                const cartRef = doc(db, "carts", user.uid);
                const docSnap = await getDoc(cartRef);

                if (docSnap.exists() && cart.length === 0) {
                    cart = docSnap.data().items || [];
                    updateCartUI();
                }
            } else {
                sidebarUserName.textContent = "Guest";
                if (profileIcon) {
                    profileIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 30px; height: 30px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                }
                if (sidebarLoginBtn) sidebarLoginBtn.style.display = 'block';
                if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'none';

                // Hide My Account button
                const myAccountBtn = document.getElementById('sidebar-my-account-btn');
                if (myAccountBtn) myAccountBtn.style.display = 'none';
                const adminBtn = document.getElementById('sidebar-admin-btn');
                if (adminBtn) adminBtn.style.display = 'none';
            }
        }

        // Auto-populate checkout form if user is logged in
        const checkoutEmailInput = document.getElementById('checkout-email');
        const checkoutNameInput = document.getElementById('checkout-name');

        if (user && checkoutEmailInput && checkoutNameInput) {
            checkoutEmailInput.value = user.email || '';
            checkoutNameInput.value = user.displayName || '';
        }

        // My Account Page: Fetch Orders
        const ordersList = document.getElementById('orders-list');
        const accountUserName = document.getElementById('account-user-name');

        if (ordersList) {
            if (user) {
                if (accountUserName) accountUserName.textContent = user.displayName || "Member";

                // Show Skeleton
                const ordersLoader = document.getElementById('orders-loader');
                if (ordersLoader) ordersLoader.classList.add('active');
                ordersList.classList.remove('visible');

                try {
                    // Fetch reviewed product IDs first to show/hide Review button
                    const reviewsSnap = await getDocs(query(collection(db, "product_reviews"), where("userId", "==", user.uid)));
                    const reviewedProductIds = new Set();
                    reviewsSnap.forEach(doc => reviewedProductIds.add(doc.data().productId));

                    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
                    const querySnapshot = await getDocs(q);

                    let orders = [];
                    const updatesToClear = [];

                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        orders.push({ id: doc.id, ...data });
                        if (data.hasUnseenUpdate) {
                            updatesToClear.push(updateDoc(doc.ref, { hasUnseenUpdate: false }));
                        }
                    });

                    // Clear notifications in background
                    if (updatesToClear.length > 0) {
                        Promise.all(updatesToClear).then(() => {
                            document.body.classList.remove('has-notification');
                        }).catch(console.error);
                    }

                    let visibleOrdersCount = 10;
                    let filteredOrders = [];

                    const renderOrders = (toRender, append = false) => {
                        if (!append) ordersList.innerHTML = '';

                        const chunk = toRender.slice(append ? visibleOrdersCount - 10 : 0, visibleOrdersCount);

                        if (!append && toRender.length === 0) {
                            ordersList.innerHTML = '<p>You haven\'t placed any orders yet.</p>';
                            document.getElementById('load-more-orders-container').style.display = 'none';
                        } else {
                            chunk.forEach(order => {
                                const date = order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleDateString() : 'Recent';
                                const total = typeof order.total === 'number' ? order.total.toFixed(2) : order.total;
                                const status = order.status || 'Pending';
                                const statusClass = `status-${status.toLowerCase().replace(/\s+/g, '-')}`;

                                let trackButtonHtml = '';
                                let cancelButtonHtml = '';
                                let reviewButtonHtml = '';

                                if (status.toLowerCase() === 'shipped') {
                                    const trackingNumber = order.trackingNumber || `1Z${order.id.slice(0, 10).toUpperCase()}A0${Math.floor(Math.random() * 90 + 10)}`;
                                    trackButtonHtml = `<a href="tracking.html?orderId=${order.id}&trackingNumber=${trackingNumber}" class="track-order-btn">Track Order</a>`;
                                } else if (status.toLowerCase() === 'pending') {
                                    cancelButtonHtml = `<button class="cancel-order-btn" data-id="${order.id}" style="margin-left: 5px; color: #ff4d4d; background: none; border: 1px solid #ff4d4d; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; cursor: pointer;">Cancel</button>`;
                                } else if (status.toLowerCase() === 'delivered') {
                                    // Check if any product in this order hasn't been reviewed
                                    const hasUnreviewed = order.items.some(item => !reviewedProductIds.has(item.productId || item.id));
                                    if (hasUnreviewed) {
                                        reviewButtonHtml = `<button class="review-prompt-btn" style="margin-left: 5px; background: #fdf6ec; color: #e6a23c; border: 1px solid #e6a23c; border-radius: 6px; padding: 4px 12px; font-size: 0.75rem; cursor: pointer; font-weight: 600;">Rate Products</button>`;
                                    }
                                }

                                let itemsHtml = order.items.map(item => {
                                    const pId = item.productId || item.id;
                                    const img = productCatalog[pId]?.image || 'placeholder-glow.jpg';
                                    const itemPrice = String(item.price).includes('TND') ? item.price : `${item.price} TND`;
                                    return `
                                        <div class="order-item-row">
                                            <img src="${img}" class="account-item-mini-img" alt="${item.name}">
                                            <div style="flex: 1;">
                                                <div style="font-weight: 500;">${item.name}</div>
                                                <div style="color: #888; font-size: 0.85rem;">Size: ${item.size} | Qty: ${item.quantity}</div>
                                            </div>
                                            <div style="font-weight: 600;">${itemPrice}</div>
                                        </div>
                                    `;
                                }).join('');

                                const orderTotal = String(total).includes('TND') ? total : `${total} TND`;

                                const orderCard = document.createElement('div');
                                orderCard.classList.add('order-card', 'reveal', 'active');
                                orderCard.innerHTML = `
                                    <div class="order-header">
                                        <span>Order #${order.orderReference || order.id.slice(0, 8).toUpperCase()}</span>
                                        <span>${date}</span>
                                    </div>
                                    <div class="order-items">
                                        ${itemsHtml}
                                    </div>
                                    <div class="order-footer">
                                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                            <span class="status-badge ${statusClass}">${status}</span>
                                            <button class="reorder-btn" data-id="${order.id}">Reorder</button>
                                            ${trackButtonHtml}
                                            ${cancelButtonHtml}
                                            ${reviewButtonHtml}
                                        </div>
                                        <span style="color: var(--accent-gold);">${orderTotal}</span>
                                    </div>
                                `;
                                ordersList.appendChild(orderCard);
                            });

                            // Pagination Check
                            if (visibleOrdersCount < toRender.length) {
                                document.getElementById('load-more-orders-container').style.display = 'flex';
                            } else {
                                document.getElementById('load-more-orders-container').style.display = 'none';
                            }

                            // Re-bind listeners for newly rendered elements
                            attachOrderActionListeners(orders);
                        }
                    };

                    const attachOrderActionListeners = (allOrders) => {
                        document.querySelectorAll('.reorder-btn').forEach(btn => {
                            btn.onclick = (e) => {
                                const orderId = e.target.getAttribute('data-id');
                                const order = allOrders.find(o => o.id === orderId);
                                if (order && order.items) {
                                    order.items.forEach(item => {
                                        const existingItem = cart.find(c => c.id === item.id);
                                        if (existingItem) existingItem.quantity += item.quantity;
                                        else cart.push({ ...item });
                                    });
                                    updateCartUI();
                                    openCart();
                                }
                            };
                        });

                        document.querySelectorAll('.cancel-order-btn').forEach(btn => {
                            btn.onclick = async (e) => {
                                const btnElement = e.currentTarget;
                                const confirmed = await window.showConfirm("Are you sure you want to cancel this order? This action cannot be undone.", "Cancel Order");
                                if (!confirmed) return;

                                const orderId = btnElement.getAttribute('data-id');
                                btnElement.innerText = "Processing...";
                                btnElement.disabled = true;

                                try {
                                    await updateDoc(doc(db, "orders", orderId), { status: "Cancelled" });
                                    const orderCard = btnElement.closest('.order-card');
                                    const statusBadge = orderCard.querySelector('.status-badge');
                                    if (statusBadge) {
                                        statusBadge.textContent = "Cancelled";
                                        statusBadge.className = "status-badge status-cancelled";
                                    }
                                    btnElement.remove();
                                } catch (error) {
                                    console.error("Error cancelling order:", error);
                                    window.showToast("Failed to cancel order.", "error");
                                    btnElement.innerText = "Cancel";
                                    btnElement.disabled = false;
                                }
                            };
                        });

                        document.querySelectorAll('.review-prompt-btn').forEach(btn => {
                            btn.onclick = () => {
                                // Trigger the global review prompt modal which finds unreviewed items
                                if (typeof initGlobalReviewPrompt === 'function') {
                                    initGlobalReviewPrompt(true); // Force open if needed
                                } else {
                                    window.showToast("Review system is preparing...", "info");
                                }
                            };
                        });

                    };

                    // Initial Render
                    setTimeout(() => {
                        if (ordersLoader) ordersLoader.classList.remove('active');
                        ordersList.classList.add('visible');

                        orders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                        filteredOrders = [...orders];
                        renderOrders(filteredOrders);
                    }, 800);

                    // Dual Filter & Sort Logic
                    const sortDateSelect = document.getElementById('order-sort-date');
                    const filterStatusSelect = document.getElementById('order-filter-status');

                    const applyFilters = () => {
                        let filtered = [...orders];
                        const dateSort = sortDateSelect?.value || 'newest';
                        const statusFilter = filterStatusSelect?.value || 'all';

                        if (statusFilter !== 'all') {
                            filtered = filtered.filter(o => (o.status || 'Pending') === statusFilter);
                        }

                        if (dateSort === 'newest') {
                            filtered.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                        } else {
                            filtered.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
                        }

                        visibleOrdersCount = 10;
                        filteredOrders = filtered;
                        renderOrders(filteredOrders);
                    };

                    if (sortDateSelect) sortDateSelect.addEventListener('change', applyFilters);
                    if (filterStatusSelect) filterStatusSelect.addEventListener('change', applyFilters);

                    // Load More Orders Logic
                    const loadMoreOrdersBtn = document.getElementById('load-more-orders-btn');
                    if (loadMoreOrdersBtn) {
                        loadMoreOrdersBtn.onclick = () => {
                            loadMoreOrdersBtn.innerText = "Loading...";
                            setTimeout(() => {
                                visibleOrdersCount += 10;
                                renderOrders(filteredOrders, true);
                                loadMoreOrdersBtn.innerText = "View More Orders";
                            }, 500);
                        };
                    }
                } catch (error) {
                    console.error("Error fetching orders:", error);
                    if (ordersLoader) ordersLoader.classList.remove('active');
                    ordersList.classList.add('visible');
                    ordersList.innerHTML = '<p>Unable to load orders at this time.</p>';
                }
            } else {
                ordersList.innerHTML = '<p>Please <a href="#" onclick="document.getElementById(\'login-btn\').click(); return false;" style="text-decoration: underline;">login</a> to view your order history.</p>';
                if (accountUserName) accountUserName.textContent = "Guest";
            }
        }
    });

    updateCartUI(); // Initial call to set empty state
    updateCheckoutUI(); // Initial call for checkout page

    // 12. Checkout Form Validation & Submission
    const placeOrderBtn = document.querySelector('.place-order-btn');
    const checkoutForm = document.querySelector('.checkout-form form');

    if (placeOrderBtn && checkoutForm) {
        placeOrderBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (cart.length === 0) {
                window.showToast("Your cart is empty.", "error");
                return;
            }

            if (checkoutForm.checkValidity()) {
                // Simulate processing
                placeOrderBtn.innerText = "Processing...";
                placeOrderBtn.style.opacity = "0.7";
                placeOrderBtn.style.pointerEvents = "none";

                // Set a timeout for the entire operation to prevent infinite loading
                const operationTimeout = setTimeout(() => {
                    console.error("TIMEOUT: Firebase did not respond within 15 seconds.");
                    window.showToast("Server not responding. Please try again.", "error");
                    // Re-enable the button on failure
                    placeOrderBtn.innerText = "Place Order";
                    placeOrderBtn.style.opacity = "1";
                    placeOrderBtn.style.pointerEvents = "auto";
                }, 15000); // 15 seconds

                try {
                    // Call the secure createOrder Cloud Function
                    // This verifies prices server-side to prevent tampering
                    const createOrderFn = httpsCallable(functions, 'createOrder');

                    const result = await createOrderFn({
                        items: cart.map(item => ({
                            id: item.id,
                            productId: item.productId || item.id,
                            name: item.name,
                            size: item.size,
                            quantity: item.quantity,
                            price: item.price // Client provides, server verifies
                        })),
                        shipping: {
                            email: document.getElementById('checkout-email').value.trim(),
                            fullName: document.getElementById('checkout-name').value,
                            address: document.getElementById('checkout-address').value,
                            city: document.getElementById('checkout-city').value,
                            postalCode: document.getElementById('checkout-postal-code').value
                        }
                    });

                    const { orderId, orderReference } = result.data;

                    clearTimeout(operationTimeout);
                    console.log("Order placed successfully with ID: ", orderId);

                    // Track guest orders locally to allow claiming later
                    if (!currentUser) {
                        const guestOrders = JSON.parse(localStorage.getItem('dodch_guest_orders') || '[]');
                        guestOrders.push(orderId);
                        localStorage.setItem('dodch_guest_orders', JSON.stringify(guestOrders));
                    }


                    setTimeout(() => {
                        cart = [];
                        localStorage.setItem('dodch_cart', JSON.stringify(cart));
                        updateCartUI();

                        const orderSummary = document.querySelector('.order-summary');
                        if (orderSummary) {
                            let guestMessage = '';
                            if (!currentUser) {
                                const googleIconSmall = `<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px; background: white; border-radius: 50%; padding: 2px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>`;
                                guestMessage = `
                                    <div id="guest-convert-banner" style="margin-top: 1.5rem; padding: 1.5rem; background: #fff; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; transition: all 0.4s ease;">
                                        <h4 style="margin-bottom: 0.5rem; color: var(--text-charcoal); font-size: 1.1rem;">Track Your Luxury Journey</h4>
                                        <p style="font-size: 0.85rem; color: #666; margin-bottom: 1.2rem; max-width: 280px; margin-left: auto; margin-right: auto;">Create an account now to claim this order and access exclusive DODCH rewards.</p>
                                        <button onclick="document.getElementById('login-btn').click()" class="cta-button cta-button-primary" style="width: auto; padding: 0.7rem 1.8rem; font-size: 0.9rem; display: flex; align-items: center; margin: 0 auto;">
                                            ${googleIconSmall} Sign In with Google
                                        </button>
                                    </div>
                                `;
                            }

                            orderSummary.innerHTML = `
                                <div style="text-align: center; padding: 2rem 0; animation: fadeIn 0.5s ease;">
                                    <svg style="width: 60px; height: 60px; color: var(--accent-gold); margin-bottom: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    <h2 style="border: none; margin-bottom: 0.5rem;">Order Confirmed</h2>
                                    <p style="font-size: 0.95rem; opacity: 0.8;">Thank you for choosing DODCH. Your order #${orderReference} has been received.</p>
                                    ${guestMessage}
                                    <a href="index.html" class="cta-button cta-button-secondary" style="margin-top: 2rem; display: inline-block; width: auto; font-size: 0.85rem;">Return Home</a>
                                </div>
                            `;
                        }
                        if (window.innerWidth < 768) {
                            orderSummary.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 1000);

                } catch (err) {
                    clearTimeout(operationTimeout);
                    console.error("Error placing order:", err);
                    window.showToast(err.message || "Error placing order.", "error");
                    placeOrderBtn.innerText = "Place Order";
                    placeOrderBtn.style.opacity = "1";
                    placeOrderBtn.style.pointerEvents = "auto";
                }
            } else {
                // Trigger browser's built-in validation UI
                checkoutForm.reportValidity();
            }
        });
    }

    // 14. Newsletter Form Logic
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = newsletterForm.querySelector('button');
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const originalText = btn.innerText;

            addDoc(collection(db, "newsletter"), {
                email: emailInput.value,
                timestamp: new Date()
            });

            btn.innerText = "Joined";
            btn.style.backgroundColor = "#4CAF50"; // Green for success
            newsletterForm.reset();

            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = "";
            }, 3000);
        });
    }

    // 21. Breadcrumbs Logic
    const initBreadcrumbs = () => {
        const existing = document.querySelector('.breadcrumb-wrapper');
        if (existing) existing.remove();

        const path = window.location.pathname;
        const page = path.split("/").pop();

        // Skip for homepage only if it's the root without filters
        if ((page === "" || page === "index.html" || page === "/") && !window.location.search) return;

        // Skip for specific high-end story pages that handle their own navigation
        if (page.includes("face-foam.html") || page.includes("face-serum.html") || page.includes("silk-mask.html") || page.includes("dodchmellow-pro-v.html")) return;

        const main = document.querySelector('main');
        if (!main) return;

        let crumbs = [{ name: "Home", url: "index.html" }];
        let currentName = "";

        // Determine current page hierarchy
        if (page.includes("index.html") || page === "/" || page === "") {
            const urlParams = new URLSearchParams(window.location.search);
            const cat = urlParams.get('cat');
            const sub = urlParams.get('sub');

            if (cat) {
                const catNames = { 'hair-care': 'Hair Care', 'face-care': 'Face Care', 'sets': 'Sets & Bundles' };
                // Correct hierarchy: Home → Shop → Category
                crumbs.push({ name: "Shop", url: "index.html" });
                currentName = catNames[cat] || cat;

                if (sub && sub !== 'all') {
                    crumbs.push({ name: currentName, url: `index.html?cat=${cat}` });
                    const subNames = { 'shampoo': 'Shampoo', 'conditioners': 'Conditioners', 'leave-in': 'Leave-in', 'masks': 'Masks', 'cleansers': 'Cleansers', 'serums': 'Serums' };
                    currentName = subNames[sub] || sub;
                }
            } else {
                currentName = "Shop";
            }
        } else if (page.includes("about.html")) {
            currentName = "About Us";
        } else if (page.includes("careers.html")) {
            currentName = "Careers";
        } else if (page.includes("privacy-policy.html")) {
            currentName = "Privacy Policy";
        } else if (page.includes("terms-of-service.html")) {
            currentName = "Terms of Service";
        } else if (page.includes("shipping-returns.html")) {
            currentName = "Shipping & Returns";
        } else if (page.includes("faq.html")) {
            currentName = "FAQ";
        } else if (page.includes("checkout.html")) {
            crumbs.push({ name: "Shop", url: "index.html" });
            currentName = "Checkout";
        } else if (page.includes("my-account.html")) {
            currentName = "My Account";
        } else if (page.includes("tracking.html")) {
            crumbs.push({ name: "My Account", url: "my-account.html" });
            currentName = "Tracking";
        } else if (page.includes("admin.html")) {
            currentName = "Admin Dashboard";
        } else if (page.includes("product.html")) {
            crumbs.push({ name: "Shop", url: "index.html" });

            // Get product name from URL param
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            const product = productCatalog[productId] || productCatalog['glass-glow-shampoo'];
            currentName = product ? product.name : "Product";
        }

        if (currentName) {
            crumbs.push({ name: currentName, url: null });
        }

        // Build HTML
        const breadcrumbHTML = `
            <div class="breadcrumb-wrapper">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
                    ${crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;

            if (isLast) {
                return `
                            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                                <span itemprop="name" class="breadcrumb-current">${crumb.name}</span>
                                <meta itemprop="position" content="${index + 1}" />
                            </li>`;
            } else {
                // Schema.org recommends absolute URLs for "item".
                const absoluteUrl = new URL(crumb.url, window.location.href).href;
                return `
                            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                                <a itemprop="item" href="${absoluteUrl}">
                                    <span itemprop="name">${crumb.name}</span>
                                </a>
                                <meta itemprop="position" content="${index + 1}" />
                                <span class="breadcrumb-separator" aria-hidden="true">&gt;</span>
                            </li>`;
            }
        }).join('')}
                    </ol>
                </nav>
            </div>
        `;

        // Inject at the top of main
        main.insertAdjacentHTML('afterbegin', breadcrumbHTML);
        document.body.classList.add('has-breadcrumbs');
    };

    initBreadcrumbs();

    // 15. Smart Footer & Contact Section Injection
    const initSmartFooter = () => {
        const footer = document.querySelector('footer');

        // Run on all pages if footer exists
        if (footer) {
            // 1. Inject "Get in Touch" Section BEFORE footer (only if not already present)
            if (!document.getElementById('contact')) {
                const contactSectionHTML = `
                    <section id="contact" class="section-padding bg-white">
                        <div class="container">
                            <div class="contact-wrapper">
                                <div class="contact-info">
                                    <h3>Get in Touch</h3>
                                    <p style="margin-bottom: 2rem; opacity: 0.8;">Have questions about our products or your order? We're here to help.</p>
                                    
                                    <div class="contact-detail-item">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                        <a href="mailto:contact@dodch.com" style="color: inherit; text-decoration: none; transition: color 0.3s ease;" onmouseover="this.style.color='var(--accent-gold)'" onmouseout="this.style.color='inherit'">contact@dodch.com</a>
                                    </div>
                                    
                                    <div class="social-links">
                                        <a href="#" class="social-icon" aria-label="Instagram" target="_blank"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
                                        <a href="#" class="social-icon" aria-label="TikTok" target="_blank"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg></a>
                                        <a href="https://www.facebook.com/profile.php?id=61586824002342" class="social-icon" aria-label="Facebook" target="_blank"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
                                    </div>
                                </div>
                                
                                <div class="contact-form-container">
                                    <form id="main-contact-form">
                                        <!-- Honeypot Field (Hidden) -->
                                        <div style="position: absolute; left: -9999px;">
                                            <input type="text" name="website" tabindex="-1" autocomplete="off">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" placeholder="Your Name" required>
                                        </div>
                                        <div class="form-group">
                                            <input type="email" placeholder="Your Email" required>
                                        </div>
                                        <div class="form-group">
                                            <textarea rows="5" placeholder="Your Message" required></textarea>
                                        </div>
                                        <button type="submit" class="contact-submit-btn" style="background-color: var(--text-charcoal); color: #fff; padding: 1rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Send Message</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </section>
                `;

                footer.insertAdjacentHTML('beforebegin', contactSectionHTML);
            }

            // Replace footer content
            footer.innerHTML = `
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-col brand-col">
                            <h4>DODCH</h4>
                            <div class="footer-luxury-text" style="margin: 0; text-align: left; font-size: 0.95rem; max-width: 300px;">
                                "At DODCH, luxury is not just a label; it is an obsession. We source the rarest ingredients to deliver an experience that transcends the ordinary."
                            </div>
                        </div>
                        
                        <div class="footer-col">
                            <h4>Company</h4>
                            <ul style="list-style: none;">
                                <li><a href="about.html" class="footer-link">About Us</a></li>
                                <li><a href="careers.html" class="footer-link">Careers</a></li>
                            </ul>
                        </div>

                        <div class="footer-col">
                            <h4>Legal & Support</h4>
                            <ul style="list-style: none;">
                                <li><a href="privacy-policy.html" class="footer-link">Privacy Policy</a></li>
                                <li><a href="terms-of-service.html" class="footer-link">Terms of Service</a></li>
                                <li><a href="shipping-returns.html" class="footer-link">Shipping & Returns</a></li>
                                <li><a href="faq.html" class="footer-link">FAQ</a></li>
                            </ul>
                        </div>

                        <div class="footer-col">
                            <h4>Collections</h4>
                            <ul style="list-style: none;">
                                <li><a href="index.html" class="footer-link">Hair Care</a></li>
                                <li><a href="index.html" class="footer-link">Scalp Solutions</a></li>
                                <li><a href="index.html" class="footer-link">Accessories</a></li>
                                <li><a href="index.html" class="footer-link">Discovery Sets</a></li>
                            </ul>
                        </div>
                    </div>

                    <div class="copyright">
                        &copy; ${new Date().getFullYear()} DODCH. All Rights Reserved.
                    </div>
                </div>
            `;

            // 3. Bind Event for the contact form (injected or existing)
            const form = document.getElementById('main-contact-form') || document.getElementById('contact-form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();

                    // Honeypot Check
                    const honeypot = form.querySelector('input[name="website"]');
                    if (honeypot && honeypot.value) {
                        console.warn("Bot detected via honeypot.");
                        return; // Silently fail
                    }

                    // Rate Limit Check (Client-side)
                    const lastSubmit = localStorage.getItem('dodch_last_contact_ts');
                    if (lastSubmit) {
                        const timeSince = Date.now() - parseInt(lastSubmit);
                        // 2 minutes cooldown (120000 ms)
                        if (timeSince < 120000) {
                            const remaining = Math.ceil((120000 - timeSince) / 1000);
                            window.showToast(`Please wait ${remaining}s before sending another message.`, "error");
                            return;
                        }
                    }

                    const btn = form.querySelector('button');
                    const originalText = btn.innerText;
                    btn.innerText = "Sending...";
                    btn.disabled = true;

                    // Exclude honeypot from data collection
                    const inputs = Array.from(form.querySelectorAll('input, textarea'))
                        .filter(el => el.name !== 'website');

                    addDoc(collection(db, "messages"), {
                        name: inputs[0].value,
                        email: inputs[1].value,
                        message: inputs[2].value,
                        timestamp: serverTimestamp(),
                        source: 'footer_contact'
                    }).then(() => {
                        localStorage.setItem('dodch_last_contact_ts', Date.now());
                        window.showToast("Message sent successfully!", "success");
                        form.reset();
                        btn.innerText = "Message Sent";
                        setTimeout(() => {
                            btn.innerText = originalText;
                            btn.disabled = false;
                        }, 3000);
                    }).catch(err => {
                        console.error(err);
                        window.showToast(err.message || "Error sending message.", "error");
                        btn.innerText = originalText;
                        btn.disabled = false;
                    });
                });
            }
        }
    };

    initSmartFooter();

    // --- Sidebar Menu Rendering ---
    const renderSidebarMenu = () => {
        const sidebarMenu = document.querySelector('.sidebar-menu');
        if (!sidebarMenu) return;

        sidebarMenu.innerHTML = ''; // Clear existing static links

        const menuItems = [
            {
                label: "Home",
                id: "home",
                type: "group",
                icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
                children: [
                    { label: "All Products", link: "index.html?cat=all", type: "link", className: "sidebar-separator-link" },
                    {
                        label: "Hair Care",
                        id: "hair-care",
                        type: "group",
                        children: [
                            { label: "All Hair Products", link: "index.html?cat=hair-care&sub=all", type: "link" },
                            { label: "Shampoo", link: "index.html?cat=hair-care&sub=shampoo", type: "link" },
                            { label: "Conditioners", link: "index.html?cat=hair-care&sub=conditioners", type: "link" },
                            { label: "Masks", link: "index.html?cat=hair-care&sub=masks", type: "link" },
                            { label: "Leave-in", link: "index.html?cat=hair-care&sub=leave-in", type: "link" }
                        ]
                    },
                    {
                        label: "Face Care",
                        id: "face-care",
                        type: "group",
                        children: [
                            { label: "All Face Products", link: "index.html?cat=face-care&sub=all", type: "link" },
                            { label: "Cleansers", link: "index.html?cat=face-care&sub=cleansers", type: "link" },
                            { label: "Serums", link: "index.html?cat=face-care&sub=serums", type: "link" }
                        ]
                    },
                    { label: "Sets & Bundles", link: "index.html?cat=sets", type: "link" }
                ]
            },
            {
                label: "About Us",
                link: "about.html",
                type: "link",
                icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
            },
            {
                label: "Contact",
                link: "#contact",
                type: "link",
                icon: `<svg class="sidebar-icon" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`
            }
        ];

        const createMenuNode = (item) => {
            if (item.type === "group") {
                const group = document.createElement('div');
                group.className = 'sidebar-menu-group';
                if (item.id) group.dataset.id = item.id;

                const toggle = document.createElement('div');
                toggle.className = 'sidebar-menu-toggle';
                toggle.innerHTML = `${item.icon || ''}<span>${item.label}</span><span class="toggle-icon"></span>`;

                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();

                    // Close other open groups at the same level (Accordion behavior)
                    const siblings = Array.from(group.parentElement.children);
                    siblings.forEach(sibling => {
                        if (sibling !== group && sibling.classList.contains('sidebar-menu-group')) {
                            sibling.classList.remove('active');
                        }
                    });

                    group.classList.toggle('active');
                });

                const submenu = document.createElement('div');
                submenu.className = 'sidebar-submenu';

                item.children.forEach(child => {
                    submenu.appendChild(createMenuNode(child));
                });

                group.appendChild(toggle);
                group.appendChild(submenu);
                return group;
            } else {
                const link = document.createElement('a');
                link.href = item.link;
                link.innerHTML = `${item.icon || ''}<span>${item.label}</span>`;
                if (item.className) {
                    // Add multiple classes if separated by space
                    item.className.split(' ').forEach(cls => link.classList.add(cls));
                }

                // SPA Navigation for Shop
                if (item.link && item.link.includes('index.html')) {
                    link.addEventListener('click', (e) => {
                        // Only intercept if we are currently on index.html
                        if (window.location.pathname.includes('index.html')) {
                            e.preventDefault();
                            window.history.pushState({}, '', item.link);
                            initShopPage(true);
                            updateSidebarActiveState();
                            if (typeof initBreadcrumbs === 'function') initBreadcrumbs();
                        }
                    });
                }
                return link;
            }
        };

        menuItems.forEach(item => {
            sidebarMenu.appendChild(createMenuNode(item));
        });

        // Auto-expand sidebar based on current URL
        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('cat');
        const isShopPage = currentPath.endsWith('/') || currentPath.endsWith('index.html');

        if (isShopPage || currentPath.includes('product.html')) {
            const homeGroup = sidebarMenu.querySelector('.sidebar-menu-group[data-id="home"]');
            if (homeGroup) homeGroup.classList.add('active');

            if (cat === 'hair-care') {
                const hairGroup = sidebarMenu.querySelector('.sidebar-menu-group[data-id="hair-care"]');
                if (hairGroup) hairGroup.classList.add('active');
            } else if (cat === 'face-care') {
                const faceGroup = sidebarMenu.querySelector('.sidebar-menu-group[data-id="face-care"]');
                if (faceGroup) faceGroup.classList.add('active');
            }
        }
    };

    renderSidebarMenu();

    // 22. Highlight Active Sidebar Link
    const updateSidebarActiveState = () => {
        const currentUrl = new URL(window.location.href);

        // Treat base homepage as "All Products" for active state
        const isBaseHomePage = (currentUrl.pathname.endsWith('/') || currentUrl.pathname.endsWith('/index.html')) && currentUrl.search === '';
        if (isBaseHomePage) {
            currentUrl.searchParams.set('cat', 'all');
        }

        // Deactivate all first
        document.querySelectorAll('.sidebar-menu-group.active').forEach(g => g.classList.remove('active'));
        document.querySelectorAll('.sidebar-menu a.active').forEach(l => l.classList.remove('active'));

        let bestMatch = null;
        let maxScore = -1;

        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            const linkUrl = new URL(link.href, window.location.origin);
            let score = 0;

            // Rule 1: Must be on the same page (e.g., index.html)
            if (linkUrl.pathname !== currentUrl.pathname) {
                return;
            }
            score = 1;

            // Rule 2: Compare query parameters
            const currentParams = currentUrl.searchParams;
            const linkParams = linkUrl.searchParams;

            if (currentUrl.search === linkUrl.search) {
                score = 10; // Perfect match is best
            } else {
                let paramsMatch = true;
                let matchCount = 0;
                // The link's params must be a subset of the current URL's params
                for (const [key, value] of linkParams.entries()) {
                    if (currentParams.get(key) !== value) {
                        paramsMatch = false;
                        break;
                    }
                    matchCount++;
                }

                if (paramsMatch) {
                    score += matchCount;
                } else {
                    score = 0; // Not a valid candidate
                }
            }

            if (score > maxScore) {
                maxScore = score;
                bestMatch = link;
            }
        });

        if (bestMatch) {
            bestMatch.classList.add('active');
            let parent = bestMatch.closest('.sidebar-menu-group');
            while (parent) {
                parent.classList.add('active');
                parent = parent.parentElement.closest('.sidebar-menu-group');
            }

            // Scroll active item into view
            setTimeout(() => {
                const sidebar = document.getElementById('desktop-sidebar');
                if (sidebar && (window.innerWidth >= 768 || sidebar.classList.contains('active'))) {
                    bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    };
    updateSidebarActiveState();

    // 23. Highlight Contact Section
    const initContactHighlight = () => {
        const highlight = () => {
            const contactSection = document.getElementById('contact');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
                contactSection.classList.remove('highlight-section');
                void contactSection.offsetWidth; // Trigger reflow
                contactSection.classList.add('highlight-section');

                setTimeout(() => {
                    contactSection.classList.remove('highlight-section');
                }, 2000);
            }
        };

        if (initialHash === '#contact') {
            setTimeout(highlight, 1000);
        }

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                if (href && (href === '#contact' || href.endsWith('#contact'))) {
                    setTimeout(highlight, 100);
                }
            }
        });
    };
    initContactHighlight();

    // 24. Admin Dashboard Logic
    const initAdminPage = async () => {
        // Helper: Debounce function for search performance
        const debounce = (func, wait) => {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        };

        const adminOrdersList = document.getElementById('admin-orders-list');
        const adminProductsList = document.getElementById('admin-products-list');

        if (!adminOrdersList) return; // Not on admin page

        // Verify Admin
        onAuthStateChanged(auth, (user) => {
            if (!user || user.uid !== ADMIN_UID) {
                window.location.href = 'index.html';
            } else {
                loadAdminOrders();
                loadAdminProducts();
                loadRevenueChart();
                loadAdminMessages();
            }
        });

        // Tab Logic
        const tabs = document.querySelectorAll('.admin-tab-btn');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const targetPane = document.getElementById(`tab-${tab.dataset.tab}`);
                if (targetPane) targetPane.classList.add('active');
            });
        });

        // Product Modal Logic
        const addProductModal = document.getElementById('add-product-modal');
        const addProductBtn = document.getElementById('admin-add-product-btn');
        const cancelProductEditBtn = document.getElementById('cancel-product-edit');
        const addProductForm = document.getElementById('add-product-form');
        const addSizeBtn = document.getElementById('add-size-btn');
        const sizesContainer = document.getElementById('new-prod-sizes-container');
        const imageFileInput = document.getElementById('new-prod-image-file');
        const dropZone = document.getElementById('drop-zone');
        const imageUrlInput = document.getElementById('new-prod-image-url');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('image-preview');
        const removeImageBtn = document.getElementById('remove-image-btn');

        if (imageFileInput) {
            imageFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    imagePreview.src = URL.createObjectURL(file);
                    imagePreviewContainer.style.display = 'block';
                    const prompt = dropZone.querySelector('.drop-zone-prompt');
                    if (prompt) prompt.textContent = file.name;
                }
            });
        }

        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => {
                if (imageFileInput) imageFileInput.value = '';
                if (imageUrlInput) imageUrlInput.value = '';
                if (imagePreview) imagePreview.src = '';
                if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';

                const prompt = dropZone ? dropZone.querySelector('.drop-zone-prompt') : null;
                if (prompt) prompt.textContent = 'Drop file here or click to upload';
            });
        }

        if (dropZone && imageFileInput) {
            dropZone.addEventListener('click', () => imageFileInput.click());

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            ['dragleave', 'dragend'].forEach(type => {
                dropZone.addEventListener(type, () => dropZone.classList.remove('dragover'));
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');

                if (e.dataTransfer.files.length) {
                    imageFileInput.files = e.dataTransfer.files;
                    // Trigger change event manually to update preview
                    imageFileInput.dispatchEvent(new Event('change'));
                }
            });
        }

        const openProductModal = () => {
            if (addProductModal) {
                addProductModal.style.display = 'flex';
                setTimeout(() => addProductModal.classList.add('active'), 10);
            }
        };

        const closeProductModal = () => {
            if (addProductModal) {
                addProductModal.classList.remove('active');
                setTimeout(() => {
                    addProductModal.style.display = 'none';
                    if (addProductForm) addProductForm.reset();
                    if (sizesContainer) sizesContainer.innerHTML = '';
                    const productIdInput = document.getElementById('product-id-input');
                    if (productIdInput) productIdInput.value = '';
                    if (imageFileInput) imageFileInput.value = '';
                    if (imageUrlInput) imageUrlInput.value = '';
                    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
                    if (imagePreview) imagePreview.src = '';
                    const prompt = dropZone ? dropZone.querySelector('.drop-zone-prompt') : null;
                    if (prompt) prompt.textContent = 'Drop file here or click to upload';
                }, 300);
            }
        };

        if (addProductBtn) addProductBtn.addEventListener('click', () => {
            const modalTitle = document.getElementById('product-modal-title');
            if (modalTitle) modalTitle.textContent = 'Add New Product';
            openProductModal();
        });
        if (cancelProductEditBtn) cancelProductEditBtn.addEventListener('click', closeProductModal);
        if (addProductModal) {
            addProductModal.addEventListener('click', (e) => {
                if (e.target === addProductModal) closeProductModal();
            });
        }

        const addSizeInputRow = (size = { label: '', price: '', originalPrice: '' }) => {
            const sizeRow = document.createElement('div');
            sizeRow.className = 'product-size-row';
            sizeRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
            sizeRow.innerHTML = `
                <input type="text" class="size-label-input admin-search-input" placeholder="Size (e.g., 50ml)" value="${size.label}" required style="flex: 2;">
                <input type="number" step="0.01" class="size-price-input admin-search-input" placeholder="Price" value="${size.price}" required style="flex: 1;">
                <input type="number" step="0.01" class="size-original-price-input admin-search-input" placeholder="Old Price (Opt)" value="${size.originalPrice || ''}" style="flex: 1;">
                <button type="button" class="remove-size-btn" style="background: #e74c3c; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
            `;
            if (sizesContainer) sizesContainer.appendChild(sizeRow);
            sizeRow.querySelector('.remove-size-btn').addEventListener('click', () => sizeRow.remove());
        };

        if (addSizeBtn) addSizeBtn.addEventListener('click', () => addSizeInputRow());

        if (addProductForm) {
            addProductForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = addProductForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                const spinner = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 18px; height: 18px; animation: spin 1s linear infinite; margin-right: 8px; vertical-align: middle;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>';
                submitBtn.innerHTML = `${spinner} Saving...`;

                // --- Step 1: Handle Image Upload & Get URL ---
                let finalImageUrl = imageUrlInput.value;
                const file = imageFileInput.files[0];

                if (file) {
                    submitBtn.innerHTML = `${spinner} Uploading Image...`;
                    try {
                        const idForPath = document.getElementById('product-id-input').value || document.getElementById('new-prod-name').value.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                        const storageRef = ref(storage, `products/${idForPath}_${Date.now()}_${file.name}`);
                        await uploadBytes(storageRef, file);
                        finalImageUrl = await getDownloadURL(storageRef);
                    } catch (uploadError) {
                        console.error("Image upload failed:", uploadError);
                        window.showToast("Image upload failed. Check browser console for CORS errors.", "error");
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Save Product';
                        return;
                    }
                }

                if (!finalImageUrl) {
                    window.showToast("Please provide an image for the product.", "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Product';
                    return;
                }

                const idInput = document.getElementById('product-id-input');
                const isEdit = idInput && idInput.value;
                const name = document.getElementById('new-prod-name').value.trim();
                let newId;
                if (isEdit) {
                    newId = idInput.value;
                } else {
                    newId = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                    if (!newId || (productCatalog[newId])) {
                        window.showToast("Product with this name already exists or name is invalid.", "error");
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Save Product';
                        return;
                    }
                }

                const sizes = Array.from(sizesContainer.querySelectorAll('.product-size-row')).map(row => ({
                    label: row.querySelector('.size-label-input').value,
                    price: parseFloat(row.querySelector('.size-price-input').value).toFixed(2),
                    originalPrice: row.querySelector('.size-original-price-input').value ? parseFloat(row.querySelector('.size-original-price-input').value).toFixed(2) : null,
                    outOfStock: false // Default to false, will be preserved below if editing
                }));

                // Preserve existing data if editing
                const existingProduct = isEdit ? productCatalog[newId] : {};
                if (isEdit && existingProduct.sizes) {
                    sizes.forEach(newSize => {
                        const oldSize = existingProduct.sizes.find(s => s.label === newSize.label);
                        if (oldSize) newSize.outOfStock = oldSize.outOfStock;
                    });
                }

                if (sizes.length === 0) { window.showToast("Please add at least one size.", "error"); submitBtn.disabled = false; submitBtn.textContent = 'Save Product'; return; }

                // Calculate order index for new products
                let orderIndex = isEdit ? (existingProduct.orderIndex || 0) : 0;
                if (!isEdit) {
                    const existingIndices = Object.values(productCatalog).map(p => p.orderIndex || 0);
                    orderIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;
                }

                // --- Step 2: Construct Product Object with Final Image URL ---
                const newProduct = {
                    name,
                    subtitle: document.getElementById('new-prod-subtitle').value.trim(),
                    description: document.getElementById('new-prod-desc').value.trim(),
                    image: finalImageUrl,
                    sizes,
                    price: Math.min(...sizes.map(s => parseFloat(s.price))).toFixed(2),
                    outOfStock: isEdit ? (existingProduct.outOfStock || false) : false,
                    style: isEdit ? (existingProduct.style || "") : "",
                    orderIndex: orderIndex
                };

                // --- Step 3: Save to Firestore ---
                submitBtn.innerHTML = `${spinner} Saving Product...`;
                try { await setDoc(doc(db, "products", newId), newProduct); productCatalog[newId] = newProduct; loadAdminProducts(); closeProductModal(); window.showToast(isEdit ? "Product updated successfully!" : "Product added successfully!", "success"); } catch (error) { console.error("Error saving product:", error); window.showToast("Failed to save product.", "error"); } finally { submitBtn.disabled = false; submitBtn.textContent = 'Save Product'; }
            });
        }

        // Pagination State
        const pageSize = 10;
        let currentPage = 1;
        let cursors = [null]; // Stores the last document of each page to use as a cursor for the next

        // Filter/Sort Elements
        const filterStatus = document.getElementById('admin-filter-status');
        const sortDate = document.getElementById('admin-sort-date');

        const refreshOrders = () => {
            currentPage = 1;
            cursors = [null];
            loadAdminOrders(0);
        };

        if (filterStatus) filterStatus.addEventListener('change', refreshOrders);
        if (sortDate) sortDate.addEventListener('change', refreshOrders);

        // Export CSV Logic
        const exportBtn = document.getElementById('admin-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const originalText = exportBtn.innerText;
                exportBtn.innerText = "Exporting...";
                exportBtn.disabled = true;

                try {
                    // Fetch ALL matching orders (no limit) for export
                    let q = collection(db, "orders");
                    const statusValue = filterStatus ? filterStatus.value : '';
                    const dateDir = sortDate ? sortDate.value : 'desc';

                    if (statusValue) q = query(q, where("status", "==", statusValue));
                    q = query(q, orderBy("timestamp", dateDir));

                    const querySnapshot = await getDocs(q);

                    // CSV Header
                    let csvContent = "data:text/csv;charset=utf-8,Order ID,Date,Customer Name,Email,Status,Total (TND),Items\n";

                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
                        const itemsStr = data.items ? data.items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join('; ') : '';

                        // Escape commas in data to prevent CSV breakage
                        const row = [
                            data.orderReference || doc.id,
                            date,
                            `"${data.shipping?.fullName || ''}"`,
                            data.shipping?.email || '',
                            data.status || 'Pending',
                            data.total || 0,
                            `"${itemsStr}"`
                        ].join(",");
                        csvContent += row + "\n";
                    });

                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    window.showToast("Export complete!", "success");
                } catch (error) {
                    console.error("Export failed:", error);
                    window.showToast("Export failed. Check console for details.", "error");
                } finally {
                    exportBtn.innerText = originalText;
                    exportBtn.disabled = false;
                }
            });
        }

        const loadAdminMessages = async () => {
            const adminMessagesList = document.getElementById('admin-messages-list');
            if (!adminMessagesList) return;

            adminMessagesList.innerHTML = '<p>Loading messages...</p>';

            try {
                const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
                onSnapshot(q, (snapshot) => {
                    adminMessagesList.innerHTML = '';
                    if (snapshot.empty) {
                        adminMessagesList.innerHTML = '<p>No messages found.</p>';
                        return;
                    }

                    let unreadCount = 0;
                    snapshot.forEach(docSnap => {
                        const msg = docSnap.data();
                        const msgId = docSnap.id;

                        if (msg.status === 'unread') unreadCount++;

                        const dateStr = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleDateString() : 'N/A';
                        const safeName = escapeHTML(msg.name);
                        const safeEmail = escapeHTML(msg.email);
                        const safeMessage = escapeHTML(msg.message);

                        // For the mailto link, encodeURIComponent adds an extra layer of URL safety
                        const mailtoLink = `mailto:${safeEmail}?subject=Reply from DODCH Cosmetics&body=Dear ${encodeURIComponent(msg.name)},%0D%0A%0D%0AThank you for getting in touch with us at DODCH!%0D%0A%0D%0A`;

                        const el = document.createElement('div');
                        el.className = 'admin-order-card';
                        el.style.borderLeft = msg.status === 'unread' ? '4px solid #D4AF37' : '1px solid #eee';
                        el.style.backgroundColor = msg.status === 'unread' ? '#fffdf7' : '#fff';

                        el.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <div>
                                    <h3 style="margin: 0; font-size: 1.1rem; ${msg.status === 'unread' ? 'font-weight: 700;' : 'font-weight: 500;'}">${safeName}</h3>
                                    <p style="margin: 0; font-size: 0.9rem; color: #666;"><a href="mailto:${safeEmail}" style="color: inherit;">${safeEmail}</a></p>
                                </div>
                                <span style="font-size: 0.8rem; color: #999;">${dateStr}</span>
                            </div>
                            <p style="margin-bottom: 1.5rem; line-height: 1.5; white-space: pre-wrap; font-size: 0.95rem; color: var(--text-charcoal);">${safeMessage}</p>
                            <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 1rem;">
                                <a href="${mailtoLink}" class="admin-btn" style="background-color: transparent; border: 1px solid #3498db; color: #3498db; text-decoration: none; padding: 0.5rem 1rem; font-size: 0.85rem; display: flex; align-items: center;">Reply</a>
                                ${msg.status === 'unread' ? '<button class="admin-btn mark-read-btn" data-id="' + msgId + '" style="background-color: transparent; border: 1px solid #333; color: #333;">Mark as Read</button>' : ''}
                                <button class="admin-btn delete-msg-btn" data-id="${msgId}" style="background-color: transparent; border: 1px solid #e74c3c; color: #e74c3c;">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        `;
                        adminMessagesList.appendChild(el);
                    });

                    const badge = document.getElementById('unread-messages-badge');
                    if (badge) {
                        badge.textContent = unreadCount;
                        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                    }

                    document.querySelectorAll('.mark-read-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            try {
                                const id = e.currentTarget.dataset.id;
                                await updateDoc(doc(db, 'messages', id), { status: 'read' });
                            } catch (err) {
                                console.error(err);
                                window.showToast("Error updating message", "error");
                            }
                        });
                    });

                    document.querySelectorAll('.delete-msg-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            if (confirm("Are you sure you want to delete this message?")) {
                                try {
                                    const id = e.currentTarget.dataset.id;
                                    await deleteDoc(doc(db, 'messages', id));
                                    window.showToast("Message deleted", "success");
                                } catch (err) {
                                    console.error(err);
                                    window.showToast("Error deleting message", "error");
                                }
                            }
                        });
                    });

                }, (error) => {
                    console.error("Error fetching messages:", error);
                    adminMessagesList.innerHTML = '<p style="color: #ff4d4d;">Permission Denied or Error loading messages.</p>';
                });
            } catch (err) {
                console.error("Setup error:", err);
            }
        };

        const loadAdminOrders = async (pageIndex = 0) => {
            adminOrdersList.innerHTML = '<p>Loading orders...</p>';
            try {
                let q = collection(db, "orders");
                const statusValue = filterStatus ? filterStatus.value : '';
                const dateDir = sortDate ? sortDate.value : 'desc';

                // Apply Filters & Sorts
                if (statusValue) {
                    q = query(q, where("status", "==", statusValue));
                }

                // Always sort by timestamp
                q = query(q, orderBy("timestamp", dateDir));

                const cursor = cursors[pageIndex];

                if (cursor) {
                    q = query(q, startAfter(cursor));
                }

                q = query(q, limit(pageSize));

                const querySnapshot = await getDocs(q);
                const orders = [];
                querySnapshot.forEach((doc) => {
                    orders.push({ id: doc.id, ...doc.data() });
                });

                // Store cursor for the next page if we have a full page
                if (querySnapshot.docs.length > 0) {
                    cursors[pageIndex + 1] = querySnapshot.docs[querySnapshot.docs.length - 1];
                }

                if (orders.length === 0) {
                    adminOrdersList.innerHTML = '<p>No orders found.</p>';
                    if (pageIndex > 0) {
                        // If we went to a page with no results, just show empty but keep controls? 
                        // Or handle gracefully. For now, just showing empty is fine.
                    }
                    return;
                }

                const renderAdminOrdersList = (ordersToRender) => {
                    adminOrdersList.innerHTML = '';
                    if (ordersToRender.length === 0) {
                        adminOrdersList.innerHTML = '<p>No matching orders found.</p>';
                        return;
                    }
                    ordersToRender.forEach(order => {
                        const date = order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                        const status = order.status || 'Pending';

                        const el = document.createElement('div');
                        el.className = 'admin-order-card';
                        el.innerHTML = `
                        <div class="admin-order-header">
                            <strong>#${order.orderReference || order.id.slice(0, 6)}</strong>
                            <span>${date}</span>
                        </div>
                        <div class="admin-order-details">
                            <p><strong>Customer:</strong> ${escapeHTML(order.shipping?.fullName)} (${escapeHTML(order.shipping?.email)})</p>
                            <p><strong>Address:</strong> ${escapeHTML(order.shipping?.address)}, ${escapeHTML(order.shipping?.city)}</p>
                            <p><strong>Total:</strong> ${order.total} TND</p>
                            <div class="admin-order-items">
                                ${order.items.map(i => `<div>${i.quantity}x ${escapeHTML(i.name)} (${escapeHTML(i.size)})</div>`).join('')}
                            </div>
                        </div>
                        <div class="admin-order-actions">
                            <span class="status-badge status-${status.toLowerCase().replace(/\s/g, '-')}">${status}</span>
                            <select class="admin-status-select" data-id="${order.id}">
                                <option value="" disabled selected>Change Status</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="In Delivery">In Delivery</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    `;
                        adminOrdersList.appendChild(el);
                    });
                };

                renderAdminOrdersList(orders);

                // Search Logic
                const searchInput = document.getElementById('admin-order-search');
                if (searchInput) {
                    searchInput.addEventListener('input', debounce((e) => {
                        const term = e.target.value.toLowerCase();
                        const filtered = orders.filter(o =>
                            (o.id && o.id.toLowerCase().includes(term)) ||
                            (o.orderReference && o.orderReference.toLowerCase().includes(term)) ||
                            (o.shipping?.fullName && o.shipping.fullName.toLowerCase().includes(term)) ||
                            (o.shipping?.email && o.shipping.email.toLowerCase().includes(term))
                        );
                        renderAdminOrdersList(filtered);
                    }, 300));
                }

                // Render Pagination Controls
                const existingControls = document.getElementById('admin-pagination-controls');
                if (existingControls) existingControls.remove();

                const paginationHTML = `
                    <div id="admin-pagination-controls" class="admin-pagination">
                        <button id="prev-page-btn" class="pagination-btn" ${pageIndex === 0 ? 'disabled' : ''}>Previous</button>
                        <span class="page-info">Page ${pageIndex + 1}</span>
                        <button id="next-page-btn" class="pagination-btn" ${orders.length < pageSize ? 'disabled' : ''}>Next</button>
                    </div>
                `;
                adminOrdersList.insertAdjacentHTML('afterend', paginationHTML);

                document.getElementById('prev-page-btn').addEventListener('click', () => {
                    if (pageIndex > 0) {
                        loadAdminOrders(pageIndex - 1);
                    }
                });

                document.getElementById('next-page-btn').addEventListener('click', () => {
                    // Only allow next if we actually fetched a full page, implying more might exist
                    if (orders.length === pageSize) {
                        loadAdminOrders(pageIndex + 1);
                    }
                });

                // Bind status change events
                document.querySelectorAll('.admin-status-select').forEach(select => {
                    select.addEventListener('change', async (e) => {
                        const newStatus = e.target.value;
                        const orderId = e.target.dataset.id;
                        if (!newStatus) return;

                        if (await window.showConfirm(`Change order status to ${newStatus}?`, "Update Order")) {
                            try {
                                await updateDoc(doc(db, "orders", orderId), { status: newStatus, hasUnseenUpdate: true });
                                window.showToast("Order status updated", "success");

                                // Auto-open email client if Confirmed
                                if (newStatus === 'Confirmed') {
                                    const order = orders.find(o => o.id === orderId);
                                    if (order && order.shipping?.email) {
                                        const subject = `Order Confirmation: DODCH #${order.orderReference || order.id}`;
                                        const itemsList = order.items.map(i => `• ${i.quantity}x ${i.name} (${i.size})`).join('\n');
                                        const totalDisplay = typeof order.total === 'number' ? order.total.toFixed(2) : order.total;

                                        const body = `Dear ${order.shipping.fullName},

Thank you for choosing DODCH. We are delighted to confirm your order.

------------------------------------------------------
ORDER SUMMARY
------------------------------------------------------
Order Reference: ${order.orderReference || order.id}

ITEMS:
${itemsList}

------------------------------------------------------
TOTAL: ${totalDisplay} TND
------------------------------------------------------

We are preparing your order with care. You will receive another notification once it has been shipped.

Visit us: https://dodch.com

Warm regards,
The DODCH Team`;
                                        window.location.href = `mailto:${order.shipping.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    }
                                }
                            } catch (err) {
                                console.error(err);
                                window.showToast("Failed to update status", "error");
                            }
                        } else {
                            e.target.value = ""; // Reset
                        }
                    });
                });

            } catch (error) {
                console.error("Error loading orders:", error);
                if (error.code === 'permission-denied') {
                    adminOrdersList.innerHTML = '<p style="color: #ff4d4d;">Permission Denied. Please update Firestore Rules to allow Admin access.</p>';
                } else if (error.code === 'failed-precondition') {
                    adminOrdersList.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: #ff4d4d; border: 1px dashed #ff4d4d; border-radius: 8px;">
                            <h3 style="margin-bottom: 0.5rem;">Missing Index</h3>
                            <p style="margin-bottom: 1rem;">Firestore requires a specific index for this Filter + Sort combination.</p>
                            <ol style="text-align: left; display: inline-block; margin: 0 auto;">
                                <li>Open your browser console (<strong>F12</strong> or <strong>Right Click > Inspect > Console</strong>).</li>
                                <li>Look for the error message containing a long link.</li>
                                <li>Click the link to create the index automatically.</li>
                            </ol>
                        </div>`;
                } else {
                    adminOrdersList.innerHTML = `<p style="color: #ff4d4d;">Error: ${error.message}</p>`;
                }
            }
        };

        const loadAdminProducts = () => {
            // Inject Sync Button
            if (!document.getElementById('admin-sync-btn')) {
                const syncBtn = document.createElement('button');
                syncBtn.id = 'admin-sync-btn';
                syncBtn.className = 'admin-btn btn-save';
                syncBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg> Sync Catalog`;
                syncBtn.style.marginBottom = '20px';
                syncBtn.style.width = 'auto';
                syncBtn.style.flex = 'none';

                syncBtn.addEventListener('click', async () => {
                    if (await window.showConfirm("Overwrite Firestore products with local catalog data?", "Sync Catalog")) {
                        try {
                            const promises = Object.entries(productCatalog).map(([id, data]) => {
                                return setDoc(doc(db, "products", id), data, { merge: true });
                            });
                            await Promise.all(promises);
                            window.showToast("Catalog synced to Firestore!", "success");
                        } catch (e) {
                            console.error(e);
                            window.showToast("Sync failed: " + e.message, "error");
                        }
                    }
                });

                if (adminProductsList.parentElement) {
                    adminProductsList.parentElement.insertBefore(syncBtn, adminProductsList);
                }
            }

            adminProductsList.innerHTML = '';

            // Sort products by orderIndex
            const sortedEntries = Object.entries(productCatalog).sort(([, a], [, b]) => {
                const orderDiff = (a.orderIndex || 0) - (b.orderIndex || 0);
                if (orderDiff !== 0) return orderDiff;
                return a.name.localeCompare(b.name);
            });

            sortedEntries.forEach(([id, product], index) => {
                const el = document.createElement('div');
                el.className = 'admin-product-card';

                // Generate inputs for each size if available, otherwise fallback to single price
                let priceInputsHTML = '';
                if (product.sizes && product.sizes.length > 0) {
                    product.sizes.forEach((size, index) => {
                        priceInputsHTML += `
                            <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-size: 0.9rem; color: #555;">${size.label}</span>
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <input type="number" class="admin-size-price-input" data-index="${index}" value="${parseFloat(size.price)}" placeholder="Price" style="width: 70px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                                    <input type="number" class="admin-size-original-price-input" data-index="${index}" value="${size.originalPrice ? parseFloat(size.originalPrice) : ''}" placeholder="Old Price" style="width: 70px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                                    <label title="Mark this size as Out of Stock" style="font-size: 0.8rem; display: flex; align-items: center; cursor: pointer;"><input type="checkbox" class="admin-size-stock-check" data-index="${index}" ${size.outOfStock ? 'checked' : ''}> OOS</label>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    priceInputsHTML = `<label>Price (TND): <input type="number" class="admin-price-input" value="${parseFloat(product.price)}" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></label>`;
                }

                const isFirst = index === 0;
                const isLast = index === sortedEntries.length - 1;

                el.innerHTML = `
                    <div class="admin-product-info">
                        <img src="${product.image}" alt="${product.name}">
                        <div class="admin-product-details">
                            <h4>${product.name}</h4>
                            <p>${product.subtitle}</p>
                        </div>
                        <div class="admin-move-controls">
                            <button class="btn-move up admin-move-btn" data-id="${id}" ${isFirst ? 'disabled' : ''}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            </button>
                            <button class="btn-move down admin-move-btn" data-id="${id}" ${isLast ? 'disabled' : ''}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                        </div>
                    </div>
                    <div class="admin-product-controls">
                        <div class="price-inputs-container">
                            ${priceInputsHTML}
                        </div>
                        <label class="stock-label"><input type="checkbox" class="admin-stock-check" data-id="${id}" ${product.outOfStock ? 'checked' : ''}> Out of Stock</label>
                        <div class="admin-actions-row">
                            <button class="admin-btn btn-edit admin-edit-prod-btn" data-id="${id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                            </button>
                            <button class="admin-btn btn-save admin-save-prod-btn" data-id="${id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                Save
                            </button>
                            <button class="admin-btn btn-delete admin-delete-prod-btn" data-id="${id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Delete
                            </button>
                        </div>
                    </div>
                `;
                adminProductsList.appendChild(el);
            });

            document.querySelectorAll('.admin-edit-prod-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const product = productCatalog[id];
                    if (!product) return;

                    const idInput = document.getElementById('product-id-input');
                    if (idInput) idInput.value = id;

                    document.getElementById('new-prod-name').value = product.name || '';
                    document.getElementById('new-prod-subtitle').value = product.subtitle || '';
                    document.getElementById('new-prod-desc').value = product.description || '';

                    if (imageUrlInput) imageUrlInput.value = product.image || '';
                    if (imagePreview && product.image) {
                        imagePreview.src = product.image;
                        imagePreviewContainer.style.display = 'block';
                    }

                    const modalTitle = document.getElementById('product-modal-title');
                    if (modalTitle) modalTitle.textContent = 'Edit Product';

                    if (sizesContainer) sizesContainer.innerHTML = '';
                    if (product.sizes && Array.isArray(product.sizes)) {
                        product.sizes.forEach(size => addSizeInputRow(size));
                    }

                    openProductModal();
                });
            });

            document.querySelectorAll('.admin-save-prod-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const card = e.currentTarget.closest('.admin-product-card');
                    const outOfStock = card.querySelector('.admin-stock-check').checked;

                    try {
                        // Update local catalog
                        productCatalog[id].outOfStock = outOfStock;

                        // Handle Size Updates
                        const sizeInputs = card.querySelectorAll('.admin-size-price-input');
                        if (sizeInputs.length > 0) {
                            sizeInputs.forEach(input => {
                                const index = input.dataset.index;
                                const newPrice = parseFloat(input.value).toFixed(2);
                                productCatalog[id].sizes[index].price = newPrice;

                                // Update original price
                                const originalPriceInput = card.querySelector(`.admin-size-original-price-input[data-index="${index}"]`);
                                if (originalPriceInput) {
                                    const oldPrice = originalPriceInput.value ? parseFloat(originalPriceInput.value).toFixed(2) : null;
                                    productCatalog[id].sizes[index].originalPrice = oldPrice;
                                }

                                // Update stock status for size
                                const stockCheck = card.querySelector(`.admin-size-stock-check[data-index="${index}"]`);
                                if (stockCheck) {
                                    productCatalog[id].sizes[index].outOfStock = stockCheck.checked;
                                }
                            });

                            // Recalculate base price (lowest of the sizes)
                            const prices = productCatalog[id].sizes.map(s => parseFloat(s.price));
                            productCatalog[id].price = Math.min(...prices).toFixed(2);
                        } else {
                            // Handle Single Price Update
                            const priceInput = card.querySelector('.admin-price-input');
                            if (priceInput) {
                                productCatalog[id].price = parseFloat(priceInput.value).toFixed(2);
                            }
                        }

                        // Push full object to ensure sizes and other fields are synced
                        await setDoc(doc(db, "products", id), productCatalog[id], { merge: true });
                        window.showToast("Product updated", "success");
                    } catch (err) {
                        console.error(err);
                        window.showToast("Failed to update product", "error");
                    }
                });
            });

            document.querySelectorAll('.admin-delete-prod-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (await window.showConfirm("Are you sure you want to delete this product? This action cannot be undone.", "Delete Product")) {
                        try {
                            console.log("Deleting product:", id);
                            // Soft delete for default products (to persist deletion across reloads)
                            // We check hasOwnProperty to be safe
                            if (defaultProductCatalog.hasOwnProperty(id)) {
                                await setDoc(doc(db, "products", id), { deleted: true }, { merge: true });
                                console.log("Soft delete executed (marked as deleted in DB)");
                            } else {
                                await deleteDoc(doc(db, "products", id));
                                console.log("Hard delete executed (removed from DB)");
                            }

                            delete productCatalog[id];
                            loadAdminProducts();
                            window.showToast("Product deleted successfully.", "success");
                        } catch (error) {
                            console.error("Error deleting product:", error);
                            window.showToast("Failed to delete product.", "error");
                        }
                    }
                });
            });

            // Move Up/Down Logic
            document.querySelectorAll('.admin-move-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    const direction = e.currentTarget.classList.contains('up') ? -1 : 1;
                    const currentIndex = sortedEntries.findIndex(([pid]) => pid === id);
                    const targetIndex = currentIndex + direction;

                    if (targetIndex >= 0 && targetIndex < sortedEntries.length) {
                        // Re-index all items to ensure clean sequence
                        const batchPromises = [];

                        sortedEntries.forEach(([pid, p], idx) => {
                            let newIndex = idx;
                            if (idx === currentIndex) newIndex = targetIndex;
                            if (idx === targetIndex) newIndex = currentIndex;

                            if ((p.orderIndex !== newIndex)) {
                                p.orderIndex = newIndex;
                                productCatalog[pid].orderIndex = newIndex; // Update local immediately
                                batchPromises.push(updateDoc(doc(db, "products", pid), { orderIndex: newIndex }));
                            }
                        });

                        try {
                            await Promise.all(batchPromises);
                            loadAdminProducts(); // Re-render admin list
                            initShopPage(); // Re-render shop page if visible
                        } catch (err) {
                            console.error("Error reordering:", err);
                            window.showToast("Failed to reorder products.", "error");
                        }
                    }
                });
            });
        };

        // Expose for live updates from loadProductCatalog
        window.refreshAdminProducts = loadAdminProducts;

        const loadRevenueChart = async () => {
            const ctx = document.getElementById('revenueChart');
            if (!ctx) return;

            try {
                // Fetch all orders to aggregate revenue (in a real app, you might want a specific aggregation query)
                // We sort by timestamp to ensure chronological order
                const q = query(collection(db, "orders"), orderBy("timestamp", "asc"));
                const querySnapshot = await getDocs(q);

                const revenueByDate = {};
                let totalRevenue = 0;
                let totalOrdersCount = 0;
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                // Define statuses that count as revenue
                const validStatuses = ['Confirmed', 'In Delivery', 'Delivered'];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    totalOrdersCount++;

                    // Check if order has a valid status for revenue
                    if (data.timestamp && data.total && data.status && validStatuses.includes(data.status)) {
                        // Add to all-time total
                        totalRevenue += data.total;

                        const date = new Date(data.timestamp.seconds * 1000);
                        // Filter for last 30 days
                        if (date >= thirtyDaysAgo) {
                            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + data.total;
                        }
                    }
                });

                // Update Total Revenue Display
                const totalRevEl = document.getElementById('total-revenue-display');
                if (totalRevEl) totalRevEl.textContent = `${totalRevenue.toFixed(2)} TND`;

                // Update Total Orders Display
                const totalOrdersEl = document.getElementById('total-orders-display');
                if (totalOrdersEl) totalOrdersEl.textContent = totalOrdersCount.toLocaleString();

                const labels = Object.keys(revenueByDate);
                const data = Object.values(revenueByDate);

                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Revenue (TND)',
                            data: data,
                            borderColor: '#D4AF37',
                            backgroundColor: 'rgba(212, 175, 55, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            } catch (error) {
                console.error("Error loading revenue chart:", error);
            }
        };

    };
    initAdminPage();

    // 16. Quick View Logic
    const initQuickView = () => {
        // Inject Modal HTML
        const qvModalHTML = `
            <div id="qv-modal" class="qv-modal-overlay">

                <div class="qv-modal-content">
                    <button id="qv-close-btn" class="qv-close-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>

                    <div class="qv-image-container">
                        <img id="qv-image" src="" alt="Product Image" class="qv-modal-image">
                    </div>
                    <div class="qv-modal-info">
                        <span class="brand-tag" style="text-transform: uppercase; letter-spacing: 3px; font-size: 0.75rem; color: var(--accent-gold); margin-bottom: 0.5rem; display: block; font-weight: 600;">DODCH</span>
                        <h2 id="qv-title" class="qv-product-title"></h2>
                        <p id="qv-price" class="qv-product-price"></p>
                        <p id="qv-desc" class="qv-product-desc"></p>
                        
                        <a id="qv-learn-more" href="#" class="qv-view-details-btn">View Full Details</a>
                        
                        <div class="size-selector" style="margin-bottom: 2rem;">
                            <span class="size-label" style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.8rem; display: block; text-transform: uppercase; letter-spacing: 1px;">Select Size</span>
                            <div class="size-options">
                                <!-- Dynamic Buttons Injected Here -->
                            </div>
                        </div>

                        <button id="qv-add-to-cart" class="qv-add-to-cart-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            <span>Add to Cart</span>
                        </button>

                    </div>
                </div>
            </div>
        `;

        if (!document.getElementById('qv-modal')) {
            document.body.insertAdjacentHTML('beforeend', qvModalHTML);
        }

        const modal = document.getElementById('qv-modal');
        const closeBtn = document.getElementById('qv-close-btn');
        const qvImage = document.getElementById('qv-image');
        const qvTitle = document.getElementById('qv-title');
        const qvPrice = document.getElementById('qv-price');
        const qvDesc = document.getElementById('qv-desc');
        const qvAddToCart = document.getElementById('qv-add-to-cart');
        const qvLearnMore = document.getElementById('qv-learn-more');

        let currentProduct = {};

        // Open Modal
        // Use event delegation to handle both static and dynamically loaded buttons
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-view-btn')) {
                const btn = e.target;
                e.preventDefault();
                e.stopPropagation();

                const id = btn.dataset.id;

                if (id === 'glass-glow-shampoo') {
                    window.showToast('This product is no longer available.', 'error');
                    return;
                }

                // Smart Import: Use catalog data if available for consistency
                const product = productCatalog[id];

                const title = product ? product.name : btn.dataset.title;
                const price = product ? product.price : btn.dataset.price;
                const img = product ? product.image : btn.dataset.img;
                const desc = product ? product.description : btn.dataset.desc;
                const style = product ? product.style : btn.dataset.style;

                currentProduct = { id, title, price, img, desc };
                document.body.style.overflow = 'hidden';

                qvImage.src = img;
                qvImage.style = style || '';
                qvTitle.textContent = title;
                qvDesc.textContent = desc;

                if (qvLearnMore) {
                    qvLearnMore.href = (product && product.storyUrl) ? product.storyUrl : `product.html?id=${id}`;
                }

                // Dynamic Size Buttons for Quick View
                const sizeOptionsContainer = modal.querySelector('.size-options');
                const sizeSelector = modal.querySelector('.size-selector');
                sizeOptionsContainer.innerHTML = ''; // Clear previous

                if (product && product.sizes && product.sizes.length > 0) {
                    sizeSelector.style.display = 'block';

                    // Find index of lowest price
                    const prices = product.sizes.map(s => parseFloat(s.price));
                    const minPrice = Math.min(...prices);
                    const minIndex = product.sizes.findIndex(s => parseFloat(s.price) === minPrice);

                    product.sizes.forEach((sizeObj, index) => {
                        const btn = document.createElement('button');
                        btn.className = 'size-btn';
                        if (index === minIndex) {
                            btn.classList.add('active'); // Default to lowest
                            // Initial check for default size in Quick View
                            if (!product.outOfStock) {
                                if (sizeObj.outOfStock) {
                                    qvAddToCart.disabled = true;
                                    qvAddToCart.querySelector('span').textContent = "Out of Stock";
                                    qvAddToCart.style.backgroundColor = "#ccc";
                                } else {
                                    qvAddToCart.disabled = false;
                                    qvAddToCart.querySelector('span').textContent = "Add to Cart";
                                    qvAddToCart.style.backgroundColor = "";
                                }
                            }
                        }
                        btn.dataset.size = sizeObj.label;
                        btn.dataset.price = sizeObj.price;
                        btn.textContent = sizeObj.label;

                        btn.addEventListener('click', () => {
                            sizeOptionsContainer.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            if (sizeObj.originalPrice) {
                                qvPrice.innerHTML = `<span style="text-decoration: line-through; color: #bbb; margin-right: 8px; font-size: 0.8em;">${sizeObj.originalPrice} TND</span> ${sizeObj.price} TND`;
                            } else {
                                qvPrice.textContent = `${sizeObj.price} TND`;
                            }

                            if (!product.outOfStock) {
                                if (sizeObj.outOfStock) {
                                    qvAddToCart.disabled = true;
                                    qvAddToCart.querySelector('span').textContent = "Out of Stock";
                                    qvAddToCart.style.backgroundColor = "#ccc";
                                } else {
                                    qvAddToCart.disabled = false;
                                    qvAddToCart.querySelector('span').textContent = "Add to Cart";
                                    qvAddToCart.style.backgroundColor = "";
                                }
                            }
                        });

                        if (sizeObj.outOfStock && !product.outOfStock) {
                            btn.style.textDecoration = "line-through";
                            btn.style.opacity = "0.6";
                        }

                        sizeOptionsContainer.appendChild(btn);
                    });
                    // Set initial price to lowest size
                    const initialSize = product.sizes[minIndex];
                    if (initialSize.originalPrice) {
                        qvPrice.innerHTML = `<span style="text-decoration: line-through; color: #bbb; margin-right: 8px; font-size: 0.8em;">${initialSize.originalPrice} TND</span> ${initialSize.price} TND`;
                    } else {
                        qvPrice.textContent = `${initialSize.price} TND`;
                    }
                } else {
                    sizeSelector.style.display = 'none';
                    qvPrice.textContent = `${price} TND`;
                }

                // Handle Out of Stock in Quick View
                if (product && product.outOfStock) { // Global override
                    qvAddToCart.disabled = true;
                    qvAddToCart.querySelector('span').textContent = "Out of Stock";
                    qvAddToCart.style.backgroundColor = "#ccc";
                    qvAddToCart.style.cursor = "not-allowed";
                } else {
                    qvAddToCart.disabled = false;
                    qvAddToCart.querySelector('span').textContent = "Add to Cart";
                    qvAddToCart.style.backgroundColor = "";
                    qvAddToCart.style.cursor = "pointer";
                }

                modal.classList.add('active');
            }
        });

        const closeModal = () => {
            document.body.style.overflow = '';
            modal.classList.remove('active');
        };
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (qvAddToCart) {
            qvAddToCart.addEventListener('click', () => {
                const activeSizeBtn = modal.querySelector('.size-btn.active');
                const size = activeSizeBtn.dataset.size;
                const price = activeSizeBtn.dataset.price;

                const newItemId = `${currentProduct.title}-${size}`;
                const existingItem = cart.find(item => item.id === newItemId);

                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    cart.push({
                        id: newItemId,
                        productId: currentProduct.id, // Pass ID for server verification
                        name: currentProduct.title,
                        size: size,
                        price: `${price} TND`,
                        image: currentProduct.img,
                        quantity: 1
                    });
                }

                updateCartUI();
                closeModal();
                openCart();
            });
        }
    };

    initQuickView();

    // 19. Related Products Logic
    const loadRelatedProducts = () => {
        // Check if we are on a product page
        const productDetail = document.querySelector('.product-detail-container');
        const foamHero = document.querySelector('.foam-hero');
        const homeHero = document.getElementById('hero');
        const silkHero = document.getElementById('hero-silk');
        const serumPage = document.querySelector('.serum-page');

        if (!productDetail && !foamHero && !homeHero && !silkHero && !serumPage) return;

        // Create container if it doesn't exist
        let container = document.getElementById('related-products-container');
        if (!container) {
            container = document.createElement('section');
            container.id = 'related-products-container';
            container.classList.add('section-padding', 'bg-white');

            if (productDetail) {
                productDetail.after(container);
            } else if (foamHero || silkHero || serumPage) {
                const main = document.querySelector('main');
                if (main) main.appendChild(container);
            } else if (homeHero) {
                const contactSection = document.getElementById('contact');
                const main = document.querySelector('main');
                if (contactSection && main.contains(contactSection)) {
                    main.insertBefore(container, contactSection);
                } else if (main) {
                    main.appendChild(container);
                }
            }
        }

        // Get current product ID to exclude
        const urlParams = new URLSearchParams(window.location.search);
        let currentId = urlParams.get('id');

        // Handle Story Page specific IDs
        if (foamHero) {
            currentId = 'foaming-cleanser';
        } else if (silkHero) {
            currentId = 'silk-therapy-mask';
        } else if (serumPage) {
            currentId = 'advanced-ha-serum';
        }

        // Resolve effective ID (matching initProductPage logic) to ensure correct exclusion
        if (!currentId || !productCatalog[currentId]) {
            currentId = 'glass-glow-shampoo';
        }

        // Use productCatalog to ensure consistency with Shop page
        const allProductIds = Object.keys(productCatalog);

        // Filter out current product, shuffle the rest, and take up to 4
        const relatedIds = allProductIds
            .filter(id => id !== currentId)
            .sort(() => 0.5 - Math.random()) // Shuffle the array
            .slice(0, 4); // Take the first 4 from the shuffled array

        if (relatedIds.length === 0) {
            if (container) container.style.display = 'none'; // Hide if no related products
            return;
        } else {
            if (container) container.style.display = 'block';
        }

        let productsHtml = '';
        relatedIds.forEach(id => {
            const product = productCatalog[id];
            if (!product) return; // Safety check

            // Calculate lowest price from sizes if available
            let displayPrice = product.price;
            let hasDiscount = false;
            if (product.sizes && product.sizes.length > 0) {
                const prices = product.sizes.map(s => parseFloat(s.price));
                displayPrice = Math.min(...prices).toFixed(2);
                hasDiscount = product.sizes.some(s => s.originalPrice && parseFloat(s.originalPrice) > parseFloat(s.price));
            }

            let badgeHTML = '';
            if (product.outOfStock) {
                badgeHTML = '<span class="product-badge out-of-stock" style="position: absolute; top: 10px; left: 10px; background: #2D2D2D; color: white; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 30px;">OUT OF STOCK</span>';
            } else if (hasDiscount) {
                badgeHTML = '<span class="product-badge sale" style="position: absolute; top: 10px; left: 10px; background: #d4af37; color: white; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 30px;">ONLINE OFFER</span>';
            }

            productsHtml += `
                <div class="product-card reveal" ${product.outOfStock ? 'style="opacity: 0.8;"' : ''}>
                    <a href="product.html?id=${id}">
                        <div class="product-image-wrapper">
                            ${badgeHTML}
                            <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}" class="product-card-img" style="${product.style || ''}">
                            <button class="quick-view-btn" 
                                data-id="${id}" 
                                data-title="${product.name}" 
                                data-price="${displayPrice}" 
                                data-img="${product.image || 'https://via.placeholder.com/300'}" 
                                data-style="${product.style || ''}"
                                data-desc="${product.description || ''}">
                                Quick View
                            </button>
                        </div>
                        <div class="product-card-info">
                            <h3 class="product-card-title">${product.name}</h3>
                            <p class="product-card-price">${displayPrice} TND</p>
                        </div>
                    </a>
                </div>
            `;
        });

        const sectionTitle = homeHero ? "Explore Our Collection" : "You May Also Like";

        container.innerHTML = `
            <div class="container">
                <h2 class="section-title reveal active">${sectionTitle}</h2>
                <div class="shop-grid">
                    ${productsHtml}
                </div>
            </div>
        `;

        // Trigger reveal animation for new elements
        setTimeout(() => {
            const newReveals = container.querySelectorAll('.reveal');
            newReveals.forEach(el => el.classList.add('active'));
        }, 100);
    };

    loadRelatedProducts();

    // 17. Navbar Search Logic
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('navbar-search-input');
    const clearBtn = document.getElementById('search-clear-btn');

    if (searchToggleBtn && searchContainer && searchInput) {
        searchToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // If active and has text, you might want to submit here
            if (searchContainer.classList.contains('active') && searchInput.value.trim() !== "") {
                console.log("Search submitted:", searchInput.value);
                // window.location.href = `index.html?search=${searchInput.value}`;
            } else {
                searchContainer.classList.toggle('active');
                if (searchContainer.classList.contains('active')) {
                    searchInput.focus();
                    navbar.classList.add('search-active');
                } else {
                    navbar.classList.remove('search-active');
                }
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target) && !searchToggleBtn.contains(e.target) && searchContainer.classList.contains('active')) {
                if (searchInput.value === "") {
                    searchContainer.classList.remove('active');
                    navbar.classList.remove('search-active');
                }
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log("Search submitted:", searchInput.value);
                searchContainer.classList.remove('active');
                navbar.classList.remove('search-active');
                // window.location.href = `index.html?search=${searchInput.value}`;
            }
        });
    }

    // Handle Browser Back/Forward for SPA Shop
    window.addEventListener('popstate', () => {
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
            initShopPage(true);
            updateSidebarActiveState();
            initBreadcrumbs();
        }
    });

    // 27. Silk Mask Hair Type Selector
    const silkTabs = document.querySelectorAll('.hair-type-btn');
    const silkPanels = document.querySelectorAll('.hair-panel');

    if (silkTabs.length > 0 && silkPanels.length > 0) {
        silkTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 1. Handle Tab State
                silkTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // 2. Get Target Panel
                const targetType = tab.dataset.type;
                const targetPanel = document.getElementById(`panel-${targetType}`);

                // 3. Handle Panel Transition
                silkPanels.forEach(panel => {
                    panel.classList.remove('active');
                });

                if (targetPanel) {
                    // Force reflow for animation restart
                    void targetPanel.offsetWidth;
                    targetPanel.classList.add('active');
                }
            });
        });
    }

});

// 18. Tracking Page Logic
const initTrackingPage = () => {
    const trackingInfoContainer = document.getElementById('tracking-info');
    if (!trackingInfoContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const trackingNumber = urlParams.get('trackingNumber');
    const orderRef = urlParams.get('orderRef');

    const orderIdEl = document.getElementById('tracking-order-id');
    const trackingNumberEl = document.getElementById('tracking-number');

    if (orderId && trackingNumber && orderIdEl && trackingNumberEl) {
        orderIdEl.textContent = orderRef ? orderRef : orderId.slice(0, 8).toUpperCase();
        trackingNumberEl.textContent = trackingNumber;
        // In a real app, you would fetch live tracking data here.
        // The timeline is static HTML for this demo.
    } else {
        trackingInfoContainer.innerHTML = `
            <div class="account-header">
                <h1>Tracking Not Found</h1>
                <p>The provided order or tracking number is invalid. Please check the link and try again.</p>
                <a href="my-account.html" class="cta-button" style="margin-top: 2rem; display: inline-block; width: auto;">Go to My Account</a>
            </div>
        `;
    }
};

initTrackingPage();

// 25. Video Background for Elixir Section
const initVideoBackground = () => {
    const candidates = document.querySelectorAll('h1, h2, h3, h4, p, span, .section-title, .subtitle');
    candidates.forEach(el => {
        const text = el.textContent.toLowerCase();
        // Match "elixir" (or typo "elexir") and "seeds" to target "The Elixir of 30,000 Seeds"
        if ((text.includes('elixir') || text.includes('elexir')) && text.includes('seeds')) {
            // Prevent running on admin dashboard
            if (el.closest('.admin-container') || el.closest('.admin-section')) return;

            const section = el.closest('section') || el.closest('.hero') || el.closest('.banner');

            // Avoid duplicate injection
            if (section && !section.querySelector('.bg-video-layer') && !section.classList.contains('admin-section')) {
                // Ensure section can position absolute children
                if (window.getComputedStyle(section).position === 'static') {
                    section.style.position = 'relative';
                }
                section.style.overflow = 'hidden';

                const video = document.createElement('video');
                video.src = '6d3b1f62-a267-49f9-a4fd-5d47d471b174.mp4';
                video.autoplay = false;
                video.loop = false;
                video.muted = true;
                video.playsInline = true;
                video.className = 'bg-video-layer';

                Object.assign(video.style, {
                    position: 'absolute',
                    top: '-15%',
                    left: '0',
                    width: '100%',
                    height: '130%',
                    objectFit: 'cover',
                    zIndex: '0',
                    opacity: '0',
                    transition: 'opacity 1.5s ease',
                    willChange: 'transform'
                });

                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    zIndex: '1',
                    pointerEvents: 'none'
                });

                // Ensure existing content sits above the video and overlay
                Array.from(section.children).forEach(child => {
                    if (child !== video && child !== overlay) {
                        child.style.position = 'relative';
                        child.style.zIndex = '2';
                    }
                });

                // Force text color to white for visibility against dark overlay
                section.style.color = '#FFFFFF';
                section.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, .section-title, .subtitle').forEach(textEl => {
                    textEl.style.color = '#FFFFFF';
                    textEl.style.textShadow = '0 2px 4px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.7)';
                });

                section.insertBefore(overlay, section.firstChild);
                section.insertBefore(video, section.firstChild);

                // Fade in video when data is loaded
                video.addEventListener('loadeddata', () => {
                    video.style.opacity = '1';
                });

                // Gradually blur video as it plays
                const animateBlur = () => {
                    if (!video.paused && !video.ended) {
                        const progress = video.currentTime / video.duration || 0;
                        video.style.filter = `blur(${progress * 2.5}px)`; // Max 8px blur
                        requestAnimationFrame(animateBlur);
                    }
                };
                video.addEventListener('play', () => requestAnimationFrame(animateBlur));

                // Parallax Effect
                window.addEventListener('scroll', () => {
                    const rect = section.getBoundingClientRect();
                    const windowHeight = window.innerHeight;
                    if (rect.top < windowHeight && rect.bottom > 0) {
                        const sectionCenter = rect.top + rect.height / 2;
                        const screenCenter = windowHeight / 2;
                        const diff = screenCenter - sectionCenter;
                        video.style.transform = `translateY(${diff * 0.15}px)`;
                    }
                });

                // Performance: Play only when in viewport
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            if (!video.ended) {
                                video.play().catch(e => console.log("Autoplay prevented:", e));
                            }
                        } else {
                            video.pause();
                        }
                    });
                }, { threshold: 0.1 });

                observer.observe(section);
            }
        }
    });
};

// Run after a short delay to ensure dynamic content is populated
setTimeout(initVideoBackground, 800);

// 26. Real-time Notification Listeners
const listenForAdminNotifications = () => {
    const adminBtn = document.getElementById('sidebar-admin-btn');
    if (!adminBtn) return; // Don't run if not on a page with the admin button

    const q = query(collection(db, "orders"), where("status", "in", ["Pending", "Confirmed"]));
    onSnapshot(q, (snapshot) => {
        const newOrderCount = snapshot.size;

        let badge = adminBtn.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            adminBtn.appendChild(badge);
        }

        if (newOrderCount > 0) {
            badge.textContent = newOrderCount;
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }, (error) => {
        console.error("Admin notification listener failed:", error);
    });
};

const listenForUserNotifications = (userId) => {
    const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("timestamp", "desc"));
    let isInitialLoad = true;

    onSnapshot(q, (snapshot) => {
        // Check if ANY order has an unseen update on the server
        const hasUnseen = snapshot.docs.some(doc => doc.data().hasUnseenUpdate === true);

        if (hasUnseen) {
            document.body.classList.add('has-notification');
        } else {
            document.body.classList.remove('has-notification');
        }

        // Show toast and trigger review prompts for real-time updates
        if (!isInitialLoad) {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();

                // Only act if it's a newer update (unseen)
                if (change.type === "modified" && data.hasUnseenUpdate === true) {
                    const orderRef = data.orderReference || change.doc.id.slice(0, 8).toUpperCase();

                    // 1. Show standard status update toast
                    window.showToast(`Order #${orderRef}: Status is now ${data.status}.`, 'info');

                    // 2. If it just became 'Delivered', trigger the global review prompt logic
                    if (data.status === 'Delivered') {
                        console.log("Real-time delivery detected! Refreshing review prompt...");
                        initGlobalReviewPrompt();
                    }
                }
            });
        }
        isInitialLoad = false;
    }, (error) => {
        console.error("User notification listener failed:", error);
    });
};

// Reset notifications when user visits My Account
if (window.location.pathname.includes('my-account.html')) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        const q = query(collection(db, "orders"), where("userId", "==", user.uid), where("hasUnseenUpdate", "==", true));
        const snap = await getDocs(q);
        snap.forEach(async (orderDoc) => {
            await updateDoc(doc(db, "orders", orderDoc.id), { hasUnseenUpdate: false });
        });
        document.body.classList.remove('has-notification');

        // Tab Switching Logic
        const tabBtns = document.querySelectorAll('.account-tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');

                // Update buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update contents
                tabContents.forEach(content => {
                    if (content.id === `${targetTab}-tab-content`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });

        // Load User's Reviews
        // We wait a tiny bit to ensure catalog is synced if possible, 
        // though it usually is global now.
        setTimeout(() => initUserReviewsHistory(user), 500);
    });
}

// 21. Product Reviews
const initProductReviews = () => {
    const reviewsContainer = document.getElementById('product-reviews-container');
    if (!reviewsContainer) return; // Not on a product page

    // Determine product ID based on URL
    const path = window.location.pathname;
    let productId = null;
    if (path.includes('glass-glow-shampoo.html')) productId = 'glass-glow-shampoo';
    else if (path.includes('dodchmellow-pro-v.html')) productId = 'dodchmellow-pro-v';
    else if (path.includes('face-foam.html')) productId = 'foaming-cleanser';
    else if (path.includes('silk-mask.html')) productId = 'silk-therapy-mask';
    else if (path.includes('face-serum.html')) productId = 'advanced-ha-serum';

    // As a fallback, try to find a buy button with data-id
    if (!productId) {
        const buyBtn = document.querySelector('.buy-now-btn, .cta-button[data-id]');
        if (buyBtn) productId = buyBtn.getAttribute('data-id');
    }

    if (!productId) return;

    const reviewModal = document.getElementById('review-modal');
    const reviewForm = document.getElementById('product-review-form');
    const writeReviewBtn = document.getElementById('write-review-toggle-btn');
    const closeReviewModal = document.getElementById('close-review-modal');
    const imageInput = document.getElementById('review-images');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    // Handle Scroll to Review Section if triggered from prompt
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open_review') === 'true') {
        const reviewsSection = document.getElementById('reviews');
        if (reviewsSection) {
            setTimeout(() => {
                reviewsSection.scrollIntoView({ behavior: 'smooth' });
            }, 800);
        }
    }

    let selectedFiles = [];

    let userState = {
        loggedIn: false,
        eligible: false,
        alreadyReviewed: false,
        orderId: null, // To satisfy security rules
        user: null
    };

    // Handle Image Selection
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length + selectedFiles.length > 2) {
                window.showToast("Maximum 2 photos allowed per review.", "warning");
                return;
            }

            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                selectedFiles.push(file);

                // Show preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    const previewDiv = document.createElement('div');
                    previewDiv.style.cssText = 'position: relative; width: 60px; height: 60px;';
                    previewDiv.innerHTML = `
                        <img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                        <button type="button" class="remove-img" style="position: absolute; top: -5px; right: -5px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
                    `;

                    previewDiv.querySelector('.remove-img').addEventListener('click', () => {
                        selectedFiles = selectedFiles.filter(f => f !== file);
                        previewDiv.remove();
                    });

                    imagePreviewContainer.appendChild(previewDiv);
                };
                reader.readAsDataURL(file);
            });
            // Reset input so same file can be selected again if removed
            imageInput.value = '';
        });
    }

    // Render Reviews
    const renderReviews = (reviews) => {
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p class="text-center" style="color: #666; font-style: italic;">No reviews yet. Be the first to share your experience!</p>';
            return;
        }

        reviewsContainer.innerHTML = '';
        reviews.forEach(review => {
            const reviewEl = document.createElement('div');
            reviewEl.style.cssText = 'padding: 1.5rem; border-bottom: 1px solid #eee; margin-bottom: 1rem;';

            // Stars
            const starsHtml = Array(5).fill(0).map((_, i) => `<span style="color: ${i < review.rating ? '#F5A623' : '#e0e0e0'}; font-size: 1.2rem;">★</span>`).join('');

            // Date
            const date = review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';

            // Author Name
            const authorName = review.authorName || 'Verified Buyer';

            // Images
            let imagesHtml = '';
            if (review.images && review.images.length > 0) {
                imagesHtml = `
                    <div style="display: flex; gap: 0.8rem; margin-top: 1rem; margin-bottom: 0.5rem;">
                        ${review.images.map(url => `
                            <img src="${url}" 
                                 style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; transition: transform 0.3s ease;" 
                                 onclick="window.open('${url}', '_blank')"
                                 onmouseover="this.style.transform='scale(1.05)'"
                                 onmouseout="this.style.transform='scale(1)'"
                            >
                        `).join('')}
                    </div>
                `;
            }

            // Delete control for Author or Admin
            const isAuthor = auth.currentUser && review.userId === auth.currentUser.uid;
            const isAdmin = auth.currentUser && auth.currentUser.uid === ADMIN_UID;

            let deleteBtnHtml = '';
            if (isAuthor || isAdmin) {
                deleteBtnHtml = `<button class="review-delete-btn" onclick="window.handleReviewDelete('${review.id}')">Delete</button>`;
            }

            reviewEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                    <div style="font-weight: 600;">${authorName} <span style="background: #e6f4ea; color: #1e8e3e; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">✓ Verified Buyer</span></div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="color: #888; font-size: 0.85rem;">${date}</div>
                        ${deleteBtnHtml}
                    </div>
                </div>
                <div style="margin-bottom: 0.8rem;">${starsHtml}</div>
                <p style="margin: 0; line-height: 1.6;">${review.text}</p>
                ${imagesHtml}
            `;
            reviewsContainer.appendChild(reviewEl);
        });
    };

    // Fetch existing reviews
    const fetchReviews = async () => {
        try {
            const q = query(collection(db, "product_reviews"), where("productId", "==", productId));
            const querySnapshot = await getDocs(q);
            let reviews = [];
            querySnapshot.forEach((doc) => {
                reviews.push({ id: doc.id, ...doc.data() });
            });
            // Sort by date descending
            reviews.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.seconds : 0;
                const timeB = b.createdAt ? b.createdAt.seconds : 0;
                return timeB - timeA;
            });
            renderReviews(reviews);
        } catch (error) {
            console.error("Error fetching reviews:", error);
            reviewsContainer.innerHTML = '<p class="text-center" style="color: red;">Failed to load reviews.</p>';
        }
    };

    fetchReviews();

    // Modal Controls
    const openModal = () => {
        if (reviewModal) reviewModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scroll
    };

    const closeModal = () => {
        if (reviewModal) reviewModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scroll
        if (reviewForm) reviewForm.reset();

        // Clear images
        selectedFiles = [];
        if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
        if (imageInput) imageInput.value = '';
    };

    if (writeReviewBtn) {
        writeReviewBtn.addEventListener('click', () => {
            if (!userState.loggedIn) {
                window.showToast("Please log in to post a review.", "warning");
                return;
            }
            if (userState.alreadyReviewed) {
                window.showToast("You have already reviewed this product.", "info");
                return;
            }
            if (!userState.eligible) {
                window.showToast("You must purchase and receive this product before reviewing.", "warning");
                return;
            }
            openModal();
        });
    }

    if (closeReviewModal) {
        closeReviewModal.addEventListener('click', closeModal);
    }

    // Close on click outside
    if (reviewModal) {
        reviewModal.addEventListener('click', (e) => {
            if (e.target === reviewModal) closeModal();
        });
    }

    // Auth State change listener
    onAuthStateChanged(auth, async (user) => {
        const params = new URLSearchParams(window.location.search);
        const shouldOpenReview = params.get('open_review') === 'true';

        if (!user) {
            userState = { loggedIn: false, eligible: false, user: null };
            if (writeReviewBtn) {
                writeReviewBtn.classList.remove('eligible');
                writeReviewBtn.classList.add('ineligible');
                writeReviewBtn.removeAttribute('style');
            }
            if (shouldOpenReview) {
                window.showToast("Please log in to share your thoughts.", "info");
            }
            return;
        }

        userState.loggedIn = true;
        userState.user = user;

        try {
            // 1. Check if user has already reviewed this product
            const reviewsRef = collection(db, "product_reviews");
            const qReviews = query(reviewsRef, where("productId", "==", productId), where("userId", "==", user.uid));
            const reviewsSnapshot = await getDocs(qReviews);

            if (!reviewsSnapshot.empty) {
                userState.alreadyReviewed = true;
                if (writeReviewBtn) {
                    writeReviewBtn.classList.remove('eligible');
                    writeReviewBtn.classList.add('ineligible');
                    writeReviewBtn.innerText = "Reviewed ✅";
                }
                if (shouldOpenReview) {
                    window.showToast("You have already reviewed this product. Thank you!", "info");
                }
                return;
            }

            // 2. Check for a 'Delivered' order
            const ordersRef = collection(db, "orders");
            const qOrders = query(ordersRef, where("userId", "==", user.uid));
            const ordersSnapshot = await getDocs(qOrders);

            let latestDeliveredOrderId = null;
            let isEligible = false;

            ordersSnapshot.forEach((docSnap) => {
                const order = docSnap.data();
                if (order.status === 'Delivered' && order.items && Array.isArray(order.items)) {
                    if (order.items.some(item => (item.id === productId || item.productId === productId))) {
                        isEligible = true;
                        latestDeliveredOrderId = docSnap.id;
                    }
                }
            });

            userState.eligible = isEligible;
            userState.orderId = latestDeliveredOrderId;

            if (writeReviewBtn) {
                writeReviewBtn.removeAttribute('style');
                if (isEligible) {
                    writeReviewBtn.classList.remove('ineligible');
                    writeReviewBtn.classList.add('eligible');

                    // AUTO-OPEN MODAL if parameter is present
                    if (shouldOpenReview) {
                        setTimeout(() => {
                            openModal();
                            window.showToast("Fill in the form to post your review!", "success");
                        }, 1200);
                    }
                } else {
                    writeReviewBtn.classList.remove('eligible');
                    writeReviewBtn.classList.add('ineligible');
                    if (shouldOpenReview) {
                        window.showToast("Only verified purchasers can leave reviews.", "warning");
                    }
                }
            }
        } catch (error) {
            console.error("Error checking review eligibility:", error);
        }
    });

    // Handle Form Submission
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!userState.user) return;

            const submitBtn = document.getElementById('submit-review-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            const rating = parseInt(document.getElementById('review-rating').value);
            const text = document.getElementById('review-text').value.trim();

            if (!rating || !text) {
                window.showToast("Please provide both rating and review text.", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
                return;
            }

            if (text.length > 3000) {
                window.showToast("Review text is too long (max 3000 characters).", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
                return;
            }

            if (selectedFiles.length > 2) {
                window.showToast("Maximum 2 photos allowed.", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
                return;
            }

            try {
                // Upload images first if any
                const imageUrls = [];
                for (const [index, file] of selectedFiles.entries()) {
                    const storageRef = ref(storage, `product-reviews/${userState.user.uid}/${Date.now()}_${index}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(snapshot.ref);
                    imageUrls.push(url);
                }

                const newReview = {
                    productId: productId,
                    userId: userState.user.uid,
                    orderId: userState.orderId, // Crucial for security rules validation
                    authorName: userState.user.displayName || 'Verified Buyer',
                    rating: rating,
                    text: text,
                    images: imageUrls,
                    createdAt: serverTimestamp()
                };

                const reviewDocId = `${userState.user.uid}_${productId}`;
                await setDoc(doc(db, "product_reviews", reviewDocId), newReview);

                window.showToast("Review submitted successfully!", "success");
                closeModal();

                // Re-fetch to show new review
                fetchReviews();

                // Update button state locally
                userState.alreadyReviewed = true;
                if (writeReviewBtn) {
                    writeReviewBtn.classList.remove('eligible');
                    writeReviewBtn.classList.add('ineligible');
                    writeReviewBtn.innerText = "Reviewed ✅";
                }
            } catch (error) {
                console.error("Error submitting review:", error);
                window.showToast("Failed to submit review. You might have already reviewed this product.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
            }
        });
    }
};

// 22. User Review Deletion & History
window.handleReviewDelete = async (reviewId) => {
    const confirmation = prompt("To delete your review, please type 'DELETE' (all caps):");
    if (confirmation !== 'DELETE') {
        if (confirmation !== null) window.showToast("Deletion cancelled. Text mismatch.", "info");
        return;
    }

    try {
        await deleteDoc(doc(db, "product_reviews", reviewId));
        window.showToast("Review deleted successfully.", "success");

        // Refresh appropriate views
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        console.error("Error deleting review:", error);
        window.showToast("Failed to delete review.", "error");
    }
};

const initUserReviewsHistory = async (user) => {
    const listContainer = document.getElementById('user-reviews-list');
    const reviewsLoader = document.getElementById('reviews-loader');
    const loadMoreContainer = document.getElementById('load-more-reviews-container');
    const loadMoreBtn = document.getElementById('load-more-reviews-btn');
    if (!listContainer) return;

    if (reviewsLoader) reviewsLoader.classList.add('active');
    listContainer.classList.remove('visible');
    if (loadMoreContainer) loadMoreContainer.style.display = 'none';

    try {
        const q = query(collection(db, "product_reviews"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        const allReviews = [];
        snap.forEach(doc => allReviews.push({ id: doc.id, ...doc.data() }));

        // Sort newest first
        allReviews.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        let visibleReviewsCount = 10;

        const renderReviewChunk = (append = false) => {
            if (!append) listContainer.innerHTML = '';

            const chunk = allReviews.slice(append ? visibleReviewsCount - 10 : 0, visibleReviewsCount);

            if (!append && allReviews.length === 0) {
                listContainer.innerHTML = '<p style="color: #666; font-style: italic;">You haven\'t written any reviews yet.</p>';
                if (loadMoreContainer) loadMoreContainer.style.display = 'none';
                return;
            }

            chunk.forEach((review) => {
                const reviewEl = document.createElement('div');
                reviewEl.className = 'review-card-item content-fade visible';
                reviewEl.style.cssText = 'padding: 1.5rem; border: 1px solid #eee; border-radius: 12px; margin-bottom: 1.5rem; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.02);';

                // Map product IDs to human names and links
                let productName = 'Product';
                let productLink = '#';
                let productImg = 'placeholder-glow.jpg';

                if (review.productId === 'glass-glow-shampoo') {
                    productName = 'Glass Glow Shampoo';
                    productLink = 'glass-glow-shampoo.html';
                    productImg = productCatalog['glass-glow-shampoo']?.image || 'IMG_3489.jpg';
                } else if (review.productId === 'dodchmellow-pro-v') {
                    productName = 'DODCHmellow Pro-V';
                    productLink = 'dodchmellow-pro-v.html';
                    productImg = productCatalog['dodchmellow-pro-v']?.image || 'IMG_3490.jpg';
                } else if (review.productId === 'foaming-cleanser') {
                    productName = 'Advanced Face Foam';
                    productLink = 'face-foam.html';
                    productImg = productCatalog['foaming-cleanser']?.image || 'IMG_3352.PNG';
                } else if (review.productId === 'silk-therapy-mask') {
                    productName = 'Silk Therapy Mask';
                    productLink = 'silk-mask.html';
                    productImg = productCatalog['silk-therapy-mask']?.image || 'F188A04D-4AA7-4D98-9EEB-14861B10D468.PNG';
                } else if (productCatalog && productCatalog[review.productId]) {
                    const prod = productCatalog[review.productId];
                    productName = prod.name || 'Product';
                    productImg = prod.image || 'placeholder-glow.jpg';
                    productLink = prod.storyUrl || `product.html?id=${review.productId}`;
                } else {
                    productName = `Product (${review.productId || 'Unknown'})`;
                }

                const starsHtml = Array(5).fill(0).map((_, i) => `<span style="color: ${i < review.rating ? '#F5A623' : '#e0e0e0'}; font-size: 1.1rem;">★</span>`).join('');
                const date = review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Recent';

                reviewEl.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: flex-start; margin-bottom: 1.5rem;">
                    <img src="${productImg}" class="account-item-mini-img" alt="${productName}">
                    <div style="flex: 1;">
                        <a href="${productLink}" style="text-decoration: none; color: var(--text-charcoal); font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 600;">${productName}</a>
                        <div style="color: #888; font-size: 0.8rem; margin-top: 2px;">Reviewed on ${date}</div>
                    </div>
                </div>
                <div style="margin-bottom: 0.8rem;">${starsHtml}</div>
                <p style="font-size: 0.95rem; line-height: 1.6; color: #444; margin-bottom: 1.5rem;">${review.text}</p>
                <div style="display: flex; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 1rem; margin-top: auto;">
                    <button class="review-delete-btn" onclick="window.handleReviewDelete('${review.id}')" style="margin-top: 1rem;">Delete My Review</button>
                </div>
            `;
                listContainer.appendChild(reviewEl);
            });

            if (visibleReviewsCount < allReviews.length) {
                if (loadMoreContainer) loadMoreContainer.style.display = 'flex';
            } else {
                if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            }
        };

        setTimeout(() => {
            if (reviewsLoader) reviewsLoader.classList.remove('active');
            listContainer.classList.add('visible');
            renderReviewChunk();
        }, 800);

        if (loadMoreBtn) {
            loadMoreBtn.onclick = () => {
                loadMoreBtn.innerText = "Loading...";
                setTimeout(() => {
                    visibleReviewsCount += 10;
                    renderReviewChunk(true);
                    loadMoreBtn.innerText = "View More Reviews";
                }, 500);
            };
        }
    } catch (error) {
        console.error("Error loading user reviews:", error);
        if (reviewsLoader) reviewsLoader.classList.remove('active');
        listContainer.classList.add('visible');
        listContainer.innerHTML = '<p style="color: red;">Error loading your reviews.</p>';
    }
};


// Global Review Notification Logic
const initGlobalReviewPrompt = (forceShow = false) => {
    // Show on all pages as requested (removed product page suppression)

    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        try {
            // 1. Get all delivered orders for the user
            const ordersRef = collection(db, "orders");
            let orders = [];

            // Query by UID
            const qOrdersUid = query(ordersRef, where("userId", "==", user.uid));
            const snapUid = await getDocs(qOrdersUid);
            snapUid.forEach(doc => orders.push(doc.data()));

            // Also query by email (handles guest orders if user later creates an account)
            if (user.email) {
                const qOrdersEmail = query(ordersRef, where("shipping.email", "==", user.email));
                const snapEmail = await getDocs(qOrdersEmail);
                snapEmail.forEach(doc => {
                    const data = doc.data();
                    // Avoid duplicates if UID and Email both matched
                    if (!orders.some(o => o.orderReference === data.orderReference)) {
                        orders.push(data);
                    }
                });
            }

            // Determine the timestamp of the LATEST order to handle dismissal "until next purchase"
            let latestOrderTime = 0;
            orders.forEach(order => {
                // Handle complex Firestore timestamp or plain number
                const ts = order.timestamp ? (typeof order.timestamp.toMillis === 'function' ? order.timestamp.toMillis() : order.timestamp) : 0;
                if (ts > latestOrderTime) latestOrderTime = ts;
            });

            // If the user has explicitly dismissed ALL prompts, we only show it again if they've made a NEW purchase since then
            const dismissedAt = parseInt(localStorage.getItem('reviewPromptDismissedAt') || '0');
            if (dismissedAt > latestOrderTime && !forceShow) {
                console.log("Global review prompt suppressed by user dismissal (no new purchase since).");
                return;
            }

            let deliveredProducts = new Set();
            orders.forEach((order) => {
                // Robust status check (case-insensitive)
                const isDelivered = order.status && order.status.toLowerCase() === 'delivered';
                if (isDelivered && order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        deliveredProducts.add(item.productId || item.id);
                    });
                }
            });

            if (deliveredProducts.size === 0) {
                console.log("No delivered products found for user.");
                return;
            }

            console.log("Delivered products found:", [...deliveredProducts]);

            // 2. Get all reviews by this user
            const reviewsRef = collection(db, "product_reviews");
            const qReviews = query(reviewsRef, where("userId", "==", user.uid));
            const reviewsSnapshot = await getDocs(qReviews);

            let reviewedProducts = new Set();
            reviewsSnapshot.forEach((docSnap) => {
                const review = docSnap.data();
                if (review.productId) {
                    reviewedProducts.add(review.productId);
                }
            });

            console.log("Already reviewed items:", [...reviewedProducts]);

            // 3. Find first product that is delivered but NOT reviewed
            let productToReview = null;
            for (let pId of deliveredProducts) {
                if (!reviewedProducts.has(pId)) {
                    productToReview = pId;
                    break;
                }
            }

            if (productToReview) {
                // Map ID to page URL and readable name
                let pageUrl = '';
                let productName = 'your recent purchase';

                if (productToReview === 'glass-glow-shampoo') {
                    pageUrl = 'glass-glow-shampoo.html';
                    productName = 'Glass Glow Shampoo';
                } else if (productToReview === 'dodchmellow-pro-v') {
                    pageUrl = 'dodchmellow-pro-v.html';
                    productName = 'DODCHmellow Pro-V';
                } else if (productToReview === 'foaming-cleanser') {
                    pageUrl = 'face-foam.html';
                    productName = 'Advanced Face Foam';
                } else if (productToReview === 'silk-therapy-mask') {
                    pageUrl = 'silk-mask.html';
                    productName = 'Silk Therapy Mask';
                } else if (productToReview === 'advanced-ha-serum') {
                    pageUrl = 'face-serum.html';
                    productName = 'Advanced HA Serum';
                } else {
                    // Fallback using the mutable catalog if found
                    const catEntry = productCatalog[productToReview];
                    if (catEntry && catEntry.storyUrl) {
                        pageUrl = catEntry.storyUrl;
                        productName = catEntry.name;
                    } else {
                        pageUrl = `product.html?id=${productToReview}`;
                    }
                }

                // Show Notification Toast
                showReviewPromptToast(productName, pageUrl);
            }

        } catch (error) {
            console.error("Error checking global review eligibility:", error);
        }
    });
};

const showReviewPromptToast = (productName, pageUrl) => {
    // Show on all pages & on each refresh as requested (removed session guard)
    if (document.getElementById('review-prompt-toast')) return;

    const toastHTML = `
        <div id="review-prompt-toast" class="review-prompt-toast">
            <div class="rpt-content">
                <span class="brand-tag">DODCH</span>
                <p>How was your <strong>${productName}</strong>? We'd love to hear your thoughts!</p>
                <div class="rpt-actions">
                    <a href="${pageUrl}?open_review=true" class="rpt-btn">Leave a Review</a>
                    <button class="rpt-close" id="rpt-close-btn">&times;</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHTML);

    const toast = document.getElementById('review-prompt-toast');
    const closeBtn = document.getElementById('rpt-close-btn');

    // Smooth entrance
    setTimeout(() => {
        if (toast) toast.classList.add('active');
    }, 1500);

    closeBtn.addEventListener('click', () => {
        if (toast) toast.classList.remove('active');

        // Save the EXACT timestamp of dismissal
        localStorage.setItem('reviewPromptDismissedAt', Date.now().toString());

        // Inform the user with a shorter message and longer duration
        setTimeout(() => {
            window.showToast("Review dismissed. You can still leave feedback later from your Account or Product pages.", "info", 6000);
            // Remove from DOM to keep it clean
            setTimeout(() => toast && toast.remove(), 1000);
        }, 800);
    });
};

// Account Tab Switching Logic
const initAccountTabs = () => {
    const tabBtns = document.querySelectorAll('.account-tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabBtns.length === 0) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // 1. Update Buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 2. Update Content (with improved cross-fade)
            tabContents.forEach(content => {
                if (content.id === `${targetTab}-tab-content`) {
                    content.style.display = 'block';
                    // Re-trigger entrance
                    setTimeout(() => {
                        content.classList.add('active');
                    }, 10);
                } else {
                    content.classList.remove('active');
                    // Keep briefly for fade out, then hide
                    setTimeout(() => {
                        if (!content.classList.contains('active')) {
                            content.style.display = 'none';
                        }
                    }, 500);
                }
            });
        });
    });
};

// Initialize reviews and global prompts when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initProductReviews();
        initGlobalReviewPrompt();
        initAccountTabs();
    });
} else {
    initProductReviews();
    initGlobalReviewPrompt();
    initAccountTabs();
}

const SEARCH_SYNONYMS = {
    'shampoo': ['shampoing', 'شامبو', 'wash', 'hair', 'cleaning', 'cleanser', 'nettoyant', 'غسول'],
    'oil': ['huile', 'زيت', 'care', 'treatment', 'elixir', 'drops', 'gouttes', 'قطرات'],
    'serum': ['سيروم', 'concentre', 'face', 'booster', 'ampoule', 'essence'],
    'mask': ['masque', 'قناع', 'care', 'treatment', 'wrap', 'soin'],
    'pear': ['figue', 'صبار', 'barbarie', 'prickly', 'cactus'],
    'fig': ['figue', 'صبار', 'barbarie'],
    'silk': ['soie', 'حرير', 'smooth', 'lisse', 'soft', 'doux'],
    'glow': ['eclat', 'اللمعان', 'bright', 'shine', 'radiant', 'brillance', 'nuage'],
    'face': ['visage', 'وجه', 'skin', 'peau', 'بشرة'],
    'body': ['corps', 'جسم', 'skin'],
    'hair': ['cheveux', 'شعر', 'scalp', 'cuir chevelu', 'فروة']
};

const SEARCH_INTENTS = {
    'needs_hydration': ['dry', 'dehydrated', 'thirsty', 'brittle', 'جاف', 'عطشان', 'sec', 'deshydrate', 'moisture', 'hydratation', 'ترطيب', 'ashy', 'flakey'],
    'needs_repair': ['damaged', 'breakage', 'split ends', 'weak', 'تالف', 'مكسر', 'abime', 'casse', 'repair', 'reparer', 'اصلاح', 'fragile', 'weakness'],
    'wants_luxury': ['premium', 'luxury', 'exclusive', 'best', 'فاخر', 'راقي', 'luxe', 'precieux', 'high-end', 'expensive', 'gold', 'or'],
    'wants_scent': ['smell', 'scent', 'fragrance', 'perfume', 'neroli', 'flower', 'رائحة', 'عطر', 'parfum', 'fleur', 'sweet', 'sucre', 'odeur'],
    'wants_growth': ['grow', 'loss', 'thinning', 'volume', 'chute', 'pousse', 'تساقط', 'نمو', 'thick', 'density'],
    'wants_smooth': ['frizz', 'frizzy', 'tangle', 'smooth', 'frisottis', 'lisse', 'tame', 'مجعد', 'ناعم', 'detangle', 'demelant'],
    'wants_antiaging': ['wrinkle', 'aging', 'youth', 'rides', 'anti-age', 'تجاعيد', 'شيخوخة', 'firm', 'lift', 'fermete']
};

// Massive SEO metadata simulation acting as a "scraped" knowledge base across site pages
const SITE_SEO_KNOWLEDGE = {
    'shampoo': [
        'sulfate-free', 'sans sulfate', 'خالي من السلفات', 'color-safe', 'daily use', 'usage quotidien', 'استخدام يومي',
        'cleansing', 'scalp care', 'purifying', 'purifiant', 'تطهير', 'mellow', 'marshmallow', 'guimauve'
    ],
    'mask': [
        'deep conditioning', 'soin profond', 'عناية عميقة', 'protein', 'keratin', 'ceramides', '10 minutes',
        'overnight', 'nuit', 'leave-in', 'sans rincage', 'بدون غسل', 'revitalize', 'revitalisant'
    ],
    'serum': [
        'hyaluronic', 'vitamin c', 'niacinamide', 'glass skin', 'peau de verre', 'بشرة زجاجية', 'fast-absorbing',
        'absorbtion rapide', 'سريع الامتصاص', 'lightweight', 'leger', 'خفيف', 'youth booster'
    ],
    'oil': [
        'argan', 'jojoba', 'vitamin e', 'anti-oxidant', 'antioxydant', 'مضاد اكسدة', 'pure', 'cold-pressed',
        'pressee a froid', 'عصرة باردة', 'multipurpose', 'multi-usages', 'متعدد الاستخدامات', 'nail cuticles', 'cuticules', 'beard', 'barbe'
    ]
};

class DODCHSearchEngine {
    constructor() {
        this.catalog = {};
        this.index = [];
    }

    // Helper to normalize strings (handle Arabic variations and French accents)
    normalize(str) {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove French accents
            .replace(/[آأإا]/g, 'ا') // Normalize Arabic Alef
            .replace(/ة/g, 'ه')     // Normalize Arabic Tehmabuta
            .replace(/ى/g, 'ي')     // Normalize Arabic Alef Maksura
            .trim();
    }

    // Initialize with productCatalog
    init(catalog) {
        this.catalog = catalog;
        this.index = Object.entries(catalog).map(([id, item]) => {
            let tags = (item.tags || []).map(t => this.normalize(t));

            // Expand searchable text with synonyms
            const synonyms = [];
            const allText = (item.name + ' ' + (item.category || '')).toLowerCase();

            for (const [key, list] of Object.entries(SEARCH_SYNONYMS)) {
                if (allText.includes(key) || list.some(l => allText.includes(l))) {
                    synonyms.push(...list, key);
                }
            }

            // Inject massive SEO Deep Knowledge based on product type
            const seoTags = [];
            for (const [category, knowledgeList] of Object.entries(SITE_SEO_KNOWLEDGE)) {
                if (allText.includes(category)) {
                    seoTags.push(...knowledgeList.map(k => this.normalize(k)));
                }
            }

            // Inject Intent Labels (e.g. if the product is known for hydration, give it the intent tag)
            // By default, let's map known products to their best intents so AI finds them easily based on descriptions
            if (allText.includes('shampoo') || allText.includes('mask')) {
                tags.push('needs_hydration', 'needs_repair', 'wants_smooth');
            }
            if (allText.includes('shampoo')) {
                tags.push('wants_scent');
            }
            if (allText.includes('serum') || allText.includes('oil')) {
                tags.push('wants_antiaging', 'wants_glow', 'needs_repair');
            }
            if (allText.includes('oil')) {
                tags.push('wants_growth'); // Often used for scalp/beard growth
            }

            const indexItem = {
                id: id,
                name: this.normalize(item.name),
                category: this.normalize(item.category || ''),
                description: this.normalize(item.description || ''),
                tags: [...new Set([...tags, ...synonyms, ...seoTags])],
                price: item.price,
                scrapedText: '' // Will be populated asynchronously
            };

            // Stealthily fetch and scrape the product page HTML in the background
            if (item.storyUrl && !item.storyUrl.startsWith('http')) {
                fetch(item.storyUrl)
                    .then(response => response.text())
                    .then(html => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');

                        // Extract text from meaningful SEO blocks (main content, descriptions, ingredients)
                        const scrapeTargets = doc.querySelectorAll('main p, main h1, main h2, main h3, main li, .inci-list span, .product-story');
                        let textAccumulator = '';
                        scrapeTargets.forEach(el => {
                            textAccumulator += ' ' + el.textContent;
                        });

                        indexItem.scrapedText = this.normalize(textAccumulator);
                    })
                    .catch(err => console.warn(`Silent scrape failed for ${item.storyUrl}:`, err));
            }

            return indexItem;
        });
    }

    // Basic Levenshtein distance for fuzzy matching
    levenshtein(a, b) {
        const matrix = [];
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // Check if a token roughly matches a target string
    isFuzzyMatch(token, targetString) {
        if (targetString.includes(token)) return true;

        // Intelligent fuzzy threshold: longer words allow more typos
        const threshold = token.length > 6 ? 2 : 1;

        if (token.length > 3) {
            const words = targetString.split(/\s+/);
            for (let word of words) {
                if (word.length > 3 && this.levenshtein(token, word) <= threshold) {
                    return true;
                }
            }
        }
        return false;
    }

    search(query) {
        if (!query || query.trim().length === 0) return [];

        const normalizedQuery = this.normalize(query);
        const tokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
        if (tokens.length === 0) return [];

        const results = [];

        for (const item of this.index) {
            let score = 0;
            let matchesAll = true;
            let matchedReasons = [];

            for (const token of tokens) {
                let tokenMatched = false;

                // 1. Exact Name match (Highest Priority)
                if (item.name.includes(token)) {
                    score += 15;
                    tokenMatched = true;
                    // Don't add a specific reason for name match to keep UI clean, it's obvious to the user.
                }
                // 2. Intent matching (Semantic Search)
                else if (!tokenMatched) {
                    for (const [intent, keywords] of Object.entries(SEARCH_INTENTS)) {
                        if (keywords.includes(token) && item.tags.includes(intent)) {
                            score += 12; // High priority for semantic needs
                            tokenMatched = true;
                            matchedReasons.push(`Solves intent for "${intent.replace(/_/g, ' ')}"`);
                            break;
                        }
                    }
                }

                // 3. Tags/Synonyms match
                if (!tokenMatched && item.tags.some(t => t.includes(token) || this.isFuzzyMatch(token, t))) {
                    score += 10;
                    tokenMatched = true;
                    matchedReasons.push(`Matches deep semantic tags related to "${token}"`);
                }
                // 4. Fuzzy Name match
                else if (!tokenMatched && this.isFuzzyMatch(token, item.name)) {
                    score += 8;
                    tokenMatched = true;
                }
                // 5. Category match
                else if (!tokenMatched && item.category.includes(token)) {
                    score += 5;
                    tokenMatched = true;
                    matchedReasons.push(`Category match`);
                }
                // 6. Deep HTML Scrape Match (Lowest Priority but highly comprehensive)
                else if (!tokenMatched && item.scrapedText && (item.scrapedText.includes(token) || this.isFuzzyMatch(token, item.scrapedText))) {
                    score += 3;
                    tokenMatched = true;
                    matchedReasons.push(`Content explicitly found inside product details`);
                }
                // 7. Description match
                else if (!tokenMatched && this.isFuzzyMatch(token, item.description)) {
                    score += 2;
                    tokenMatched = true;
                }

                if (!tokenMatched) {
                    matchesAll = false;
                    break;
                }
            }

            if (matchesAll && score > 0) {
                // Determine the best reason to show, distinct and concise.
                const uniqueReasons = [...new Set(matchedReasons)];
                const topReason = uniqueReasons.length > 0 ? uniqueReasons[0] : "Identified as a strong contextual match";
                results.push({ item: this.catalog[item.id], id: item.id, score: score, matchedReason: topReason });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 5);
    }

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('dodch_search_history') || '[]');
        } catch (e) { return []; }
    }

    addToHistory(query) {
        if (!query || query.length < 2) return;
        let history = this.getHistory();
        history = [query, ...history.filter(h => h !== query)].slice(0, 5);
        localStorage.setItem('dodch_search_history', JSON.stringify(history));
    }
}

window.dodchSearchEngine = new DODCHSearchEngine();


// Advanced Search Integration
document.addEventListener("DOMContentLoaded", () => {
    // We need to wait for productCatalog to load, or re-init when it does
    // For now we will set up a watcher or just wait a bit, but ideally called after catalog loads
    setTimeout(() => {
        if (window.productCatalog && Object.keys(window.productCatalog).length > 0) {
            window.dodchSearchEngine.init(window.productCatalog);
            console.log("Search Engine Initialized with", Object.keys(window.productCatalog).length, "products");
        }
    }, 1500); // Wait for potential firebase load

    const searchContainers = document.querySelectorAll(".search-container");

    // Create halo element
    const halo = document.createElement("div");
    halo.id = "search-results-halo";
    document.body.appendChild(halo);

    // Create dropdown element
    const dropdown = document.createElement("div");
    dropdown.id = "search-results-dropdown";
    document.body.appendChild(dropdown);

    let activeInput = null;
    let selectedIndex = -1;
    let currentResults = [];

    // Debounce helper
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Safe global handler for trending search clicks to avoid long-string inline HTML issues
    window.dodchSearchTrendClick = (q) => {
        const inp = document.getElementById('navbar-search-input');
        if (inp) {
            inp.value = q;
            inp.focus();
            inp.dispatchEvent(new Event('input'));
        }
    };

    const populateWidgets = (container) => {
        const trends = [
            { query: 'Shampoo', label: 'Shampoo for Daily Use' },
            { query: 'Serum', label: 'Hydrating Serums' },
            { query: 'Mask', label: 'Silk Therapy Mask' }
        ];

        let listHtml = '';
        trends.forEach(t => {
            listHtml += `<div class="search-widget-list-item" onclick="window.dodchSearchTrendClick('${t.query}')" style="padding: 10px 12px; border-bottom: 1px solid rgba(0, 0, 0, 0.03); border-radius: 8px; font-size: 0.9rem; color: #555; cursor: pointer; display: flex; align-items: center; gap: 12px; margin-bottom: 2px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #D4AF37; flex-shrink: 0; opacity: 0.8;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span style="font-weight: 500;">${t.label}</span>
            </div>`;
        });

        // Create widget container
        const trendingWidget = document.createElement("div");
        trendingWidget.className = "search-widget";
        trendingWidget.innerHTML = `
            <div class="search-widget-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                Trending Searches
            </div>
            <div class="search-widget-list-container" style="margin-top: 10px; display: flex; flex-direction: column;">
                ${listHtml}
            </div>
        `;

        const journalWidget = document.createElement("div");
        journalWidget.className = "search-widget";
        journalWidget.innerHTML = `
            <div class="search-widget-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                The Journal
            </div>
            <div class="search-widget-card" onclick="window.location.href='journal.html'">
                <img src="IMG_3357.jpg" class="search-widget-img" alt="Journal">
                <div>
                    <div style="font-weight:600; font-size: 0.85rem;">Luxury Hair Care</div>
                    <div style="font-size: 0.75rem; color: #888;">5 Tips for Shine</div>
                </div>
            </div>
        `;

        container.innerHTML = "";
        container.appendChild(trendingWidget);
        container.appendChild(journalWidget);
    };

    const populateLiveTiles = (container) => {
        container.innerHTML = `
            <div class="search-widget-title" style="margin-left: 5px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                DODCH Spotlight
            </div>
            <div class="live-tiles-grid">
                <div class="os-tile os-tile-large">
                    <span class="os-tile-badge">Live Care</span>
                    <video class="os-tile-bg" autoplay muted loop playsinline src="foam cleanser.mp4"></video>
                    <div class="os-tile-content">
                        <div style="font-size: 0.7rem; opacity: 0.9; font-weight: 500;">How to use</div>
                        <div style="font-size: 1.1rem; font-weight: 700;">Deep Cleansing Ritual</div>
                    </div>
                </div>
                <div class="os-tile os-tile-wide flipping">
                    <div class="os-tile-flipper">
                        <div class="os-tile-front">
                            <img src="IMG_3258.jpg" class="os-tile-bg" alt="Serum">
                            <div class="os-tile-content"><div style="font-weight: 700;">Daily Hydration</div></div>
                        </div>
                        <div class="os-tile-back">
                            <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 5px; color: var(--accent-gold);">Pro Tip</div>
                            <div style="font-size: 0.75rem; line-height: 1.4;">Apply on damp skin for 2x moisture locking.</div>
                        </div>
                    </div>
                </div>
                <div class="os-tile" style="background: var(--accent-gold); color: #fff;">
                    <div class="os-tile-content" style="background: none; align-items: center; justify-content: center; text-align: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-bottom: 8px;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                        <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">Gift Guide</div>
                    </div>
                </div>
                <div class="os-tile" style="background: var(--text-charcoal);">
                    <div class="os-tile-content" style="background: none; align-items: center; justify-content: center;">
                         <div style="font-family: var(--font-serif); font-size: 1.2rem; font-weight: 700; color: white;">DODCH</div>
                         <div style="font-size: 0.5rem; letter-spacing: 2px; color: rgba(255,255,255,0.6);">EST. 2026</div>
                    </div>
                </div>
                <div class="os-tile os-tile-wide flipping">
                    <div class="os-tile-flipper">
                        <div class="os-tile-front">
                            <img src="F188A04D-4AA7-4D98-9EEB-14861B10D468.PNG" class="os-tile-bg" alt="Mask">
                            <div class="os-tile-content"><div style="font-weight: 700;">Silk Therapy</div></div>
                        </div>
                        <div class="os-tile-back">
                            <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 5px; color: var(--accent-gold);">New Formula</div>
                            <div style="font-size: 0.75rem; line-height: 1.4;">Now with 15% more Prickly Pear oil for extreme softness.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Start flippers
        setTimeout(() => {
            const flippingTiles = container.querySelectorAll(".os-tile.flipping");
            if (flippingTiles.length > 0) {
                if (window.tileInterval) clearInterval(window.tileInterval);
                window.tileInterval = setInterval(() => {
                    const randomTile = flippingTiles[Math.floor(Math.random() * flippingTiles.length)];
                    randomTile.classList.toggle("flip");
                }, 3500);
            }
        }, 100);
    };

    const positionDropdown = (inputEl) => {
        const container = inputEl.closest(".search-container");
        if (container && dropdown.parentNode !== container) {
            container.prepend(halo);
            container.appendChild(dropdown);

            // Add close button if missing
            if (!container.querySelector("#search-close-btn")) {
                const closeBtn = document.createElement("button");
                closeBtn.id = "search-close-btn";
                closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; stroke: currentColor;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                closeBtn.style.position = "absolute";
                container.appendChild(closeBtn);

                closeBtn.addEventListener("mousedown", (e) => {
                    e.preventDefault(); // Prevent input from blurring prematurely
                    inputEl.value = "";
                    dropdown.classList.remove("active");
                    halo.classList.remove("active");
                    const nav = document.getElementById("navbar");
                    if (nav) nav.classList.remove("search-active");
                    container.classList.remove("active");
                    document.body.style.overflow = "auto";
                    document.documentElement.style.overflow = "auto"; // Unlock root scroll as well
                    inputEl.blur();
                });
            }
        }
        // Use fluid CSS-based positioning
        dropdown.style.top = "";
        if (window.innerWidth > 768) {
            const rect = container.getBoundingClientRect();
            // Stable dashboard width: max 1180px, but fits window
            const dropdownWidth = Math.min(1180, window.innerWidth - 80);
            dropdown.style.width = dropdownWidth + "px";
            dropdown.style.position = "fixed";

            // Center the entire dashboard on the screen for stability
            const globalLeft = (window.innerWidth - dropdownWidth) / 2;

            dropdown.style.left = globalLeft + "px";
            dropdown.style.top = (rect.top + rect.height + 15) + "px";
            dropdown.style.transform = "translateY(0)";
            dropdown.style.right = "auto";
            dropdown.style.zIndex = "200000";
        } else {
            dropdown.style.width = "95vw";
            dropdown.style.position = "fixed";
            dropdown.style.left = "2.5vw";
            dropdown.style.top = "70px";
            dropdown.style.right = "auto";
            dropdown.style.transform = "translateY(10px)";
            dropdown.style.zIndex = "200000";
        }
    };

    // Persistent Dashboard Components
    const layoutDiv = document.createElement("div");
    layoutDiv.className = "search-dropdown-layout";

    const liveTilesDiv = document.createElement("div");
    liveTilesDiv.className = "search-live-tiles-container";

    const sideWidgetsDiv = document.createElement("div");
    sideWidgetsDiv.className = "search-side-widgets";

    const mainResultsDiv = document.createElement("div");
    mainResultsDiv.className = "search-main-results";

    // Initialize content once
    populateWidgets(sideWidgetsDiv);
    populateLiveTiles(liveTilesDiv);

    // Initial structure setup
    // Layout and hiding logic dynamically handled via CSS Flexbox/Grid
    layoutDiv.appendChild(liveTilesDiv);
    layoutDiv.appendChild(sideWidgetsDiv);
    layoutDiv.appendChild(mainResultsDiv);

    const renderResults = (results, query) => {
        currentResults = results;
        selectedIndex = -1;
        mainResultsDiv.innerHTML = ""; // Only clear the results pane

        // Toggle class for responsive CSS hiding on mobile
        if (!query || query.length < 2) {
            layoutDiv.classList.remove("has-query");
        } else {
            layoutDiv.classList.add("has-query");
        }

        const history = window.dodchSearchEngine.getHistory();

        // Ensure layout is injected into the dropdown
        if (!dropdown.contains(layoutDiv)) {
            dropdown.innerHTML = "";
            dropdown.appendChild(layoutDiv);
        }

        // --- State 1: Empty / History Dashboard ---
        if ((!query || query.length < 2) && (history.length > 0 || true)) {
            const historyHtml = history.length > 0 ? `
                <div class="search-history-section" style="padding: 10px;">
                    <div style="font-size: 0.75rem; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Recent Searches
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${history.map(h => `
                            <div class="history-pill" onclick="var inp=document.getElementById('navbar-search-input'); if(inp){ inp.value='${h}'; inp.focus(); inp.dispatchEvent(new Event('input')); }" style="padding: 10px 22px; background: rgba(255,255,255,0.12); backdrop-filter: blur(5px); border-radius: 30px; font-size: 0.95rem; color: #FFFFFF; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); transition: all 0.2s; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                                ${h}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : `<div style="padding: 20px; color: rgba(255,255,255,0.6); font-size: 1rem; font-style: italic; font-weight: 300;">Start typing to find hair or skin products...</div>`;

            mainResultsDiv.innerHTML = historyHtml;
            dropdown.classList.add("active");
            halo.classList.add("active");
            return;
        }

        // --- State 2: No Results ---
        if (results.length === 0 && query.length > 0) {
            mainResultsDiv.innerHTML = `<div class="search-no-results" style="padding: 20px; color: rgba(255,255,255,0.7);">No products found for "${query}". Try searching for categories like "shampoo" or "mask".</div>`;
            dropdown.classList.add("active");
            halo.classList.add("active");
            return;
        }

        // --- State 3: Filtering & Suggestions ---
        results.forEach((res, index) => {
            const item = res.item;
            const minPrice = item.sizes && item.sizes.length > 0
                ? Math.min(...item.sizes.map(s => parseFloat(s.price)))
                : parseFloat(item.price);

            const priceStr = item.sizes && item.sizes.length > 0 ? `From ${minPrice.toFixed(2)} TND` : `${minPrice.toFixed(2)} TND`;

            const div = document.createElement("div");
            div.className = "search-result-item" + (index === 0 ? " highlighted" : "");
            if (index === 0) selectedIndex = 0;

            let imgUrl = item.images && item.images.length > 0 ? item.images[0] : (item.image || "");

            div.innerHTML = `
                <img src="${imgUrl}" class="search-result-image" alt="${item.name}">
                <div class="search-result-info">
                    <div class="search-result-title">${item.name}</div>
                    <div class="search-result-price" style="margin-top: 4px;">${priceStr}</div>
                </div>
            `;

            const lowerTitle = item.name.toLowerCase();
            if (lowerTitle.includes(query.toLowerCase())) {
                const regex = new RegExp(`(${query})`, "gi");
                div.querySelector(".search-result-title").innerHTML = item.name.replace(regex, "<strong>$1</strong>");
            }

            div.addEventListener("mousedown", (e) => {
                e.preventDefault();
                window.dodchSearchEngine.addToHistory(query);
                window.location.href = item.storyUrl || `product.html?id=${res.id}`;
            });

            div.addEventListener("mouseenter", () => {
                updateSelection(index);
            });

            mainResultsDiv.appendChild(div);
        });

        dropdown.classList.add("active");
        halo.classList.add("active");
        if (dropdown.classList.contains("active")) {
            dropdown.style.transform = "translateY(0)";
        }
    };

    const updateSelection = (index) => {
        const items = mainResultsDiv.querySelectorAll(".search-result-item");
        items.forEach(i => i.classList.remove("highlighted"));
        if (index >= 0 && index < items.length) {
            items[index].classList.add("highlighted");
            selectedIndex = index;
        }
    };

    const handleSearch = debounce((e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            renderResults([], query);
            return;
        }

        // Show AI Thinking ONLY in the results column - keeping widgets visible
        if (!dropdown.contains(layoutDiv)) {
            dropdown.innerHTML = "";
            dropdown.appendChild(layoutDiv);
        }

        mainResultsDiv.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--accent-gold);">
                <div class="ai-thinking-dots" style="display: flex; gap: 8px; justify-content: center; margin-bottom: 1rem;">
                    <span style="width: 8px; height: 8px; background: currentColor; border-radius: 50%; animation: pulse 0.6s infinite alternate;"></span>
                    <span style="width: 8px; height: 8px; background: currentColor; border-radius: 50%; animation: pulse 0.6s infinite 0.2s alternate;"></span>
                    <span style="width: 8px; height: 8px; background: currentColor; border-radius: 50%; animation: pulse 0.6s infinite 0.4s alternate;"></span>
                </div>
                <div style="font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase; font-weight: 500; opacity: 0.7;">AI Thinking...</div>
            </div>
        `;

        dropdown.classList.add("active");
        halo.classList.add("active");

        setTimeout(() => {
            if (Object.keys(window.dodchSearchEngine.catalog).length === 0 && window.productCatalog) {
                window.dodchSearchEngine.init(window.productCatalog);
            }
            const results = window.dodchSearchEngine.search(query);
            renderResults(results, query);
        }, 400);
    }, 250); // 250ms debounce

    searchContainers.forEach(container => {
        const input = container.querySelector("input");
        const clearBtn = container.querySelector("#search-clear-btn");
        if (!input) return;

        if (clearBtn) {
            clearBtn.addEventListener("mousedown", (e) => {
                e.preventDefault();
                input.value = "";
                renderResults([], ""); // Show history immediately
                input.focus();
            });
        }

        input.addEventListener("focus", (e) => {
            activeInput = e.target;
            positionDropdown(activeInput);
            const query = e.target.value.trim();

            const nav = document.getElementById("navbar");
            if (nav) nav.classList.add("search-active");
            container.classList.add("active");
            halo.classList.add("active");
            document.body.style.overflow = "hidden";
            document.documentElement.style.overflow = "hidden";

            // If empty, show dashboard immediately with history/widgets
            if (query.length === 0) {
                renderResults([], "");
            } else {
                handleSearch(e);
            }
        });

        // Replace blur event. Instead, handle outside clicks.
        document.addEventListener("mousedown", (evt) => {
            if (container.classList.contains("active") && !container.contains(evt.target) && !dropdown.contains(evt.target)) {
                dropdown.classList.remove("active");
                halo.classList.remove("active");
                const nav = document.getElementById("navbar");
                if (nav) nav.classList.remove("search-active");
                container.classList.remove("active");
                document.body.style.overflow = "auto";
                document.documentElement.style.overflow = "auto"; // Unlock root scroll as well
            }
        });

        input.addEventListener("input", (e) => {
            activeInput = e.target;
            positionDropdown(activeInput);
            handleSearch(e);
        });

        input.addEventListener("keydown", (e) => {
            if (!dropdown.classList.contains("active")) return;

            const items = dropdown.querySelectorAll(".search-result-item");

            if (e.key === "ArrowDown") {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelection(selectedIndex);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                selectedIndex = selectedIndex - 1;
                if (selectedIndex < 0) selectedIndex = items.length - 1;
                updateSelection(selectedIndex);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (selectedIndex >= 0 && currentResults[selectedIndex]) {
                    const id = currentResults[selectedIndex].id;
                    const item = currentResults[selectedIndex].item;
                    window.dodchSearchEngine.addToHistory(input.value.trim()); // Save to history
                    window.location.href = item.storyUrl || `product.html?id=${id}`;
                }
            } else if (e.key === "Escape") {
                dropdown.classList.remove("active");
                halo.classList.remove("active");
                const nav = document.getElementById("navbar");
                if (nav) nav.classList.remove("search-active");
                container.classList.remove("active");
                document.body.style.overflow = "auto";
                document.documentElement.style.overflow = "auto"; // Unlock root scroll as well
                input.blur();
            }
        });
    });
});

// --- Contact Form Submission Handler ---
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'main-contact-form') {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('.contact-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        // Honeypot check
        const honeypot = form.querySelector('input[name="website"]').value;
        if (honeypot) {
            // Silently succeed for bots
            if (window.showToast) window.showToast("Message sent successfully!", "success");
            form.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        const nameInput = form.querySelector('input[type="text"]:not([name="website"])');
        const emailInput = form.querySelector('input[type="email"]');
        const messageInput = form.querySelector('textarea');

        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const message = messageInput ? messageInput.value.trim() : "";

        if (!name || !email || !message) {
            if (window.showToast) window.showToast("Please fill in all fields.", "error");
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        try {
            // Data structure matches strictly with firestore.rules requirements:
            await addDoc(collection(db, 'messages'), {
                name: name,
                email: email,
                message: message,
                status: 'unread', // Explicitly required string 'unread'
                createdAt: serverTimestamp() // Explicitly required server-side timestamp object
            });

            if (window.showToast) window.showToast("Message sent successfully!", "success");
            form.reset();
        } catch (error) {
            console.error("Error sending message:", error);
            if (window.showToast) window.showToast("Error sending message. Please try again later.", "error");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
});



