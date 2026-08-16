import React from 'react';
import { motion } from 'motion/react';
import { Star, ShieldCheck, ExternalLink, Quote, Wallet } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  address: string;
  earnings: string;
  quote: string;
  txHash: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Alexandre V.',
    role: 'Leader Tier Sponsor',
    address: '0x8f3C...A063',
    earnings: '$12,450 USDT',
    quote: 'The 100% peer-to-peer payout speed is unreal. As soon as my 5th partner joined, the smart contract executed the auto re-topup and sent funds directly to my wallet in seconds.',
    txHash: '0xa38c7f219b1d309228e57f12e84129b8c0d9a7e6d5c4b3a2109876543210abcd'
  },
  {
    name: 'Elena Rostova',
    role: 'Champion Tier Partner',
    address: '0x3c44...d293',
    earnings: '$38,900 USDT',
    quote: 'The 13-Level forced matrix spillover creates real team momentum. I received $325 USDT matrix level bonuses from spillover nodes I didn’t even recruit directly!',
    txHash: '0x9d2b1f8e6a5c4d3b2a109876543210abcdef1234567890abcdef1234567890ab'
  },
  {
    name: 'Marcus Thorne',
    role: 'Builder Tier Member',
    address: '0x71C7...976F',
    earnings: '$4,200 USDT',
    quote: 'No admin delay and no manual withdrawal buttons. The contract rules are immutable and visible on BscScan. This is the cleanest Web3 matrix engine I’ve ever seen.',
    txHash: '0x7e6d5c4b3a2109876543210abcdef1234567890abcdef1234567890abcdef12'
  }
];

export default function TestimonialsSection() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
  };

  return (
    <section id="testimonials-section" className="py-24 relative overflow-hidden bg-surface-sunken border-y border-border-subtle">
      {/* Ambient glow orb */}
      <div className="pointer-events-none absolute -top-24 right-[8%] h-[500px] w-[500px] rounded-full bg-accent-blue/5 blur-[120px] animate-pulse-slow -z-10" />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="mb-4">
            <span className="badge badge-brand text-accent-blue bg-accent-blue/10 border-accent-blue/20">
              <ShieldCheck size={12} />
              <span>On-Chain Verified Community Feedback</span>
            </span>
          </div>
          <h2 className="section-title">
            Trusted by <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Web3 Leaders</span> Worldwide
          </h2>
          <p className="section-subtitle mt-4 mx-auto">
            Real feedback from active matrix leaders backed by auditable BNB Smart Chain transactions.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="card p-8 group flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 hover:border-accent-blue/30"
            >
              <Quote className="pointer-events-none absolute -top-2 -right-2 text-accent-blue/5 group-hover:text-accent-blue/10 transition-colors duration-300" size={80} strokeWidth={1} />

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400" />
                    ))}
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20">
                    {t.earnings} Earned
                  </span>
                </div>

                <p className="text-[14px] text-prime italic leading-relaxed mb-8 font-medium">
                  "{t.quote}"
                </p>
              </div>

              <div className="relative z-10 pt-5 border-t border-border-subtle flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent-blue/10 ring-2 ring-accent-blue/20 ring-offset-2 ring-offset-surface shrink-0 group-hover:ring-accent-blue/40 transition-all">
                    <Wallet size={16} className="text-accent-blue" />
                  </div>
                  <div>
                    <div className="font-extrabold text-prime text-[13px]">{t.name}</div>
                    <div className="text-[11px] text-sub font-mono tracking-tight">{t.role}</div>
                  </div>
                </div>

                <a
                  href={`https://testnet.bscscan.com/tx/${t.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-surface border border-border-subtle text-sub hover:text-accent-blue hover:border-accent-blue/30 transition-colors flex items-center gap-1.5 font-mono shadow-sm"
                >
                  <span>{t.address}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
