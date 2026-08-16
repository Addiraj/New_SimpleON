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
      <span className={`font-mono tracking-tight text-3xl font-black tabular-nums ${className}`}>
        --
      </span>
    );
  }

  return (
    <span className={`font-mono tracking-tight text-3xl font-black tabular-nums ${className}`}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as any },
  }),
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
      } catch (err) {} finally {
        if (mounted) timeoutId = window.setTimeout(fetchStats, 30000);
      }
    };
    fetchStats();
    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="w-full bg-surface-elevated/50 border-y border-border-subtle relative z-20">
      <div className="section-container py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-accent-red-muted text-accent-red shrink-0">
              <Landmark size={24} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Total Distributed</div>
              <CountUp end={stats?.totalUsdtDistributed ?? null} suffix=" USDT" className="text-prime" />
            </div>
          </motion.div>

          <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="flex items-center gap-4 md:border-l md:border-border-subtle md:pl-6"
          >
            <div className="p-3 rounded-xl bg-accent-blue/10 text-accent-blue shrink-0">
              <Users size={24} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Active Participants</div>
              <CountUp end={stats?.activeParticipants ?? null} className="text-prime" />
            </div>
          </motion.div>

          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="flex items-center gap-4 md:border-l md:border-border-subtle md:pl-6"
          >
            <div className="p-3 rounded-xl bg-accent-green/10 text-accent-green shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Distributed Today</div>
              <CountUp end={stats?.distributedToday ?? null} suffix=" USDT" className="text-prime" />
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
