import React from 'react';
import { Hand, Settings, Zap, ArrowLeft } from 'lucide-react';

export default function RedactionModeSelector({ onModeSelect, onBack }) {
  const modes = [
    {
      id: 'manual',
      title: 'Manual',
      description: 'Full control over what gets redacted',
      icon: Hand,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      hoverBg: 'hover:bg-orange-50'
    },
    {
      id: 'semi-automatic',
      title: 'Semi-Automatic',
      description: 'AI suggestions with manual approval',
      icon: Settings,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      hoverBg: 'hover:bg-blue-50'
    },
    {
      id: 'automatic',
      title: 'Automatic',
      description: 'Full AI-powered redaction',
      icon: Zap,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100',
      hoverBg: 'hover:bg-purple-50'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Redaction Mode</h2>
        <p className="text-lg text-gray-600">
          Intelligent document redaction powered by AI
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeSelect(mode.id)}
            className={`
              bg-white rounded-2xl border-2 border-gray-200 p-8 text-center 
              hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-1 
              transition-all duration-300 ${mode.hoverBg}
            `}
          >
            <div className={`inline-flex p-4 rounded-2xl ${mode.bgColor} mb-6`}>
              <mode.icon className={`h-8 w-8 ${mode.color}`} />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {mode.title}
            </h3>
            
            <p className="text-gray-600 leading-relaxed">
              {mode.description}
            </p>
          </button>
        ))}
      </div>
      
      <div className="text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to file selection</span>
        </button>
      </div>
    </div>
  );
}