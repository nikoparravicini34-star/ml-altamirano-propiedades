import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Check, AlertCircle } from 'lucide-react';
import type { ParsedPropertyFields, Property } from '../../types';
import {
  getPreviewEntries,
  mergeParsedIntoForm,
  parsePropertyDescription,
} from '../../lib/propertyAIParser';

interface PropertyAIAssistantProps {
  formData: Partial<Property>;
  onApply: (merged: Partial<Property>) => void;
}

export default function PropertyAIAssistant({ formData, onApply }: PropertyAIAssistantProps) {
  const [description, setDescription] = useState('');
  const [parsed, setParsed] = useState<ParsedPropertyFields | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setApplied(false);
    setLoading(true);

    try {
      const result = await parsePropertyDescription(description);
      setParsed(result);
    } catch (err) {
      setParsed(null);
      setError(err instanceof Error ? err.message : 'Error al generar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsed) return;
    const merged = mergeParsedIntoForm(formData, parsed);
    onApply(merged);
    setApplied(true);
  };

  const previewEntries = parsed ? getPreviewEntries(parsed) : [];

  return (
    <m.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-graphite rounded-xl border border-border shadow-sm mb-6 overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/80 to-graphite">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary border border-accent/30 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-white">Crear propiedad con IA</h2>
            <p className="text-sm text-text-light mt-1">
              Pegá o escribí una descripción libre y la IA completará los campos del formulario.
              Los datos existentes no se borran: solo se rellenan campos vacíos.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label htmlFor="ai-property-description" className="block text-sm font-medium text-white mb-2">
            Descripción de la propiedad
          </label>
          <textarea
            id="ai-property-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setApplied(false);
            }}
            rows={5}
            disabled={loading}
            placeholder="Ej: Casa en venta en San Sebastián, Escobar. 3 dormitorios, 2 baños, pileta y parrilla. 220 m² cubiertos sobre lote de 800 m². USD 320.000..."
            className="w-full bg-primary border border-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none disabled:opacity-60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || !description.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            {loading ? 'Generando...' : 'Generar datos'}
          </button>
          {applied && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
              <Check size={16} />
              Datos aplicados al formulario
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence>
          {parsed && previewEntries.length > 0 && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-primary/60 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">Vista previa de datos generados</h3>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                  >
                    <Check size={16} />
                    Aplicar datos al formulario
                  </button>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {previewEntries.map(({ key, label, value }) => (
                    <div key={key} className={key === 'short_description' || key === 'full_description' ? 'sm:col-span-2' : ''}>
                      <dt className="text-xs uppercase tracking-wide text-text-light">{label}</dt>
                      <dd className="text-sm text-white mt-0.5 whitespace-pre-wrap">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.section>
  );
}
