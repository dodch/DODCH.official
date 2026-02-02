import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp, updateDoc, limit, orderBy, startAfter, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";


const ADMIN_UID = '4JAqYb2fnEhpqaBv7xWwsFDUXun2';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Enable App Check debug token for localhost
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = "d698a82e-c668-4ca4-82fa-8a6ac6a6e0e4";
}

// Initialize App Check
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LcAk10sAAAAAJLRyVesWS-Ub87u8v_Qzow1xl7l'),
    isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    const initialHash = window.location.hash;
    
    // --- Custom UI Helpers (Toast & Confirm) ---
    window.showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;
        
        let icon = '';
        if (type === 'success') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        else if (type === 'error') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        else icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

        toast.innerHTML = `${icon} <span>${message}</span>`;
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('active'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
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

    // Preloader Logic
    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
    });

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
    const hero = document.getElementById('hero');
    const heroOverlay = document.querySelector('.hero-overlay');
    const heroBgParallax = document.querySelector('.hero-bg-parallax');
    const experienceImageContainers = document.querySelectorAll('.experience-image');
    const promiseIcons = document.querySelectorAll('.promise-icon');
    const progressBar = document.getElementById('scroll-progress');
    const stickyCTA = document.getElementById('sticky-cta');
    const footer = document.querySelector('footer');
    
    const updateNavbar = () => {
        const scrollY = window.scrollY;
        if (hero) {
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
    const revealElements = document.querySelectorAll('.reveal');

    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const elementVisible = 20; // Distance from bottom before revealing

        revealElements.forEach((element) => {
            const elementTop = element.getBoundingClientRect().top;

            if (elementTop < windowHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    };

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

            if (scrollY > hero.offsetHeight && !isFooterVisible) {
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
        revealOnScroll();
        runCounterAnimation();
    });
    
    // Trigger once on load to show hero content immediately
    updateNavbar();
    revealOnScroll();

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
    };

    if(hamburger && sidebar) {
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
            el.addEventListener('click', function(e) {
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
        document.addEventListener('click', function(e) {
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
            subtitle: "The Elixir of 10,000 Seeds",
            price: "24.00",
            image: "/IMG_3357.jpg",
            description: "A high-performance treatment formulated around the rarest, most expensive cosmetic oil on the planet: Pure Cold-Pressed Prickly Pear Seed Oil. Experience the 'Solar-Floral' journey with notes of Tunisian Orange Blossom and Tropical Vanilla.",
            style: "", // CSS filter if needed
            sizes: [
                { label: '50ml', price: '24.00' },
                { label: '100ml', price: '44.00' },
                { label: '250ml', price: '95.00', originalPrice: '105.00' }
            ]
        },
        'pure-oil': {
            name: "Prickly Pear Pure Oil",
            subtitle: "100% Organic Cold-Pressed Elixir",
            price: "85.00",
            image: "/IMG_3256.PNG",
            description: "The ultimate luxury for hair and skin. Sourced from the finest seeds in Tunisia, this dry oil penetrates instantly to repair, nourish, and add a mirror-like shine without any greasy residue.",
            style: "filter: hue-rotate(15deg);",
            sizes: [
                { label: '50ml', price: '85.00' },
                { label: '100ml', price: '160.00' }
            ]
        },
        'hair-mask': {
            name: "Silk & Wheat Hair Mask",
            subtitle: "Deep Repair & Glass Shine",
            price: "55.00",
            image: "/IMG_3256.PNG",
            description: "Infused with hydrolyzed silk proteins and wheat amino acids. This mask reconstructs the hair fiber from within while creating a breathable shield on the surface for instant manageability.",
            style: "filter: sepia(0.2);",
            sizes: [
                { label: '200ml', price: '55.00' },
                { label: '400ml', price: '100.00' }
            ]
        },
        'ritual-set': {
            name: "The Ritual Set",
            subtitle: "The Complete Mediterranean Experience",
            price: "120.00",
            image: "/IMG_3256.PNG",
            description: "The full collection: Glass Glow Shampoo, Silk & Wheat Mask, and the Pure Oil. Designed to work in harmony for the ultimate hair transformation.",
            style: "filter: contrast(1.1);",
            sizes: [] // No sizes for the set
        }
    };

    // Mutable catalog that will be updated with Firestore data
    let productCatalog = { ...defaultProductCatalog };

    // Function to render Shop Page grid dynamically
    const initShopPage = () => {
        // Only run on shop page (where product detail container is absent)
        if (document.querySelector('.product-detail-container')) return;
        
        const shopGrid = document.querySelector('.shop-grid');
        if (!shopGrid) return;

        shopGrid.innerHTML = ''; // Clear static HTML
        
        // Sort by orderIndex
        const sortedCatalog = Object.entries(productCatalog).sort(([, a], [, b]) => {
            return (a.orderIndex || 0) - (b.orderIndex || 0);
        });

        sortedCatalog.forEach(([id, product]) => {
            // Calculate lowest price from sizes
            let displayPrice = product.price;
            let hasDiscount = false;

            if (product.sizes && product.sizes.length > 0) {
                const prices = product.sizes.map(s => parseFloat(s.price));
                displayPrice = Math.min(...prices).toFixed(2);
                hasDiscount = product.sizes.some(s => s.originalPrice && parseFloat(s.originalPrice) > parseFloat(s.price));
            }

            const cardHTML = `
                <div class="product-card reveal active">
                    <a href="product.html?id=${id}">
                        <div class="product-image-wrapper">
                            ${hasDiscount ? '<span class="product-badge sale" style="position: absolute; top: 10px; left: 10px; background: #d4af37; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px;">ONLINE OFFER</span>' : ''}
                            <img src="${product.image}" alt="${product.name}" class="product-card-img" style="${product.style || ''}">
                            <button class="quick-view-btn" 
                                data-id="${id}" 
                                data-title="${product.name}" 
                                data-price="${displayPrice}" 
                                data-img="${product.image}" 
                                data-style="${product.style || ''}"
                                data-desc="${product.description}">
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
            shopGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    };

    // Function to fetch product overrides (price, stock) from Firestore
    const loadProductCatalog = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const productId = doc.id;
                
                // Merge Firestore data into catalog (handling both updates and new products)
                if (productCatalog[productId]) {
                    productCatalog[productId] = { ...productCatalog[productId], ...data };
                } else {
                    productCatalog[productId] = data;
                }
            });
            // Re-run product page init to reflect changes if we are on a product page
            initProductPage();
            // Re-render shop grid if we are on shop page
            initShopPage();
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
            // The onAuthStateChanged observer will handle the UI update without a reload.
            await signOut(auth);
            window.showToast("Successfully logged out.", "success");
        } catch (error) {
            console.error("Logout failed", error);
        }
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

        if (checkoutSubtotalEl) checkoutSubtotalEl.innerText = `${subtotal.toFixed(2)} TND`;
        if (checkoutTotalEl) checkoutTotalEl.innerText = `${subtotal.toFixed(2)} TND`;

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
            if(cartEmptyMsg) cartItemsContainer.appendChild(cartEmptyMsg);
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
        if (cartSubtotalEl) cartSubtotalEl.textContent = `${subtotal.toFixed(2)} TND`;

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
                let nameEl = container ? container.querySelector('.product-title, .product-name, h1, h2, h3, h4, h5') : null;
                
                const productName = nameEl ? nameEl.textContent.trim() : "Unknown Product";
                
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
                let imageSrc = '';
                // Prioritize image in container
                const imgEl = container ? container.querySelector('img.product-image, img') : null;
                if (imgEl) {
                    imageSrc = imgEl.src;
                } else {
                    // Fallback only if we are sure it's a single product page
                    const mainImg = document.getElementById('main-product-image');
                    if (mainImg) imageSrc = mainImg.src;
                }

                const newItemId = `${productName}-${size}`;
                const existingItem = cart.find(item => item.id === newItemId);

                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    const newItem = {
                        id: newItemId,
                    productId: clickedBtn.dataset.productId, // Pass ID for server verification
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

        // Add "View Main Page" link for Glass Glow Shampoo
        const existingStoryBtn = document.getElementById('product-story-link');
        if (existingStoryBtn) existingStoryBtn.remove();

        if (addToCartBtn && (!productId || productId === 'glass-glow-shampoo')) {
            const storyBtn = document.createElement('a');
            
            if (product.outOfStock) {
                addToCartBtn.disabled = true;
                addToCartBtn.innerText = "Out of Stock";
                addToCartBtn.style.backgroundColor = "#ccc";
            }

            storyBtn.id = 'product-story-link';
            storyBtn.href = 'index.html';
            storyBtn.textContent = 'View Main Page';
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
                            adminBtn.style.marginTop = '0.5rem';
                            adminBtn.style.borderColor = 'var(--text-charcoal)';
                            adminBtn.style.color = 'var(--text-charcoal)';
                            myAccountBtn.after(adminBtn);
                        } else {
                            adminBtn.style.display = 'inline-block';
                        }
                    }
                } else {
                    myAccountBtn.style.display = 'inline-block';
                    const adminBtn = document.getElementById('sidebar-admin-btn');
                    if (adminBtn) adminBtn.style.display = 'inline-block';
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
                ordersList.innerHTML = '<p>Loading your order history...</p>';

                try {
                    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
                    const querySnapshot = await getDocs(q);
                    
                    const orders = [];
                    querySnapshot.forEach((doc) => {
                        orders.push({ id: doc.id, ...doc.data() });
                    });

                    const renderOrders = (sortedOrders) => {
                        ordersList.innerHTML = '';
                        if (sortedOrders.length === 0) {
                            ordersList.innerHTML = '<p>You haven\'t placed any orders yet.</p>';
                        } else {
                            sortedOrders.forEach(order => {
                                const date = new Date(order.timestamp.seconds * 1000).toLocaleDateString();
                                const total = typeof order.total === 'number' ? order.total.toFixed(2) : order.total;
                                const status = order.status || 'Pending';
                                const statusClass = `status-${status.toLowerCase().replace(/\s+/g, '-')}`;

                                let trackButtonHtml = '';
                                let cancelButtonHtml = '';

                                // If the order is shipped, create a track button.
                                if (status.toLowerCase() === 'shipped') {
                                    // For this demo, we'll generate a fake tracking number if one isn't in the data.
                                    const trackingNumber = order.trackingNumber || `1Z${order.id.slice(0, 10).toUpperCase()}A0${Math.floor(Math.random() * 90 + 10)}`;
                                    const orderRefParam = order.orderReference ? `&orderRef=${order.orderReference}` : '';
                                    trackButtonHtml = `<a href="tracking.html?orderId=${order.id}&trackingNumber=${trackingNumber}${orderRefParam}" class="track-order-btn">Track Order</a>`;
                                } else if (status.toLowerCase() === 'pending') {
                                    cancelButtonHtml = `<button class="cancel-order-btn" data-id="${order.id}" style="margin-left: 5px; color: #ff4d4d; background: none; border: 1px solid #ff4d4d; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; cursor: pointer;">Cancel</button>`;
                                }
                                
                                let itemsHtml = order.items.map(item => `
                                    <div class="order-item-row">
                                        <span>${item.quantity}x ${item.name} (${item.size})</span>
                                        <span>${item.price}</span>
                                    </div>
                                `).join('');

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
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span class="status-badge ${statusClass}">${status}</span>
                                            <button class="reorder-btn" data-id="${order.id}">Reorder</button>
                                            ${trackButtonHtml}
                                            ${cancelButtonHtml}
                                        </div>
                                        <span style="color: var(--accent-gold);">${total} TND</span>
                                    </div>
                                `;
                                ordersList.appendChild(orderCard);
                            });

                            // Attach Reorder Event Listeners
                            document.querySelectorAll('.reorder-btn').forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    const orderId = e.target.getAttribute('data-id');
                                    const order = orders.find(o => o.id === orderId);
                                    if (order && order.items) {
                                        order.items.forEach(item => {
                                            const existingItem = cart.find(c => c.id === item.id);
                                            if (existingItem) {
                                                existingItem.quantity += item.quantity;
                                            } else {
                                                cart.push({ ...item });
                                            }
                                        });
                                        updateCartUI();
                                        openCart();
                                    }
                                });
                            });

                            // Attach Cancel Event Listeners
                            document.querySelectorAll('.cancel-order-btn').forEach(btn => {
                                btn.addEventListener('click', async (e) => {
                                    const btnElement = e.currentTarget;
                                    const confirmed = await window.showConfirm("Are you sure you want to cancel this order? This action cannot be undone.", "Cancel Order");
                                    if (!confirmed) return;
                                    
                                    const orderId = btnElement.getAttribute('data-id');
                                    
                                    btnElement.innerText = "Processing...";
                                    btnElement.disabled = true;
                                    btnElement.style.opacity = "0.5";

                                    try {
                                        await updateDoc(doc(db, "orders", orderId), {
                                            status: "Cancelled"
                                        });
                                        
                                        // Update UI locally
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
                                        btnElement.style.opacity = "1";
                                    }
                                });
                            });
                        }
                    };

                    // Default sort by date
                    orders.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
                    renderOrders(orders);

                    const sortBtns = document.querySelectorAll('.filter-sort-btn');
                    sortBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            sortBtns.forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');

                            const sortBy = btn.dataset.sort;
                            let sortedOrders = [...orders];

                            if (sortBy === 'status') {
                                const statusOrder = { 'pending': 1, 'processing': 2, 'shipped': 3, 'delivered': 4, 'cancelled': 5 };
                                sortedOrders.sort((a, b) => {
                                    const statusA = (a.status || 'pending').toLowerCase();
                                    const statusB = (b.status || 'pending').toLowerCase();
                                    return (statusOrder[statusA] || 99) - (statusOrder[statusB] || 99);
                                });
                            } else { // 'date'
                                sortedOrders.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
                            }
                            renderOrders(sortedOrders);
                        });
                    });
                } catch (error) {
                    console.error("Error fetching orders:", error);
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
                    // Generate a unique reference code locally
                    const orderRef = 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();

                    // Calculate total locally
                    const total = cart.reduce((sum, item) => {
                        let price = String(item.price).replace(/[^0-9.]/g, '');
                        return sum + (parseFloat(price) * item.quantity);
                    }, 0);

                    const docRef = await addDoc(collection(db, "orders"), {
                        orderReference: orderRef,
                        items: cart,
                        shipping: {
                            email: document.getElementById('checkout-email').value.trim(),
                            fullName: document.getElementById('checkout-name').value,
                            address: document.getElementById('checkout-address').value,
                            city: document.getElementById('checkout-city').value,
                            postalCode: document.getElementById('checkout-postal-code').value
                        },
                        total: parseFloat(total.toFixed(2)),
                        timestamp: serverTimestamp(),
                        status: 'Pending',
                        userId: currentUser ? currentUser.uid : 'guest'
                    });

                    clearTimeout(operationTimeout);
                    console.log("Order placed successfully with ID: ", docRef.id);
                    
                    setTimeout(() => {
                        cart = [];
                        localStorage.setItem('dodch_cart', JSON.stringify(cart));
                        updateCartUI();
                        
                        const orderSummary = document.querySelector('.order-summary');
                        if (orderSummary) {
                            orderSummary.innerHTML = `
                                <div style="text-align: center; padding: 2rem 0; animation: fadeIn 0.5s ease;">
                                    <svg style="width: 60px; height: 60px; color: var(--accent-gold); margin-bottom: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    <h2 style="border: none; margin-bottom: 0.5rem;">Order Confirmed</h2>
                                    <p style="font-size: 0.95rem; opacity: 0.8;">Thank you for choosing DODCH. Your order #${orderRef} has been received.</p>
                                    <a href="index.html" class="cta-button" style="margin-top: 2rem; display: inline-block; width: auto;">Return Home</a>
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
        const path = window.location.pathname;
        const page = path.split("/").pop();
        
        // Skip for homepage
        if (page === "" || page === "index.html") return;

        const main = document.querySelector('main');
        if (!main) return;

        let crumbs = [{ name: "Home", url: "index.html" }];
        let currentName = "";

        // Determine current page hierarchy
        if (page.includes("shop.html")) {
            currentName = "Shop";
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
            crumbs.push({ name: "Shop", url: "shop.html" });
            currentName = "Checkout";
        } else if (page.includes("my-account.html")) {
            currentName = "My Account";
        } else if (page.includes("tracking.html")) {
            crumbs.push({ name: "My Account", url: "my-account.html" });
            currentName = "Tracking";
        } else if (page.includes("admin.html")) {
            currentName = "Admin Dashboard";
        } else if (page.includes("product.html")) {
            crumbs.push({ name: "Shop", url: "shop.html" });
            
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
                                <li><a href="shop.html" class="footer-link">Hair Care</a></li>
                                <li><a href="shop.html" class="footer-link">Scalp Solutions</a></li>
                                <li><a href="shop.html" class="footer-link">Accessories</a></li>
                                <li><a href="shop.html" class="footer-link">Discovery Sets</a></li>
                            </ul>
                        </div>
                    </div>

                    <div class="copyright">
                        &copy; 2026 DODCH. All Rights Reserved.
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

    // 22. Highlight Active Sidebar Link
    const initSidebarHighlight = () => {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.sidebar-menu a');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            const targetPage = href.split('#')[0].split('?')[0];
            
            if (targetPage) {
                const isMatch = currentPath.endsWith(targetPage) || 
                                (targetPage === 'index.html' && currentPath.endsWith('/'));
                
                if (isMatch && !href.includes('#')) {
                    link.classList.add('active');
                }
            }
        });
    };
    initSidebarHighlight();

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

                const newProduct = { 
                    name, 
                    subtitle: document.getElementById('new-prod-subtitle').value.trim(), 
                    description: document.getElementById('new-prod-desc').value.trim(), 
                    image: "", 
                    sizes, 
                    price: Math.min(...sizes.map(s => parseFloat(s.price))).toFixed(2), 
                    outOfStock: isEdit ? (existingProduct.outOfStock || false) : false, 
                    style: isEdit ? (existingProduct.style || "") : "",
                    orderIndex: orderIndex
                };

                // Handle Image Upload
                let finalImageUrl = imageUrlInput.value;
                const file = imageFileInput.files[0];
                
                if (file) {
                    submitBtn.innerHTML = `${spinner} Uploading Image...`;
                    try {
                        const storageRef = ref(storage, `products/${newId}_${Date.now()}_${file.name}`);
                        await uploadBytes(storageRef, file);
                        finalImageUrl = await getDownloadURL(storageRef);
                    } catch (uploadError) {
                        console.error("Image upload failed:", uploadError);
                        window.showToast("Image upload failed.", "error");
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Save Product';
                        return;
                    }
                }

                if (!finalImageUrl) {
                    window.showToast("Please select an image.", "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Product';
                    return;
                }
                newProduct.image = finalImageUrl;

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
                    link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0,10)}.csv`);
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
                            <strong>#${order.orderReference || order.id.slice(0,6)}</strong>
                            <span>${date}</span>
                        </div>
                        <div class="admin-order-details">
                            <p><strong>Customer:</strong> ${order.shipping?.fullName} (${order.shipping?.email})</p>
                            <p><strong>Address:</strong> ${order.shipping?.address}, ${order.shipping?.city}</p>
                            <p><strong>Total:</strong> ${order.total} TND</p>
                            <div class="admin-order-items">
                                ${order.items.map(i => `<div>${i.quantity}x ${i.name} (${i.size})</div>`).join('')}
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
                    searchInput.addEventListener('input', (e) => {
                        const term = e.target.value.toLowerCase();
                        const filtered = orders.filter(o => 
                            (o.id && o.id.toLowerCase().includes(term)) ||
                            (o.orderReference && o.orderReference.toLowerCase().includes(term)) ||
                            (o.shipping?.fullName && o.shipping.fullName.toLowerCase().includes(term)) ||
                            (o.shipping?.email && o.shipping.email.toLowerCase().includes(term))
                        );
                        renderAdminOrdersList(filtered);
                    });
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
                                await updateDoc(doc(db, "orders", orderId), { status: newStatus });
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
                    if(await window.showConfirm("Overwrite Firestore products with local catalog data?", "Sync Catalog")) {
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
                return (a.orderIndex || 0) - (b.orderIndex || 0);
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
                            await deleteDoc(doc(db, "products", id));
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
                    <button id="qv-close-btn" class="qv-close-btn">&times;</button>
                    <div class="qv-image-container">
                        <img id="qv-image" src="" alt="Product Image" class="qv-modal-image">
                    </div>
                    <div class="qv-modal-info">
                        <h2 id="qv-title" class="qv-product-title"></h2>
                        <p id="qv-price" class="qv-product-price"></p>
                        <p id="qv-desc" class="qv-product-desc"></p>
                        
                        <div class="size-selector" style="margin-bottom: 1.5rem;">
                            <span class="size-label">Size</span>
                            <div class="size-options">
                                <!-- Dynamic Buttons Injected Here -->
                            </div>
                        </div>

                        <button id="qv-add-to-cart" class="qv-add-to-cart-btn">Add to Cart</button>
                        <a id="qv-learn-more" href="#" style="text-align: center; display: block; margin-top: 1rem; font-size: 0.85rem; text-decoration: underline; color: var(--text-charcoal);">Learn More</a>
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
                    qvLearnMore.href = `product.html?id=${id}`;
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
                                    qvAddToCart.textContent = "Out of Stock";
                                    qvAddToCart.style.backgroundColor = "#ccc";
                                } else {
                                    qvAddToCart.disabled = false;
                                    qvAddToCart.textContent = "Add to Cart";
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
                            
                            // Update Add to Cart based on size
                            if (!product.outOfStock) {
                                if (sizeObj.outOfStock) {
                                    qvAddToCart.disabled = true;
                                    qvAddToCart.textContent = "Out of Stock";
                                    qvAddToCart.style.backgroundColor = "#ccc";
                                } else {
                                    qvAddToCart.disabled = false;
                                    qvAddToCart.textContent = "Add to Cart";
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
                    qvAddToCart.textContent = "Out of Stock";
                    qvAddToCart.style.backgroundColor = "#ccc";
                    qvAddToCart.style.cursor = "not-allowed";
                } else {
                    qvAddToCart.disabled = false;
                    qvAddToCart.textContent = "Add to Cart";
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
        if(closeBtn) closeBtn.addEventListener('click', closeModal);
        if(modal) modal.addEventListener('click', (e) => {
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
        if (!productDetail) return;

        // Create container if it doesn't exist
        let container = document.getElementById('related-products-container');
        if (!container) {
            container = document.createElement('section');
            container.id = 'related-products-container';
            container.classList.add('section-padding', 'bg-white');
            productDetail.after(container);
        }

        // Get current product ID to exclude
        const urlParams = new URLSearchParams(window.location.search);
        let currentId = urlParams.get('id');

        // Resolve effective ID (matching initProductPage logic) to ensure correct exclusion
        if (!currentId || !productCatalog[currentId]) {
            currentId = 'glass-glow-shampoo';
        }

        // Use productCatalog to ensure consistency with Shop page
        const catalogEntries = Object.entries(productCatalog);
        
        // Filter out current product and limit to 4
        const relatedEntries = catalogEntries
            .filter(([id]) => id !== currentId)
            .slice(0, 4);

        if (relatedEntries.length === 0) return;

        let productsHtml = '';
        relatedEntries.forEach(([id, product]) => {
            // Calculate lowest price from sizes if available
            let displayPrice = product.price;
            let hasDiscount = false;
            if (product.sizes && product.sizes.length > 0) {
                const prices = product.sizes.map(s => parseFloat(s.price));
                displayPrice = Math.min(...prices).toFixed(2);
                hasDiscount = product.sizes.some(s => s.originalPrice && parseFloat(s.originalPrice) > parseFloat(s.price));
            }

            productsHtml += `
                <div class="product-card reveal">
                    <a href="product.html?id=${id}">
                        <div class="product-image-wrapper">
                            ${hasDiscount ? '<span class="product-badge sale" style="position: absolute; top: 10px; left: 10px; background: #d4af37; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px;">ONLINE OFFER</span>' : ''}
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

        container.innerHTML = `
            <div class="container">
                <h2 class="section-title reveal active">You May Also Like</h2>
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

    if (searchToggleBtn && searchContainer && searchInput) {
        searchToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // If active and has text, you might want to submit here
            if (searchContainer.classList.contains('active') && searchInput.value.trim() !== "") {
                console.log("Search submitted:", searchInput.value);
                // window.location.href = `shop.html?search=${searchInput.value}`;
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
                // window.location.href = `shop.html?search=${searchInput.value}`;
            }
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
