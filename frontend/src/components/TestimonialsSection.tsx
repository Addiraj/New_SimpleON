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
    <section id="testimonials-section" className="py-20 relative overflow-hidden bg-surface-elevated/30 border-y border-border-theme">
      {/* Ambient glow orb */}
      <div className="pointer-events-none absolute -top-24 right-[8%] h-80 w-80 rounded-full bg-accent-blue/20 blur-3xl animate-pulse-slow -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 rounded-full bg-accent-blue/10 px-3.5 py-1.5 text-xs font-bold text-accent-blue border border-accent-blue/20 mb-3">
            <ShieldCheck size={14} />
            <span>On-Chain Verified Community Feedback</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-prime sm:text-4xl lg:text-5xl">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              Web3 Leaders
            </span>{' '}
            Worldwide
          </h2>
          <p className="mt-4 text-base text-sub leading-relaxed">
            Real feedback from active matrix leaders backed by auditable BNB Smart Chain transactions.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="group p-6 rounded-2xl bg-surface border border-border-theme shadow-sm flex flex-col justify-between relative overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-accent-blue/30 transition-all duration-300"
            >
              <Quote className="pointer-events-none absolute -top-2 -right-2 text-accent-blue/10 group-hover:text-accent-blue/20 transition-colors duration-300" size={72} strokeWidth={1.5} />

              <div className="relative">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={16} className="fill-amber-400" />
                    ))}
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold">
                    {t.earnings} Earned
                  </span>
                </div>

                <p className="text-xs text-prime italic leading-relaxed mb-6 font-medium">
                  "{t.quote}"
                </p>
              </div>

              <div className="relative pt-4 border-t border-border-theme/60 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-accent-blue/10 ring-2 ring-accent-blue/30 ring-offset-2 ring-offset-surface shrink-0">
                    <Wallet size={16} className="text-accent-blue" />
                  </div>
                  <div>
                    <div className="font-extrabold text-prime">{t.name}</div>
                    <div className="text-[10px] text-sub font-mono">{t.role}</div>
                  </div>
                </div>

                <a
                  href={`https://testnet.bscscan.com/tx/${t.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-surface-elevated text-sub hover:text-accent-blue transition-colors flex items-center space-x-1 text-[10px] font-mono"
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
