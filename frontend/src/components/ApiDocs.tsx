import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Terminal, Send, Check, Copy, Layers, Play } from 'lucide-react';
import { api } from '../services/api';

export default function ApiDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('nonce');
  const [loading, setLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  const endpoints = [
    {
      id: 'nonce',
      method: 'GET',
      path: '/api/auth/nonce?address=0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      description: 'Fetch SIWE cryptographic auth nonce for Web3 signature challenge.'
    },
    {
      id: 'calculations',
      method: 'GET',
      path: '/api/booster/calculations?basePlan=1.0',
      description: 'Calculate distribution parameters for all 6 Booster Tiers (Launch through Visionary).'
    },
    {
      id: 'matrixTree',
      method: 'GET',
      path: '/api/matrix/tree',
      description: 'Fetch booster matrix hierarchy and earnings breakdown.'
    },
    {
      id: 'stats',
      method: 'GET',
      path: '/api/stats/global',
      description: 'Get global network metrics, total USDT distributed, and cycle counts.'
    },
    {
      id: 'contractInfo',
      method: 'GET',
      path: '/api/contract/info',
      description: 'Retrieve verified contract addresses and ABI function signatures.'
    }
  ];

  const executeApiCall = async (endpoint: typeof endpoints[0]) => {
    setLoading(true);
    setSelectedEndpoint(endpoint.id);
    try {
      const res = await api.get(endpoint.path.replace('/api', ''));
      setApiResponse(res);
    } catch (err: any) {
      setApiResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-black bg-accent-red/10 text-accent-red rounded-full uppercase tracking-wider">
          <Terminal size={14} />
          <span>Interactive REST API Console</span>
        </span>
        <h2 className="text-3xl font-extrabold text-prime sm:text-4xl">
          SimpleOn Web3 REST API Testing
        </h2>
        <p className="text-sm text-sub leading-relaxed">
          Test live production backend endpoints for authentication, booster math, matrix placements, and contract info.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector Column */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-extrabold text-sub uppercase tracking-wider px-1">Available Endpoints</h3>
          {endpoints.map((ep) => (
            <button
              key={ep.id}
              onClick={() => executeApiCall(ep)}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedEndpoint === ep.id
                  ? 'border-accent-red bg-accent-red/5 shadow-sm'
                  : 'border-border-theme bg-surface hover:bg-surface-elevated'
                }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-green-500/10 text-green-500">
                  {ep.method}
                </span>
                <span className="font-mono text-xs font-extrabold text-prime truncate">{ep.path}</span>
              </div>
              <p className="text-xs text-sub leading-snug">{ep.description}</p>
            </button>
          ))}
        </div>

        {/* Response Console Column */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border-theme shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border-theme">
              <div className="flex items-center space-x-2">
                <Play size={16} className="text-accent-red" />
                <span className="text-sm font-extrabold text-prime">Live Response Console</span>
              </div>
              {loading && <span className="text-xs text-accent-red font-mono animate-pulse">Sending Request...</span>}
            </div>

            <div className="mt-4">
              <pre className="p-4 rounded-2xl bg-neutral-950 text-green-400 font-mono text-xs min-h-[320px] max-h-[480px] overflow-auto leading-relaxed border border-border-theme">
                {apiResponse
                  ? JSON.stringify(apiResponse, null, 2)
                  : '// Click any API endpoint on the left to execute live test call...'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
