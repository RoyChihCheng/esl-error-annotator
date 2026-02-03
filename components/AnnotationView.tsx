import React, { useState } from 'react';
import { Annotation } from '../types';
import { Info, X } from 'lucide-react';

interface AnnotationViewProps {
  originalText: string;
  annotations: Annotation[];
}

const AnnotationView: React.FC<AnnotationViewProps> = ({ originalText, annotations }) => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  // Sort annotations by start index to ensure correct rendering order
  // Note: This simple implementation assumes no overlapping annotations for simplicity.
  // Overlapping annotations would require a more complex interval tree or segmentation logic.
  const sortedAnnotations = [...annotations].sort((a, b) => a.start_index - b.start_index);

  const renderText = () => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((ann, idx) => {
      // Text before the annotation
      if (ann.start_index > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>
            {originalText.slice(lastIndex, ann.start_index)}
          </span>
        );
      }

      // The annotated text
      const errorText = originalText.slice(ann.start_index, ann.end_index);
      elements.push(
        <span
          key={`ann-${idx}`}
          className="bg-red-100 text-red-800 border-b-2 border-red-400 cursor-pointer hover:bg-red-200 transition-colors px-0.5 rounded-sm relative group"
          onClick={() => setSelectedAnnotation(ann)}
        >
          {errorText}
        </span>
      );

      lastIndex = ann.end_index;
    });

    // Remaining text
    if (lastIndex < originalText.length) {
      elements.push(
        <span key="text-end">
          {originalText.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="relative">
      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 leading-relaxed text-lg font-serif text-slate-800 whitespace-pre-wrap">
        {renderText()}
      </div>

      {selectedAnnotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setSelectedAnnotation(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {selectedAnnotation.error_code}
                </span>
                <span className="text-slate-500 text-sm font-medium">
                  {selectedAnnotation.macro_code}
                </span>
              </div>
              <button onClick={() => setSelectedAnnotation(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Original</h4>
                <p className="text-red-600 bg-red-50 p-2 rounded border border-red-100 font-medium">
                  {selectedAnnotation.original_span}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Correction</h4>
                <p className="text-green-600 bg-green-50 p-2 rounded border border-green-100 font-medium">
                  {selectedAnnotation.corrected_span}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Explanation</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {selectedAnnotation.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationView;
