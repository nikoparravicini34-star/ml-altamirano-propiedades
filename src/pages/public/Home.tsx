import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Shield, TrendingUp, Heart } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import SearchBar from '../../components/ui/SearchBar';
import PropertyCard from '../../components/ui/PropertyCard';
import OptimizedImage from '../../components/ui/OptimizedImage';
import { useFeaturedProperties } from '../../hooks/useProperties';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PremiumButton from '../../components/motion/PremiumButton';
import Reveal from '../../components/motion/Reveal';
import { ease, staggerContainer, fadeUp, blurIn } from '../../lib/motion';
import { optimizeImageUrl } from '../../lib/images';

export default function Home() {
  const { properties: featuredProperties, loading, error } = useFeaturedProperties();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  const heroSrc = useMemo(
    () => optimizeImageUrl(settings.hero_image_url, { width: 1600, quality: 75 }),
    [settings.hero_image_url]
  );

  const displayedFeaturedProperties = useMemo(
    () => featuredProperties.slice(0, 4),
    [featuredProperties]
  );

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users size={32} className="text-accent" />;
      case 'Shield': return <Shield size={32} className="text-accent" />;
      case 'TrendingUp': return <TrendingUp size={32} className="text-accent" />;
      case 'Heart': return <Heart size={32} className="text-accent" />;
      default: return <Shield size={32} className="text-accent" />;
    }
  };

  return (
    <div className="overflow-x-hidden">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroSrc}
            alt="Luxury home"
            className="w-full h-full object-cover"
            style={{ transform: 'translateZ(0)' }}
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-hero-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-primary/40" />
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,77,0.06),transparent_55%)]" />
            <div className="absolute -top-24 left-1/4 h-48 w-48 rounded-full bg-accent/10 blur-[40px]" />
            <div className="absolute bottom-0 right-1/5 h-56 w-56 rounded-full bg-accent/8 blur-[48px]" />
          </div>
        </div>

        <div className="relative z-10 section-padding w-full pt-32 pb-20">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-3xl"
          >
            <motion.span
              variants={blurIn}
              className="text-accent text-sm font-medium tracking-widest uppercase mb-4 block"
            >
              {settings.hero_badge}
            </motion.span>
            <motion.h1
              variants={blurIn}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white font-bold leading-tight mb-6"
            >
              {settings.hero_title}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/80 text-lg mb-8 max-w-xl">
              {settings.hero_subtitle}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-12">
              <PremiumButton
                variant="energy"
                onClick={() => navigate('/propiedades?operacion=venta')}
              >
                {settings.hero_button_sale}
                <ArrowRight size={18} />
              </PremiumButton>
              <PremiumButton
                variant="outline"
                onClick={() => navigate('/propiedades?operacion=alquiler')}
                className="border-white/40 text-white hover:border-accent"
              >
                {settings.hero_button_rent}
                <ArrowRight size={18} />
              </PremiumButton>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.35, ease: ease.out }}
          >
            <SearchBar />
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <span className="scroll-indicator w-px h-8 bg-gradient-to-b from-accent to-transparent origin-top" />
        </motion.div>
      </section>

      <section className="py-20 bg-primary section-glow relative overflow-hidden content-visibility-auto">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,77,0.06),transparent_55%)]" />
          <div className="absolute -top-24 left-1/4 h-48 w-48 rounded-full bg-accent/10 blur-[40px]" />
          <div className="absolute bottom-0 right-1/5 h-56 w-56 rounded-full bg-accent/8 blur-[48px]" />
        </div>
        <div className="section-padding relative">
          <Reveal direction="up" className="text-center mb-12">
            <span className="text-accent text-sm font-medium tracking-widest uppercase mb-3 block">
              Destacadas
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white font-bold">
              Propiedades Destacadas
            </h2>
            <div className="divider-gold mt-4" />
          </Reveal>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-text-light">No se pudieron cargar las propiedades destacadas.</p>
              <p className="text-xs text-text-light/70 mt-1">Reintentá en unos momentos.</p>
            </div>
          ) : displayedFeaturedProperties.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-text-light text-lg">
                No hay propiedades destacadas disponibles por el momento.
              </p>
              <PremiumButton
                variant="secondary"
                onClick={() => navigate('/propiedades')}
                className="mt-6"
              >
                Ver todas las propiedades
                <ArrowRight size={18} />
              </PremiumButton>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedFeaturedProperties.map((property, index) => (
                  <PropertyCard key={property.id} property={property} index={index} />
                ))}
              </div>
              <Reveal direction="up" delay={0.1} className="text-center mt-10">
                <PremiumButton variant="secondary" onClick={() => navigate('/propiedades')}>
                  Ver todas las propiedades
                  <ArrowRight size={18} />
                </PremiumButton>
              </Reveal>
            </>
          )}
        </div>
      </section>

      <section className="py-20 bg-primary relative overflow-hidden content-visibility-auto">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,77,0.06),transparent_55%)]" />
          <div className="absolute -top-24 left-1/4 h-48 w-48 rounded-full bg-accent/10 blur-[40px]" />
          <div className="absolute bottom-0 right-1/5 h-56 w-56 rounded-full bg-accent/8 blur-[48px]" />
        </div>
        <div className="section-padding relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {settings.features.map((feature, index) => (
              <Reveal
                key={feature.title}
                direction="up"
                delay={index * 0.06}
              >
                <div className="text-center p-6 rounded-2xl border border-white/5 bg-primary/40 hover:border-accent/25 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.35)] h-full">
                  <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_24px_rgba(201,162,77,0.12)]">
                    {getFeatureIcon(feature.icon)}
                  </div>
                  <h3 className="font-serif text-xl text-white font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary relative overflow-hidden content-visibility-auto">
        <div className="section-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Reveal direction="left">
              <span className="text-accent text-sm font-medium tracking-widest uppercase mb-3 block">
                Sobre Nosotros
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-white font-bold mb-6">
                {settings.about_title}
              </h2>
              <p className="text-text-light leading-relaxed mb-6">
                {settings.about_description}
              </p>
              <p className="text-text-light leading-relaxed mb-8">
                {settings.description}
              </p>
              <PremiumButton variant="outline" onClick={() => navigate('/nosotros')}>
                Conocer más
                <ArrowRight size={18} />
              </PremiumButton>
            </Reveal>
            <div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-premium border border-white/10 neon-border">
                  <OptimizedImage
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
                    alt="Our office"
                    width={800}
                    quality={72}
                    progressive={false}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 w-48 h-48 border border-accent/20 rounded-2xl -z-10" />
                <div className="absolute -top-4 -right-4 w-24 h-24 border border-accent/10 rounded-xl -z-10" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
