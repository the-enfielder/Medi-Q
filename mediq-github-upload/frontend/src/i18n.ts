import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      "hero_title_1": "Healthcare without",
      "hero_title_highlight": "waiting.",
      "hero_subtitle": "Experience the future of medical appointments. Real-time tracking, smart queues, and zero overcrowding.",
      "live_tv": "Live TV",
      "track_status": "Track Status",
      "book_appointment": "Book Appointment",
      "smart_queue": "Smart Queue Management"
    }
  },
  es: {
    translation: {
      "hero_title_1": "Asistencia médica sin",
      "hero_title_highlight": "esperas.",
      "hero_subtitle": "Experimente el futuro de las citas médicas. Seguimiento en tiempo real, colas inteligentes y cero aglomeraciones.",
      "live_tv": "TV en Vivo",
      "track_status": "Rastrear Estado",
      "book_appointment": "Reservar Cita",
      "smart_queue": "Gestión Inteligente de Colas"
    }
  },
  hi: {
    translation: {
      "hero_title_1": "बिना प्रतीक्षा के",
      "hero_title_highlight": "स्वास्थ्य सेवा।",
      "hero_subtitle": "चिकित्सा नियुक्तियों के भविष्य का अनुभव करें। वास्तविक समय ट्रैकिंग, स्मार्ट कतारें, और शून्य भीड़।",
      "live_tv": "लाइव टीवी",
      "track_status": "स्थिति ट्रैक करें",
      "book_appointment": "अपॉइंटमेंट बुक करें",
      "smart_queue": "स्मार्ट कतार प्रबंधन"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
