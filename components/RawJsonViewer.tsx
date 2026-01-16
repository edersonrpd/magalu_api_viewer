import React from 'react';
import { Code, Copy, Check } from 'lucide-react';

interface RawJsonViewerProps {
  data: any;
}

export const RawJsonViewer: React.FC<RawJsonViewerProps> = ({ data }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 mt-8">
      <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2 text-gray-300">
          <Code size={16} />
          <span className="text-sm font-mono font-medium">Resposta JSON Bruta</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs flex items-center gap-1.5 px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-all"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-green-400 leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};