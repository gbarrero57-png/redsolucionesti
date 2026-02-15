'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useSpring } from 'framer-motion';

interface ScrollImageSequenceProps {
    directory: string;
    frameCount: number;
    fit?: 'contain' | 'cover';
}

const ScrollImageSequence: React.FC<ScrollImageSequenceProps> = ({
    directory,
    frameCount,
    fit = 'contain'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 80,
        damping: 25,
        restDelta: 0.001
    });

    useEffect(() => {
        let loadedCount = 0;
        const loadedImgArray: HTMLImageElement[] = [];

        const preloadImages = () => {
            for (let i = 1; i <= frameCount; i++) {
                const img = new Image();
                const frameNumber = i.toString().padStart(3, '0');
                img.src = `${directory}/ezgif-frame-${frameNumber}.jpg`;
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === frameCount) {
                        setIsLoading(false);
                    }
                };
                loadedImgArray.push(img);
            }
            setImages(loadedImgArray);
        };

        preloadImages();
    }, [directory, frameCount]);

    const renderFrame = (index: number) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const ctx = canvas?.getContext('2d', { alpha: false }); // Performance optimization
        const img = images[index];

        if (canvas && ctx && img && container) {
            const displayWidth = container.clientWidth;
            const displayHeight = container.clientHeight;

            const imgWidth = img.width;
            const imgHeight = img.height;

            // Enable high-quality smoothing for maximal sharpness
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // COVER vs CONTAIN logic
            const ratio = fit === 'cover'
                ? Math.max(displayWidth / imgWidth, displayHeight / imgHeight)
                : Math.min(displayWidth / imgWidth, displayHeight / imgHeight);

            const drawWidth = imgWidth * ratio;
            const drawHeight = imgHeight * ratio;

            // Center the subject precisely
            const x = (displayWidth - drawWidth) / 2;
            const y = (displayHeight - drawHeight) / 2;

            // Clear with black to avoid ghosting artifacts
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, displayWidth, displayHeight);

            ctx.drawImage(img, x, y, drawWidth, drawHeight);
        }
    };

    useEffect(() => {
        const unsubscribe = smoothProgress.on("change", (v) => {
            const frameIndex = Math.min(Math.floor(v * frameCount), frameCount - 1);
            if (images[frameIndex]) {
                renderFrame(frameIndex);
            }
        });
        return () => unsubscribe();
    }, [images, smoothProgress, frameCount, fit]);

    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container) {
                const rect = container.getBoundingClientRect();
                const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DDR at 2 for performance vs clarity balance

                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;

                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;

                const ctx = canvas.getContext('2d', { alpha: false });
                if (ctx) {
                    ctx.resetTransform();
                    ctx.scale(dpr, dpr);
                    ctx.imageSmoothingQuality = 'high';
                }

                const currentFrame = Math.min(Math.floor(smoothProgress.get() * frameCount), frameCount - 1);
                if (images[currentFrame]) renderFrame(currentFrame);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [images, frameCount, smoothProgress, fit]);

    return (
        <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-ti-dark/50 backdrop-blur-sm rounded-3xl">
                    <div className="w-10 h-10 border-4 border-ti-blue border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="block pointer-events-none brightness-[102%] contrast-[103%] saturate-[105%]"
                style={{
                    imageRendering: 'auto',
                    filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
                }}
            />
        </div>
    );
};

export default ScrollImageSequence;
