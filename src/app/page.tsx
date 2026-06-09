import {
    ArrowRight,
    BookOpen,
    Brain,
    Heart,
    MapPin,
    Shield,
    Sun,
    Users,
    Volume2,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: MapPin,
    title: "Interactive venue map",
    description:
      "Toilets, quiet rooms, exits, lifts, help desks — every location marked clearly before you arrive.",
    color: "text-sage-600",
    bg: "bg-sage-50",
  },
  {
    icon: Brain,
    title: "Your sensory profile",
    description:
      "Tell us what helps and what's hard. Every itinerary adapts to your specific needs — not a generic checklist.",
    color: "text-lavender-600",
    bg: "bg-lavender-50",
  },
  {
    icon: Volume2,
    title: "Sensory environment preview",
    description:
      "Lighting levels, common sounds, smells, crowd density — know what the atmosphere is like before you get there.",
    color: "text-calm-600",
    bg: "bg-calm-50",
  },
  {
    icon: Sun,
    title: "Weather + transport",
    description:
      "Real Sydney weather forecasts for your visit day, plus Transport NSW trip planning with approximate step counts.",
    color: "text-warm-600",
    bg: "bg-warm-50",
  },
  {
    icon: Shield,
    title: "If you feel overwhelmed",
    description:
      "Every guide includes quiet spaces, numbered exits, a simple plan for hard moments, and venue contact numbers.",
    color: "text-red-500",
    bg: "bg-red-50",
  },
  {
    icon: BookOpen,
    title: "Visual social story",
    description:
      "Auto-generated printable social story with simple language and visuals — shareable with your support network.",
    color: "text-sage-700",
    bg: "bg-sage-50",
  },
  {
    icon: Users,
    title: "Peak & quiet times",
    description:
      "See when venues are busiest so you can choose the calmest time to visit.",
    color: "text-lavender-600",
    bg: "bg-lavender-50",
  },
  {
    icon: Heart,
    title: "Calming affirmations",
    description:
      "Gentle, validating tips throughout — written for you, not about you. You've got this.",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
];

const affirmations = [
  "Wanting to know what to expect is a strength, not a weakness.",
  "Preparation is self-care. You are looking after yourself.",
  "It's okay to take things at your own pace.",
  "Your needs are valid. Pathwise is here to help.",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-sage-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sage-800 text-lg">Pathwise</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/guides"
              className="text-sm text-sage-700 hover:text-sage-900"
            >
              My guides
            </Link>
            <Link
              href="/plan"
              className="bg-sage-600 hover:bg-sage-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-calm"
              aria-label="Create your first venue guide"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-lavender-100 text-lavender-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Heart className="w-3.5 h-3.5" />
          Neuroaffirming · Trauma-informed · Made with care
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-sage-900 mb-6 text-balance leading-tight">
          Know what to expect
          <br />
          <span className="text-sage-600">before you get there.</span>
        </h1>

        <p className="text-lg sm:text-xl text-sage-700 max-w-2xl mx-auto mb-10 text-balance leading-relaxed">
          Paste the link to any Sydney venue — museum, café, park, hospital —
          and Pathwise creates a personalised, calming guide tailored to how
          your brain works.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-700 text-white px-6 py-3.5 rounded-xl font-semibold text-base transition-colors focus-calm shadow-lg shadow-sage-200"
          >
            Create my first guide
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/plan"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-sage-50 text-sage-700 border border-sage-200 px-6 py-3.5 rounded-xl font-semibold text-base transition-colors focus-calm"
          >
            Skip to venue URL
          </Link>
        </div>

        {/* Sample URL input preview */}
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-sage-200 shadow-xl shadow-sage-100 p-6 text-left">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
            Example
          </p>
          <div className="flex items-center gap-3 bg-sage-50 rounded-lg px-4 py-3 text-sm text-sage-700 font-mono">
            <MapPin className="w-4 h-4 text-sage-400 shrink-0" />
            australianmuseum.net.au
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "🚻 Gender-neutral toilets: Level 1, near gallery 3",
              "🤫 Quiet room: Level 2 Learning Centre",
              "🚶 ~2,400 steps from Museum station",
              "🌤 Partly cloudy, 18°C on Saturday",
            ].map((item) => (
              <span
                key={item}
                className="text-xs bg-sage-100 text-sage-700 rounded-full px-3 py-1"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Rotating affirmation banner */}
      <div className="bg-lavender-50 border-y border-lavender-100 py-4 overflow-hidden">
        <div className="flex gap-16 animate-none">
          <p className="text-center w-full text-lavender-700 text-sm font-medium italic px-4">
            &ldquo;{affirmations[0]}&rdquo;
          </p>
        </div>
      </div>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-sage-900 mb-4">
            Everything you need to feel ready
          </h2>
          <p className="text-sage-600 max-w-xl mx-auto">
            Pathwise goes beyond a simple venue guide — it understands that
            knowing what to expect is how many of us feel safe.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl border border-sage-100 p-5 hover:shadow-md hover:shadow-sage-100 transition-shadow"
            >
              <div className={`${feature.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-sage-900 mb-2 text-sm">
                {feature.title}
              </h3>
              <p className="text-xs text-sage-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-sage-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How Pathwise works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Tell us about you",
                body: "A short sensory profile — what you find challenging, what helps, how much detail you want. Takes 2 minutes.",
              },
              {
                step: "2",
                title: "Paste the venue link",
                body: "Any website URL for a Sydney venue, event, or activity. Pathwise extracts everything it can find.",
              },
              {
                step: "3",
                title: "Get your personalised guide",
                body: "Your itinerary is ready. View it, print it as a social story, save it offline, or share it with your support network.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-sage-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sage-300 text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-white text-sage-900 hover:bg-sage-50 px-8 py-3.5 rounded-xl font-semibold transition-colors focus-calm"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sage-100 py-10 px-4 text-center text-sm text-sage-500">
        <p className="mb-2">
          Made with care for the neurodiverse community 💚
        </p>
        <p>
          Pathwise is not a medical tool. Always check directly with venues for
          the most current accessibility information.
        </p>
      </footer>
    </div>
  );
}
