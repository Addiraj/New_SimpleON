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
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <h2 id="contact-heading" className="text-3xl font-extrabold tracking-tight text-prime sm:text-4xl">
          Get in Touch
        </h2>
        <p id="contact-subheading" className="mt-4 text-[14px] text-sub max-w-xl mx-auto leading-relaxed">
          Have questions about the SimpleOn contract architecture or marketing plan? Send us a message.
        </p>
      </div>

        {/* Layout Grid */}
        <div id="contact-grid" className="grid gap-12 lg:grid-cols-12 max-w-5xl mx-auto items-center">
          
          {/* Left Column: Direct Info */}
          <div id="contact-info-col" className="lg:col-span-5 flex flex-col gap-8">
            <div id="contact-info-card" className="card p-6 sm:p-8 flex flex-col gap-6">
              <h3 className="text-[17px] font-bold text-prime tracking-tight">Contact Resources</h3>
              
              <div className="flex flex-col gap-4">
                {/* Email address */}
                <div className="flex items-start gap-4 text-[13px] text-prime">
                  <div className="p-2.5 bg-accent-red/10 text-accent-red rounded-xl mt-0.5 border border-accent-red/20">
                    <Mail size={16} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-extrabold text-prime tracking-wider uppercase text-[11px]">Email Inquiries</h4>
                    <p className="text-muted leading-relaxed">support@simpleon.network</p>
                    <a href="mailto:support@simpleon.network" className="inline-flex items-center gap-1.5 text-accent-red hover:opacity-80 font-bold mt-1.5 transition-colors uppercase tracking-wider text-[11px]">
                      <span>Send email</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Social media / community links */}
                <div className="flex items-start gap-4 text-[13px] text-prime border-t border-border-subtle pt-5 mt-1">
                  <div className="p-2.5 bg-accent-blue/10 text-accent-blue rounded-xl mt-0.5 border border-accent-blue/20">
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-extrabold text-prime tracking-wider uppercase text-[11px]">Telegram Discussion</h4>
                    <p className="text-muted leading-relaxed">Join the global SimpleOn community</p>
                    <button className="inline-flex items-center gap-1.5 text-accent-blue hover:opacity-80 font-bold mt-1.5 transition-colors uppercase tracking-wider text-[11px] w-fit">
                      <span>t.me/SimpleOnGlobal</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Contract disclaimer notice */}
            <div className="card p-5 border-accent-blue/30 bg-accent-blue/5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shrink-0">
                <Info size={16} />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="text-[13px] font-bold text-accent-blue">Smart Contract Secured</h4>
                <p className="text-[12px] text-muted leading-relaxed">Because SimpleOn is fully peer-to-peer and governed by code on-chain, support handles only technical web connectivity questions. All reward computations are handled strictly by smart contracts.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Message Box */}
          <div id="contact-form-col" className="lg:col-span-7">
            <div id="contact-form-card" className="card p-6 sm:p-8 flex flex-col gap-6">
              <h3 className="text-[17px] font-bold text-prime tracking-tight">Leave a Message</h3>
              
              <div className="flex flex-col gap-5">
                {/* Name */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-sub uppercase tracking-wider">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full text-[13px] font-bold bg-surface-sunken text-prime border border-border-subtle rounded-xl px-4 py-3.5 focus:outline-none focus:border-accent-red transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-sub uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full text-[13px] font-bold bg-surface-sunken text-prime border border-border-subtle rounded-xl px-4 py-3.5 focus:outline-none focus:border-accent-red transition-colors"
                    placeholder="Enter your email address"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-sub uppercase tracking-wider">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="w-full text-[13px] font-bold bg-surface-sunken text-prime border border-border-subtle rounded-xl px-4 py-3.5 focus:outline-none focus:border-accent-red transition-colors resize-none"
                    placeholder="Describe your inquiry..."
                  />
                </div>

                {/* Status and Action button */}
                <div className="pt-2 flex flex-col gap-4">
                  {statusMessage && (
                    <div className="text-[12px] font-bold text-center text-accent-green bg-accent-green/10 py-3 rounded-xl border border-accent-green/20 uppercase tracking-wider">
                      {statusMessage}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary w-full py-4 text-[13px]"
                  >
                    <Send size={16} />
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
