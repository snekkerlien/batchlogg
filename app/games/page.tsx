import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import LearningProgress from "./LearningProgress";
import PageGuide from "@/app/components/PageGuide";

const GAMES = [
  {
    href: "/games/brew-basics",
    title: "Brew Basics",
    description:
      "Test your brewing knowledge, learn the key terms, and get a useful explanation with every answer.",
    detail: "Knowledge quiz",
    icon: "🌾",
  },
  {
    href: "/games/brew-day-sequence",
    title: "Brew Day Sequence",
    description:
      "Put the main stages of an all-grain brew day in order and learn why each step comes next.",
    detail: "Process challenge",
    icon: "🧭",
  },
  {
    href: "/games/fermentation-detective",
    title: "Fermentation Detective",
    description:
      "Read common fermentation scenarios, pick a sensible next step, and uncover the brewing reasoning.",
    detail: "Troubleshooting",
    icon: "🔎",
  },
  {
    href: "/games/recipe-builder",
    title: "Recipe Builder",
    description:
      "Make ingredient and process choices to shape a beer's flavor, body, bitterness, and finish.",
    detail: "Recipe decisions",
    icon: "🧪",
  },
  {
    href: "/games/brew-math-lab",
    title: "Brew Math Lab",
    description:
      "Practice ABV, gravity, dilution, and recipe-scaling calculations with worked explanations.",
    detail: "Brewing calculations",
    icon: "🧮",
  },
  {
    href: "/games/flavor-aroma",
    title: "Flavor & Aroma",
    description:
      "Match familiar sensory clues to the ingredients, fermentation, and handling choices that can cause them.",
    detail: "Sensory skills",
    icon: "👃",
  },
];

export default function BrewingGamesPage() {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-3 z-20">
          <BackButton />
        </div>
        <div className="absolute right-4 top-3 z-20">
          <MenuOverlay current="games" />
        </div>

        <PageHeading
          title="Brewing Academy"
          subtitle="Short, interactive challenges to build your brewing knowledge one decision at a time."
        />

        <LearningProgress
          games={GAMES.map((game) => ({
            id: game.href.replace("/games/", ""),
            title: game.title,
          }))}
        />

        <section aria-label="Choose a learning game" className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="group rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-green-400/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold text-green-200 group-hover:text-green-100">
                  {game.title}
                </h2>
                <span aria-hidden="true" className="text-2xl text-amber-200">
                  {game.icon}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">
                {game.description}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-white/45">
                {game.detail}
              </p>
            </Link>
          ))}
        </section>
      </div>
      <PageGuide
        buttonLabel="Brewing Academy guide"
        eyebrow="Practice, learn, and build confidence"
        title="Your Brewing Academy, explained."
        description="Pick a short interactive challenge to practise brewing knowledge, process choices, troubleshooting, calculations, and sensory skills."
        sectionHeading="Make the most of the Academy"
        illustration="academy"
        footer="Learn at your own pace; replay a challenge whenever you like."
        sections={[
          {
            title: "Choose a challenge",
            description: "Each card describes the topic and style of activity before you open it.",
          },
          {
            title: "Learn from each answer",
            description: "Challenges explain the reasoning so you can learn, not just score.",
          },
          {
            title: "Try different skills",
            description: "Explore brewing basics, brew-day order, fermentation, recipe decisions, math, and flavor.",
          },
          {
            title: "Track your progress",
            description: "The progress area summarizes your activity across the available challenges.",
          },
        ]}
      />
    </main>
  );
}
