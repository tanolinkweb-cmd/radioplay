import { RadioProvider } from "@/context/RadioContext";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Tracks from "@/components/Tracks";
import Footer from "@/components/Footer";
import FloatingPlayer from "@/components/FloatingPlayer";

const Index = () => {
  return (
    <RadioProvider>
      <main className="relative min-h-screen overflow-x-hidden">
        <Hero />
        <About />
        <Tracks />
        <Footer />
        <FloatingPlayer />
      </main>
    </RadioProvider>
  );
};

export default Index;
