import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, User, Phone, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfileModal } from '../../context/ProfileModalContext';
import { completeUserProfile, uploadAvatar } from '../../lib/supabase';
import { validateName, validatePhone } from '../../lib/validation';
import DefaultAvatar from './DefaultAvatar';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

function FieldInput({
  icon: Icon,
  label,
  required,
  error,
  ...inputProps
}: {
  icon: typeof User;
  label: string;
  required?: boolean;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hasError = !!error;

  return (
    <div>
      <label className="admin-label">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <div className="relative">
        <div
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
            hasError ? 'text-red-400' : 'text-accent/70'
          }`}
        >
          <Icon size={16} strokeWidth={1.75} />
        </div>
        <input
          {...inputProps}
          className={`input-premium pl-10 ${
            hasError ? 'border-red-400/60 focus:border-red-400 focus:ring-red-400/20' : ''
          } ${inputProps.disabled ? 'opacity-70 cursor-not-allowed bg-graphite-dark' : ''}`}
        />
      </div>
      {error && (
        <p className="text-[11px] mt-1.5 font-medium text-red-400">{error}</p>
      )}
    </div>
  );
}

export default function CompleteProfileModal() {
  const { user, profile, refreshProfile } = useAuth();
  const { isOpen, closeProfileModal } = useProfileModal();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? profile.full_name?.split(' ')[0] ?? '');
      setLastName(profile.last_name ?? profile.full_name?.split(' ').slice(1).join(' ') ?? '');
      setPhone(profile.phone ?? '');
      if (!avatarFile) {
        setAvatarPreview(profile.avatar_url ?? null);
      }
    }
  }, [profile, avatarFile]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSaveState('idle');
      setSubmitError(null);
      setErrors({});
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError('Seleccioná un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSubmitError('La imagen no puede superar los 2 MB.');
      return;
    }
    setSubmitError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const firstNameErr = validateName(firstName, 'nombre');
    const lastNameErr = validateName(lastName, 'apellido');
    const phoneErr = validatePhone(phone);
    if (firstNameErr) errs.firstName = firstNameErr;
    if (lastNameErr) errs.lastName = lastNameErr;
    if (phoneErr) errs.phone = phoneErr;
    return errs;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!user) {
      setSaveState('error');
      setSubmitError('No hay sesión activa. Volvé a iniciar sesión con Google.');
      return;
    }

    setSaveState('saving');
    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(user.id, avatarFile);
        } catch (uploadErr) {
          console.error('Avatar upload failed:', uploadErr);
          const msg =
            uploadErr instanceof Error
              ? uploadErr.message
              : (uploadErr as { message?: string })?.message ?? 'Error al subir la foto';
          if (!avatarUrl) {
            setSaveState('error');
            setSubmitError(`No se pudo subir la foto: ${msg}`);
            return;
          }
        }
      }

      await completeUserProfile(user.id, {
        email: user.email ?? profile?.email ?? null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        avatar_url: avatarUrl,
        profile_completed: true,
      });

      await refreshProfile();

      setSaveState('success');
      setTimeout(() => {
        closeProfileModal();
      }, 900);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveState('error');
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            'Error al guardar el perfil. Intentá nuevamente.';
      setSubmitError(message);
    }
  };

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.trim();
  const showPhoto = avatarPreview && avatarPreview.length > 0;

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div
          key="profile-overlay"
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            key="profile-card"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[440px] max-h-[95vh] overflow-y-auto card-premium border border-white/10 shadow-premium relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-profile-title"
          >
            <div className="h-1 bg-gold-gradient rounded-t-2xl" />

            <form onSubmit={handleSave} className="px-7 sm:px-8 pt-7 pb-8">
              <div className="text-center mb-6">
                <div className="w-11 h-11 rounded-xl bg-primary border border-accent/30 flex items-center justify-center mx-auto mb-3.5 shadow-gold">
                  <span className="font-serif font-bold text-lg leading-none text-accent">A</span>
                </div>
                <h2
                  id="complete-profile-title"
                  className="font-serif text-[22px] font-bold mb-1.5 text-white"
                >
                  Completá tu perfil
                </h2>
                <p className="text-sm leading-relaxed max-w-xs mx-auto text-text-light">
                  Es tu primera vez. Completá estos datos para continuar.
                </p>
              </div>

              <div className="flex flex-col items-center mb-7">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative group focus:outline-none"
                  aria-label="Subir foto de perfil"
                >
                  <div className="rounded-full p-[3px] bg-gold-gradient shadow-gold transition-transform duration-300 group-hover:scale-[1.02]">
                    <div className="rounded-full overflow-hidden bg-graphite p-[3px]">
                      {showPhoto ? (
                        <img
                          src={avatarPreview!}
                          alt="Vista previa"
                          className="object-cover rounded-full w-[88px] h-[88px]"
                        />
                      ) : (
                        <DefaultAvatar size={88} initials={initials || undefined} />
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full w-8 h-8 bg-accent shadow-gold border-2 border-graphite transition-all duration-200 group-hover:scale-110">
                    <Camera size={14} className="text-[#1B1B1B]" strokeWidth={2.25} />
                  </div>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-[11px] mt-2.5 text-text-light">
                  Tocá para subir tu foto · JPG, PNG o WebP
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput
                    icon={User}
                    label="Nombre"
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''));
                      setErrors((prev) => ({ ...prev, firstName: '' }));
                    }}
                    placeholder="Juan"
                    error={errors.firstName}
                    autoComplete="given-name"
                  />
                  <FieldInput
                    icon={User}
                    label="Apellido"
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''));
                      setErrors((prev) => ({ ...prev, lastName: '' }));
                    }}
                    placeholder="Martín"
                    error={errors.lastName}
                    autoComplete="family-name"
                  />
                </div>

                <FieldInput
                  icon={Phone}
                  label="Teléfono"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\+?\d*$/.test(val)) {
                      setPhone(val);
                      setErrors((prev) => ({ ...prev, phone: '' }));
                    }
                  }}
                  placeholder="1123456789"
                  error={errors.phone}
                  autoComplete="tel"
                />

                <FieldInput
                  icon={Mail}
                  label="Email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  readOnly
                />
                <p className="text-[10.5px] -mt-2 text-text-light/70">
                  El email de Google no puede modificarse.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {submitError && saveState === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/30"
                  >
                    <p className="text-xs font-medium text-red-400">{submitError}</p>
                  </motion.div>
                )}
                {saveState === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 px-4 py-3 rounded-xl flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-400/30"
                  >
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <p className="text-xs font-medium text-emerald-400">
                      Perfil guardado. Entrando al sitio...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={saveState === 'saving' || saveState === 'success'}
                className={`mt-6 w-full flex items-center justify-center gap-2.5 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-300 ${
                  saveState === 'success'
                    ? 'bg-emerald-600 text-white cursor-not-allowed opacity-85'
                    : 'btn-primary disabled:opacity-70 disabled:cursor-not-allowed'
                }`}
              >
                {saveState === 'saving' && (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                )}
                {saveState === 'success' && (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    ¡Listo!
                  </>
                )}
                {(saveState === 'idle' || saveState === 'error') && (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    Guardar y continuar
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
