'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
    const [isHovered, setIsHovered] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    const springConfig = { damping: 25, stiffness: 700 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX - 16);
            cursorY.set(e.clientY - 16);
        };

        const handleMouseEnter = () => setIsHovered(true);
        const handleMouseLeave = () => setIsHovered(false);

        // Attach listeners to interactive elements
        const updateListeners = () => {
            const clickables = document.querySelectorAll('a, button, input, [role="button"], .cursor-hover');
            clickables.forEach((el) => {
                el.addEventListener('mouseenter', handleMouseEnter);
                el.addEventListener('mouseleave', handleMouseLeave);
            });
            return () => {
                clickables.forEach((el) => {
                    el.removeEventListener('mouseenter', handleMouseEnter);
                    el.removeEventListener('mouseleave', handleMouseLeave);
                });
            };
        };

        window.addEventListener('mousemove', moveCursor);
        const cleanupListeners = updateListeners();

        // Re-attach listeners when DOM changes (observer)
        const observer = new MutationObserver(updateListeners);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            cleanupListeners();
            observer.disconnect();
        };
    }, [cursorX, cursorY]);

    return (
        <motion.div
            className="fixed top-0 left-0 w-8 h-8 rounded-full border border-emerald-500/50 pointer-events-none z-[9999] hidden md:flex items-center justify-center mix-blend-difference"
            style={{
                x: cursorXSpring,
                y: cursorYSpring,
            }}
        >
            <motion.div
                className="bg-emerald-400 rounded-full"
                animate={{
                    width: isHovered ? 8 : 4,
                    height: isHovered ? 8 : 4,
                    opacity: isHovered ? 1 : 0.5,
                }}
                transition={{ duration: 0.2 }}
            />
        </motion.div>
    );
}
