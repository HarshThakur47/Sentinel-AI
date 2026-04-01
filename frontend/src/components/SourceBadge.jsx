import React from 'react';
import { FileText } from 'lucide-react';

const SourceBadge = ({ source, index }) => {
  return (
    <div 
      className="source-badge animate-fade-in" 
      style={{ animationDelay: `${0.4 + (index * 0.1)}s` }}
    >
      <FileText size={14} className="source-icon" />
      <span className="source-title">Source {index + 1}: {source.title || "Document"}</span>
    </div>
  );
};

export default SourceBadge;