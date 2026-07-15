import { m } from 'framer-motion';

export default function RealEstateAI() {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="font-serif text-3xl text-white font-bold">IA Inmobiliaria</h1>
    </m.div>
  );
}
