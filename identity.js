document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');
    const letters = document.querySelectorAll('.letter');
    const sections = document.querySelectorAll('.identity-section');
    const body = document.body;

    // 1. Custom Cursor Logic
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    document.querySelectorAll('section, h2, p, a').forEach(el => {
        el.addEventListener('mouseenter', () => body.classList.add('hovering'));
        el.addEventListener('mouseleave', () => body.classList.remove('hovering'));
    });

    // 2. Scroll Animation Engine
    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                const activeLetter = entry.target.dataset.active;
                
                entry.target.classList.add('active');
                updateLogoState(sectionId, activeLetter);
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, observerOptions);

    sections.forEach(sec => observer.observe(sec));

    function updateLogoState(sectionId, activeId) {
        // Reset letters
        letters.forEach(l => {
            l.style.transform = 'translate(0,0) rotate(0deg) scale(1)';
            l.style.opacity = '1';
            l.classList.remove('focus');
        });

        const logoContainer = document.querySelector('.logo-big');

        if (sectionId === 'sec-intro') {
            logoContainer.style.transform = 'scale(0.5) translateY(-50px)';
        } else if (sectionId === 'sec-manifesto') {
            logoContainer.style.transform = 'scale(0.3) translateY(-100vh)';
            logoContainer.style.opacity = '0';
        } else {
            logoContainer.style.transform = 'scale(1.2) translateZ(50px)';
            
            // Letter-specific transformations
            if (activeId === 'D') {
                const d1 = document.querySelector('.letter[data-letter="D"]');
                d1.style.transform = 'translateX(-22vw) rotateY(-15deg) scale(1.6)';
                d1.classList.add('focus');
                hideOthersExcept(['D']);
            } else if (activeId === 'O') {
                const o = document.querySelector('.letter[data-letter="O"]');
                o.style.transform = 'scale(6) translateZ(-100px)';
                o.style.opacity = '0.08';
                o.classList.add('focus');
                hideOthersExcept(['O']);
            } else if (activeId === 'D2') {
                const d2 = document.querySelector('.letter[data-letter="D2"]');
                d2.style.transform = 'rotateY(180deg) scale(2) translateZ(30px)';
                d2.classList.add('focus');
                hideOthersExcept(['D2']);
            } else if (activeId === 'C') {
                const c = document.querySelector('.letter[data-letter="C"]');
                c.style.transform = 'scale(2.5) translateX(12vw) rotateX(10deg)';
                c.style.textShadow = '0 0 30px var(--accent-gold)';
                c.classList.add('focus');
                hideOthersExcept(['C']);
            } else if (activeId === 'H') {
                const h = document.querySelector('.letter[data-letter="H"]');
                h.style.transform = 'translateY(-35vh) scale(3.5) rotateZ(5deg)';
                h.classList.add('focus');
                hideOthersExcept(['H']);
            }
        }
    }

    function hideOthersExcept(activeLabels) {
        letters.forEach(l => {
            if (!activeLabels.includes(l.dataset.letter)) {
                l.style.opacity = '0.05';
            }
        });
    }

    // Parallax Scroll for BG Media
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const videos = document.querySelectorAll('.bg-media video');
        videos.forEach(v => {
            v.style.transform = `translateY(${scrolled * 0.2}px)`;
        });
    });
});
