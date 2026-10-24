"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

type Answer = {
  text: string;
  correct: boolean;
  feedback: string;
};

type Question = {
  prompt: string;
  answers: Answer[];
};

type LearningGame = {
  title: string;
  subtitle: string;
  intro: string;
  questions: Question[];
};

type QuestionSeed = [string, string, string, string, string, string];

function buildQuestions(seeds: QuestionSeed[]): Question[] {
  return seeds.map(([prompt, correct, explanation, ...incorrect]) => ({
    prompt,
    answers: [
      {
        text: correct,
        correct: true,
        feedback: explanation,
      },
      ...incorrect.map((text) => ({
        text,
        correct: false,
        feedback: `The best answer is: ${correct}. ${explanation}`,
      })),
    ],
  }));
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

const LEARNING_GAMES: Record<string, LearningGame> = {
  "brew-basics": {
    title: "Brew Basics",
    subtitle: "Build your brewing know-how, one question at a time.",
    intro: "Answer seven random questions from a 70-question pool. Choices are shuffled on every attempt, and explanations reveal the brewing behind each answer.",
    questions: buildQuestions([
      ["What is wort?", "The sweet liquid extracted from malt before fermentation", "Wort is the sugar-rich liquid made during mashing and collected before yeast ferments it.", "Beer after it has finished fermenting", "The grain left behind after sparging", "Water used to rinse brewing equipment"],
      ["What does brewing yeast do during fermentation?", "Converts fermentable sugars into alcohol and carbon dioxide", "Yeast consumes fermentable sugars and produces alcohol, carbon dioxide, and flavor compounds.", "Removes all bitterness from hops", "Turns starch directly into malt", "Separates grain from the wort"],
      ["Why is crushed malt mixed with warm water during the mash?", "To let malt enzymes convert starches into sugars", "The mash gives malt enzymes suitable conditions to convert starch into sugars that yeast can use.", "To carbonate the finished beer", "To add yeast before the boil", "To extract alcohol from the grain"],
      ["What is the main purpose of milling malt before brewing?", "Crack the grain so water can reach its starchy interior", "A suitable crush exposes the grain interior while retaining husks that help form a filter bed.", "Turn the malt into flour as fine as possible", "Remove all husks from the grain", "Sterilize the grain"],
      ["What is a base malt mainly used for?", "Providing most of the fermentable extract in many beer recipes", "Base malts commonly provide much of a recipe's extract and enzymes for starch conversion.", "Adding all the beer's bitterness", "Carbonating the finished beer", "Replacing brewing yeast"],
      ["What do specialty malts commonly contribute?", "Color, flavor, and sometimes body", "Roasting and processing create flavors such as toast, caramel, or roast and can deepen beer color.", "Carbon dioxide for bottle conditioning", "The yeast needed for fermentation", "A precise fermentation temperature"],
      ["What is a mash rest?", "A period when crushed malt and water are held at a chosen temperature", "The rest gives malt enzymes time to work on starches and other grain components.", "A period when bottled beer is shaken", "The time hops steep in cold beer after packaging", "The time yeast is stored in a refrigerator"],
      ["Which statement about mash enzymes is correct?", "They help convert malt starches into smaller sugars", "Malt enzymes, including amylases, break starch into sugars during mashing.", "They create hop alpha acids", "They carbonate wort", "They sanitize the fermenter"],
      ["What is one role of alpha-amylase in the mash?", "It breaks starch chains into shorter dextrins and sugars", "Alpha-amylase cuts starch chains at internal points, helping create a range of shorter carbohydrates.", "It converts alcohol into carbon dioxide", "It extracts color from hops", "It consumes all maltose during the mash"],
      ["What is one role of beta-amylase in the mash?", "It releases maltose units from starch-chain ends", "Beta-amylase helps produce maltose, an important fermentable sugar, from starch.", "It makes the beer fizzy", "It removes minerals from water", "It creates yeast cells"],
      ["What can a warmer mash temperature generally encourage?", "A wort with more dextrins and a fuller perceived body", "Mash temperature affects enzyme activity; warmer rests often favor less fermentable wort, within recipe and process limits.", "A wort with no sugars", "A lower original gravity in every recipe", "The immediate fermentation of the wort"],
      ["Why do brewers pay attention to mash pH?", "Enzyme performance and wort extraction are affected by pH", "Mash pH influences enzyme activity and the chemistry of extraction; brewers manage it for consistency.", "It determines the keg size", "It replaces the need to measure temperature", "It controls how quickly bottles carbonate"],
      ["What is strike water?", "The water heated and added to the grain to begin mashing", "Strike-water volume and temperature are planned so the mash reaches its target conditions.", "The first beer drawn from a serving tap", "Water used only to rinse empty bottles", "Water mixed with yeast after fermentation"],
      ["What does lautering mean?", "Separating wort from the grain bed", "Lautering collects liquid wort from the mash while retaining the spent grain.", "Adding yeast to cooled wort", "Carbonating beer in a keg", "Removing alcohol from finished beer"],
      ["What is sparging in a typical all-grain brew?", "Rinsing the grain bed with water to collect more wort extract", "Sparging washes additional dissolved sugars from the grain bed into the kettle.", "Cooling wort after the boil", "Adding hops to a fermenter", "Cleaning the outside of a mash tun"],
      ["What are first runnings?", "The wort collected early from the mash before or during sparging", "First runnings are the initial wort drained from the mash tun and are often more concentrated.", "The first bubbles from an airlock", "The first beer poured from a new keg", "Water left over after cleaning"],
      ["Why is wort boiled in many beer recipes?", "To help sanitize it, drive off some volatiles, and support hop utilization", "The boil serves several purposes; its details depend on the recipe and brewing process.", "To create fermentable sugar from hops", "To make yeast grow inside the kettle", "To carbonate the beer"],
      ["What is the hot break?", "Protein and other material that coagulate during the wort boil", "The hot break is material formed as wort boils; it can later settle with trub.", "The point when a bottle cap opens", "A hop variety used only for dry hopping", "A measure of fermentation speed"],
      ["Why does a brewer account for boil-off?", "Boiling evaporates water and changes the wort volume and concentration", "Estimating boil-off helps the brewer plan pre-boil volume and reach the intended post-boil volume and gravity.", "It measures how much yeast has settled", "It predicts the beer's exact final carbonation", "It prevents all hop aroma loss"],
      ["What are alpha acids in hops known for contributing?", "Much of the beer's bitterness after isomerization during the boil", "Boil conditions isomerize hop alpha acids, making them more soluble and contributing bitterness.", "The fermentable sugars in wort", "The beer's alcohol after fermentation", "The mineral content of brewing water"],
      ["What is the usual effect of an early boil-hop addition?", "It tends to contribute more bitterness than a late addition", "Longer boiling generally increases alpha-acid isomerization, while volatile aroma compounds are driven off.", "It always contributes only aroma and no bitterness", "It cools the wort more quickly", "It replaces the need for yeast"],
      ["What is a late-boil hop addition often used for?", "Adding hop flavor and some aroma while still receiving some heat", "Later timing generally preserves more volatile flavor and aroma than a long boil, though exact results vary.", "Raising mash efficiency", "Increasing the wort's original gravity", "Sanitizing bottles after packaging"],
      ["What does dry hopping mean?", "Adding hops during or after fermentation rather than boiling them", "Dry hopping extracts hop aroma and flavor without a long boil; timing and contact practices vary.", "Boiling hops until all aroma disappears", "Drying malt in a kiln", "Removing water from finished beer"],
      ["Why do brewers choose different hop varieties?", "Varieties can have different bitterness, flavor, and aroma characteristics", "Hop varieties differ in their oils and alpha-acid content, and growing conditions also affect them.", "Each variety ferments a different beer style by itself", "Some varieties make water unnecessary", "Hop varieties determine the yeast strain"],
      ["What does IBU estimate?", "The concentration of iso-alpha acids and related bittering compounds in beer", "IBU is a laboratory-oriented estimate of bitterness compounds; perceived bitterness also depends on the beer.", "The beer's alcohol percentage", "The exact amount of dissolved carbon dioxide", "The color of the malt"],
      ["What does brewing yeast need to ferment wort successfully?", "Suitable wort, an appropriate yeast strain, and healthy fermentation conditions", "Yeast health, pitching rate, temperature, and wort composition all influence fermentation.", "Only hops and cold water", "Direct sunlight and an open fermenter", "A continuous supply of oxygen throughout fermentation"],
      ["What is a common broad difference between ale and lager yeast use?", "Many ale strains are fermented warmer than many lager strains", "There are exceptions, but ale strains are often used at warmer temperatures than traditional lager strains.", "Ale yeast always ferments without producing alcohol", "Lager yeast cannot ferment maltose", "They are exactly the same strain in every recipe"],
      ["What does attenuation describe?", "How much of the wort's fermentable extract yeast ferments", "Apparent attenuation relates the drop in gravity during fermentation to the starting extract.", "How much bitterness hops contribute", "How quickly a keg chills", "The color change during the boil"],
      ["What does yeast flocculation describe?", "How readily yeast cells clump together and settle", "Flocculation is yeast's tendency to aggregate and sediment, which affects beer clarity and yeast handling.", "How much alcohol a hydrometer measures", "How quickly hops dissolve in hot wort", "How well a bottle cap seals"],
      ["Why is pitching an appropriate amount of yeast important?", "It supports a healthy fermentation suited to the wort and yeast strain", "Pitching rate is one factor in fermentation health and flavor; appropriate rates depend on the wort and yeast.", "It guarantees the beer will be clear immediately", "It removes the need to control fermentation temperature", "It determines the final beer color"],
      ["Why might a brewer make a yeast starter?", "To grow or prepare healthy liquid yeast for pitching when appropriate", "A starter can increase viable yeast available for pitching; whether it is needed depends on yeast type and batch.", "To carbonate wort before boiling", "To measure mash pH", "To replace cleaning and sanitizing"],
      ["Why may wort be aerated or oxygenated before pitching many brewing yeasts?", "Yeast uses oxygen early to build components needed for healthy cell growth", "Oxygen is useful to yeast during its early growth phase; brewers typically avoid aerating finished beer.", "Oxygen converts hops into malt", "It makes the wort instantly sterile", "It guarantees a higher final gravity"],
      ["Why should brewers generally avoid splashing fermented beer during transfer?", "Oxygen pickup can cause staling and damage flavors", "Once fermentation is complete, excess oxygen exposure can oxidize beer and reduce freshness.", "It removes all carbonation", "It makes yeast ferment faster", "It increases the beer's original gravity"],
      ["Why is fermentation temperature controlled?", "Temperature affects yeast activity and the flavors it produces", "Fermentation temperature influences yeast performance and flavor; targets depend on strain and recipe.", "It sets the kettle's boil-off rate", "It decides how many hops are in a recipe", "It guarantees a particular beer color"],
      ["Why can a fermenter feel warmer than the room during active fermentation?", "Fermentation produces heat", "Yeast activity releases heat, so the beer can be warmer than ambient air.", "The airlock heats the beer", "Hops continue boiling inside the fermenter", "Carbon dioxide turns into heat only after packaging"],
      ["What is krausen?", "The foamy head that can form on fermenting beer", "Krausen forms from yeast, proteins, and carbon dioxide during active fermentation.", "A type of brewing-water salt", "The grain bed after sparging", "A measurement of beer color"],
      ["What does an airlock mainly do on a fermenter?", "Lets gas escape while helping limit outside air and contaminants entering", "An airlock provides a one-way vent path, though it is not a substitute for sound sanitation and a proper seal.", "Measures the beer's gravity", "Controls mash temperature", "Adds oxygen during packaging"],
      ["What does original gravity (OG) measure?", "The wort's density before fermentation begins", "OG indicates dissolved extract in wort before fermentation and is used in brewing calculations.", "The beer's color before boiling", "The final pressure in a keg", "The volume of yeast in a packet"],
      ["What does final gravity (FG) measure?", "The beer's density after fermentation", "FG is measured after fermentation and, with OG, can help estimate alcohol and assess fermentation progress.", "The wort temperature at mash-in", "The weight of the empty fermenter", "The bitterness of a hop addition"],
      ["How is a basic ABV estimate commonly calculated from gravity readings?", "Using the difference between original and final gravity in an approximate formula", "A common homebrew estimate uses OG minus FG multiplied by a factor; it is an approximation, not a laboratory measurement.", "By counting airlock bubbles for one minute", "By measuring the beer's color", "By adding the hop alpha-acid percentages"],
      ["Why should a hydrometer reading be temperature-corrected when needed?", "Liquid temperature can affect density readings", "Hydrometers are calibrated for a reference temperature, so readings outside that range may need correction.", "Temperature changes the printed scale on the hydrometer", "Correction converts IBU directly to ABV", "It prevents fermentation from continuing"],
      ["Why can refractometer readings be harder to interpret after fermentation starts?", "Alcohol affects how light refracts, so a correction is needed", "A refractometer reading after fermentation needs an alcohol correction using the original reading or another method.", "The instrument can only measure hop aroma", "Fermentation removes all water from the sample", "Refractometers measure pressure, not concentration"],
      ["What is a useful sign that primary fermentation may be complete?", "Gravity readings remain stable over an appropriate period", "Stable gravity readings are more useful than airlock activity alone; allow time for the beer and yeast to finish.", "The krausen has just started to form", "The beer has reached the mash temperature", "The fermenter has stopped feeling warm for one hour"],
      ["What is the fermentation lag phase?", "The early period when yeast adapts and grows before vigorous fermentation is apparent", "Yeast may be active before visible signs appear; lag duration varies with yeast and conditions.", "The time after a keg is emptied", "The pause between hop additions", "The time malt rests in the mash tun"],
      ["What is diacetyl often associated with in beer?", "A buttery or butterscotch-like flavor", "Diacetyl can be produced during fermentation; yeast may reduce it when given suitable time and conditions.", "A sharp citrus hop aroma", "A salty mineral taste from all water", "A measure of alcohol strength"],
      ["What does cold crashing usually mean?", "Cooling fermented beer to encourage particles and yeast to settle", "Cold crashing can help clarify beer, though it does not replace sanitation or guarantee brilliance.", "Freezing the beer solid to remove all alcohol", "Boiling the beer after fermentation", "Adding warm water to the mash"],
      ["Why might beer be conditioned after primary fermentation?", "To allow flavors to mature and the beer to reach its intended state", "Conditioning time can allow yeast to clean up some fermentation byproducts and flavors to integrate.", "To create malt starch from hops", "To make gravity readings unnecessary", "To sanitize the outside of the keg"],
      ["What is priming sugar used for in bottle conditioning?", "Yeast ferments a measured amount to produce carbonation in the sealed bottle", "Residual yeast ferments priming sugar and the resulting carbon dioxide dissolves into beer; accurate measurement matters.", "It raises bitterness after packaging", "It stops fermentation instantly", "It removes oxygen from the headspace completely"],
      ["Why is bottling beer before fermentation is complete risky?", "Continued fermentation can create excessive pressure in bottles", "More fermentable sugar can produce more carbon dioxide in sealed bottles than intended, risking bottle failure.", "The beer will lose all its color", "The bottles will prevent yeast from producing alcohol", "It always makes the beer sour"],
      ["How is beer commonly force-carbonated in a keg?", "Carbon dioxide is supplied from a gas cylinder and dissolves into the beer", "Keg carbonation uses regulated CO₂; pressure, temperature, and time affect carbonation.", "By adding dry yeast to the outside of the keg", "By boiling the keg with its lid open", "By shaking air into the beer"],
      ["Why should a keg and its beer-contact parts be cleaned and sanitized before filling?", "To remove soil and reduce the risk of contaminating the beer", "Cleaning removes deposits; sanitizing clean beer-contact surfaces helps limit microbes.", "To increase the keg's capacity", "To make the beer ferment a second time automatically", "To lower the beer's original gravity"],
      ["What is the difference between cleaning and sanitizing?", "Cleaning removes soil; sanitizing reduces microorganisms on a clean surface", "The processes are different and work best in that order; sanitizing does not reliably remove visible residue.", "Cleaning adds yeast; sanitizing adds hops", "They mean exactly the same thing", "Sanitizing removes all mineral content from water"],
      ["Why should a brewer follow the sanitizer label's directions?", "Contact time, dilution, and use instructions vary by product", "Using the correct concentration and contact time helps the sanitizer work as intended and supports safe use.", "All sanitizers are safe to drink at any concentration", "The label determines mash efficiency", "Sanitizer should always be mixed with boiling wort"],
      ["What can brewing-water minerals influence?", "Mash chemistry, yeast performance, and perceived flavor", "Water ions interact with malt and affect mash pH and flavor; suitable profiles depend on the beer and source water.", "Only the shape of the bottle", "The yeast strain's genetic code", "The volume of the fermenter"],
      ["Why might chlorine or chloramine in tap water concern brewers?", "They can contribute medicinal or plastic-like off-flavors", "Some water supplies use disinfectants that can react with malt-derived compounds; brewers choose an appropriate treatment.", "They always increase hop aroma", "They make yeast unnecessary", "They determine the beer's carbonation level"],
      ["What is one common reason brewers treat brewing water to address chloramine?", "Some use a suitable dose of metabisulfite, following reliable guidance", "Metabisulfite can neutralize chloramine when used appropriately; verify the water and dose rather than guessing.", "Adding extra hops always removes it", "Boiling every volume of water for several hours is the only option", "Adding yeast consumes the disinfectant"],
      ["What does water hardness mainly relate to in brewing water?", "The concentration of dissolved minerals, especially calcium and magnesium", "Hardness is largely associated with calcium and magnesium ions and can affect mash and flavor chemistry.", "The water's temperature at mash-in", "The pressure in the serving keg", "The amount of carbon dioxide in the air"],
      ["Why is calcium often discussed in brewing-water profiles?", "It can influence mash chemistry and yeast flocculation", "Calcium has several brewing effects, including mash pH interactions and yeast behavior; amounts should suit the recipe and water.", "It converts alcohol into sugar", "It replaces the need for a mash rest", "It provides hop aroma"],
      ["Why avoid excessive sparging or unsuitable sparge conditions?", "They can extract unwanted compounds from the grain husks", "Very high pH and low gravity near the end of runoff can increase extraction of astringent husk compounds.", "Sparging removes all fermentable sugars from the wort", "It makes the boil stop", "It prevents yeast from settling"],
      ["What is malt extract brewing?", "Using concentrated wort extract instead of mashing all the grain yourself", "Malt extract is produced from wort and lets brewers make beer without performing a full mash for all fermentables.", "Using hops instead of malt", "Fermenting grain without water", "A method that skips fermentation"],
      ["What is brew-in-a-bag (BIAB)?", "An all-grain method that holds crushed grain in a bag during the mash", "The bag contains the grain and can simplify separation after mashing; processes vary by brewer.", "A method for carbonating bottles", "A yeast storage technique", "A way to dry-hop inside a sealed bottle"],
      ["What does all-grain brewing mean?", "The fermentable extract is produced by mashing malted grain", "All-grain brewers create wort from grain rather than relying on malt extract for the main fermentable portion.", "The recipe contains no water", "The beer uses only unmalted hops", "The beer is packaged before fermentation"],
      ["What does mash efficiency describe?", "How effectively potential extract from the grain reaches the collected wort", "Efficiency compares collected extract with the grain's potential and depends on the recipe and process.", "How quickly beer chills in a keg", "How much carbonation remains after pouring", "The percentage of hops that dissolve"],
      ["What is original gravity (OG) in a recipe used for?", "A target for wort concentration before fermentation", "OG helps describe wort strength and, together with FG, can help estimate alcohol.", "A target for final beer color", "A measurement of keg pressure", "A count of yeast cells in the fermenter"],
      ["What does SRM describe?", "Beer color using a standard scale", "SRM is a standard measure associated with beer color, not alcohol or bitterness.", "The beer's alcohol by volume", "The amount of yeast sediment", "The level of carbonation"],
      ["What is oxidation in packaged beer commonly associated with?", "Stale flavors and loss of freshness", "Oxygen exposure, especially after fermentation, can accelerate staling and change aroma and flavor.", "Improved hop aroma in every beer", "A guaranteed increase in alcohol", "A lower mash pH"],
      ["What is trub?", "Sediment made up of break material, hop matter, and other solids", "Trub forms during brewing and settling; brewers manage how much carries into fermentation.", "A type of yeast nutrient", "A measure of mash temperature", "The foam that forms in a serving glass"],
      ["When might yeast nutrient be useful?", "When a recipe or fermentation conditions call for additional nutrients", "Malt wort contains nutrients, but some fermentations may benefit from appropriate nutrient additions following product guidance.", "As a universal replacement for healthy yeast", "Only to increase hop bitterness", "To carbonate a finished keg"],
      ["What is a yeast starter?", "A small propagation of liquid yeast before pitching into a larger batch", "A starter can grow yeast cells when appropriate; whether it is useful depends on yeast form, age, and batch size.", "A sugar solution added to bottles for carbonation", "A first wort runoff", "A sanitizer used on fermenters"],
      ["What does a beer's body describe?", "How full or light it feels in the mouth", "Body is a sensory impression influenced by residual extract, proteins, carbonation, and other factors.", "Its exact alcohol percentage", "The size of its fermenter", "The time it spends in the kettle"],
    ]),
  },
  "brew-day-sequence": {
    title: "Brew Day Sequence",
    subtitle: "Follow the main stages of an all-grain brew day.",
    intro: "Answer seven random questions from a 70-question brew-day pool. Choices are shuffled each attempt, with explanations to help you learn the process.",
    questions: [
      {
        prompt: "You have measured and crushed the malt. What comes next?",
        answers: [
          {
            text: "Heat strike water, then mash in the grain",
            correct: true,
            feedback: "Strike water is heated for the mash. The crushed malt is mixed in so enzymes can convert starches into sugars.",
          },
          {
            text: "Pitch yeast into the dry grain",
            correct: false,
            feedback: "Yeast is added after the wort is boiled and cooled. First, make wort by mashing the grain.",
          },
          {
            text: "Package the beer",
            correct: false,
            feedback: "Packaging comes after fermentation and conditioning. The mash is still needed to make wort.",
          },
        ],
      },
      {
        prompt: "The mash rest is complete. What is the usual next step?",
        answers: [
          {
            text: "Separate the sweet wort from the grain, often by lautering and sparging",
            correct: true,
            feedback: "Lautering separates wort from the grain bed; sparging rinses remaining sugars from the grain.",
          },
          {
            text: "Add priming sugar and bottle",
            correct: false,
            feedback: "The wort still needs to be boiled, cooled, and fermented before packaging.",
          },
          {
            text: "Pitch yeast into the hot mash",
            correct: false,
            feedback: "Yeast is pitched after the wort is boiled and cooled to a suitable temperature.",
          },
        ],
      },
      {
        prompt: "You have collected the wort. What usually follows?",
        answers: [
          {
            text: "Boil the wort and add hops according to the recipe",
            correct: true,
            feedback: "The boil helps sanitize wort and is when many hop additions are made. Follow the recipe's timing.",
          },
          {
            text: "Ferment it immediately without cooling",
            correct: false,
            feedback: "After the boil, wort is cooled before yeast is pitched. Hot wort can harm or kill yeast.",
          },
          {
            text: "Mash the same grain a second time",
            correct: false,
            feedback: "The collected wort moves on to the boil; it is not normally returned to the mash.",
          },
        ],
      },
      {
        prompt: "The boil is finished. What should happen before adding yeast?",
        answers: [
          {
            text: "Cool the wort to an appropriate pitching temperature",
            correct: true,
            feedback: "Cooling prepares the wort for yeast. The target depends on the yeast and recipe.",
          },
          {
            text: "Leave the wort uncovered until it reaches room temperature",
            correct: false,
            feedback: "Cool the wort using a suitable method while protecting it from contamination.",
          },
          {
            text: "Add dry malt and begin another mash",
            correct: false,
            feedback: "The wort is ready to be cooled and transferred for fermentation, not mashed again.",
          },
        ],
      },
      {
        prompt: "The wort is cool. What is a sensible next step?",
        answers: [
          {
            text: "Transfer it to a clean, sanitized fermenter and pitch yeast",
            correct: true,
            feedback: "Once cooled, transfer with clean, sanitized equipment and pitch suitable yeast according to its instructions.",
          },
          {
            text: "Add yeast to the kettle while it is still hot",
            correct: false,
            feedback: "Yeast should be pitched at a suitable temperature, not into hot wort.",
          },
          {
            text: "Bottle it before fermentation begins",
            correct: false,
            feedback: "Fermentation must take place before packaging. Bottling fermenting beer can create dangerous pressure.",
          },
        ],
      },
      {
        prompt: "Fermentation appears to have slowed. How should you check whether it is done?",
        answers: [
          {
            text: "Take gravity readings over time and check that they are stable",
            correct: true,
            feedback: "Airlock activity alone is not a dependable measure. Stable gravity readings, along with the recipe and yeast guidance, help assess completion.",
          },
          {
            text: "Bottle as soon as the airlock stops bubbling",
            correct: false,
            feedback: "An airlock can stop for reasons other than completed fermentation. Confirm stable gravity before packaging.",
          },
          {
            text: "Add more yeast every time bubbling slows",
            correct: false,
            feedback: "A slower airlock does not automatically mean fermentation is stuck. Check gravity and fermentation conditions first.",
          },
        ],
      },
      ...buildQuestions([
        ["Your recipe, water, and ingredients are ready. What helps avoid a rushed brew day?", "Review the recipe, measure ingredients, and prepare clean equipment", "Preparation keeps the process organized and helps prevent missed steps.", "Pitch yeast into the dry grain", "Bottle the unfermented wort", "Add hops before measuring the water"],
        ["You are using grain that has not been milled. What is a suitable next action?", "Crush the malt to expose its interior while keeping husks mostly intact", "A suitable crush supports conversion and can help the grain bed filter during lautering.", "Boil the whole grain before crushing", "Soak the malt in sanitizer", "Add the grain after fermentation"],
        ["You have a recipe and know the batch size. What should guide your strike-water amount?", "The recipe and the planned mash thickness and equipment losses", "Water volume depends on the recipe and process, including later sparging and system losses.", "The color of the fermenter", "The final keg pressure only", "A fixed amount that is identical for every batch"],
        ["How should you choose the strike-water temperature?", "Calculate it to reach the recipe's target mash temperature after grain is added", "Grain temperature and mash thickness affect the final mash temperature.", "Set it to the wort's boiling point", "Use the fermentation temperature", "Choose it based only on hop variety"],
        ["When adding crushed grain to strike water, what helps avoid dough balls?", "Stir the grain in gradually and mix thoroughly", "Gradual mixing helps wet the grain evenly and break up dry clumps.", "Pour the whole grain bill into a sealed fermenter", "Avoid stirring so the grain stays dry", "Add yeast before mixing"],
        ["The mash is cooler than the recipe target. What is a sensible response?", "Adjust gently using the process your equipment and recipe allow", "A controlled adjustment can restore the target; avoid large swings and verify with a thermometer.", "Add ice until it reaches the target", "Boil the grain bed dry", "Ignore all temperature readings"],
        ["The mash is hotter than intended. What should you do?", "Use a controlled correction appropriate to your setup and recheck", "Mash temperature affects enzyme activity, so correct carefully and record the actual temperature.", "Add dry hops to cool it", "Pitch yeast into the mash", "Seal the kettle and assume the temperature will correct itself"],
        ["Why stir the mash after dough-in?", "To distribute water and temperature through the grain bed", "Mixing helps avoid dry pockets and temperature stratification.", "To add oxygen after fermentation", "To force all husks through the filter", "To create carbonation"],
        ["Why may a brewer check mash temperature in more than one place?", "The mash can have uneven temperatures", "Multiple checks help find hot or cool spots and confirm the mash is near target.", "Each grain kernel has a different boiling point", "The thermometer measures alcohol", "Mash temperatures cannot vary"],
        ["The mash rest has finished. Why might a brewer raise the mash temperature before runoff?", "A mash-out can reduce wort viscosity and slow further enzyme activity", "Some processes use a mash-out; its use and target depend on the recipe and equipment.", "It ferments the wort", "It carbonates the mash", "It replaces the boil"],
        ["Before collecting wort, what should be done with the grain bed in a typical lautering setup?", "Allow the bed to settle and establish a clear runoff path", "A stable grain bed can help filter particles as wort is collected.", "Stir all the grain into the kettle", "Add yeast to the bed", "Dry the grain bed with hot air"],
        ["The first runoff is cloudy with grain particles. What is one common response?", "Return some runoff gently to the top of the grain bed", "Recirculation can help the grain bed filter particles; follow the equipment process.", "Pour the grain bed into the fermenter", "Add priming sugar", "Increase hop bitterness"],
        ["Why collect runoff without compacting the grain bed excessively?", "A compacted bed can restrict flow and cause a stuck runoff", "Avoiding excessive compaction helps maintain wort flow through the grain.", "Compaction improves yeast growth", "It raises the wort's carbonation", "It prevents the boil from starting"],
        ["What is the purpose of sparge water in a typical batch-sparge process?", "Rinse dissolved extract from the grain into the kettle", "Sparge water helps recover sugars remaining in the grain bed.", "Cool the wort after the boil", "Sanitize the fermenter", "Set final beer carbonation"],
        ["When sparging, why use suitable water temperature and pH?", "To support extraction while limiting unwanted husk compounds", "Very high pH and low-gravity runoff can increase astringent extraction; process targets vary.", "To make yeast ferment faster", "To increase the hop alpha-acid content", "To stop the wort from boiling"],
        ["Runoff is complete. What should you check before the boil?", "Collected volume and, if available, pre-boil gravity", "These measurements help compare the batch with the recipe and adjust the process.", "The final packaged-beer carbonation", "Bottle-cap diameter", "The fermenter's airlock activity"],
        ["Why bring collected wort to a controlled boil?", "The boil supports wort processing and allows timed hop additions", "A planned boil supports sanitation and recipe-specific evaporation and hop extraction.", "It completes fermentation before yeast is added", "It removes the need for cooling", "It adds oxygen to finished beer"],
        ["A recipe calls for a bittering hop addition at the start of the boil. When should it be added?", "At the recipe's specified early-boil timing", "Longer boil time generally increases isomerization and bitterness contribution.", "After packaging", "Before the grain is milled", "Only after fermentation is complete"],
        ["A recipe calls for a late-boil hop addition. Why follow its stated timing?", "Timing influences the balance of bitterness, flavor, and aroma", "Later additions receive less boil time and often retain more volatile hop character.", "Timing determines the yeast strain", "Late hops turn malt starch into sugar", "Timing changes the kettle volume to zero"],
        ["The boil is vigorous enough to risk a boil-over. What is the best response?", "Reduce heat temporarily and manage the boil safely", "A controlled boil helps prevent spills and keeps the process safe.", "Add sanitizer to the kettle", "Leave the hot kettle unattended", "Seal the kettle airtight"],
        ["Why avoid leaving a kettle unattended during heating and boiling?", "Hot liquids and boil-overs can create burn and fire hazards", "Stay attentive, use stable equipment, and follow safe hot-side practices.", "The wort will instantly ferment", "Hops stop working if observed", "The kettle will lose all its minerals"],
        ["A recipe includes a whirlfloc or kettle fining addition. When is it commonly used?", "Near the end of the boil, according to product and recipe directions", "Kettle finings are typically added late in the boil to aid hot-break and trub settling.", "During bottle conditioning", "Before milling the grain", "After the beer is served"],
        ["Why might a brewer use a whirlpool after the boil?", "To gather hop matter and trub into a more concentrated area", "Whirlpooling can help separate solids from wort; the method and rest depend on the recipe.", "To carbonate the wort", "To restart fermentation", "To crush the malt"],
        ["The boil is over. What should happen before transferring cooled wort?", "Use clean, sanitized equipment on surfaces that contact post-boil wort", "After the boil, contamination control becomes important; clean and sanitize contact surfaces.", "Use equipment with visible residue", "Add unmeasured sanitizer directly to the fermenter", "Rinse the fermenter with wort only"],
        ["Why cool wort promptly using a suitable method after boiling?", "To reach a yeast-appropriate pitching temperature and manage contamination risk", "Cooling prepares wort for yeast and limits the time it remains in a vulnerable warm range.", "To raise the mash temperature", "To remove all dissolved sugars", "To make the beer instantly carbonated"],
        ["What is one benefit of a counterflow or immersion wort chiller?", "It transfers heat from wort to a cooling medium", "A chiller helps bring wort down toward pitching temperature efficiently.", "It measures original gravity automatically", "It replaces the fermenter", "It produces hop alpha acids"],
        ["After chilling, why transfer wort carefully into the fermenter?", "To limit contamination and avoid unnecessary splashing after fermentation begins", "Use clean, sanitized contact surfaces; follow a suitable oxygenation plan before pitching.", "To add grain husks back into the wort", "To raise the beer's IBU", "To boil the wort again in the fermenter"],
        ["When is oxygen generally most useful to many brewing yeasts?", "Before or around pitching, according to the brewing process", "Yeast uses oxygen early for growth; oxygen exposure later can stale beer.", "After packaging, by opening each bottle", "Only during the mash", "It is never relevant to yeast"],
        ["Why check the wort's pitching temperature before adding yeast?", "To keep the yeast within its recommended temperature range", "Pitching too hot or cold can stress yeast; follow strain and recipe guidance.", "To determine hop variety", "To calculate bottle volume", "To measure the water hardness"],
        ["You are using dry yeast. What is the best way to prepare it?", "Follow the yeast manufacturer's pitching instructions", "Dry-yeast handling guidance varies; follow the supplier's directions for the strain and batch.", "Always boil the yeast packet", "Mix it with sanitizer", "Add it to the grain before mashing"],
        ["You are using liquid yeast and unsure whether it is enough for a large or strong wort. What should you do?", "Use a suitable pitching-rate estimate and follow yeast guidance", "Required cell count depends on wort volume, gravity, strain, and yeast condition.", "Assume one small pack is always enough", "Add the yeast during the boil", "Dilute it with sanitizer"],
        ["Why might a brewer take an original-gravity reading after collecting and boiling wort?", "To compare wort strength with the recipe target", "OG records the starting density and supports later process and alcohol estimates.", "To measure the beer's final carbonation", "To verify the color of the label", "To determine whether bottles are clean"],
        ["The original gravity is lower than the recipe target. What is a useful first step?", "Check measurement temperature, volume, and process notes before adjusting", "Verify readings and batch volume first; any correction depends on the recipe and stage.", "Add dry yeast until the gravity changes", "Bottle immediately", "Add sanitizer to raise gravity"],
        ["Why record the actual mash and boil volumes?", "They help diagnose process losses and improve future recipe consistency", "Good records help tune equipment profiles and repeat successful batches.", "They replace sanitation", "They determine yeast genetics", "They eliminate the need for a recipe"],
        ["Why keep notes about hop additions and their timing?", "Timing and amount influence bitterness, flavor, and aroma", "Accurate hop records make recipe results easier to understand and reproduce.", "Hop timing controls bottle pressure directly", "It tells yeast when to stop fermenting", "It changes the malt's protein content"],
        ["Fermentation has begun. What should you do with the fermenter?", "Maintain conditions appropriate for the yeast and keep it protected", "Stable, suitable fermentation conditions support yeast performance and reduce contamination risk.", "Open it repeatedly to check by smell", "Move it into direct sunlight", "Add more grain each day"],
        ["Why keep fermentation records such as temperature and gravity?", "They help track progress and troubleshoot deviations", "Measurements provide more reliable information than appearance or airlock activity alone.", "They determine the keg's color", "They make cleaning unnecessary", "They guarantee a particular flavor"],
        ["A recipe specifies fermentation temperature. Why follow it?", "The yeast strain and desired flavor profile inform the target", "Temperature affects yeast activity and flavor; strain guidance is important.", "It is chosen only to match the room color", "All beer ferments best at the same temperature", "It controls mash efficiency after fermentation"],
        ["The fermenter is bubbling vigorously. Should you open it to stir?", "Usually avoid opening it unless the process specifically calls for an intervention", "Opening increases contamination risk; vigorous airlock activity alone does not require stirring.", "Yes, stir it every hour with an unclean spoon", "Add hops through an unsanitized funnel", "Bottle the beer immediately"],
        ["The airlock has slowed after several days. What should you do?", "Check gravity over time and continue following the recipe's fermentation guidance", "Airlock rate is not a reliable endpoint; stable gravity and adequate time are more useful.", "Assume fermentation is complete and bottle now", "Pour the beer back into the kettle", "Add boiling water"],
        ["Why allow time after gravity appears stable before packaging?", "Yeast may still need time to finish and condition the beer", "Stable readings are useful, but recipe and yeast guidance may call for additional conditioning.", "It increases original gravity", "It creates hop bitterness after the boil", "It removes the need to sanitize packaging equipment"],
        ["What should you do before taking a gravity sample?", "Use clean, sanitized sampling equipment and avoid returning the sample", "Good sampling hygiene reduces contamination risk; do not return a measured sample to the fermenter.", "Use a dirty cup and pour the sample back", "Add the sample to the mash", "Shake the fermenter open"],
        ["A hydrometer reading seems implausible. What should you check?", "Calibration temperature, sample conditions, and reading technique", "Temperature, bubbles on the instrument, and reading the meniscus correctly can affect results.", "The bottle cap brand", "The dry-hop amount only", "The label color"],
        ["Why degas a fermented sample before a refractometer reading?", "Dissolved carbon dioxide can interfere with a clear reading", "Bubbles and alcohol effects can complicate readings; use an appropriate sampling and correction method.", "It raises the sample's original gravity", "It creates new fermentable sugars", "It replaces temperature correction for every instrument"],
        ["The beer has finished fermenting and you plan to bottle-condition it. What must be calculated carefully?", "The priming-sugar amount for beer volume and desired carbonation", "Over- or under-priming affects carbonation; use a reliable calculator and account for process conditions.", "The amount of mash grain to add to each bottle", "The hop boil time after filling", "The yeast's original package weight only"],
        ["Before bottling, what should you verify about fermentation?", "Gravity is stable and the beer is ready according to the recipe", "Packaging beer with ongoing fermentation can create excessive pressure.", "The airlock has bubbled exactly 100 times", "The beer is clear in the fermenter", "The yeast has all been removed"],
        ["What is important when filling bottles for conditioning?", "Use clean, sanitized bottles and suitable caps, leaving appropriate headspace", "Sanitation and consistent filling help protect beer and allow controlled carbonation.", "Fill bottles while fermentation is active and cap them tightly", "Add an unmeasured scoop of sugar to each", "Leave every bottle uncapped"],
        ["You plan to keg the finished beer. What should be clean and sanitized?", "The keg and all surfaces that contact the beer", "Beer-contact surfaces should be cleaned and sanitized before filling.", "Only the outside of the keg", "Only the gas cylinder", "The fermenter's exterior only"],
        ["What is one advantage of transferring beer to a keg with minimal splashing?", "It limits oxygen pickup and protects flavor", "Reducing oxygen exposure after fermentation helps preserve freshness.", "It raises bitterness", "It increases gravity", "It makes the keg self-cleaning"],
        ["After packaging, why store beer under conditions suited to its style and packaging?", "Temperature and light exposure can affect quality over time", "Storage conditions influence aging and freshness; follow recipe and packaging guidance.", "All beers improve indefinitely in sunlight", "Warmth always improves hop aroma", "Storage changes the malt bill"],
        ["A batch misses its target volume after the boil. What should you do?", "Record the result and make only a suitable recipe-based adjustment", "Volume affects gravity and the batch profile; note it to improve future equipment and process estimates.", "Add sanitizer until the volume is correct", "Ignore all measurements", "Add unboiled grain to the fermenter"],
        ["Why keep the kettle covered or manage it as the recipe directs after the boil?", "To protect wort while following the intended cooling and process method", "Post-boil handling should limit contamination while allowing safe cooling; exact practice varies.", "To trap all steam permanently", "To ferment the wort in the kettle", "To prevent yeast from being pitched"],
        ["What is the role of a grain bed during lautering?", "It can act as a filter that retains larger grain particles", "A settled grain bed helps clarify runoff when handled appropriately.", "It produces carbonation", "It measures gravity", "It cools the boil"],
        ["Why avoid crushing malt to an excessively fine powder in many lauter systems?", "Fine material can impede runoff and contribute to a stuck mash", "Crush settings balance exposed endosperm with a workable grain-bed filter.", "It prevents enzymes from working", "It makes hops less bitter", "It sterilizes the grain"],
        ["What does a recipe's target mash time help specify?", "How long the mash is held under its planned conditions", "Mash duration is part of the process; conversion and recipe methods influence the required rest.", "How long beer should be served from a keg", "How long bottles should be washed after use", "When to add priming sugar during fermentation"],
        ["What should you do if the mash temperature varies from the recipe?", "Measure accurately, make a controlled correction if appropriate, and record it", "Temperature affects the mash; consistent measurement and notes help with repeatability.", "Add hops to the mash until the reading changes", "Pitch yeast to lower the temperature", "Assume all thermometers read identically"],
        ["Why may a brewer use a kettle-volume mark or dipstick?", "To estimate wort volume at key stages", "Volume measurements help plan boil-off, batch size, and gravity comparisons.", "To measure yeast viability", "To calculate IBU without a recipe", "To sanitize the kettle"],
        ["A hop addition is listed at flameout. What does that mean?", "Add it when the heat is turned off at the end of the boil", "Flameout timing gives a hot steep rather than the full boil duration; follow the recipe.", "Add it before milling the grain", "Add it after bottle conditioning", "Add it while pitching yeast"],
        ["A whirlpool hop addition is in the recipe. What should you follow?", "The specified temperature and contact time for the whirlpool step", "Hop extraction depends on temperature and time; recipe directions define the intended result.", "A fixed temperature used for every beer", "The yeast's storage temperature only", "The bottling pressure"],
        ["Why chill wort before pitching even if the yeast is robust?", "Pitching temperature affects yeast health and fermentation character", "Use the yeast's recommended range and avoid extremes that can stress cells.", "Cooling removes every contaminant", "It guarantees a fixed ABV", "It converts malt into hops"],
        ["What should guide the choice of fermenter size?", "Batch volume plus suitable headspace for fermentation activity", "Headspace helps accommodate krausen and foaming; vessel needs vary by process.", "The number of hop varieties only", "The bottle label dimensions", "The water's mineral profile alone"],
        ["What is a blow-off tube sometimes used for?", "Providing a wider path for gas and krausen during vigorous fermentation", "A blow-off setup can help manage foamy fermentation; keep the arrangement clean and safe.", "Measuring final gravity", "Adding oxygen after fermentation", "Filtering the grain before the mash"],
        ["Why ensure a fermenter's airlock is not blocked?", "Fermentation gas needs a safe path to escape", "A blocked vessel can build pressure; use suitable equipment and never seal active fermentation without pressure-rated design.", "It improves mash efficiency", "It stops yeast activity", "It increases the beer's color"],
        ["What should be done with used grain after lautering?", "Handle or dispose of it appropriately; it is no longer the wort", "Spent grain has had much of its soluble extract removed and can be composted or reused suitably.", "Add it to the finished beer for carbonation", "Use it as sanitizer", "Return it to the fermenter as yeast nutrient"],
        ["A recipe calls for a specific yeast strain. Why use that strain or a suitable substitute?", "Yeast choice affects fermentation behavior and flavor", "Strains vary in attenuation, temperature range, and flavor profile.", "Yeast determines the mash water volume exactly", "Every strain produces identical beer", "Yeast adds all hop bitterness"],
        ["What should you do if equipment instructions conflict with an online brew schedule?", "Follow safe equipment instructions and adapt the recipe appropriately", "Equipment safety and manufacturer guidance take precedence; record recipe adjustments.", "Ignore pressure and temperature ratings", "Use the equipment outside its intended purpose", "Seal a boiling kettle airtight"],
        ["Why clean brewing equipment soon after use?", "Fresh deposits are often easier to remove before they dry", "Prompt cleaning helps prevent buildup and makes later sanitation more effective.", "It increases fermentation gravity", "It extracts more hop aroma", "It makes every surface sterile without sanitizer"],
        ["At the end of brew day, what is valuable to record?", "Actual measurements, timings, deviations, and observations", "Detailed notes make it easier to repeat successes and diagnose differences in later batches.", "Only the beer's name", "Nothing until the beer is packaged", "The color of the kettle handle only"],
      ]).slice(0, 64),
    ],
  },
  "fermentation-detective": {
    title: "Fermentation Detective",
    subtitle: "Use clues and measurements to make thoughtful brewing decisions.",
    intro: "Answer seven random questions from a 70-question troubleshooting pool. Choices are shuffled each attempt, and explanations help you reason through fermentation clues.",
    questions: [
      {
        prompt: "The airlock is quiet, but it has only been a day since pitching. What should you do?",
        answers: [
          {
            text: "Check that the fermenter is sealed and monitor gravity and temperature",
            correct: true,
            feedback: "A quiet airlock can mean a small leak or simply a slow start. Gravity and temperature tell you more than bubbles alone.",
          },
          {
            text: "Immediately bottle the beer",
            correct: false,
            feedback: "Fermentation is almost certainly not confirmed complete after one day. Bottling too early can cause excessive pressure.",
          },
          {
            text: "Discard the batch because the yeast is dead",
            correct: false,
            feedback: "A quiet airlock alone does not show that yeast is inactive. Check the seal, temperature, and gravity trend.",
          },
        ],
      },
      {
        prompt: "Your fermenting beer is warmer than the yeast's recommended range. What is the best response?",
        answers: [
          {
            text: "Gently bring it toward the yeast's recommended range and avoid sudden swings",
            correct: true,
            feedback: "Fermentation generates heat. A stable temperature suited to the yeast helps avoid unwanted stress and flavor changes.",
          },
          {
            text: "Add ice directly into the fermenter",
            correct: false,
            feedback: "Adding ice risks contamination and sudden temperature changes. Adjust the environment around the sealed fermenter instead.",
          },
          {
            text: "Move it somewhere even warmer so it finishes faster",
            correct: false,
            feedback: "Higher temperatures can stress yeast and create unwanted flavors. Follow the yeast and recipe guidance.",
          },
        ],
      },
      {
        prompt: "The airlock has stopped bubbling. Is fermentation definitely finished?",
        answers: [
          {
            text: "No. Use gravity readings over time to check for stability",
            correct: true,
            feedback: "Airlock activity can stop because of a leak or changing fermentation rate. Stable gravity readings are a better indicator.",
          },
          {
            text: "Yes. No bubbles always means fermentation is complete",
            correct: false,
            feedback: "Airlock bubbles are not a reliable completion test. Check gravity and allow the beer time to finish and condition.",
          },
          {
            text: "Yes, if the fermenter looks clear from the outside",
            correct: false,
            feedback: "Appearance is not a reliable way to determine final gravity. Use a hydrometer or other suitable gravity measurement.",
          },
        ],
      },
      {
        prompt: "A gravity reading is lower than yesterday's. What does that suggest?",
        answers: [
          {
            text: "Fermentation may still be active, so keep monitoring before packaging",
            correct: true,
            feedback: "A changing gravity suggests fermentation may be continuing. Wait for stable readings before packaging.",
          },
          {
            text: "The beer is definitely ready to bottle today",
            correct: false,
            feedback: "A changing gravity means fermentation may still be underway. Packaging too early can lead to excess carbonation and pressure.",
          },
          {
            text: "The reading proves the beer is contaminated",
            correct: false,
            feedback: "A falling gravity is expected during fermentation as yeast consumes sugars. Look for stable readings and other signs before drawing conclusions.",
          },
        ],
      },
      {
        prompt: "You are preparing equipment that will touch cooled wort. What is the right order?",
        answers: [
          {
            text: "Clean away residue, then sanitize the contact surfaces",
            correct: true,
            feedback: "Cleaning removes soil that can shield microbes; sanitizing a clean surface reduces contamination risk.",
          },
          {
            text: "Sanitize over visible residue and skip cleaning",
            correct: false,
            feedback: "Visible soil can reduce sanitizer effectiveness. Clean first, then sanitize according to its instructions.",
          },
          {
            text: "Rinse with water only and handle the inside with bare hands",
            correct: false,
            feedback: "Use a cleaning and sanitizing process suitable for brewing equipment, and avoid contaminating sanitized surfaces.",
          },
        ],
      },
      ...buildQuestions([
        ["Your airlock is quiet twelve hours after pitching. What is the best first move?", "Check the fermenter seal and monitor temperature and gravity", "A leak or normal lag can explain a quiet airlock; gravity and temperature provide better clues.", "Bottle the beer immediately", "Add sanitizer to the wort", "Discard the batch without checking"],
        ["There is no visible activity after one day, but the wort is within the yeast range. What should you do?", "Give the yeast time and keep monitoring", "Lag time varies with yeast, pitching rate, and wort; visible bubbles are not the only sign of fermentation.", "Pitch a second packet every hour", "Heat the fermenter above the strain's range", "Open it and stir with an unclean spoon"],
        ["The airlock is not bubbling, but gravity has fallen since pitching. What does that suggest?", "Fermentation is occurring even if the airlock is quiet", "A leaky seal can prevent airlock activity; gravity change is evidence that extract is being consumed.", "The beer is fully carbonated", "The hydrometer is measuring hop aroma", "The batch must be discarded"],
        ["The airlock bubbles steadily. Does that prove fermentation is healthy and complete?", "No; check gravity, temperature, and the recipe's expected progress", "Bubbles show gas is escaping, but do not establish fermentation health or completion by themselves.", "Yes, bubbling always means the beer is finished", "Yes, it proves the beer is not contaminated", "No; add sanitizer to the airlock"],
        ["The fermenter is warmer than the room during active fermentation. Is that unusual?", "No; yeast activity can generate heat", "Fermenting beer can be warmer than ambient air, especially during vigorous activity.", "Yes; it proves the thermometer is broken", "Yes; fermentation never produces heat", "No; the beer is boiling"],
        ["A temperature probe attached to the fermenter reads above the yeast's recommended range. What next?", "Use a controlled cooling method and monitor the beer temperature", "Gently return the beer toward the strain's range and avoid abrupt swings.", "Add ice directly into the fermenter", "Move it next to a heater", "Open it to release heat"],
        ["The beer is colder than the yeast's recommended range and gravity is unchanged. What is sensible?", "Gently bring it toward the strain's range and monitor for activity", "Cold can slow some yeast; adjust gradually and recheck gravity rather than assuming a failure.", "Boil the fermenter contents", "Add priming sugar and bottle", "Shake air into the finished beer"],
        ["Fermentation temperature rose quickly after vigorous activity began. What should you consider?", "Use temperature control to avoid sustained excessive warmth", "Fermentation heat can raise beer temperature; follow the yeast's recommended range.", "Increase the temperature further to finish instantly", "Add unboiled water", "Assume temperature cannot affect flavor"],
        ["The fermenter is in direct sunlight. What is a better location?", "A shaded place with stable, suitable temperature", "Stable temperature and protection from light are generally preferable for fermentation.", "A sunny windowsill", "Beside an oven", "Outdoors where temperature changes quickly"],
        ["The yeast package says to ferment within a specific range. Which temperature should guide you?", "The yeast supplier's range and the recipe's intended profile", "Strain-specific guidance is more useful than a universal temperature for every beer.", "The boiling point of water", "The serving temperature of the finished beer", "The airlock's size"],
        ["A krausen has formed on top of the beer. What does it usually indicate?", "Active fermentation is producing foam", "Krausen commonly forms from yeast, proteins, and carbon dioxide during fermentation.", "The beer is definitely ready to bottle", "The beer has been contaminated for certain", "The mash has not converted"],
        ["Krausen has fallen, but you have not taken a gravity reading. What should you conclude?", "Appearance alone cannot confirm fermentation is complete", "Use gravity readings over time and follow the recipe and yeast guidance.", "The beer is safe to bottle now", "All yeast has died", "The original gravity has increased"],
        ["A thick krausen is pushing into the airlock. What should you do?", "Use a suitable clean blow-off arrangement if needed and keep the vent path clear", "A blow-off tube can handle vigorous foam; never allow active fermentation gas to become trapped.", "Seal the airlock opening", "Remove the lid and leave the fermenter open", "Bottle the beer while foaming"],
        ["The airlock appears blocked during active fermentation. Why is that important?", "Gas needs a safe, unobstructed route out of the vessel", "A blocked vessel can build pressure; use a suitable venting setup.", "It stops mash enzymes", "It means the beer is fully fermented", "It improves hop utilization"],
        ["Your fermenter lid leaks slightly. What should you rely on to assess fermentation?", "Gravity readings and temperature rather than airlock bubbles", "A leak can bypass the airlock; measurements remain more informative.", "The sound of bubbles only", "The smell from opening it repeatedly", "The number of times the lid flexes"],
        ["The airlock stopped after vigorous bubbling. What should you do before packaging?", "Take gravity readings over time and confirm they are stable", "Airlock activity often slows before fermentation is verified complete; stable gravity is a better check.", "Bottle immediately because bubbling stopped", "Add a large amount of sugar", "Rack it into an unclean bucket"],
        ["Gravity is still dropping between readings. What does that mean for packaging?", "Wait; fermentation may still be active", "Changing gravity indicates extract is still being consumed, so packaging may be premature.", "Bottle now to trap the remaining gas", "Add more priming sugar", "The yeast has stopped working"],
        ["Two gravity readings taken too close together differ slightly. What is a careful next step?", "Take another reading after an appropriate interval using consistent technique", "Small measurement variation can occur; compare readings over time with a suitable instrument.", "Average them and bottle immediately", "Add water until they match", "Assume contamination"],
        ["A gravity reading seems much higher than expected. What should you check first?", "Instrument calibration, sample temperature, and reading technique", "Temperature and technique can affect a hydrometer reading; verify before intervening.", "The label on the fermenter", "The number of airlock bubbles", "The color of the yeast"],
        ["A refractometer reading after fermentation seems unexpectedly high. Why might that be?", "Alcohol affects refractive readings, so a post-fermentation correction is needed", "Use the original reading and an appropriate correction method, or confirm with a hydrometer.", "Alcohol always makes the reading zero", "Hops cause the refractometer to measure pressure", "The fermenter is too large"],
        ["The hydrometer has bubbles clinging to it in the sample. What should you do?", "Remove bubbles and read the instrument carefully at its calibrated temperature", "Bubbles can affect buoyancy and the reading; use clean, consistent technique.", "Add the sample back to the fermenter", "Boil the sample in the hydrometer jar", "Ignore the scale and estimate by color"],
        ["A gravity sample is much warmer than the hydrometer calibration temperature. What is appropriate?", "Apply a suitable temperature correction or cool the sample safely", "Hydrometer readings depend on temperature; use the instrument's calibration guidance.", "Subtract the yeast's pitching rate", "Add hops to correct it", "Use the OG value as the FG"],
        ["The fermenter looks clear, but gravity has changed since yesterday. What should you do?", "Continue waiting and check for stable gravity", "Clarity does not prove fermentation is complete; changing gravity means it may still be active.", "Bottle because clear beer cannot ferment further", "Add oxygen to stop fermentation", "Discard it immediately"],
        ["Gravity is stable, but the beer tastes very sweet compared with the recipe. What is sensible?", "Review the recipe, expected FG, yeast, and measurement accuracy before deciding", "Stable gravity is useful, but an unexpectedly high FG may reflect recipe, yeast, or measurement factors.", "Add sanitizer to reduce sweetness", "Boil the beer in its fermenter", "Bottle with extra priming sugar"],
        ["Gravity is stable but much lower than the recipe's expected FG. What should you do?", "Verify the readings and consider recipe fermentability and yeast attenuation", "A lower FG can result from fermentability, yeast, or measurement differences; check before taking action.", "Add dry grain to the finished beer", "Assume the hydrometer measures bitterness", "Add more priming sugar automatically"],
        ["The fermentation seems stalled at a higher gravity than expected. What should you check first?", "Verify gravity and review temperature, yeast health, and wort conditions", "Confirm the measurement and assess process factors before interventions.", "Bottle immediately to restart the yeast", "Add sanitizer", "Pour the beer into the mash tun"],
        ["A stalled fermentation has been confirmed. What is a responsible next step?", "Research the cause and choose a measured intervention suitable for the beer", "Potential interventions depend on yeast, temperature, gravity, and sanitation; avoid blind additions.", "Add an arbitrary amount of sugar", "Open-ferment it in a warm room", "Add cleaning chemicals"],
        ["The beer smells buttery during fermentation. What can help yeast reduce diacetyl?", "Allow suitable time and conditions for the yeast to finish", "Some yeast can reabsorb diacetyl during conditioning; follow strain and recipe guidance.", "Add more hops to hide every flavor", "Bottle immediately", "Chill it before fermentation is complete"],
        ["The beer smells like green apple during fermentation. What should you do?", "Allow fermentation and conditioning time, then reassess", "Acetaldehyde can be a fermentation byproduct that yeast may reduce with time; do not rush packaging.", "Add green apples to the fermenter", "Bottle before gravity is stable", "Add sanitizer to the beer"],
        ["A sulfur-like aroma is present during fermentation. What is a reasonable response?", "Follow yeast guidance and allow time for fermentation and conditioning", "Some strains produce sulfur aromas that may diminish; assess the beer after suitable conditioning.", "Add bleach to remove the aroma", "Aerate repeatedly after fermentation", "Package before checking gravity"],
        ["The beer smells solvent-like after fermenting warm. What process factor is worth reviewing?", "Fermentation temperature and yeast health", "Some unwanted higher alcohol flavors can be associated with stressed or warm fermentation, though diagnosis depends on the beer.", "Bottle color", "Keg size", "Mash paddle length"],
        ["A medicinal, plastic-like flavor appears in the finished beer. Which brewing issue could be investigated?", "Chlorine or chloramine in brewing water or sanitation practices", "These disinfectants can react with phenolic compounds and create medicinal off-flavors.", "Low bottle fill level only", "A low mash temperature always", "A lack of hop bitterness"],
        ["The beer has a strong vinegar-like aroma and a surface film. What should you do?", "Avoid tasting if there are concerning signs and assess sanitation and contamination risk", "Acetic aromas and surface growth can indicate contamination; use caution and review process controls.", "Bottle it to stop all microbes", "Add more priming sugar", "Stir with an unclean spoon"],
        ["You see fuzzy growth on the beer surface. What is the safest choice?", "Do not consume it; discard carefully and review sanitation", "Fuzzy growth is a warning sign. Avoid disturbing it or trying to salvage the batch by skimming.", "Skim it off and bottle the beer", "Add hops to kill it", "Taste a large sample to identify it"],
        ["You see a thin pellicle but no fuzzy growth or obvious spoilage. What should you do?", "Assess the process and avoid disturbing it; seek reliable style-specific guidance", "A pellicle can have different causes and does not alone identify a safe or unsafe beer; avoid assumptions.", "Assume every pellicle is harmless", "Stir it into the beer", "Bottle immediately without checking gravity"],
        ["The airlock smells unusual when you open the fermenter. What is a sensible approach?", "Minimize opening and evaluate the beer with process history and other signs", "Opening exposes beer to contamination; aroma alone can be hard to interpret during active fermentation.", "Open it daily to smell more closely", "Add sanitizer to the fermenter", "Bottle based on aroma alone"],
        ["You accidentally splashed finished beer during transfer. What should you do for the rest of the process?", "Reduce further oxygen exposure and package carefully", "One event cannot be undone, but limiting additional oxygen pickup helps protect freshness.", "Aerate the beer repeatedly", "Leave the beer open overnight", "Add extra yeast to remove oxygen completely"],
        ["The fermenter was opened briefly with sanitized equipment. What should you do?", "Close it promptly and continue monitoring normally", "Brief exposure does not guarantee contamination; maintain sanitation and observe the batch.", "Discard it automatically", "Add boiling water", "Bottle it immediately"],
        ["You forgot to sanitize a spoon that touched the cooled wort. What is the best response?", "Avoid further handling, monitor carefully, and recognize contamination risk", "Contamination cannot be reversed reliably with a later addition; keep records and assess the batch cautiously.", "Add sanitizer to the fermenter now", "Boil the fermenting beer", "Open it daily to inspect"],
        ["A sample thief was used and returned to the fermenter. What is the concern?", "The sample may have introduced contaminants", "Sampling tools should be clean and sanitized, and measured samples should not be returned.", "The original gravity will rise", "The beer becomes carbonated", "The yeast strain changes"],
        ["The fermentation temperature controller reads a constant value, but a separate thermometer differs. What should you do?", "Check probe placement and verify instruments before adjusting", "Probe location and calibration can explain differences; confirm the beer temperature with a reliable method.", "Set the controller to the boiling point", "Ignore both readings", "Add ice directly to the beer"],
        ["A heating belt warms one spot on the fermenter. What should you monitor?", "The beer temperature and the controller's sensor placement", "Localized heating can make the probe reading differ from the beer; use suitable placement and equipment guidance.", "The airlock color", "The bottle pressure", "The hop alpha acids"],
        ["The room temperature falls overnight. What is a useful response?", "Check the beer temperature and maintain a suitable stable range", "Beer temperature can lag behind room changes; use a suitable control method and strain guidance.", "Add sugar to compensate", "Open the fermenter to room air", "Assume the beer temperature changed instantly"],
        ["A warm spell raises the room temperature during fermentation. What should you monitor?", "The actual fermenting beer temperature", "Active fermentation generates heat, so beer may be warmer than the surrounding air.", "Only the kettle temperature", "The number of bottles in storage", "The mash pH after fermentation"],
        ["The fermenter appears inactive after cold storage. What might be happening?", "Low temperature may have slowed yeast activity", "Some yeast activity slows in cold conditions; check gravity and follow the strain's guidance before intervening.", "The beer has boiled", "Hops have consumed the sugars", "The batch has automatically carbonated"],
        ["You cold-crashed beer while gravity was still falling. What is the concern?", "Cooling can slow yeast without proving fermentation is complete", "Confirm fermentation completion before packaging; cold temperatures can make activity less visible.", "Cold crashing raises the gravity", "It adds alcohol", "It kills every yeast cell instantly"],
        ["The fermenter is under pressure and the spunding valve is not venting. What should you do?", "Follow pressure-rated equipment instructions and relieve pressure safely", "Never exceed vessel ratings; a blocked or failed pressure-relief system requires immediate safe attention.", "Ignore the pressure gauge", "Open a non-pressure-rated lid abruptly", "Heat the vessel"],
        ["A pressure-capable fermenter is used for fermentation. What is essential?", "Stay within the vessel and relief-valve pressure ratings", "Pressure fermentation requires rated equipment and correct relief setup; ordinary fermenters may not be pressure-safe.", "Seal every vent to retain all gas", "Use a glass vessel not rated for pressure", "Ignore manufacturer instructions"],
        ["A batch has a large amount of headspace in the fermenter. What should you consider?", "Monitor normal fermentation and protect the beer from unnecessary oxygen exposure later", "Headspace is not automatically a problem during active fermentation, when CO₂ is produced; later handling still matters.", "Top it up with unboiled water", "Add extra hops to fill the space", "Bottle the wort immediately"],
        ["You are tempted to top up a fermenter with tap water. What should you consider?", "Use only a suitable, sanitary method consistent with the recipe", "Added water affects gravity and may introduce contaminants; do not add untreated water casually.", "Any water is always safe to add", "Water cannot change beer strength", "Add sanitizer concentrate instead"],
        ["A gravity sample tastes sweeter than expected during active fermentation. What should you do?", "Compare gravity readings over time and allow fermentation to proceed", "Wort and young beer can taste sweet while fermentable sugars remain; taste alone is not a completion test.", "Bottle immediately", "Add priming sugar", "Assume the beer is contaminated"],
        ["You are unsure whether a gravity change is real or instrument error. What helps?", "Repeat measurements with calibrated equipment and consistent sample technique", "Consistent method and reliable tools help separate actual fermentation changes from measurement variation.", "Count bubbles instead", "Change the recipe's OG", "Add yeast nutrient without checking"],
        ["The sample contains lots of suspended yeast. What should you remember when interpreting it?", "Cloudiness does not by itself indicate fermentation completion or failure", "Yeast in suspension is common; gravity trend and process context are more useful.", "The beer is always contaminated", "The gravity must be zero", "The beer is already carbonated"],
        ["A yeast packet is past its best-before date. What should you consider?", "Viability may be reduced; use fresh yeast or assess a suitable plan", "Age and storage affect yeast viability; follow supplier guidance and account for pitching needs.", "The yeast is guaranteed more active", "Add it after packaging", "Use it without regard to batch gravity"],
        ["Yeast was stored warm for an extended period. What should you consider?", "Storage may have reduced viability, so use supplier guidance and assess the pitch", "Yeast health depends on strain, form, age, and storage; avoid assuming the original cell count remains.", "Warm storage always improves viability", "The yeast can now replace hops", "Ferment at any temperature"],
        ["A high-gravity wort is fermenting slowly. What factors are worth reviewing?", "Yeast pitch rate, oxygenation before pitching, temperature, and wort composition", "High gravity can stress yeast; review process and measurements before choosing an intervention.", "Bottle size and label color", "Hop bag material only", "The number of mash paddles"],
        ["A low-gravity wort fermented quickly. Does fast fermentation alone mean it is ready to package?", "No; confirm stable gravity and suitable conditioning", "Speed varies and does not replace gravity checks or recipe guidance.", "Yes, fast fermentation is always complete", "Yes, bottle while gravity falls", "No, add sanitizer"],
        ["You added much more yeast than planned. What should you do?", "Record it and monitor fermentation; avoid unnecessary additions", "Pitching rate can affect fermentation behavior, but the batch should be assessed with measurements and process context.", "Add sanitizer to balance it", "Bottle immediately", "Raise mash temperature"],
        ["A fermentation smells fruity, but the recipe uses an expressive ale yeast. What should you do?", "Compare the aroma with the strain and style expectations and reassess after conditioning", "Some yeast strains produce esters; aroma should be interpreted in the recipe and fermentation context.", "Assume every fruity aroma is contamination", "Add bleach", "Open the fermenter repeatedly"],
        ["A fermented beer has little aroma while cold. What should you consider?", "Serving temperature can affect how aromas are perceived", "Cold beer can seem less aromatic; assess it at an appropriate serving temperature as well.", "The beer contains no flavor compounds", "The yeast has stopped existing", "The original gravity changed"],
        ["A sample tastes harshly bitter during active fermentation. What is sensible?", "Wait until fermentation and conditioning are complete before judging", "Young beer can taste unbalanced; assess the finished beer before making conclusions.", "Add priming sugar to remove bitterness", "Boil the fermenter", "Add cleaning solution"],
        ["A finished beer is unexpectedly flat in the keg. What should you check?", "CO₂ supply, connections, temperature, and carbonation time", "Keg carbonation depends on gas supply, leaks, temperature, pressure, and time.", "The mash pH only", "The yeast packet date only", "The bottle-cap color"],
        ["Bottle-conditioned beer is overcarbonated. What is a key safety concern?", "Excess pressure can cause bottles to break", "Handle cautiously and cool the bottles; investigate fermentation completion and priming calculations.", "The beer will lose its bitterness only", "It means the beer is sterile", "It is always safe to open warm bottles quickly"],
        ["Bottle-conditioned beer is undercarbonated. What should you review?", "Priming-sugar measurement, yeast activity, temperature, and conditioning time", "Carbonation depends on measured sugar, viable yeast, seal, temperature, and time.", "The original mash paddle", "The hop variety's color", "The kettle's boil-off"],
        ["After fermentation, the beer tastes stale or papery. What process issue might you review?", "Oxygen exposure during transfer or packaging", "Oxidation can create stale flavors; review splashing, headspace, and packaging practices.", "The strike-water volume only", "The airlock's shape", "The grain crush only"],
        ["The beer is cloudy after fermentation. What should you check before deciding it is a fault?", "Style expectations, yeast settling, temperature, and any recipe additions", "Some beers are intentionally hazy; cloudiness can also come from yeast or other process factors.", "Assume all haze is contamination", "Add sanitizer", "Bottle before gravity stabilizes"],
        ["A batch tastes unexpectedly astringent. What brewing factors could be reviewed?", "Mash and sparge pH, temperature, and grain-bed handling", "Astringency can be associated with husk extraction and other factors; review the process rather than guessing.", "Bottle pressure alone", "The yeast packet color", "Keg line length only"],
        ["The beer tastes buttery after packaging. What should you review?", "Fermentation completion, yeast conditioning, and temperature control", "Diacetyl can reflect fermentation and conditioning factors; consult strain and recipe guidance.", "The bottle label adhesive", "The amount of sparge water only", "The keg's exterior finish"],
        ["You suspect a batch may be contaminated but see no visible growth. What is a responsible approach?", "Use sensory and process evidence cautiously; do not rely on one sign alone", "Contamination diagnosis can be difficult; avoid unsafe salvage assumptions and review sanitation and fermentation records.", "Taste large amounts to identify microbes", "Add sanitizer after fermentation", "Bottle the batch under extra pressure"],
        ["A beer has a pellicle and a sour aroma, but the recipe was not intended to be sour. What should you do?", "Treat it as a possible unintended fermentation and assess cautiously", "Unplanned microbes can produce acidity and surface films; avoid packaging assumptions and follow safe handling.", "Stir the pellicle in and serve immediately", "Add unmeasured priming sugar", "Assume it is always harmless"],
        ["A beer has a tart flavor in a style intended to be tart. What should you do?", "Compare it with the recipe and expected fermentation profile", "Some styles are intentionally acidic; judge flavor in the intended style and process context.", "Assume all acidity is contamination", "Add sanitizer", "Raise the beer to boiling temperature in the fermenter"],
        ["The yeast settled to the bottom after fermentation. Is that necessarily a problem?", "No; sedimentation is common, and clarity depends on yeast and process", "Yeast flocculation and settling are normal for many strains; avoid disturbing sediment during transfer if clarity matters.", "Yes; all yeast should remain suspended forever", "It proves the beer is contaminated", "It means the beer has no alcohol"],
        ["You want to reuse yeast from a previous batch. What should you consider?", "Sanitary handling, yeast health, age, and suitability for the next wort", "Repitching depends on viability, contamination risk, generation, and the new beer's requirements.", "Every slurry is safe and identical indefinitely", "Store it in an open container", "Add it directly to boiling wort"],
        ["You plan to add fruit after primary fermentation. What should you consider?", "Use a clean, suitable addition and account for renewed fermentation", "Fruit can introduce fermentable sugars and microbes; sanitation and renewed gravity checks matter.", "Fruit can never ferment", "Bottle immediately after adding fruit", "Add it without measuring the batch"],
        ["You plan to dry-hop after fermentation. What should you consider?", "Limit oxygen pickup and use clean handling practices", "Dry hopping can introduce oxygen and may restart activity; use suitable timing and handling.", "Aerate the beer thoroughly", "Add hops during bottle filling with dirty tools", "Assume gravity cannot change"],
        ["A gravity reading rises slightly after dry hopping. What may explain it?", "Hops can affect sampling and measurement; verify with consistent technique", "Suspended material and sampling conditions can complicate readings; investigate before concluding fermentation restarted or reversed.", "Yeast converted alcohol back into malt", "The beer gained sugar from nowhere", "The hydrometer is measuring keg pressure"],
        ["You see foam or bubbles after adding fermentable fruit. What should you do?", "Keep the vessel safely vented and monitor gravity", "Fruit sugars can restart fermentation and produce gas; do not seal an actively fermenting vessel without rated equipment.", "Seal the vessel tightly without a vent", "Bottle immediately", "Add sanitizer to stop the yeast"],
        ["The fermenter is nearly full and krausen is rising. What is a safer plan for future batches?", "Allow adequate headspace or use an appropriate blow-off setup", "Krausen can overflow; plan vessel capacity and venting for vigorous fermentation.", "Seal the airlock", "Fill above the lid", "Use a non-pressure-rated vessel as a pressure tank"],
        ["A pressure relief valve is venting frequently. What should you check?", "The pressure setting, gas path, and equipment instructions", "Use rated equipment and verify settings and obstructions; never disable a relief valve to retain pressure.", "Block the relief valve", "Heat the vessel", "Ignore vessel ratings"],
        ["You hear a hissing sound from a pressure fermenter. What should you do?", "Check for leaks and follow the equipment's safe pressure procedure", "A leak can affect pressure and sanitation; handle pressurized equipment according to its manufacturer.", "Open it abruptly", "Increase pressure until the sound stops", "Use a flame to find the leak"],
        ["A fermentation temperature sensor fell off the vessel. What is appropriate?", "Reattach it correctly and verify the beer temperature with a reliable method", "A detached probe may read air temperature instead of beer temperature; confirm the actual process conditions.", "Assume the beer stayed exactly on target", "Increase heating to maximum", "Add ice to the fermenter"],
        ["The fermenter was moved during active fermentation. What should you do?", "Keep it sealed, restore suitable conditions, and continue monitoring", "Movement alone does not necessarily harm beer; minimize unnecessary exposure and check progress normally.", "Open it to stir in air", "Bottle it immediately", "Add sanitizer through the airlock"],
        ["A sample smells like rotten eggs during fermentation. What should you consider?", "Some yeast strains produce sulfur compounds that may diminish with conditioning", "Sulfur aromas can be strain-related; assess the beer after fermentation and follow yeast guidance.", "It always proves dangerous contamination", "Add bleach to the batch", "Bottle it before gravity stabilizes"],
        ["A strong solvent aroma persists in finished beer. What should you review for future batches?", "Yeast strain, fermentation temperature, pitching health, and wort gravity", "These factors can influence higher alcohol production and yeast stress.", "Bottle shape and label font", "The fermenter's exterior color", "The length of the mash paddle"],
        ["You have an uncertain fermentation problem and are considering adding a chemical. What should you do?", "Identify the product and use only a suitable, measured treatment with reliable guidance", "Unverified additions can harm beer or create safety issues; never guess with brewing chemicals.", "Add a random sanitizer dose", "Mix cleaning products in the fermenter", "Pour in household chemicals until the aroma changes"],
        ["A sample has a sharp solvent smell, but the fermenter is still active. What should you do?", "Check temperature and yeast guidance, then reassess after fermentation", "Young beer can change during conditioning; avoid premature interventions and review fermentation conditions.", "Bottle it immediately", "Add household cleaner", "Aerate it repeatedly"],
        ["The beer is still cloudy after a short cold crash. What should you do?", "Allow more settling time or use a suitable clarification approach", "Clarification speed varies with yeast, temperature, and process; haze is not automatically a defect.", "Add sanitizer", "Boil it in the fermenter", "Bottle before confirming gravity"],
        ["You notice sediment was disturbed while transferring finished beer. What should you do?", "Minimize further disturbance and avoid splashing", "Some sediment carryover may affect clarity and flavor; careful transfer limits more disturbance and oxygen.", "Stir vigorously to remove it", "Add priming sugar to settle it", "Open the fermenter for several hours"],
        ["A batch's gravity is stable but higher than expected, and the beer tastes sweet. What is a useful diagnostic?", "Review mash fermentability, yeast performance, and gravity measurement", "Recipe and process factors can leave more residual extract; verify readings and compare with expected FG.", "Add sanitizer", "Bottle with no priming sugar immediately", "Assume the hydrometer is an airlock"],
        ["The beer reached a lower-than-expected FG. What should you review?", "Yeast attenuation, mash profile, recipe fermentability, and measurement accuracy", "These factors influence final gravity; compare process notes before changing future recipes.", "The bottle cap color", "The size of the airlock", "The kettle handle material"],
        ["You are planning a warm fermentation but the strain has a narrow temperature range. What should you do?", "Use a suitable temperature-control plan or choose a compatible strain", "Strain selection and temperature management should match the recipe and desired profile.", "Ignore the strain guidance", "Use direct sunlight as a controller", "Pitch the yeast during the boil"],
        ["The beer fermented colder than intended and is slow. What should you avoid?", "Avoid abrupt heating; adjust gradually and monitor progress", "Sudden changes can stress yeast; follow the strain's guidance and use gravity to assess activity.", "Boil the fermenter", "Add unmeasured sugar and bottle", "Open it and shake vigorously"],
        ["You suspect fermentation has stopped because the beer is too cold. What is a careful approach?", "Verify gravity and gradually restore a suitable temperature if appropriate", "Check whether gravity is actually stable, then make a controlled adjustment based on the yeast and recipe.", "Add sanitizer", "Bottle without checking", "Heat it with an open flame"],
        ["A fermenter is leaking around the lid, but gravity is decreasing. What should you conclude?", "Fermentation is progressing; the leak explains why the airlock may be quiet", "Gravity change is useful evidence; improve the seal if possible without unnecessary exposure.", "The batch is definitely finished", "The yeast is dead", "The wort has not been made"],
        ["There is no airlock movement, no gravity change, and the beer is cold. What first?", "Verify the readings and bring the beer gradually into the yeast's recommended range", "Confirm instrument technique and temperature before diagnosing a stuck fermentation.", "Bottle immediately", "Add boiling water", "Add a random sanitizer"],
        ["There is no airlock movement, but the beer is warm and gravity is falling. What is likely?", "Fermentation is active, with gas escaping somewhere other than the airlock", "A leak can bypass the airlock; gravity decline indicates fermentation activity.", "The yeast has stopped", "The beer is carbonated in bottles", "The batch must be discarded"],
        ["A gravity sample was taken with an unsanitized tool. What should you do next?", "Sanitize future sampling equipment and avoid returning samples", "The sample may have introduced contamination; do not add more risk by returning it.", "Add sanitizer directly to the beer", "Boil the fermenter contents", "Bottle immediately"],
        ["A strong yeasty flavor is present in a young beer. What may help?", "Allow settling and conditioning time, then transfer carefully if appropriate", "Suspended yeast can contribute flavor; time and careful handling may improve the finished beer.", "Add more yeast", "Aerate it after fermentation", "Bottle before gravity is stable"],
        ["The beer has a medicinal flavor and you used chlorinated tap water. What should you investigate?", "Water treatment and chlorine or chloramine removal", "Disinfectants can contribute medicinal off-flavors; verify water treatment for future batches.", "Mash paddle length", "Bottle headspace only", "The yeast packet color"],
        ["A finished beer has a cardboard-like flavor. What is a likely process area to review?", "Oxygen exposure during transfer and packaging", "Oxidation is a common cause of papery or stale flavors; reduce oxygen pickup after fermentation.", "Mash temperature only", "Kettle size only", "The amount of calcium only"],
        ["Beer foams excessively when poured from a keg. What should you check?", "Serving pressure, beer temperature, line setup, and carbonation", "Keg balance and temperature influence pour behavior; check system setup before changing the beer.", "Mash pH only", "Original gravity only", "Bottle priming sugar"],
        ["Beer pours flat from a keg even though the CO₂ cylinder is open. What should you check?", "Gas connections, leaks, regulator setting, and time at temperature", "A leak or insufficient carbonation time can prevent the beer reaching target carbonation.", "The dry-hop schedule only", "The fermenter's airlock", "The grain crush"],
        ["A bottle gushes when opened, but the beer was packaged recently. What is a key concern?", "Possible ongoing fermentation or excessive priming sugar", "Gushing can have several causes; check fermentation completion, priming calculations, and cleanliness.", "The beer's color is too dark", "The mash was stirred too often", "The bottle label is too small"],
        ["Bottles show inconsistent carbonation across a batch. What might you review?", "Priming-sugar mixing, filling consistency, seals, and storage conditions", "Uneven sugar distribution or sealing and temperature differences can cause variable carbonation.", "The original grain crush only", "The hop alpha-acid content", "The fermenter's shape"],
        ["You want to taste a suspicious batch. What is a sensible safety approach?", "Do not taste beer with visible mold or other clear warning signs", "Visible fuzzy growth or concerning contamination signs warrant avoiding consumption and careful disposal.", "Taste a large amount to confirm", "Bottle it under pressure", "Add sanitizer and taste again"],
      ]).slice(0, 65),
    ],
  },
};

function LearningGameFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-3 z-20">
          <BackButton href="/games" />
        </div>
        <div className="absolute right-4 top-3 z-20">
          <MenuOverlay current="games" />
        </div>
        <PageHeading title={title} subtitle={subtitle} />
        {children}
      </div>
    </main>
  );
}

