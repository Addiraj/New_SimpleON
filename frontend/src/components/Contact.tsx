import React, { useState } from 'react';
import { Mail, MessageSquare, ExternalLink, Send, Info } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.message) {
      setStatusMessage('Please fill out all fields.');
      return;
    }

    setStatusMessage('Message received. Live form delivery is coming soon.');
    setTimeout(() => {
      setStatusMessage(null);
      setFormData({ name: '', email: '', message: '' });
    }, 5000);
  };

  return (
    <section id="contact-section" className="py-16 transition-colors duration-300">
      <div id="contact-container" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div id="contact-header" className="text-center max-w-3xl mx-auto mb-16">
          <h2 id="contact-heading" className="text-3xl font-extrabold tracking-tight text-prime sm:text-4xl">
            Get in Touch
          </h2>
          <p id="contact-subheading" className="mt-4 text-base text-sub">
            Have questions about the SimpleOn contract architecture or marketing plan? Send us a message.
          </p>
        </div>

        {/* Layout Grid */}
        <div id="contact-grid" className="grid gap-12 lg:grid-cols-12 max-w-5xl mx-auto items-center">
          
          {/* Left Column: Direct Info */}
          <div id="contact-info-col" className="lg:col-span-5 space-y-8">
            <div id="contact-info-card" className="rounded-2xl border border-border-theme bg-surface p-6 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-prime">Contact Resources</h3>
              
              <div className="space-y-4">
                {/* Email address */}
                <div className="flex items-start space-x-3.5 text-xs text-prime">
                  <div className="p-2.5 bg-accent-red/10 text-accent-red rounded-xl mt-0.5">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-prime">Email Inquiries</h4>
                    <p className="text-sub mt-0.5">support@simpleon.network</p>
                    <a href="mailto:support@simpleon.network" className="inline-flex items-center space-x-1 text-accent-red hover:opacity-80 font-bold mt-1.5 transition-colors">
                      <span>Send email</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Social media / community links */}
                <div className="flex items-start space-x-3.5 text-xs text-prime border-t border-border-theme pt-4">
                  <div className="p-2.5 bg-accent-blue/10 text-accent-blue rounded-xl mt-0.5">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-prime">Telegram Discussion</h4>
                    <p className="text-sub mt-0.5">Join the global SimpleOn community</p>
                    <button className="inline-flex items-center space-x-1 text-accent-blue hover:opacity-80 font-bold mt-1.5 transition-colors">
                      <span>t.me/SimpleOnGlobal</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Contract disclaimer notice */}
            <div className="p-4 rounded-xl border border-accent-blue/20 bg-accent-blue/5 text-[11px] text-prime flex space-x-2 leading-relaxed">
              <Info size={16} className="flex-shrink-0 mt-0.5 text-accent-blue" />
              <span>
                <strong>Smart Contract Secured:</strong> Because SimpleOn is fully peer-to-peer and governed by code on-chain, support handles only technical web connectivity questions. All reward computations are handled strictly by smart contracts.
              </span>
            </div>
          </div>

          {/* Right Column: Message Box */}
          <div id="contact-form-col" className="lg:col-span-7">
            <div id="contact-form-card" className="rounded-2xl border border-border-theme bg-surface p-8 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-prime">Leave a Message</h3>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black text-sub uppercase tracking-wider mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full text-xs font-bold bg-surface-elevated text-prime border border-border-theme rounded-xl px-4 py-3.5 focus:outline-none focus:border-accent-red transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-black text-sub uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full text-xs font-bold bg-surface-elevated text-prime border border-border-theme rounded-xl px-4 py-3.5 focus:outline-none focus:border-accent-red transition-colors"
                    placeholder="Enter your email address"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[10px] font-black text-sub uppercase tracking-wider mb-1.5">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="w-full text-xs font-bold bg-surface-elevated text-prime border border-border-theme rounded-xl px-4 py-3.5 focus:outline-none focus:border-accent-red transition-colors resize-none"
                    placeholder="Describe your inquiry..."
                  />
                </div>

                {/* Status and Action button */}
                <div className="pt-2">
                  {statusMessage && (
                    <div className="mb-4 text-xs font-bold text-center text-accent-red bg-accent-red/10 py-2.5 rounded-xl border border-accent-red/20">
                      {statusMessage}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-red-600 py-4 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700 transition-all active:scale-95 shadow-md shadow-red-600/10"
                  >
                    <Send size={14} />
                    <span>Send Message</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
