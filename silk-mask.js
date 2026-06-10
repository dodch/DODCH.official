document.addEventListener('DOMContentLoaded', () => {
    const heroVideo = document.getElementById('hero-video-silk');
    const heroCanvas = document.getElementById('hero-canvas-silk');

    if (heroVideo && heroCanvas) {
        const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // Mobile fallback to simple loop to save battery/CPU - mobile browsers struggle with frame capture
        if (isMobile) {
            heroVideo.loop = true;
            heroVideo.style.display = 'block';
            if (heroCanvas) heroCanvas.style.display = 'none';
            heroVideo.play().catch(e => console.log('Autoplay prevented:', e));
            return;
        }

        const ctx = heroCanvas.getContext('2d');

        // Frame capture config
        const CAPTURE_FPS = 30;      
        const REVERSE_FPS = 30;      
        const CAPTURE_INTERVAL = 1000 / CAPTURE_FPS;
        const REVERSE_INTERVAL = 1000 / REVERSE_FPS;

        let frames = [];
        let captureTimer = null;
        let reverseRaf = null;
        let reverseIndex = 0;
        let isReversing = false;
        let lastReverseTime = 0;

        const syncCanvasSize = () => {
            if (heroVideo.videoWidth) {
                heroCanvas.width = heroVideo.videoWidth;
                heroCanvas.height = heroVideo.videoHeight;
            }
        };

        const captureFrame = () => {
            if (heroVideo.readyState < 2 || heroVideo.paused || heroVideo.ended) return;
            createImageBitmap(heroVideo).then(bitmap => {
                if (!isReversing) frames.push(bitmap);
            }).catch(() => { });
        };

        const startCapture = () => {
            frames = []; 
            stopCapture();
            captureTimer = setInterval(captureFrame, CAPTURE_INTERVAL);
        };

        const stopCapture = () => {
            if (captureTimer) clearInterval(captureTimer);
            captureTimer = null;
        };

        const reverseLoop = (timestamp) => {
            if (!isReversing) return;

            if (timestamp - lastReverseTime >= REVERSE_INTERVAL) {
                lastReverseTime = timestamp;

                if (reverseIndex < 0 || frames.length === 0) {
                    stopReverse();
                    return;
                }

                const frame = frames[reverseIndex];
                if (frame) {
                    ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
                    ctx.drawImage(frame, 0, 0, heroCanvas.width, heroCanvas.height);
                }
                reverseIndex--;
            }
            reverseRaf = requestAnimationFrame(reverseLoop);
        };

        const startReverse = () => {
            stopCapture();
            if (frames.length === 0) {
                heroVideo.currentTime = 0;
                heroVideo.play();
                return;
            }

            syncCanvasSize();
            reverseIndex = frames.length - 1;
            isReversing = true;
            lastReverseTime = 0;

            // Draw the very last frame immediately to prevent a black flicker
            const lastFrame = frames[reverseIndex];
            if (lastFrame) {
                ctx.drawImage(lastFrame, 0, 0, heroCanvas.width, heroCanvas.height);
            }

            heroVideo.style.display = 'none';
            heroCanvas.style.display = 'block';
            reverseRaf = requestAnimationFrame(reverseLoop);
        };

        const stopReverse = () => {
            isReversing = false;
            cancelAnimationFrame(reverseRaf);
            
            heroVideo.currentTime = 0;
            heroCanvas.style.display = 'none';
            heroVideo.style.display = 'block';
            
            heroVideo.play().then(() => startCapture()).catch(() => { });
        };

        const init = () => {
            syncCanvasSize();
            heroVideo.loop = false;
            heroVideo.addEventListener('ended', startReverse);
            
            // Use Intersection Observer to only run the logic when visible
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    heroVideo.play().then(() => startCapture()).catch(() => {});
                } else {
                    heroVideo.pause();
                    stopCapture();
                    isReversing = false;
                    cancelAnimationFrame(reverseRaf);
                }
            }, { threshold: 0.1 });

            observer.observe(heroVideo.closest('section'));
        };

        if (heroVideo.readyState >= 1) init();
        else heroVideo.addEventListener('loadedmetadata', init, { once: true });
    }
});