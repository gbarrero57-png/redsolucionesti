import type { Metadata } from 'next';
import SofiaLanding from '@/components/sofia/SofiaLanding';

export const metadata: Metadata = {
  title: 'SofIA — Recepcionista IA para clínicas dentales | Red Soluciones TI',
  description:
    'Agenda citas, responde preguntas y gestiona tu recepción por WhatsApp las 24 horas. Sin tarjeta de crédito · Setup en 48h · Cancela cuando quieras.',
};

export default function Home() {
  return <SofiaLanding />;
}
