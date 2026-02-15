import Navbar from '../components/layout/Navbar';
import Hero from '../components/sections/Hero';
import Services from '../components/sections/Services';
import ValueProp from '../components/sections/ValueProp';
import Pricing from '../components/sections/Pricing';
import Contact from '../components/sections/Contact';
import Footer from '../components/layout/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Services />
      <ValueProp />
      <Pricing />
      <Contact />
      <Footer />
    </main>
  );
}
