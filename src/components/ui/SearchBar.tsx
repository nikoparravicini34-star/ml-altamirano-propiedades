import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import PremiumButton from '../motion/PremiumButton';
import { ease } from '../../lib/motion';

export default function SearchBar() {
  const navigate = useNavigate();
  const [operation, setOperation] = useState<'venta' | 'alquiler'>('venta');
  const [propertyType, setPropertyType] = useState('');
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('operacion', operation);
    if (propertyType) params.set('tipo', propertyType);
    if (city) params.set('ciudad', city);
    if (minPrice) params.set('precioMin', minPrice);
    if (maxPrice) params.set('precioMax', maxPrice);
    if (bedrooms) params.set('dormitorios', bedrooms);
    navigate(`/propiedades?${params.toString()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: ease.out }}
      className="bg-graphite/95 rounded-2xl shadow-premium border border-white/10 p-6 w-full max-w-5xl mx-auto hover:shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition-shadow duration-500"
    >
      <div className="relative flex gap-2 mb-6 p-1 rounded-xl bg-primary/50 w-fit">
        {(['venta', 'alquiler'] as const).map((op) => (
          <button
            key={op}
            onClick={() => setOperation(op)}
            className="relative px-6 py-2.5 rounded-lg font-medium text-sm z-10"
          >
            {operation === op && (
              <motion.span
                layoutId="search-op-pill"
                className="absolute inset-0 rounded-lg bg-gold-gradient shadow-gold"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative z-10 capitalize ${operation === op ? 'text-[#1B1B1B]' : 'text-text-light hover:text-white'}`}>
              {op === 'venta' ? 'Venta' : 'Alquiler'}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="relative">
          <label className="block text-xs text-text-light mb-1.5 font-medium tracking-wide uppercase">Tipo</label>
          <div className="relative">
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="input-premium appearance-none pr-10"
            >
              <option value="">Todos</option>
              <option value="Casa">Casa</option>
              <option value="Departamento">Departamento</option>
              <option value="Lote">Lote</option>
              <option value="PH">PH</option>
              <option value="Oficina">Oficina</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-light mb-1.5 font-medium tracking-wide uppercase">Ubicación</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad o barrio"
            className="input-premium"
          />
        </div>

        <div>
          <label className="block text-xs text-text-light mb-1.5 font-medium tracking-wide uppercase">Precio mín.</label>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Mínimo"
            className="input-premium"
          />
        </div>

        <div>
          <label className="block text-xs text-text-light mb-1.5 font-medium tracking-wide uppercase">Precio máx.</label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Máximo"
            className="input-premium"
          />
        </div>

        <div>
          <label className="block text-xs text-text-light mb-1.5 font-medium tracking-wide uppercase">Dormitorios</label>
          <div className="relative">
            <select
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="input-premium appearance-none pr-10"
            >
              <option value="">Cualquiera</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" />
          </div>
        </div>

        <div className="flex items-end">
          <PremiumButton variant="energy" onClick={handleSearch} className="w-full py-3">
            <Search size={18} />
            <span>Buscar</span>
          </PremiumButton>
        </div>
      </div>
    </motion.div>
  );
}
