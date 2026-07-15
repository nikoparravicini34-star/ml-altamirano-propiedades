import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-6">
          <ShieldX size={32} className="text-accent" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-white mb-3">Acceso denegado</h1>
        <p className="text-text-light mb-8">
          No tenés permisos para acceder a esta sección. Si creés que es un error, contactá al administrador.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          Volver al inicio
        </Link>
      </motion.div>
    </div>
  );
}
