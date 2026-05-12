import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { Reveal } from '@/components/ui/Reveal'
import { IntroWordmark } from '@/components/sections/IntroWordmark'
import { Hero } from '@/components/sections/Hero'
import { TheProblem } from '@/components/sections/TheProblem'
import { TheCCCFrame } from '@/components/sections/TheCCCFrame'
import { GetLocal } from '@/components/sections/GetLocal'
import { Footprint } from '@/components/sections/Footprint'
import { Apparatus } from '@/components/sections/Apparatus'
import { TheFourDs } from '@/components/sections/TheFourDs'
import { NonProfitByDesign } from '@/components/sections/NonProfitByDesign'
import { TheClose } from '@/components/sections/TheClose'

export default function Home() {
  return (
    <>
      <Navigation />
      <main id="main-content">
        <IntroWordmark />

        <Hero />

        <Reveal>
          <TheProblem />
        </Reveal>

        <Reveal y={40} duration={0.8}>
          <TheCCCFrame />
        </Reveal>

        <Reveal>
          <GetLocal />
        </Reveal>

        <Reveal>
          <Footprint />
        </Reveal>

        <Reveal>
          <Apparatus />
        </Reveal>

        <Reveal>
          <TheFourDs />
        </Reveal>

        <Reveal y={40} duration={0.8}>
          <NonProfitByDesign />
        </Reveal>

        <Reveal>
          <TheClose />
        </Reveal>
      </main>
      <Footer />
    </>
  )
}
