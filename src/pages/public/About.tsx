import { m } from 'framer-motion';
import { Award, Users, Building2, TrendingUp } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function About() {
  const { settings } = useSiteSettings();
  const stats = [
    { icon: <Building2 size={32} className="text-accent" />, value: '500+', label: 'Propiedades vendidas' },
    { icon: <Users size={32} className="text-accent" />, value: '1000+', label: 'Clientes satisfechos' },
    { icon: <Award size={32} className="text-accent" />, value: '10+', label: 'Años de experiencia' },
    { icon: <TrendingUp size={32} className="text-accent" />, value: '98%', label: 'Tasa de satisfacción' },
  ];

  const values = [
    {
      title: 'Transparencia',
      description: 'Creemos en la honestidad y claridad en cada transacción. Nuestros clientes merecen conocer todos los detalles.',
    },
    {
      title: 'Compromiso',
      description: 'Nos dedicamos a encontrar la propiedad perfecta para cada cliente, acompañándolos en todo el proceso.',
    },
    {
      title: 'Excelencia',
      description: 'Buscamos la excelencia en cada aspecto de nuestro servicio, desde la atención hasta el cierre de operaciones.',
    },
    {
      title: 'Innovación',
      description: 'Utilizamos las últimas tecnologías y tendencias del mercado para ofrecer el mejor servicio.',
    },
  ];

  return (
    <div className="pt-24 pb-20 bg-surface min-h-screen">
      <div className="section-padding">
        {/* Hero */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="text-accent text-sm font-medium tracking-widest uppercase mb-3 block">
            Sobre Nosotros
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl text-white font-bold mb-6">
            {settings.about_title}
          </h1>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            {settings.about_description}
          </p>
          <p className="text-text-light text-base max-w-2xl mx-auto mt-4">
            {settings.description}
          </p>
        </m.div>

        {/* Stats */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="card-premium p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                {stat.icon}
              </div>
              <span className="block text-3xl font-bold text-accent mb-1">{stat.value}</span>
              <span className="text-sm text-text-light">{stat.label}</span>
            </div>
          ))}
        </m.div>

        {/* Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <m.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-3xl text-white font-bold mb-6">
              Nuestra Historia
            </h2>
            <div className="space-y-4 text-text-light leading-relaxed">
              <p>
                Fundada en 2014, {settings.company_name} nació con la visión de transformar la experiencia 
                inmobiliaria en Argentina. Comenzamos como una pequeña oficina en Escobar y hoy somos 
                referentes en propiedades premium de la zona norte de Buenos Aires.
              </p>
              <p>
                Nos especializamos en barrios privados de alto standing como Nordelta, Puertos, San Sebastián, 
                San Matías y Santa Guadalupe. Nuestro equipo conoce cada rincón de estos barrios y puede 
                asesorarte para encontrar la propiedad que se adapte perfectamente a tus necesidades.
              </p>
              <p>
                A lo largo de estos años, hemos ayudado a cientos de familias a encontrar su hogar ideal 
                y a inversores a maximizar su capital en el mercado inmobiliario más dinámico del país.
              </p>
            </div>
          </m.div>
          <m.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
                alt="Our team"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-accent/10 rounded-2xl -z-10" />
          </m.div>
        </div>

        {/* Values */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-3xl text-white font-bold mb-4">
            Nuestros Valores
          </h2>
          <div className="w-20 h-1 bg-accent mx-auto" />
        </m.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <m.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card-premium p-6"
            >
              <h3 className="font-serif text-xl font-bold text-white mb-3">
                {value.title}
              </h3>
              <p className="text-text-light text-sm leading-relaxed">
                {value.description}
              </p>
            </m.div>
          ))}
        </div>
      </div>
    </div>
  );
}
