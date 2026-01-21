'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface FlipCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    image?: string | null;
}

export default function FlipCard({ icon: Icon, title, description, image }: FlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className="relative h-80 w-full perspective-1000 cursor-pointer group"
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <motion.div
                className="w-full h-full relative preserve-3d transition-all duration-500"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-sm text-emerald-400/80 font-medium">Hover to learn more</p>

                    {image && (
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-5 group-hover:opacity-10 transition-opacity">
                            <img src={image} alt="" className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>

                {/* Back */}
                <div
                    className="absolute inset-0 backface-hidden glass-elevated rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-emerald-500/30 rotate-y-180 bg-gradient-to-br from-emerald-900/40 to-black/90"
                >
                    <div className="absolute top-4 right-4">
                        <Icon className="w-5 h-5 text-emerald-500/20" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        {description}
                    </p>
                    <div className="mt-6 px-4 py-2 rounded-lg bg-emerald-500/10 text-xs text-emerald-300 font-mono border border-emerald-500/20">
                        Detailed Analysis
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