export default function LearningGamePage() {
  const params = useParams<{ game: string }>();
  const game = LEARNING_GAMES[params.game];
  const [attemptQuestions, setAttemptQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  function startGame() {
    const selectedQuestions = shuffle(game.questions).slice(0, 7).map((question) => ({
      ...question,
      answers: shuffle(
        question.answers.length >= 4
          ? question.answers
          : [
              ...question.answers,
              {
                text: "Bottle the beer before fermentation is complete",
                correct: false,
                feedback:
                  "Packaging before fermentation is complete can create excessive pressure. Confirm the process is ready before packaging.",
              },
            ]
      ),
    }));
    setAttemptQuestions(selectedQuestions);
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setFinished(false);
    setStarted(true);
  }

  function chooseAnswer(answerIndex: number) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    if (attemptQuestions[questionIndex].answers[answerIndex].correct) {
      setScore((current) => current + 1);
    }
  }

  function continueGame() {
    if (questionIndex + 1 === attemptQuestions.length) {
      setFinished(true);
      setStarted(false);
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedAnswer(null);
  }

  if (!game) {
    return (
      <LearningGameFrame title="Challenge not found" subtitle="Choose a brewing lesson from the learning hub.">
        <div className="text-center">
          <Link href="/games" className="text-green-200 underline underline-offset-4">
            Browse learning games
          </Link>
        </div>
      </LearningGameFrame>
    );
  }

  const question = attemptQuestions[questionIndex];
  const answeredCorrectly =
    selectedAnswer !== null && question?.answers[selectedAnswer].correct;

  return (
    <LearningGameFrame title={game.title} subtitle={game.subtitle}>
      <section className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6">
        {!started && !finished && (
          <>
            <p className="text-center leading-7 text-white/75">{game.intro}</p>
            <p className="mt-3 text-center text-sm text-white/50">
              {game.questions.length} questions · 7 random questions per attempt
            </p>
            <button
              type="button"
              onClick={startGame}
              className="mt-6 min-h-11 w-full rounded-lg bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
            >
              Start challenge
            </button>
          </>
        )}

        {started && (
          <>
            <div className="flex items-center justify-between gap-4 text-sm text-white/55">
              <span>Question {questionIndex + 1} of {attemptQuestions.length}</span>
              <span aria-live="polite">Score: {score}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-green-400 transition-all"
                style={{ width: `${((questionIndex + 1) / attemptQuestions.length) * 100}%` }}
              />
            </div>
            <h2 className="mt-6 text-center text-lg font-semibold leading-7 text-green-100">
              {question.prompt}
            </h2>
            <div className="mt-5 grid gap-3">
              {question.answers.map((answer, index) => {
                const isSelected = selectedAnswer === index;
                const showCorrect = selectedAnswer !== null && answer.correct;
                return (
                  <button
                    key={answer.text}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={selectedAnswer !== null}
                    onClick={() => chooseAnswer(index)}
                    className={`min-h-12 rounded-lg border px-4 py-3 text-left transition disabled:cursor-default ${
                      showCorrect
                        ? "border-green-300/50 bg-green-900/30 text-green-100"
                        : isSelected
                          ? "border-amber-300/50 bg-amber-900/30 text-amber-100"
                          : "border-white/15 bg-white/5 hover:border-green-300/40 hover:bg-white/10"
                    }`}
                  >
                    {answer.text}
                  </button>
                );
              })}
            </div>
            {selectedAnswer !== null && (
              <div
                role="status"
                className={`mt-5 rounded-lg border p-4 ${
                  answeredCorrectly
                    ? "border-green-300/20 bg-green-950/30"
                    : "border-amber-300/20 bg-amber-950/30"
                }`}
              >
                <p className="font-semibold">
                  {answeredCorrectly ? "That's right." : "Not quite."}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {question.answers[selectedAnswer].feedback}
                </p>
                <button
                  type="button"
                  onClick={continueGame}
                  className="mt-4 min-h-10 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                >
                  {questionIndex + 1 === attemptQuestions.length ? "See your results" : "Next question"}
                </button>
              </div>
            )}
          </>
        )}

        {finished && (
          <div className="text-center">
            <p className="text-2xl font-semibold text-green-200">Challenge complete!</p>
            <p className="mt-3 text-white/75">
              You got {score} out of {attemptQuestions.length} correct.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Try another round to revisit the explanations and strengthen what you learned.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="mt-6 min-h-11 w-full rounded-lg bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
            >
              Play again
            </button>
          </div>
        )}
      </section>
      <div className="mt-5 text-center">
        <Link href="/games" className="text-sm text-white/55 underline underline-offset-4 hover:text-green-200">
          Back to learning challenges
        </Link>
      </div>
    </LearningGameFrame>
  );
}
