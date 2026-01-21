'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const Particle = ({ delay, duration, x, scale, opacity }: { delay: number; duration: number; x: number; scale: number; opacity: number }) => {
    return (
        <motion.div
            className="absolute bg-emerald-500/20 rounded-full blur-sm"
            style={{
                width: 20 * scale,
                height: 20 * scale,
                left: `${x}%`,
            }}
            initial={{ y: "110vh", opacity: 0, rotate: 0 }}
            animate={{
                y: "-10vh",
                opacity: [0, opacity, 0],
                rotate: 360,
            }}
            transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: "linear",
            }}
        />
    );
};

export default function BackgroundEffect() {
    const [particles, setParticles] = useState<{ id: number; delay: number; duration: number; x: number; scale: number; opacity: number }[]>([]);

    useEffect(() => {
        // Generate random particles on client side to avoid hydration mismatch
        const newParticles = Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            delay: Math.random() * 20,
            duration: 15 + Math.random() * 20,
            x: Math.random() * 100,
            scale: 0.5 + Math.random() * 1.5,
            opacity: 0.2 + Math.random() * 0.3,
        }));
        setParticles(newParticles);
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <Particle
                    key={p.id}
                    delay={p.delay}
                    duration={p.duration}
                    x={p.x}
                    scale={p.scale}
                    opacity={p.opacity}
                />
            ))}
            {/* Gradient Overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-60" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        </div>
    );
}
