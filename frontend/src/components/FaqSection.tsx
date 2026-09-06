import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: 'General' | 'Security' | 'Payouts' | 'Matrix';
}

const faqs: FaqItem[] = [
  {
    category: 'General',
    question: 'What is SimpleOn and how does it work?',
    answer: 'SimpleOn is a 100% decentralized Web3 smart contract income engine running on BNB Smart Chain. It runs a 6-tier Booster ladder — Launch, Starter, Builder, Leader, Champion, and Visionary — through auto-cycling X3/X5 matrices to distribute USDT earnings peer-to-peer with zero platform retention.'
  },
  {
    category: 'Payouts',
    question: 'How are USDT commissions paid out?',
    answer: 'All payouts occur instantly on-chain in Web-20 USDT directly to your connected Web3 wallet address. There are no manual withdrawal requests, waiting periods, or admin approvals required.'
  },
  {
    category: 'Matrix',
    question: 'What is the 5-Partner Cycle and Auto Re-Topup?',
    answer: 'Each Booster Tier position requires 5 partner placements to complete a cycle. Upon the 5th placement, the smart contract automatically uses reserved funds to re-topup your slot, allowing you to cycle repeatedly without re-depositing.'
  },
  {
    category: 'Security',
    question: 'Is the smart contract audited and secure?',
    answer: 'Yes! The smart contract is open-source, fully verified on BscScan, and audited for vulnerability vectors like ReentrancyGuard, SafeERC20 logic, and SIWE EIP-712 nonce authentication.'
  },
  {
    category: 'Matrix',
    question: 'What happens when a Booster Tier reaches its daily cycle cap?',
    answer: 'Starter through Champion each allow up to 5 completed cycles per rolling 24 hours (Launch is uncapped). Once a tier is capped for the day, that cycle\'s reward automatically routes to your immediate sponsor instead of being lost.'
  },
  {
    category: 'General',
    question: 'What wallet do I need to get started?',
    answer: 'You can use any standard EVM-compatible Web3 wallet, such as MetaMask, Trust Wallet, or Binance Web3 Wallet, configured for BNB Smart Chain (BSC Testnet or Mainnet).'
  }
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
  };

  return (
    <section id="faq-section" className="py-24 relative overflow-hidden bg-page">
      {/* Ambient accent-red glow orb */}
      <div className="pointer-events-none absolute -top-24 right-[10%] h-[500px] w-[500px] rounded-full bg-accent-red/5 blur-[120px] animate-pulse-slow" />

      <div className="section-container relative z-10 max-w-4xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mb-4">
            <span className="badge badge-brand text-accent-red bg-accent-red/10 border-accent-red/20">
              <HelpCircle size={12} />
              <span>Frequently Asked Questions</span>
            </span>
          </div>
          <h2 className="section-title">
            Everything You Need to <span className="bg-gradient-to-r from-accent-red to-accent-orange bg-clip-text text-transparent">Know</span>
          </h2>
          <p className="section-subtitle mt-4 mx-auto">
            Transparent answers regarding smart contract mechanics, payouts, matrices, and security.
          </p>
        </div>

        {/* Accordion List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-4"
        >
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                className={`card overflow-hidden transition-colors duration-300 ${
                  isOpen
                    ? 'bg-accent-red-muted border-accent-red/30'
                    : 'hover:border-accent-red/20 hover:bg-surface-elevated/50'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="text-[15px] font-bold text-prime flex items-center gap-3">
                    <span className="badge badge-brand text-[10px] text-accent-red bg-accent-red/10 border-accent-red/20 shrink-0 uppercase tracking-wider">
                      {faq.category}
                    </span>
                    <span>{faq.question}</span>
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-sub shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent-red' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-6 pt-1 text-[13px] text-sub leading-relaxed border-t border-accent-red/20 font-medium">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
