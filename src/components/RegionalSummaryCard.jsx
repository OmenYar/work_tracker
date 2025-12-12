import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RegionalSummaryCard = ({ regional, count, items, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-shadow duration-300"
        >
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <MapPin className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{regional}</h3>
                            <p className="text-sm text-gray-300">Regional Area</p>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-yellow-400">{count}</span>
                        <span className="text-gray-300">waiting approval</span>
                    </div>
                </div>

                <Button
                    onClick={() => setIsExpanded(!isExpanded)}
                    variant="ghost"
                    className="w-full text-white hover:bg-white/10 flex items-center justify-between"
                >
                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-3 border-t border-white/10 pt-4"
                    >
                        {items.map((item) => (
                            <div key={item.id} className="bg-white/5 rounded-lg p-3 space-y-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-semibold">{item.siteName}</p>
                                        <p className="text-sm text-gray-400">ID: {item.siteId1}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                    <div>
                                        <span className="text-gray-400">Customer:</span>
                                        <p className="text-white">{item.customer}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Aging:</span>
                                        <p className="text-white">{item.agingDays || 'N/A'} days</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default RegionalSummaryCard;