import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Landmark, Users, TrendingUp } from 'lucide-react';
import { statsApi } from '../services/api';

interface CountUpProps {
  end: number | null;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

function CountUp({ end, prefix = '', suffix = '', duration = 1.5, className = '' }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === null) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  if (end === null) {
    return (
      <span className={`font-mono tracking-tight text-3xl sm:text-4xl font-black tabular-nums ${className}`}>
        --
      </span>
    );
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <span className={`font-mono tracking-tight text-3xl sm:text-4xl font-black tabular-nums ${className}`}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

// Purely visual entrance animation (staggered fade/slide-up) — no effect on data/logic.
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

export default function StatsTicker() {
  const [stats, setStats] = useState<{ totalUsdtDistributed: number; activeParticipants: number; distributedToday: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    const fetchStats = async () => {
      try {
        const response = await statsApi.getGlobalStats();
        if (mounted && response) {
          setStats(response);
        }
      } catch (err) {
        console.error('Failed to fetch global stats:', err);
      } finally {
        if (mounted) {
          timeoutId = window.setTimeout(fetchStats, 30000);
        }
      }
    };

    fetchStats();

    return () => {
      mounted = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div id="live-stats-ticker" className="relative z-20 -mt-6">
      {/* Full-width elevated band to create visual rhythm between Hero and this section */}
      <div className="w-full bg-surface-elevated/60 border-y border-border-theme/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div
            id="stats-container-inner"
            className="rounded-3xl border border-border-theme bg-surface-elevated/80 backdrop-blur-md p-6 sm:p-8 shadow-xl relative overflow-hidden"
          >
            {/* Subtle decorative glow */}
            <div className="absolute top-0 left-1/4 h-20 w-40 rounded-full bg-accent-red/5 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 h-20 w-40 rounded-full bg-accent-blue/5 blur-2xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full bg-accent-purple/5 blur-2xl pointer-events-none" />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center text-center"
            >
              {/* Stat 1 */}
              <motion.div
                variants={itemVariants}
                id="stat-total-distributed"
                className="flex flex-col items-center space-y-3"
              >
                <div className="p-3 bg-gradient-to-br from-accent-red/20 to-accent-orange/10 text-accent-red rounded-2xl">
                  <Landmark size={22} />
                </div>
                <div>
                  <CountUp
                    end={stats?.totalUsdtDistributed ?? null}
                    prefix=""
                    suffix=" USDT"
                    className="bg-gradient-to-r from-accent-red to-accent-orange bg-clip-text text-transparent"
                  />
                </div>
                <span className="text-[10px] sm:text-xs font-black text-sub uppercase tracking-wider">
                  Total Distributed
                </span>
              </motion.div>

              {/* Stat 2 */}
              <motion.div
                variants={itemVariants}
                id="stat-active-participants"
                className="flex flex-col items-center space-y-3 border-t border-border-theme/40 pt-6 md:border-t-0 md:pt-0 md:border-l"
              >
                <div className="p-3 bg-gradient-to-br from-accent-blue/20 to-accent-purple/10 text-accent-blue rounded-2xl">
                  <Users size={22} />
                </div>
                <div>
                  <CountUp
                    end={stats?.activeParticipants ?? null}
                    className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent"
                  />
                </div>
                <span className="text-[10px] sm:text-xs font-black text-sub uppercase tracking-wider">
                  Active Participants
                </span>
              </motion.div>

              {/* Stat 3 */}
              <motion.div
                variants={itemVariants}
                id="stat-distributed-today"
                className="flex flex-col items-center space-y-3 border-t border-border-theme/40 pt-6 md:border-t-0 md:pt-0 md:border-l"
              >
                <div className="p-3 bg-gradient-to-br from-accent-orange/20 to-accent-green/10 text-accent-orange rounded-2xl">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <CountUp
                    end={stats?.distributedToday ?? null}
                    suffix=" USDT"
                    className="bg-gradient-to-r from-accent-orange to-accent-green bg-clip-text text-transparent"
                  />
                </div>
                <span className="text-[10px] sm:text-xs font-black text-sub uppercase tracking-wider">
                  Distributed Today
                </span>
              </motion.div>
            </motion.div>

            {/* Caption + live indicator */}
            <div
              id="stats-ticker-caption"
              className="mt-6 flex items-center justify-center gap-2 text-center text-[10px] sm:text-xs text-sub/80 border-t border-border-theme/50 pt-4 font-medium"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
              </span>
              <span>Live backend data refreshed every 30 seconds.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
