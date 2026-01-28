import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxAMaFnEznO-reO5KgUYux6XTjQiT0nUk",
  authDomain: "dodch-f766d.firebaseapp.com",
  projectId: "dodch-f766d",
  storageBucket: "dodch-f766d.appspot.com",
  messagingSenderId: "806139075119",
  appId: "1:806139075119:web:1ad61826e445566734c4da",
  measurementId: "G-F0F4LL6PHV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    
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

        // Navbar Logic
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

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
    revealOnScroll();

    // 3. Mobile Sidebar Toggle
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.getElementById('desktop-sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');

    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        if (navbar) navbar.classList.remove('menu-open');
    };

    const openSidebar = () => {
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

    // 8. Custom Cursor Logic
    const cursor = document.getElementById('custom-cursor');
    
    // Only run on devices that support hover (desktop)
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // Add hover effect for interactive elements
        const interactiveSelectors = 'a, button, .slider-nav, .pagination-dot, input, textarea, .pillar-card, .experience-card, .promise-item';
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(interactiveSelectors)) {
                cursor.classList.add('hovered');
            } else {
                cursor.classList.remove('hovered');
            }
        });
        
        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
        document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
    }

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
        });
    }

    // 11. Product Page & Cart Logic
    let cart = JSON.parse(localStorage.getItem('dodch_cart')) || [];
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
    const addToCartBtn = document.querySelector('.add-to-cart-btn');

    // Auth Logic
    const loginBtn = document.getElementById('login-btn');
    
    const handleLogin = async () => {
        try {
            // The onAuthStateChanged observer will handle the UI update without a reload.
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed. Please ensure popups are enabled and try again. Check the console for more details.");
        }
    };

    const handleLogout = async () => {
        try {
            // The onAuthStateChanged observer will handle the UI update without a reload.
            await signOut(auth);
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

    // Checkout Page Logic
    const checkoutItemsContainer = document.getElementById('checkout-items-container');
    const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
    const checkoutTotalEl = document.getElementById('checkout-total');

    const updateCheckoutUI = () => {
        if (!checkoutItemsContainer) return;
        
        checkoutItemsContainer.innerHTML = '';
        let subtotal = 0;

        cart.forEach(item => {
            const itemTotal = parseFloat(item.price.replace('$', '')) * item.quantity;
            subtotal += itemTotal;

            const el = document.createElement('div');
            el.classList.add('summary-item');
            el.innerHTML = `
                <div class="summary-item-info">
                    <img src="${item.image}" alt="${item.name}">
                    <div>
                        <h4>${item.name}</h4>
                        <p>Size: ${item.size} | Qty: ${item.quantity}</p>
                    </div>
                </div>
                <div class="summary-item-price">$${itemTotal.toFixed(2)}</div>
            `;
            checkoutItemsContainer.appendChild(el);
        });

        if (checkoutSubtotalEl) checkoutSubtotalEl.innerText = `$${subtotal.toFixed(2)}`;
        if (checkoutTotalEl) checkoutTotalEl.innerText = `$${subtotal.toFixed(2)}`;
    };

    const openCart = () => {
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
    };

    const closeCart = () => {
        cartDrawer.classList.remove('active');
        cartOverlay.classList.remove('active');
    };

    const updateCartUI = () => {
        // Save to storage whenever UI updates
        localStorage.setItem('dodch_cart', JSON.stringify(cart));
        
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

        const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price.replace('$', '')) * item.quantity), 0);
        if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;

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

    if (sizeBtns.length > 0 && priceDisplay) {
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all
                sizeBtns.forEach(b => b.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');
                
                // Update Price
                const newPrice = btn.getAttribute('data-price');
                priceDisplay.innerText = `$${newPrice}`;
                
                // Optional: Update image if you had different images per size
                // const newImage = btn.getAttribute('data-image');
                // if(newImage) document.getElementById('main-product-image').src = newImage;
            });
        });
    }

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const productName = document.querySelector('.product-info h1')?.textContent;
            const activeSizeBtn = document.querySelector('.size-btn.active');
            if (!productName || !activeSizeBtn) return;

            const newItemId = `${productName}-${activeSizeBtn.dataset.size}`;
            const existingItem = cart.find(item => item.id === newItemId);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                const newItem = {
                    id: newItemId,
                    name: productName,
                    size: activeSizeBtn.dataset.size,
                    price: `$${parseFloat(activeSizeBtn.dataset.price).toFixed(2)}`,
                    image: document.getElementById('main-product-image')?.src,
                    quantity: 1
                };
                cart.push(newItem);
            }
            
            updateCartUI();
            openCart();

            addToCartBtn.innerText = "Added to Cart";
            setTimeout(() => addToCartBtn.innerText = "Add to Cart", 2000);
        });
    }

    // Sidebar Logic
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarLoginBtn = document.getElementById('sidebar-login-btn');
    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');

    if (sidebarLoginBtn) {
        sidebarLoginBtn.addEventListener('click', () => handleLogin());
    }

    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', () => {
            handleLogout();
        });
    }

    // Auth State Observer
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

        // Update Navbar Login Button Text
        const loginTextSpan = document.querySelector('#login-btn .login-text');
        if (loginTextSpan) {
            loginTextSpan.textContent = user ? 'Logout' : 'Login';
        }

        // Update Sidebar UI
        if (sidebarUserName) {
            if (user) {
                sidebarUserName.textContent = user.displayName || user.email || "Member";
                if (sidebarLoginBtn) sidebarLoginBtn.style.display = 'none';
                if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'block';

                // Add My Account link to sidebar if it doesn't exist
                const sidebarMenu = document.querySelector('.sidebar-menu');
                if (sidebarMenu && !document.getElementById('sidebar-account-link')) {
                    const accountLink = document.createElement('a');
                    accountLink.href = 'my-account.html';
                    accountLink.id = 'sidebar-account-link';
                    accountLink.textContent = 'My Account';
                    sidebarMenu.appendChild(accountLink);
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
                if (sidebarLoginBtn) sidebarLoginBtn.style.display = 'block';
                if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'none';
                
                // Remove My Account link
                const accountLink = document.getElementById('sidebar-account-link');
                if (accountLink) accountLink.remove();
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
                                // If the order is shipped, create a track button.
                                if (status.toLowerCase() === 'shipped') {
                                    // For this demo, we'll generate a fake tracking number if one isn't in the data.
                                    const trackingNumber = order.trackingNumber || `1Z${order.id.slice(0, 10).toUpperCase()}A0${Math.floor(Math.random() * 90 + 10)}`;
                                    trackButtonHtml = `<a href="tracking.html?orderId=${order.id}&trackingNumber=${trackingNumber}" class="track-order-btn">Track Order</a>`;
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
                                        <span>Order #${order.id.slice(0, 8).toUpperCase()}</span>
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
                                        </div>
                                        <span style="color: var(--accent-gold);">$${total}</span>
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
        placeOrderBtn.addEventListener('click', (e) => {
            e.preventDefault();

            if (cart.length === 0) {
                alert("Your cart is empty.");
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
                    alert("The server is not responding. Please check your internet connection and try again.");
                    // Re-enable the button on failure
                    placeOrderBtn.innerText = "Place Order";
                    placeOrderBtn.style.opacity = "1";
                    placeOrderBtn.style.pointerEvents = "auto";
                }, 15000); // 15 seconds

                try {
                    // Save Order to Firestore
                    const orderData = {
                        items: cart,
                        shipping: {
                            email: document.getElementById('checkout-email').value,
                            fullName: document.getElementById('checkout-name').value,
                            address: document.getElementById('checkout-address').value,
                            city: document.getElementById('checkout-city').value,
                            postalCode: document.getElementById('checkout-postal-code').value
                        },
                        total: cart.reduce((sum, item) => {
                            let price = item.price;
                            // Handle price if it's a string with $ or just a number
                            if (typeof price === 'string') {
                                price = parseFloat(price.replace('$', ''));
                            }
                            return sum + (price * item.quantity);
                        }, 0),
                        timestamp: serverTimestamp(), // Use server timestamp for accuracy
                        status: 'Pending', // Standardized status
                        userId: currentUser ? currentUser.uid : 'guest'
                    };

                    addDoc(collection(db, "orders"), orderData)
                        .then((docRef) => {
                            clearTimeout(operationTimeout); // Success, so clear the timeout
                            console.log("Order placed successfully with ID: ", docRef.id);
                            
                            // This logic now runs ONLY on success
                            setTimeout(() => {
                                // Clear Cart
                                cart = [];
                                localStorage.setItem('dodch_cart', JSON.stringify(cart));
                                updateCartUI();
                                
                                // Replace Order Summary with Success Message
                                const orderSummary = document.querySelector('.order-summary');
                                if (orderSummary) {
                                    orderSummary.innerHTML = `
                                        <div style="text-align: center; padding: 2rem 0; animation: fadeIn 0.5s ease;">
                                            <svg style="width: 60px; height: 60px; color: var(--accent-gold); margin-bottom: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <h2 style="border: none; margin-bottom: 0.5rem;">Order Confirmed</h2>
                                            <p style="font-size: 0.95rem; opacity: 0.8;">Thank you for choosing DODCH. Your order #${docRef.id.slice(0, 8).toUpperCase()} is being prepared.</p>
                                            <a href="index.html" class="cta-button" style="margin-top: 2rem; display: inline-block; width: auto;">Return Home</a>
                                        </div>
                                    `;
                                }
                                
                                // Scroll to summary on mobile if needed
                                if (window.innerWidth < 768) {
                                    orderSummary.scrollIntoView({ behavior: 'smooth' });
                                }
                            }, 1000); // Reduced timeout for faster feedback
                        })
                        .catch(err => {
                            clearTimeout(operationTimeout); // Failure, so clear the timeout
                            console.error("CRITICAL: Error placing order:", err);
                            alert("There was a critical error placing your order. Your cart has not been cleared. Please try again.");
                            // Re-enable the button on failure
                            placeOrderBtn.innerText = "Place Order";
                            placeOrderBtn.style.opacity = "1";
                            placeOrderBtn.style.pointerEvents = "auto";
                        });
                } catch (err) {
                    clearTimeout(operationTimeout); // Synchronous error, so clear the timeout
                    console.error("Synchronous Error preparing order:", err);
                    alert("An error occurred while preparing your order. Please check your cart and try again.");
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

    // 15. Smart Footer & Contact Popup
    const initSmartFooter = () => {
        // We identify the "Shampoo Page" (Home) by the presence of the #hero element
        const heroSection = document.getElementById('hero');
        const footer = document.querySelector('footer');
        
        // If NOT homepage (no hero) and footer exists
        if (!heroSection && footer) {
            // Replace footer content
            footer.innerHTML = `
                <div class="container footer-minimal">
                    <div class="footer-luxury-text">
                        "At DODCH, luxury is not just a label; it is an obsession. We source the rarest ingredients and adhere to uncompromising standards of quality to deliver an experience that transcends the ordinary."
                    </div>
                    
                    <div class="footer-socials">
                        <a href="#" class="social-icon" aria-label="Instagram" target="_blank"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
                        <a href="#" class="social-icon" aria-label="TikTok" target="_blank"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg></a>
                        <a href="https://www.facebook.com/profile.php?id=61586824002342" class="social-icon" aria-label="Facebook" target="_blank"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
                    </div>

                    <button id="footer-contact-trigger" class="footer-contact-btn">Contact Concierge</button>

                    <div class="copyright">
                        &copy; 2026 DODCH. All Rights Reserved.
                    </div>
                </div>
            `;

            // Inject Popup HTML
            const popupHTML = `
                <div id="contact-popup" class="contact-popup-overlay">
                    <div class="contact-popup-content">
                        <button id="contact-popup-close" class="contact-popup-close">&times;</button>
                        <h3 class="contact-popup-title">Concierge Service</h3>
                        <p class="contact-popup-subtitle">How may we assist you today?</p>
                        <form class="contact-popup-form" id="popup-contact-form">
                            <div class="form-group">
                                <input type="text" placeholder="Your Name" required>
                            </div>
                            <div class="form-group">
                                <input type="email" placeholder="Your Email" required>
                            </div>
                            <div class="form-group">
                                <textarea rows="4" placeholder="Your Message" required></textarea>
                            </div>
                            <button type="submit">Send Message</button>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', popupHTML);

            // Bind Events
            const triggerBtn = document.getElementById('footer-contact-trigger');
            const popup = document.getElementById('contact-popup');
            const closeBtn = document.getElementById('contact-popup-close');
            const form = document.getElementById('popup-contact-form');

            if (triggerBtn && popup) {
                triggerBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    popup.classList.add('active');
                });

                closeBtn.addEventListener('click', () => popup.classList.remove('active'));
                
                popup.addEventListener('click', (e) => {
                    if (e.target === popup) popup.classList.remove('active');
                });

                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const btn = form.querySelector('button');
                        btn.innerText = "Sending...";
                        
                        const inputs = form.querySelectorAll('input, textarea');
                        addDoc(collection(db, "messages"), {
                            name: inputs[0].value,
                            email: inputs[1].value,
                            message: inputs[2].value,
                            source: 'footer_popup',
                            timestamp: new Date()
                        }).then(() => {
                            form.innerHTML = `
                                <div style="text-align: center; padding: 2rem;">
                                    <svg style="width: 50px; height: 50px; color: var(--accent-gold); margin-bottom: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    <h3 style="color: var(--accent-gold); margin-bottom: 0.5rem;">Message Sent</h3>
                                    <p>Our concierge will be in touch shortly.</p>
                                </div>
                            `;
                            setTimeout(() => {
                                popup.classList.remove('active');
                            }, 2500);
                        }).catch(err => {
                            console.error(err);
                            btn.innerText = "Error. Try again.";
                        });
                    });
                }
            }
        }
    };

    initSmartFooter();

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
                                <button class="size-btn active" data-size="250ml" data-price="35.00">250ml</button>
                                <button class="size-btn" data-size="500ml" data-price="65.00">500ml</button>
                            </div>
                        </div>

                        <button id="qv-add-to-cart" class="qv-add-to-cart-btn">Add to Cart</button>
                        <a href="product.html" style="text-align: center; display: block; margin-top: 1rem; font-size: 0.85rem; text-decoration: underline; color: var(--text-charcoal);">View Full Details</a>
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
        const qvSizeBtns = modal.querySelectorAll('.size-btn');

        let currentProduct = {};

        // Open Modal
        document.querySelectorAll('.quick-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const id = btn.dataset.id;
                const title = btn.dataset.title;
                const price = btn.dataset.price;
                const img = btn.dataset.img;
                const desc = btn.dataset.desc;

                currentProduct = { id, title, price, img, desc };

                qvImage.src = img;
                qvTitle.textContent = title;
                qvPrice.textContent = `$${price}`;
                qvDesc.textContent = desc;
                
                qvSizeBtns.forEach(b => b.classList.remove('active'));
                qvSizeBtns[0].classList.add('active');

                modal.classList.add('active');
            });
        });

        const closeModal = () => modal.classList.remove('active');
        if(closeBtn) closeBtn.addEventListener('click', closeModal);
        if(modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        qvSizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                qvSizeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const newPrice = btn.dataset.price;
                qvPrice.textContent = `$${newPrice}`;
            });
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
                        name: currentProduct.title,
                        size: size,
                        price: `$${price}`,
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

    const orderIdEl = document.getElementById('tracking-order-id');
    const trackingNumberEl = document.getElementById('tracking-number');

    if (orderId && trackingNumber && orderIdEl && trackingNumberEl) {
        orderIdEl.textContent = orderId.slice(0, 8).toUpperCase();
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
