document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');
    const letters = document.querySelectorAll('.letter');
    const sections = document.querySelectorAll('.identity-section');
    const body = document.body;

    // 1. Smooth Custom Cursor
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        const easing = 0.15;
        cursorX += (mouseX - cursorX) * easing;
        cursorY += (mouseY - cursorY) * easing;
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.querySelectorAll('section, h2, p, a, .letter').forEach(el => {
        el.addEventListener('mouseenter', () => body.classList.add('hovering'));
        el.addEventListener('mouseleave', () => body.classList.remove('hovering'));
    });

    // 2. Intersection Observer with larger margin
    const observerOptions = {
        threshold: 0.6,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                const activeLetter = entry.target.dataset.active;
                
                // Remove active from others
                sections.forEach(s => s.classList.remove('active'));
                entry.target.classList.add('active');
                
                updateLogoState(sectionId, activeLetter);
            }
        });
    }, observerOptions);

    sections.forEach(sec => observer.observe(sec));

    function updateLogoState(sectionId, activeId) {
        const logoContainer = document.querySelector('.logo-big');
        
        // Reset all letters to baseline transparent-ish
        letters.forEach(l => {
            l.style.transform = 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) scale(1)';
            l.style.opacity = '0.05';
            l.style.filter = 'blur(5px)';
            l.classList.remove('focus');
        });

        if (sectionId === 'sec-intro') {
            logoContainer.style.transform = 'translate3d(0,0,0) scale(0.6)';
            letters.forEach(l => {
                l.style.opacity = '1';
                l.style.filter = 'none';
            });
        } 
        else if (sectionId === 'sec-manifesto') {
            logoContainer.style.transform = 'translate3d(0, -100vh, 0) scale(1)';
            logoContainer.style.opacity = '0';
        } 
        else {
            logoContainer.style.opacity = '1';
            logoContainer.style.transform = 'translate3d(0,0,0) scale(1.2)';
            
            // Highlight and animate the active letter
            const currentLetter = document.querySelector(`.letter[data-letter="${activeId}"]`);
            if (currentLetter) {
                currentLetter.style.opacity = '1';
                currentLetter.style.filter = 'none';
                currentLetter.classList.add('focus');

                if (activeId === 'D') {
                    currentLetter.style.transform = 'translate3d(-25vw, 0, 100px) rotateY(-20deg) scale(2)';
                } else if (activeId === 'O') {
                    currentLetter.style.transform = 'translate3d(0, 0, -200px) scale(8)';
                    currentLetter.style.opacity = '0.15';
                } else if (activeId === 'D2') {
                    currentLetter.style.transform = 'translate3d(0, 0, 150px) rotateY(180deg) scale(2.5)';
                } else if (activeId === 'C') {
                    currentLetter.style.transform = 'translate3d(15vw, 0, 50px) scale(2.5) rotateX(15deg)';
                } else if (activeId === 'H') {
                    currentLetter.style.transform = 'translate3d(0, -30vh, 200px) scale(4)';
                }
            }
        }
    }
});
