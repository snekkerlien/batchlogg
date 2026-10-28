"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { useUnits } from "@/app/components/Units";
import type { UnitSystem } from "@/lib/units";

type Answer = {
  text: string;
  correct: boolean;
  feedback: string;
};

type Question = {
  prompt: string;
  answers: Answer[];
  source?: string;
  hint?: string;
};

type LearningGame = {
  title: string;
  subtitle: string;
  intro: string;
  questions: Question[];
  source: string;
};

type QuestionSeed = [
  prompt: string,
  correctAnswer: string,
  explanation: string,
  wrongAnswerOne: string,
  wrongAnswerTwo: string,
  wrongAnswerThree: string,
  source?: string,
];

type AuthoredQuestionSeed = {
  prompt: string;
  correctAnswer: string;
  explanation: string;
  wrongAnswers: [string, string, string];
  source?: string;
};

type QuestionInput = QuestionSeed | AuthoredQuestionSeed;

type MissedAnswerReview = {
  prompt: string;
  selected: string;
  correctAnswer: string;
  explanation: string;
  source?: string;
};

function SourceCitation({ source }: { source: string }) {
  if (source.startsWith("Wikipedia:")) {
    return (
      <a
        href="https://en.wikipedia.org/wiki/Brewing"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-white/80"
      >
        {source.replace("Wikipedia: ", "Wikipedia — ")}
      </a>
    );
  }
  return <>{source}</>;
}

function mathQuestionHint(prompt: string): string | undefined {
  if (/apparent attenuation/i.test(prompt)) {
    return "Subtract final gravity points from original gravity points, then divide that drop by the original gravity points and multiply by 100.";
  }
  if (/abv|alcohol content/i.test(prompt)) {
    return "A common estimate is (original gravity − final gravity) × 131.25.";
  }
  if (/hydrometer|refractometer|gravity.*temperature/i.test(prompt)) {
    return "Check what the instrument measures and compare the sample temperature with its calibration temperature.";
  }
  if (/dilut|add .*water to .*wort|final volume/i.test(prompt)) {
    return "Convert each gravity to points by subtracting 1.000. Keep gravity-point volume constant: current volume × current points ÷ target points.";
  }
  if (/malt-to-volume ratio|same ratio|scale.*recipe|recipe uses/i.test(prompt)) {
    return "Find the batch-size multiplier: new volume ÷ original volume. Multiply the original ingredient amount by that factor.";
  }
  if (/priming|sugar.*batch|batch.*sugar|dext/i.test(prompt)) {
    return "Find how many times larger the batch is, then multiply the original sugar amount by that same volume ratio.";
  }
  if (/extract|how much.*needed|makes .* gallon|makes .* litre/i.test(prompt)) {
    return "Use the stated extract amount per volume as a rate, then multiply by the batch volume.";
  }
  return undefined;
}

function plainLanguageQuestion(prompt: string): string {
  return prompt;
}

function plainLanguageAnswer(answer: string): string {
  return answer;
}

function hasNumericAnswer(answer: string): boolean {
  return /^\s*-?\d+(?:\.\d+)?(?:\s*[a-z%]+)?\s*$/i.test(answer);
}

function buildQuestions(seeds: QuestionInput[]): Question[] {
  return seeds.map((seed) => {
    const {
      prompt,
      correctAnswer,
      explanation,
      wrongAnswers,
      source,
    } = Array.isArray(seed)
      ? {
          prompt: seed[0],
          correctAnswer: seed[1],
          explanation: seed[2],
          wrongAnswers: [seed[3], seed[4], seed[5]] as [string, string, string],
          source: seed[6],
        }
      : seed;
    const hint = hasNumericAnswer(correctAnswer) ? mathQuestionHint(prompt) : undefined;

    return {
      prompt,
      ...(hint ? { hint } : {}),
      ...(source ? { source } : {}),
      answers: [
        {
          text: correctAnswer,
          correct: true,
          feedback: explanation,
        },
        ...wrongAnswers.map((text) => ({
          text,
          correct: false,
          feedback: `The best answer is: ${correctAnswer}. ${explanation}`,
        })),
      ],
    };
  });
}

function createBrewDayPracticeQuestions(): QuestionSeed[] {
  return [
    ["The mash temperature is stable. What should you do during the rest?", "Keep the mash near its target and allow the planned rest time", "Holding the intended temperature gives mash enzymes time to convert starches.", "Raise it to mash-out temperature before the scheduled rest ends", "Begin lautering before the planned rest is complete", "Add the sparge water and drain it immediately"],
    ["You have finished measuring the mash water. What should you verify before dough-in?", "The water is at the calculated strike temperature", "Strike-water temperature is chosen so the grain and water reach the recipe's mash target.", "It is at the target mash temperature before accounting for the cooler grain", "It is at the planned fermentation temperature", "It is at the sparge temperature rather than the calculated strike temperature"],
    ["The mash contains a few dry pockets after dough-in. What should you do?", "Stir until the grain is evenly wetted and the clumps are broken up", "Even wetting helps prevent dough balls and supports consistent conversion.", "Add more dry grain before breaking up the clumps", "Raise the temperature without mixing the dry pockets", "Begin runoff while some grain remains unwetted"],
    ["The mash is at its target temperature. Why cover the vessel during the rest?", "To help maintain a stable mash temperature", "Insulation or a lid reduces heat loss during the planned rest.", "To keep the mash from contacting any air at all", "To make the mash reach boiling temperature", "To prevent enzymes from converting starch"],
    ["You are checking whether mash conversion has progressed. Which test is commonly used?", "An iodine test on a cooled sample", "Iodine can indicate whether starch remains, though it does not replace gravity or process checks.", "A hydrometer test for finished-beer alcohol", "A pH test to confirm all starch is gone", "A temperature reading to measure dissolved sugar"],
    ["The mash rest is complete and you are ready to drain. What helps start runoff smoothly?", "Open the outlet gradually and establish a steady flow", "A controlled runoff helps avoid disturbing or compacting the grain bed.", "Open the outlet fully and stir the grain bed as wort drains", "Drain the first wort, then add all sparge water at once without mixing", "Keep the outlet closed until the grain bed dries"],
    ["Your lauter tun has a false bottom. What is its purpose?", "Support the grain bed while allowing wort to drain", "The false bottom separates the grain bed from the outlet and supports runoff.", "Measure wort gravity beneath the grain bed", "Keep the mash at its target temperature by heating it", "Prevent sparge water from reaching the grain"],
    ["Runoff has slowed to a trickle. What should you check?", "Whether the grain bed is compacted or the outlet is obstructed", "A compacted bed or blocked outlet can restrict wort flow.", "Whether the grain bed is draining too quickly", "Whether the sparge water is still being heated", "Whether the wort has reached its boil"],
    ["You are collecting first runnings. What are they?", "The initial wort drained from the mash before or during sparging", "First runnings are typically more concentrated than later runoff.", "The wort collected after all sparge water has passed through the grain", "The water added to the grain for the first sparge", "The wort left in the kettle after the boil"],
    ["You are batch sparging. What normally happens after adding sparge water to the grain?", "Stir, allow the bed to settle, then drain the wort", "Mixing helps rinse extract into the water before collecting the runoff.", "Drain the water before it has mixed with the grain", "Keep the outlet open while adding water and stirring", "Add the water only after the grain has been removed"],
    ["You are fly sparging. What helps maintain a consistent rinse?", "Add sparge water gently while collecting runoff at a controlled rate", "Balanced inflow and runoff help rinse the grain bed evenly.", "Add all the sparge water at once, then drain the tun", "Drain the tun completely before beginning the sparge", "Stir the grain bed continuously while collecting runoff"],
    ["Pre-boil gravity is lower than expected. What should you verify first?", "The measured volume and gravity-reading technique", "Volume and measurement accuracy help explain a gravity difference before making adjustments.", "The gravity reading only, without checking sample temperature or calibration", "The kettle's boil-off rate after the boil has started", "The post-fermentation gravity from a previous batch"],
    ["The kettle is nearly full and the wort is heating. What should you watch for?", "Foam and boil-over as the wort approaches a boil", "Wort can foam up at the start of the boil, so remain attentive and manage heat.", "A drop in fermentation gravity", "The mash temperature in the drained grain", "Pressure building in a sealed kettle"],
    ["A recipe calls for a 60-minute hop addition. When do you add it?", "At the point that leaves 60 minutes of boil time", "Hop timing is counted relative to the recipe's specified remaining boil time.", "At the point that leaves 60 minutes after the boil ends", "When 60 minutes have passed since flameout", "At the start of fermentation"],
    ["A recipe includes a kettle fining near the end of the boil. What is its intended use?", "Help coagulate or settle some haze-forming material", "Kettle finings are used according to their instructions to aid hot-break or cold-break settling.", "Add fermentable extract to raise the original gravity", "Provide yeast nutrients for the entire fermentation", "Create carbonation as the wort cools"],
    ["The boil is complete. What is a useful next action?", "Create a whirlpool if the recipe and equipment call for one", "A whirlpool can gather trub and support a planned hop-stand process.", "Begin sparging the spent grain into the boiled wort", "Transfer the wort while it is still boiling into the fermenter", "Add dry hops before the wort has cooled, regardless of the recipe"],
    ["You are using an immersion chiller. What should you do before it contacts wort?", "Clean it and sanitize it according to its use and instructions", "Chillers that contact wort late in the boil need to be clean and sanitized.", "Rinse it without removing any visible residue", "Sanitize it only after it has cooled the wort", "Immerse it in the fermenter after the beer is packaged"],
    ["The wort has reached the intended pitching temperature. What should you do before transferring?", "Use clean, sanitized equipment on the cold side", "After cooling, protect wort from contamination with sanitized beer-contact equipment.", "Rely on hot-side sanitation even though the wort is now cool", "Clean the fermenter after transferring the wort into it", "Add sanitizer directly to the wort instead of sanitizing equipment"],
    ["You are transferring cooled wort to the fermenter. What transfer practice helps yeast?", "Aerate or oxygenate the wort before pitching when the yeast process calls for it", "Many brewing yeasts benefit from oxygen early, before fermentation is established.", "Avoid oxygen before pitching but aerate the beer after fermentation", "Provide oxygen continuously throughout fermentation", "Add oxygen only after the beer is packaged"],
    ["The fermenter is filled with cooled wort. What should happen next?", "Pitch the prepared yeast at a suitable temperature", "Pitching follows cooling and sanitary transfer, using yeast appropriate to the wort.", "Wait until the wort warms above the yeast's recommended range", "Add the yeast before the wort has cooled", "Add more hops instead of the prepared yeast"],
    ["You are using dry yeast. What should guide whether to rehydrate it?", "The yeast manufacturer's instructions", "Dry-yeast handling differs by product, so follow the supplier's directions.", "A generic rehydration temperature used for every yeast product", "The wort's boil-off rate rather than the yeast directions", "The yeast's color or package size alone"],
    ["The recipe calls for yeast nutrient. When is it generally added?", "At the recipe's specified point, often during the boil", "Follow the product and recipe instructions for nutrient amount and timing.", "At any time after the beer has been packaged", "Only during the dry-hop contact period", "Only before the grain is milled"],
    ["You missed the target post-boil volume. What should you record?", "The actual volume and gravity before deciding on a suitable correction", "Both measurements help identify concentration differences and improve the next brew.", "The target volume only, without measuring the actual wort", "The gravity only, without recording the volume", "The fermenter's airlock activity as a substitute for both measurements"],
    ["Trub is visible in the kettle after chilling. What is a reasonable transfer decision?", "Follow the recipe and equipment practice for leaving or transferring trub", "Some trub may be left behind or transferred depending on the process and equipment.", "Transfer all trub regardless of the recipe or equipment", "Add sanitizer to the wort to dissolve the trub", "Return the trub to the mash tun and restart runoff"],
    ["The wort is in the fermenter. Why fit an airlock or suitable vent?", "Allow fermentation gas to escape while limiting outside contamination", "Fermentation produces carbon dioxide, which needs a safe route out of the vessel.", "Seal the fermenter so no gas can escape", "Use the airlock to measure the wort's gravity", "Keep the airlock blocked until fermentation is complete"],
    ["A brew-day measurement differs from the recipe. What is the best recordkeeping practice?", "Write down the actual measurement and the time or process stage", "Clear records make it easier to diagnose and repeat brewing outcomes.", "Record only the recipe's target instead of the measurement", "Change the reading to match the expected value", "Use airlock bubbles as a substitute for recording it"],
    ["You finished lautering but have not started the boil. What is a useful equipment check?", "Confirm kettle volume and that the heat source is ready", "Volume and safe, ready equipment help the boil proceed as planned.", "Check the fermenter's final gravity before fermentation", "Set the serving pressure before the beer is made", "Verify bottle carbonation before the wort is boiled"],
    ["Wort is cooling more slowly than expected. What should you review?", "Chiller flow, wort movement, and the cooling setup", "Checking the cooling equipment and circulation can help improve heat transfer.", "The yeast's flocculation after it has been pitched", "The keg's serving line length", "The amount of priming sugar in the recipe"],
    ["You are ready to clean after lautering. What should happen to the spent grain?", "Remove it from the vessel before cleaning the mash equipment", "Clearing grain residue makes equipment cleaning more effective.", "Add it to the fermenter after the wort has cooled", "Return it to the kettle during the boil", "Use it as a substitute for hops"],
    ["The brew day is complete and the yeast has been pitched. What is the next planned phase?", "Monitor fermentation conditions and record progress", "Once yeast is pitched, track temperature and fermentation progress rather than continuing hot-side steps.", "Continue sparging the fermenting wort", "Raise the fermenter to the mash temperature", "Adjust the hop boil time after packaging"],
  ];
}

function createFermentationPracticeQuestions(): QuestionSeed[] {
  return [
    ["The fermenter is producing a sulfur aroma during active fermentation. What is the best first response?", "Keep conditions within the yeast's range and reassess after fermentation and conditioning", "Some yeast strains produce sulfur compounds that can fade during fermentation or conditioning.", "Transfer the beer off the yeast before gravity has stabilized", "Cold-crash immediately to remove the yeast before it can produce more sulfur", "Add a late hop charge before checking whether the aroma fades"],
    ["A buttery note is present before fermentation has finished. What is the best next step?", "Verify fermentation progress and allow suitable yeast conditioning time", "Yeast can reduce diacetyl during conditioning; follow the strain and recipe guidance.", "Cold-crash before gravity is stable to preserve the current flavor", "Transfer the beer off the yeast as soon as the buttery note appears", "Package on the planned date without checking gravity or flavor"],
    ["A green-apple aroma is present in young beer. What is a sensible first step?", "Allow fermentation to finish and reassess after conditioning", "Acetaldehyde can be present in young beer and may be reduced by yeast as fermentation completes.", "Package while the beer is young so the aroma cannot develop further", "Cold-crash before checking whether fermentation is complete", "Increase oxygen exposure during transfer to help the yeast finish"],
    ["The beer tastes unexpectedly sweet after fermentation. What should you measure?", "Final gravity and, if needed, compare it with the recipe target", "Gravity helps distinguish residual extract from a sensory impression of sweetness.", "The original gravity again without measuring the finished beer", "The fermentation temperature alone", "The remaining yeast amount without checking gravity"],
    ["Gravity is stable but higher than the recipe's expected final gravity. Which set of factors should you review together?", "The yeast strain, mash fermentability, and fermentation conditions", "These factors influence how much extract is fermented and can help explain a high finish.", "Only the yeast's flocculation and whether it settled early", "Only the measured original gravity and the recipe's target gravity", "Only the fermentation temperature, without checking gravity accuracy"],
    ["A beer seems to have stopped fermenting early. What is a useful diagnostic?", "Verify the gravity reading and check temperature and yeast guidance", "Confirming measurements and fermentation conditions is safer than adding ingredients blindly.", "Use the airlock rate alone to decide whether fermentation is stalled", "Raise the temperature sharply before checking the strain's range", "Add fermentable sugar to see whether the yeast responds"],
    ["The yeast has settled before gravity is stable. What should you do first?", "Check gravity and temperature, then decide whether gentle rousing is appropriate", "Confirm the fermentation trend and conditions before disturbing the beer or adding yeast.", "Rouse the yeast immediately without checking the gravity trend", "Cold-crash the beer to settle the remaining yeast", "Add another yeast pitch before checking temperature"],
    ["You suspect a stuck fermentation. What should you check before taking action?", "Gravity trend, beer temperature, and the yeast's expected attenuation", "Measurements and conditions help distinguish a true stall from a slow or nearly complete fermentation.", "The original gravity without checking the current gravity", "The yeast's appearance without checking temperature", "The airlock's bubble rate without taking gravity readings"],
    ["The temperature rises during vigorous fermentation. What is the best explanation?", "Yeast metabolism releases heat, so the beer can run warmer than the surrounding room", "The beer itself may become warmer than the surrounding room during active fermentation.", "The room temperature can only rise if fermentation is producing heat", "Yeast produces most fermentation heat after activity has ended", "A warmer beer reading means the fermenter has reached its final gravity"],
    ["The beer is fermenting at the lower end of the yeast range. What should guide any adjustment?", "The strain's recommended range and the recipe's fermentation profile", "Temperature changes should be gradual and suited to the specific yeast.", "Raise it by a fixed amount whenever the airlock slows, without checking beer temperature", "Use the same fermentation temperature as the previous beer regardless of strain", "Move it to the warmest available location to shorten fermentation"],
    ["Krausen is rising, but the airlock shows no bubbles. What is the best next step?", "Check for a leak or obstruction while keeping a safe vent path", "Krausen suggests activity, but a leak or blocked airlock can make bubbling misleading; maintain safe venting.", "Treat the quiet airlock as evidence that fermentation has stopped", "Seal the fermenter more tightly so pressure builds until bubbles appear", "Remove the airlock and leave the opening uncovered"],
    ["Krausen has fallen and the beer is cloudy. What does that tell you about completion?", "Cloudiness and krausen appearance alone cannot confirm final gravity", "Use gravity readings over time rather than visual signs to assess completion.", "A fallen krausen usually confirms fermentation is finished if the recipe timeline has passed", "Cloudiness means the beer has not reached its expected final gravity", "Wait the recipe's stated number of days and package without checking gravity"],
    ["A standard non-pressure-rated fermenter is bulging or appears pressurized. What should you do?", "Safely restore an unobstructed gas-release path without sealing the vessel", "A standard fermentation vessel needs a safe vent; trapped gas can create dangerous pressure.", "Move the vessel and continue monitoring without checking the vent", "Treat the bulging as normal krausen pressure and wait for it to subside", "Use a pressure-relief setting intended for a different vessel"],
    ["The airlock liquid has been sucked back into the fermenter after cooling. What should you consider?", "Avoid contamination and replace the airlock liquid using clean, suitable practice", "Temperature changes can draw airlock liquid inward; handle the airlock hygienically.", "Add replacement liquid with an unclean utensil", "Leave the airlock empty and uncovered", "Open the fermenter to stir the airlock liquid through the beer"],
    ["Why should a gravity sample not be poured back into the fermenter?", "It can carry microbes from the sample, instrument, or handling back into the beer", "Discarding the sample avoids reintroducing contaminants after measurement or tasting.", "The sample contains no yeast after it has been measured", "The sample's lower volume would change the batch gravity", "A sample can be returned safely if it looks and smells normal"],
    ["A hydrometer reading varies unexpectedly between samples. Which check addresses the broadest sources of variation?", "Use consistent sampling, temperature correction, calibration, and meniscus reading", "Consistent technique and temperature correction help make gravity comparisons reliable.", "Check sample temperature but assume the instrument is correctly calibrated", "Check calibration but ignore bubbles and reading technique", "Use a different sample without controlling its temperature"],
    ["A refractometer reading changes after fermentation begins. What correction is needed?", "Account for alcohol using the original reading and an appropriate correction", "Alcohol changes refractive index, so an uncorrected post-fermentation reading is misleading.", "Use the original refractometer reading alone as the final gravity", "Use a hydrometer correction formula without accounting for alcohol", "Treat the refractometer reading as a direct ABV measurement"],
    ["The gravity reading is stable across appropriate checks. What should you still consider before packaging?", "Whether the beer has had adequate time to finish and condition", "Stable gravity is a key check, but yeast may need time to complete cleanup and conditioning.", "Whether the beer has been cold-crashed, regardless of the recipe", "Whether yeast has completely disappeared from the beer", "Whether the beer has reached the recipe's exact expected gravity"],
    ["A beer develops an unexpected pellicle or fuzzy growth. What is a careful response?", "Avoid tasting it and assess the contamination safely", "Visible growth can indicate contamination; do not taste beer with clear warning signs.", "Remove the growth and assume the beer is safe without further assessment", "Bottle it before checking whether the growth returns", "Stir the surface growth into the beer to hide it"],
    ["You notice a vinegar-like aroma in a fermenter. What should you investigate?", "Possible oxygen exposure or microbial contamination", "Acetic acidity can be associated with oxygen and certain microbial activity; inspect the process.", "Whether the beer was fermented too cold", "Whether the yeast has flocculated too quickly", "Whether the mash temperature was slightly low"],
    ["A solvent-like flavor is stronger than expected. Which fermentation factor should you review?", "Fermentation temperature and yeast stress", "Warm or stressful fermentation can increase harsh higher alcohol character.", "Whether the yeast was pitched at an appropriate rate", "Whether the wort gravity was unusually high", "Whether the strain was fermented within its recommended range"],
    ["A beer has a medicinal or plastic-like character. What process input is worth checking?", "Chlorine or chloramine in brewing water and sanitation practice", "Chlorine compounds can contribute medicinal phenolic flavors when they react with beer compounds.", "Whether the beer was exposed to oxygen after fermentation", "Whether fermentation temperature was higher than planned", "Whether the yeast strain is known for clove-like phenols"],
    ["Fermentation is active and the airlock is bubbling. Should you open the vessel to smell it?", "Avoid unnecessary opening and use measurements to monitor progress", "Opening the fermenter can introduce contamination or oxygen; airlock activity alone is not a diagnosis.", "Open it to smell the beer whenever the bubble rate changes", "Use aroma alone instead of checking gravity or temperature", "Open it and stir in air to confirm fermentation is active"],
    ["The beer is fermenting more slowly than a previous batch. What should you compare?", "Yeast type, amount of yeast added, wort strength, and temperature", "These factors can all affect fermentation pace; compare them before intervening.", "Airlock bubbling rate alone", "Elapsed time alone without comparing gravity readings", "Room temperature alone without checking the beer temperature"],
    ["The yeast package was stored warm before pitching. What is a useful concern?", "Viability may be reduced; check package handling and fermentation progress", "Storage affects yeast viability, so assess the product and monitor rather than assuming a healthy pitch.", "The yeast's recommended range has necessarily increased", "The beer's gravity has already reached its final value", "The yeast will always ferment more vigorously after warm storage"],
    ["A high-gravity wort is fermenting slowly. What yeast-related factor matters?", "Whether the pitch and strain are suitable for the wort's gravity", "High-gravity wort can place greater demands on yeast; pitch rate and strain suitability matter.", "Whether the pitch rate accounts for the higher wort gravity", "Whether the yeast strain tolerates the planned alcohol level", "Whether fermentation temperature is within the strain's range"],
    ["The fermenter is exposed to strong light. What is a better storage condition?", "Keep it shaded and at a stable, yeast-appropriate temperature", "Light protection and stable temperature help protect the beer during fermentation.", "Keep it under strong light but lower its temperature", "Move it to a warmer location to offset light exposure", "Change the mash temperature after fermentation has begun"],
    ["A foam blow-off tube is bubbling actively. What should you ensure?", "The tube remains clear and drains into a clean, suitable vessel", "A clear blow-off path lets foam and gas escape safely during vigorous fermentation.", "Clamp the tube to keep krausen inside the fermenter", "Allow the receiving vessel to fill until it blocks the tube", "Remove the tube and seal the fermenter while it is active"],
    ["The beer is finished fermenting and you will bottle-condition it. What is important?", "Calculate priming sugar for the beer volume and carbonation target", "Appropriate priming avoids under-carbonation and excessive bottle pressure.", "Use the same unmeasured priming amount for every batch", "Calculate the sugar from original gravity alone without using beer volume", "Add priming sugar before confirming fermentation is complete"],
    ["Fermentation is complete but the beer is hazy. What can help with clarity?", "Allow settling or use an appropriate clarification and cold-conditioning process", "Yeast and other particles may settle with time or suitable clarification; clarity does not establish fermentation completion.", "Agitate the beer to keep particles suspended before packaging", "Transfer the beer immediately without allowing particles to settle", "Add an unmeasured dose of finings without following product directions"],
  ];
}

function createRecipePracticeQuestions(): QuestionSeed[] {
  const decisions: QuestionSeed[] = [
    ["You want a pale color and clean malt profile. Which base should dominate the grain bill?", "Use pale base malt for most of the extract and keep colored specialty malts restrained", "A pale base malt supplies most of the extract while a modest specialty-malt share preserves a light, clean profile.", "Use pale malt with a larger share of Vienna malt for a richer bread-like profile", "Use pale malt with a measured crystal-malt addition for more caramel character", "Use pale malt with a small roasted-malt addition for a hint of roast"],
    ["You want a restrained caramel note in the malt profile. Which specialty malt should you use sparingly?", "Crystal malt", "A measured amount of crystal malt can add caramel-like flavor and color.", "Light Munich malt for a bready malt note", "Carapils or dextrin malt for foam and body", "A small amount of toasted malt for a biscuit-like note"],
    ["You want a smooth roast character rather than sharp roast bitterness. Which malt choice fits?", "A restrained amount of a smooth-roasting dark malt", "A carefully chosen dark malt and modest proportion can add roast without overwhelming the beer.", "A small amount of dehusked roasted malt for softer roast character", "A modest portion of chocolate malt for cocoa and roast notes", "A larger share of black patent malt for a sharper, more assertive roast"],
    ["You want stronger biscuit-like malt flavor. Which grain-bill change is most direct?", "Add a measured portion of biscuit or toasted malt", "Biscuit and toasted malts contribute bread-like, toasty flavors.", "Increase light Munich malt for a rounder, bread-like malt character", "Increase crystal malt for more caramel sweetness", "Add a small amount of roasted malt for a darker toast character"],
    ["You want more fermentable extract without changing the beer's color much. Which adjustment fits?", "Increase the pale base malt while recalculating the batch gravity", "Pale base malt adds fermentable extract with less color impact than dark specialty malts.", "Increase pale malt and reduce the batch volume to concentrate the wort", "Replace some pale malt with light crystal malt for additional extract and color", "Increase the malt bill but keep the same water volume and final batch size"],
    ["You want a fuller body and a sweeter finish. Which mash profile is a sensible starting point?", "Mash toward the warmer end of the recipe's suitable range", "A warmer mash often leaves more dextrins, which can contribute body and sweetness.", "Mash toward the cooler end and rely on a highly attenuative yeast", "Keep the mash temperature and increase the proportion of highly fermentable base malt", "Mash warmer but use a highly attenuative yeast to offset the fuller wort"],
    ["You want a drier finish without changing the recipe's target gravity. What is a useful first adjustment?", "Mash toward the cooler end of a suitable range", "A cooler mash often produces more fermentable wort and can support a drier finish.", "Mash warmer to leave more dextrins in the wort", "Keep the mash profile and choose a lower-attenuation yeast", "Increase crystal malt while keeping the same mash profile"],
    ["You want more body without adding a strong flavor. Which ingredient could help in a restrained amount?", "Dextrin malt", "Dextrin malt is commonly used to add body and foam support with limited strong flavor.", "Light wheat malt for protein and foam support", "Light Munich malt for a more noticeable bready flavor", "A more attenuative yeast strain for a drier finish"],
    ["You want a stronger citrus hop aroma with moderate bitterness. Which timing is a good fit?", "Use late-boil or whirlpool additions of an aroma-forward hop", "Later additions emphasize volatile hop flavor and aroma while generally adding less bitterness than a long boil.", "Move the same hop charge earlier to increase bitterness and reduce retained aroma", "Use a larger whirlpool addition at a controlled temperature for more aroma and some bitterness", "Keep the hop amounts but move the late addition to dry hopping"],
    ["You want more bitterness while keeping the late-hop aroma unchanged. What should you adjust?", "Increase the calculated early-boil bittering addition", "An appropriately sized early addition contributes bitterness; keep the aroma additions as planned.", "Use a higher-alpha hop at the same early-boil timing and recalculate the amount", "Move some of the late addition earlier while keeping the total hop mass constant", "Increase the late-hop amount and leave the bittering addition unchanged"],
    ["You want hop aroma but minimal additional bitterness. Which change is most suitable?", "Increase a suitable dry-hop addition", "Dry hopping extracts hop aroma and flavor without a long boil.", "Increase a whirlpool addition while keeping its temperature and contact time controlled", "Move the aroma addition to a short late-boil addition", "Increase the early bittering addition while reducing late hops"],
    ["You want a softer bitterness while preserving late-hop character. What should you review?", "Reduce or adjust the early bittering addition", "The early addition contributes much of the bitterness; late additions can be retained for aroma and flavor.", "Use a lower-alpha hop for the early addition and recalculate its amount", "Move some of the early charge later while accounting for the changed bitterness", "Reduce the late-hop charge and leave the bittering schedule unchanged"],
    ["You want a fruit-forward fermentation profile. Which yeast selection is most relevant?", "Choose a strain known for producing suitable fruity esters", "Yeast strain and fermentation conditions influence ester production; choose a profile suited to the beer.", "Choose a relatively neutral strain and emphasize fruit character with suitable hops", "Choose a phenolic strain for a more spice-forward profile", "Choose a strain with a suitable ester profile but ferment it at the cool end of its range"],
    ["You want a clean, restrained yeast profile so hops remain prominent. What should guide yeast choice?", "Select a compatible strain with a relatively neutral profile", "A neutral strain can let malt and hop character stand out when fermented appropriately.", "Select a compatible strain with moderate esters for a more expressive fermentation", "Select a phenolic strain to add clove and spice alongside the hops", "Select a neutral strain but ferment it outside its recommended range"],
    ["You want a clove-like note typical of some wheat beers. What yeast character should you seek?", "A suitable phenolic wheat-beer yeast", "Some wheat-beer strains produce clove-like phenols as part of their characteristic profile.", "A wheat-beer strain known mainly for banana-like esters", "A clean, neutral wheat strain for a restrained yeast character", "A strain with a strong sulfur profile rather than clove-like phenols"],
    ["You are increasing a recipe from 20 L to 30 L. What is the best starting approach?", "Scale ingredient amounts by 1.5, then review gravity, bitterness, and system losses", "The volume ratio is 30 ÷ 20 = 1.5; efficiency, hop utilization, and equipment losses may still change the result.", "Scale only the fermentables and keep the hop schedule unchanged", "Use a factor of 0.67 because the original batch is smaller", "Scale every amount by 1.5 and assume the original gravity and bitterness will match exactly"],
    ["Your recipe estimate is below its target original gravity at the planned volume. Which change directly raises extract?", "Increase fermentable malt or extract and recalculate the recipe", "More fermentable ingredient increases extract; account for batch volume and system efficiency.", "Reduce the batch volume while keeping the fermentable amount fixed", "Improve expected mash efficiency and update the gravity estimate", "Add specialty malt with a lower extract potential and recalculate the grain bill"],
    ["You want a lighter color without changing hop character. What should you change first?", "Use a paler malt bill and reduce dark specialty malts", "The grain bill largely determines wort color, so choose malts that fit the intended shade.", "Replace a portion of dark crystal malt with a lighter crystal malt", "Reduce the amount of roasted malt while keeping the hop schedule fixed", "Use a lighter base malt but retain the same proportion of dark specialty malt"],
    ["You want a more stable foam without adding much malt flavor. Which grain choice is a sensible starting point?", "A modest amount of dextrin malt", "Dextrin malt can support foam and body while contributing relatively little strong flavor.", "A modest amount of wheat malt for protein and a light grain character", "A larger share of crystal malt for body and caramel notes", "A restrained amount of roasted malt for body and roast character"],
    ["You want a crisp, dry finish in a lager. Which yeast trait is useful?", "Choose a lager strain with attenuation suited to a crisp, dry finish", "A strain with suitable attenuation can consume enough fermentable extract to support the intended finish.", "Choose a lager strain with lower attenuation to retain more body", "Choose a strain with suitable attenuation but a more expressive ester profile", "Choose a highly flocculent strain without checking its attenuation"],
    ["You want a rich, bready malt note without adding caramel sweetness. Which malt is the most direct choice?", "Use a suitable Munich-style malt in a balanced proportion", "Munich-style malt can contribute rich bready malt character without relying on crystal sweetness.", "Use Vienna malt for a lighter, more toasted malt character", "Use light crystal malt for a mild caramel note", "Use biscuit malt for a drier, cracker-like impression"],
    ["You want less astringency from a grain bill with husked malt. What process choice helps?", "Avoid excessively hot, high-pH sparging", "Careful sparge temperature and pH help limit extraction of harsh husk compounds.", "Keep sparge pH controlled but extend runoff to a very low final gravity", "Use a finer crush while maintaining the same sparge conditions", "Use cooler sparge water but allow runoff pH to rise unchecked"],
  ];
  const contexts = [
    (question: string) => question,
    (question: string) => `While refining your recipe, ${question.charAt(0).toLowerCase()}${question.slice(1)}`,
    (question: string) => `For your next batch, ${question.charAt(0).toLowerCase()}${question.slice(1)}`,
    (question: string) => `As you plan the recipe, ${question.charAt(0).toLowerCase()}${question.slice(1)}`,
  ];

  return decisions.flatMap((seed): QuestionSeed[] =>
    contexts.map((format): QuestionSeed => [
      format(seed[0]),
      seed[1],
      seed[2],
      seed[3],
      seed[4],
      seed[5],
    ]),
  );
}

function createMathPracticeQuestions(system: UnitSystem): QuestionSeed[] {
  const metric = system === "metric";
  const volumeUnit = metric ? "L" : "gal";
  const massUnit = metric ? "kg" : "lb";
  const questions: QuestionSeed[] = [
    [
      "How can original- and final-gravity readings be used to estimate alcohol content?",
      "Use their gravity difference in an approximate ABV formula",
      "The OG-to-FG drop gives a homebrew ABV estimate; it is approximate rather than a laboratory measurement.",
      "Use the final gravity alone and apply a fixed conversion factor",
      "Divide the original gravity points by the final gravity points",
      "Treat the gravity-point drop as the ABV percentage without a conversion factor",
    ],
    metric
      ? [
          "A label estimates 0.45 kg of dry malt extract per litre at a target strength. How much is needed for 5 L?",
          "2.25 kg",
          "Scale 0.45 kg per litre by 5 L: 0.45 × 5 = 2.25 kg.",
          "1.8 kg",
          "2.7 kg",
          "4.5 kg",
        ]
      : [
          "A label estimates 1 lb of dry malt extract per gallon at a target strength. How much is needed for 5 gal?",
          "5 lb",
          "Scale 1 lb per gallon by 5 gal: 1 × 5 = 5 lb.",
          "4 lb",
          "6 lb",
          "10 lb",
        ],
    metric
      ? [
              "You have 10 L of wort at 1.048 and dilute it to 1.040. What final volume is needed?",
              "12 L",
              "Gravity-point volume is conserved during dilution. Divide 10 × 48 by the 40 target points per litre to get 12 L.",
              "11 L",
              "13 L",
              "14 L",
        ]
      : [
              "You have 4 gal of wort at 1.048 and dilute it to 1.040. What final volume is needed?",
              "4.8 gal",
              "Gravity-point volume is conserved during dilution. Divide 4 × 48 by the 40 target points per gallon to get 4.8 gal.",
              "4.3 gal",
              "5.3 gal",
              "5.8 gal",
        ],
    metric
      ? [
          "A priming example uses 100 g of sugar for 20 L. How much scales to 40 L at the same carbonation target?",
          "200 g",
          "The batch volume doubles, so double the example amount: 100 × 2 = 200 g.",
          "100 g",
          "150 g",
          "400 g",
        ]
      : [
          "A priming example uses 4 oz of sugar for 5 gal. How much scales to 10 gal at the same carbonation target?",
          "8 oz",
          "The batch volume doubles, so double the example amount: 4 × 2 = 8 oz.",
          "4 oz",
          "6 oz",
          "16 oz",
        ],
    [
      "Wort at 1.040 ferments to 1.010. What is its apparent attenuation?",
      "75%",
      "The gravity drop is 30 points from 40 original points: 30 ÷ 40 × 100 = 75%.",
      "30%",
      "40%",
      "90%",
    ],
    metric
      ? [
          "A 20 L recipe uses 4 kg of malt. How much keeps the same ratio at 30 L?",
          "6 kg",
          "Scale by 30 ÷ 20 = 1.5; 4 × 1.5 = 6 kg.",
          "5 kg",
          "7.5 kg",
          "12 kg",
        ]
      : [
          "A 5 gal recipe uses 10 lb of malt. How much keeps the same ratio at 7.5 gal?",
          "15 lb",
          "Scale by 7.5 ÷ 5 = 1.5; 10 × 1.5 = 15 lb.",
          "12.5 lb",
          "17.5 lb",
          "20 lb",
        ],
    metric
      ? [
          "You add 4 L of water to 20 L of wort at 1.060. What is the approximate new gravity?",
          "1.050",
          "Dilution gives 60 × 20 ÷ 24 = 50 points, or approximately 1.050.",
          "1.045",
          "1.055",
          "1.060",
        ]
      : [
          "You add 1 gal of water to 5 gal of wort at 1.060. What is the approximate new gravity?",
          "1.050",
          "Dilution gives 60 × 5 ÷ 6 = 50 points, or approximately 1.050.",
          "1.045",
          "1.055",
          "1.060",
        ],
    [
      "A hydrometer is calibrated to a reference temperature. Why may its reading need a correction?",
      "The sample temperature can affect its density reading",
      "A correction accounts for the hydrometer's calibration temperature when the sample is warmer or cooler.",
      "It treats every sample temperature as if it matched the calibration temperature",
      "It corrects for alcohol's effect on a refractometer",
      "It converts gravity points into bitterness units",
    ],
  ];
  const formatGravity = (points: number) => `1.${String(1000 + points).slice(1)}`;
  const formatNumber = (value: number) => Number(value.toFixed(1));

  for (let index = 1; index <= 23; index += 1) {
    const volume = metric ? 10 + index : 3 + index;
    const startingPoints = 60;
    const targetPoints = 50;
    const finalVolume = formatNumber((volume * startingPoints) / targetPoints);
    questions.push([
      `You have ${volume} ${volumeUnit} of wort at 1.060 and dilute it to 1.050. What final volume is needed?`,
      `${finalVolume} ${volumeUnit}`,
      `Gravity-point volume is conserved during dilution. Divide ${volume} × 60 by 50 target points per ${volumeUnit} to get ${finalVolume} ${volumeUnit}.`,
      `${formatNumber(finalVolume - 2)} ${volumeUnit}`,
      `${formatNumber(finalVolume + 1)} ${volumeUnit}`,
      `${formatNumber(finalVolume + 2)} ${volumeUnit}`,
    ]);

    const water = index + 2;
    const resultingPoints = Math.round((startingPoints * volume) / (volume + water));
    questions.push([
      `You add ${water} ${volumeUnit} of water to ${volume} ${volumeUnit} of wort at 1.060. What is the approximate new gravity?`,
      formatGravity(resultingPoints),
      `Dilution gives 60 × ${volume} ÷ (${volume} + ${water}) = ${resultingPoints} points, or approximately ${formatGravity(resultingPoints)}.`,
      formatGravity(resultingPoints + 3),
      formatGravity(resultingPoints - 3),
      "1.060",
    ]);

    const baseVolume = metric ? 10 + index : 3 + index;
    const targetVolume = baseVolume + (metric ? 5 : 1.5);
    const baseMalt = metric ? 3 + (index % 4) : 6 + (index % 5);
    const scaledMalt = Number(((baseMalt * targetVolume) / baseVolume).toFixed(2));
    questions.push([
      `A ${baseVolume} ${volumeUnit} recipe uses ${baseMalt} ${massUnit} of malt. How much keeps the same malt-to-volume ratio at ${targetVolume} ${volumeUnit}?`,
      `${scaledMalt} ${massUnit}`,
      `Scale by ${targetVolume} ÷ ${baseVolume}: ${baseMalt} × ${targetVolume} ÷ ${baseVolume} = ${scaledMalt} ${massUnit}.`,
      `${Number((scaledMalt - 1).toFixed(2))} ${massUnit}`,
      `${Number((scaledMalt + 1).toFixed(2))} ${massUnit}`,
      `${Number((scaledMalt + 2).toFixed(2))} ${massUnit}`,
    ]);

    const originalPoints = 40 + index;
    const fermentedPoints = 20 + (index % 5) * 2;
    const finalPoints = originalPoints - fermentedPoints;
    const attenuation = Number(((fermentedPoints / originalPoints) * 100).toFixed(1));
    questions.push([
      `Wort starts at ${formatGravity(originalPoints)} and finishes at ${formatGravity(finalPoints)}. What is the apparent attenuation?`,
      `${attenuation}%`,
      `The gravity drop is ${originalPoints} - ${finalPoints} = ${fermentedPoints} points. ${fermentedPoints} ÷ ${originalPoints} × 100 = ${attenuation}%.`,
      `${Number((attenuation - 10).toFixed(1))}%`,
      `${Number((attenuation + 10).toFixed(1))}%`,
      `${finalPoints}%`,
    ]);
  }
  return questions;
}

function createFlavorPracticeQuestions(): QuestionSeed[] {
  const profiles: Array<{
    compound: string;
    explanation: string;
    clues: string[];
    alternatives: [string, string, string];
  }> = [
    {
      compound: "Diacetyl",
      explanation: "Diacetyl is associated with buttery or butterscotch-like flavor; yeast can reduce it during conditioning.",
      clues: ["a buttery aroma", "a butterscotch-like finish", "a slick, butter-like palate impression", "a buttered-popcorn note", "a creamy butterscotch character", "a lingering buttery flavor"],
      alternatives: ["Acetaldehyde", "Ethyl acetate", "Dimethyl sulfide (DMS)"],
    },
    {
      compound: "Acetaldehyde",
      explanation: "Acetaldehyde is commonly associated with green-apple notes and can be reduced by yeast as fermentation finishes.",
      clues: ["a fresh green-apple aroma", "a cut-apple flavor", "a green fruit note in young beer", "a raw apple-like finish", "a sharp green-apple character", "an apple-skin aroma before conditioning"],
      alternatives: ["Diacetyl", "Ethyl acetate", "Oxidation"],
    },
    {
      compound: "Dimethyl sulfide (DMS)",
      explanation: "DMS is often described as cooked corn or cabbage and can be influenced by wort production and cooling.",
      clues: ["a cooked-corn aroma", "a sweet canned-corn note", "a cooked vegetable character", "a cabbage-like sulfur note", "a creamed-corn flavor", "a cooked sweetcorn finish"],
      alternatives: ["Hydrogen sulfide", "Sulfur dioxide", "Acetaldehyde"],
    },
    {
      compound: "Hydrogen sulfide",
      explanation: "Hydrogen sulfide is associated with rotten-egg aromas and may diminish during fermentation or conditioning.",
      clues: ["a rotten-egg smell", "an egg-like sulfur aroma", "a distinct hydrogen-sulfide odor", "a lingering eggy note", "a rotten-egg character during fermentation", "an egg-like aroma in a young beer"],
      alternatives: ["Dimethyl sulfide (DMS)", "Sulfur dioxide", "Acetaldehyde"],
    },
    {
      compound: "Fusel alcohols",
      explanation: "Elevated fusel alcohols can produce hot, harsh, or solvent-like aromas and flavors.",
      clues: ["a hot solvent-like aroma", "a harsh nail-polish-remover note", "a warming, spirit-like harshness", "a sharp alcoholic burn", "a solvent-like finish", "an overly hot alcoholic aroma"],
      alternatives: ["Ethyl acetate", "Acetaldehyde", "Diacetyl"],
    },
    {
      compound: "Isoamyl acetate",
      explanation: "Isoamyl acetate is a fruity ester commonly associated with banana-like aroma, especially in some wheat beers.",
      clues: ["a banana aroma", "a ripe banana flavor", "a banana-like ester note", "a sweet banana character", "a banana-and-pear fruit note", "a bubblegum-like banana aroma"],
      alternatives: ["4-vinyl guaiacol", "Ethyl acetate", "Acetaldehyde"],
    },
    {
      compound: "4-vinyl guaiacol",
      explanation: "4-vinyl guaiacol is a yeast-derived phenol associated with clove-like spice in some wheat beers.",
      clues: ["a clove-like aroma", "a spicy clove flavor", "a medicinal clove note", "a clove-and-spice character", "a peppery, clove-like finish", "a familiar wheat-beer clove aroma"],
      alternatives: ["Isoamyl acetate", "Chlorophenols", "Sulfur dioxide"],
    },
    {
      compound: "Oxidation",
      explanation: "Oxygen exposure during packaging or storage can lead to stale, papery, or cardboard-like notes.",
      clues: ["a papery, stale flavor", "a cardboard-like aroma", "a muted, stale malt character", "a paper-like finish in an older beer", "a dull, oxidized flavor", "a stale cardboard note after storage"],
      alternatives: ["Light-struck character", "Acetaldehyde", "Dimethyl sulfide (DMS)"],
    },
    {
      compound: "Light-struck hop compounds",
      explanation: "Light can react with hop-derived compounds to create a skunky, light-struck character.",
      clues: ["a skunky aroma after light exposure", "a light-struck beer smell", "a skunk-like note in a clear bottle", "a pungent aroma from a sunlit beer", "a skunky flavor in a beer exposed to light", "a light-struck character after bright storage"],
      alternatives: ["Oxidation", "Dimethyl sulfide (DMS)", "Hydrogen sulfide"],
    },
    {
      compound: "Ethyl acetate",
      explanation: "Ethyl acetate can contribute fruity notes at low levels and solvent-like character when excessive.",
      clues: ["a fruity aroma that turns solvent-like", "a pear-like note with a sharp edge", "a nail-polish-like ester aroma", "a fruity solvent character", "a sweet fruit note with solvent harshness", "a sharp ester-like aroma"],
      alternatives: ["Isoamyl acetate", "Fusel alcohols", "Acetaldehyde"],
    },
    {
      compound: "Chlorophenols",
      explanation: "Chlorophenols can create medicinal, plastic-like, or adhesive-bandage notes, sometimes from chlorine reacting with phenols.",
      clues: ["a medicinal, bandage-like aroma", "a plastic-like phenolic flavor", "an adhesive-bandage character", "a medicinal note in the finish", "a plastic or antiseptic aroma", "a harsh medicinal phenol character"],
      alternatives: ["4-vinyl guaiacol", "Fusel alcohols", "Oxidation"],
    },
    {
      compound: "Sulfur dioxide",
      explanation: "Sulfur dioxide may smell like struck matches or burnt sulfur and is distinct from rotten-egg hydrogen sulfide.",
      clues: ["a struck-match aroma", "a burnt-match sulfur note", "a sharp matchstick smell", "a burnt-sulfur character", "a match-like aroma above the glass", "a sharp struck-match finish"],
      alternatives: ["Hydrogen sulfide", "Dimethyl sulfide (DMS)", "Acetaldehyde"],
    },
    {
      compound: "Hop-derived citrus oils",
      explanation: "Citrus-like hop aroma can come from hop oils and varies by variety and handling.",
      clues: ["a grapefruit-like hop aroma", "a lemony hop nose", "a fresh orange-peel note", "a citrus zest aroma from late hops", "a bright citrus hop character", "a grapefruit-and-lemon aroma"],
      alternatives: ["Fruity yeast esters", "Hop-derived pine oils", "Diacetyl"],
    },
    {
      compound: "Roasted malt compounds",
      explanation: "Roasted malts can contribute coffee-like, cocoa-like, and dark toast flavors to beer.",
      clues: ["a coffee-like malt aroma", "a dark cocoa flavor", "a roasted coffee finish", "a toasted dark-malt note", "a roast-and-chocolate character", "a coffee and cocoa aroma"],
      alternatives: ["Hop-derived citrus oils", "Fruity yeast esters", "Diacetyl"],
    },
    {
      compound: "Lactic acidity",
      explanation: "Lactic acid contributes a clean, yogurt-like or tart acidity in intentionally sour beer styles.",
      clues: ["a clean, yogurt-like tartness", "a lactic sourness", "a gentle, yogurt-like acidity", "a bright sour-beer tang", "a clean tart finish", "a lactic, dairy-like sour note"],
      alternatives: ["Acetic acidity", "Diacetyl", "Acetaldehyde"],
    },
  ];

  return profiles.flatMap(({ compound, explanation, clues, alternatives }) =>
    clues.map((clue): QuestionSeed => [
      `A tasting note describes ${clue}. Which flavor source best matches?`,
      compound,
      explanation,
      ...alternatives,
    ]),
  );
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function questionPromptKey(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
}

function uniqueQuestionsByPrompt(questions: Question[]): Question[] {
  const seenPrompts = new Set<string>();
  return questions.filter((question) => {
    const promptKey = questionPromptKey(question.prompt);
    if (seenPrompts.has(promptKey)) return false;
    seenPrompts.add(promptKey);
    return true;
  });
}

const LEARNING_GAMES: Record<string, LearningGame> = {
  "brew-basics": {
    title: "Brew Basics",
    subtitle: "Build your brewing know-how, one question at a time.",
    intro: "Answer seven random questions from a 100-question pool. Choices are shuffled on every attempt, and explanations reveal the brewing behind each answer.",
    source: "How to Brew, Chapters 1–11",
    questions: buildQuestions([
      ["What is wort?", "The sweet liquid extracted from malt before fermentation", "Wort is the sugar-rich liquid made during mashing and collected before yeast ferments it.", "The liquid collected after fermentation but before conditioning", "The grain bed after most of its soluble extract has been rinsed away", "The sparge water before it has passed through the grain"],
      ["What does brewing yeast do during fermentation?", "Converts fermentable sugars into alcohol and carbon dioxide", "Yeast consumes fermentable sugars and produces alcohol, carbon dioxide, and flavor compounds.", "Converts fermentable sugars mainly into carbon dioxide and organic acids", "Produces alcohol and water, with little carbon dioxide", "Converts most sugars into glycerol and flavor compounds rather than alcohol"],
      ["Why is crushed malt mixed with warm water during the mash?", "To let malt enzymes convert starches into sugars", "The mash gives malt enzymes suitable conditions to convert starch into sugars that yeast can use.", "To dissolve sugars already present in the grain without enzyme activity", "To extract color and flavor from the malt after starch conversion", "To prepare the grain for rinsing before the mash enzymes have acted"],
      ["What is the main purpose of milling malt before brewing?", "Crack the grain so water can reach its starchy interior", "A suitable crush exposes the grain interior while retaining husks that help form a filter bed.", "Crush the kernels finely enough to expose the endosperm but risk a slower runoff", "Crack the grain lightly while leaving some kernels mostly intact", "Remove the husks before crushing to expose the endosperm"],
      ["What is a base malt mainly used for?", "Providing most of the fermentable extract in many beer recipes", "Base malts commonly provide much of a recipe's extract and enzymes for starch conversion.", "Providing much of the extract but little of the enzymes needed for a typical all-malt mash", "Contributing a distinctive toast or caramel note in a modest proportion", "Providing most of the color while contributing only a small share of the extract"],
      ["What do specialty malts commonly contribute?", "Color, flavor, and sometimes body", "Roasting and processing create flavors such as toast, caramel, or roast and can deepen beer color.", "Fermentable extract and a flavor contribution, with the balance depending on the malt", "Color and roast character but little enzymatic power", "Body and foam support with relatively little change to flavor"],
      ["What is a mash rest?", "A period when crushed malt and water are held at a chosen temperature", "The rest gives malt enzymes time to work on starches and other grain components.", "A period when the mash is raised gradually through enzyme-active temperatures", "A short hold after lautering to settle particles before boiling", "A rest during fermentation when yeast reduces some flavor compounds"],
      ["Which statement about mash enzymes is correct?", "They help convert malt starches into smaller sugars", "Malt enzymes, including amylases, break starch into sugars during mashing.", "They convert starch into sugars most actively during fermentation", "They break down proteins but do not act on starch", "They continue converting starch throughout the wort boil"],
      ["What is one role of alpha-amylase in the mash?", "It breaks starch chains into shorter dextrins and sugars", "Alpha-amylase cuts starch chains at internal points, helping create a range of shorter carbohydrates.", "It releases maltose from the ends of starch chains", "It converts longer dextrins into fermentable sugars only", "It breaks starch chains into shorter pieces while beta-amylase produces much of the maltose"],
      ["What is one role of beta-amylase in the mash?", "It releases maltose units from starch-chain ends", "Beta-amylase helps produce maltose, an important fermentable sugar, from starch.", "It cuts starch chains at internal points to create shorter dextrins", "It breaks maltose into glucose during the mash", "It removes branch points from starch chains rather than releasing maltose"],
      ["What can a warmer mash temperature generally encourage?", "A wort with more dextrins and a fuller perceived body", "Mash temperature affects enzyme activity; warmer rests often favor less fermentable wort, within recipe and process limits.", "A more fermentable wort with a lower final gravity", "A similar fermentability with faster enzyme activity only", "A fuller wort mainly because more grain extract is created"],
      ["Why do brewers pay attention to mash pH?", "Enzyme performance and wort extraction are affected by pH", "Mash pH influences enzyme activity and the chemistry of extraction; brewers manage it for consistency.", "It affects extraction and flavor but has little bearing on enzyme activity", "It is used mainly to predict the beer's final carbonation", "It determines fermentability more directly than mash temperature"],
      ["What is strike water?", "The water heated and added to the grain to begin mashing", "Strike-water volume and temperature are planned so the mash reaches its target conditions.", "The first wort collected from the mash before sparging", "The water added after the mash rest to rinse the grain", "The water used to adjust the kettle volume after the boil"],
      ["What does lautering mean?", "Separating wort from the grain bed", "Lautering collects liquid wort from the mash while retaining the spent grain.", "Rinsing the grain bed with sparge water to recover more extract", "Recirculating early runoff through the grain bed to improve clarity", "Draining the mash tun after the sparge is complete"],
      ["What is sparging in a typical all-grain brew?", "Rinsing the grain bed with water to collect more wort extract", "Sparging washes additional dissolved sugars from the grain bed into the kettle.", "Recirculating the first cloudy runoff until it clears", "Collecting the concentrated first wort before adding rinse water", "Diluting collected wort to reach the planned kettle volume"],
      ["What are first runnings?", "The first sweet liquid drained from the grain before it is rinsed", "First runnings are the first sweet liquid collected from the grain. The later rinse collects more liquid.", "The wort collected after sparge water has rinsed the grain", "The initial cloudy wort returned to the top of the grain bed", "The final low-gravity runoff collected after sparging"],
      ["Why is wort boiled in many beer recipes?", "To help sanitize it, drive off some volatiles, and support hop utilization", "The boil serves several purposes; its details depend on the recipe and brewing process.", "To extract all bitterness from hops before adding them", "To concentrate the wort without changing its gravity", "To make the wort ferment without yeast"],
      ["What is the hot break?", "Protein and other material that coagulate during the wort boil", "The hot break is material formed as wort boils; it can later settle with trub.", "The foam produced by yeast during active fermentation", "The sediment that forms only after bottle conditioning", "The hop material left in the kettle after chilling"],
      ["Why does a brewer account for boil-off?", "Boiling evaporates water and changes the wort volume and concentration", "Estimating boil-off helps the brewer plan pre-boil volume and reach the intended post-boil volume and gravity.", "It estimates the volume lost to grain absorption during lautering", "It predicts how much wort the fermenter will absorb", "It measures how much water is retained in the grain bed"],
      ["What are alpha acids in hops known for contributing?", "Much of the beer's bitterness after isomerization during the boil", "Boil conditions isomerize hop alpha acids, making them more soluble and contributing bitterness.", "Most of the citrus aroma in late hop additions", "The fermentable sugars extracted from malt", "The minerals that determine brewing-water hardness"],
      ["What is the usual effect of an early boil-hop addition?", "It tends to contribute more bitterness than a late addition", "Longer boiling generally increases alpha-acid isomerization, while volatile aroma compounds are driven off.", "It contributes the same bitterness as a late addition in every recipe", "It preserves more volatile hop aroma than a short boil", "It prevents hop alpha acids from isomerizing"],
      ["What is a late-boil hop addition often used for?", "Adding hop flavor and some aroma while still receiving some heat", "Later timing generally preserves more volatile flavor and aroma than a long boil, though exact results vary.", "Increasing bitterness as much as an equal long-boiled addition", "Raising mash extract by adding hops to the kettle", "Reducing hop aroma by boiling the addition longer"],
      ["What does dry hopping mean?", "Adding hops during or after fermentation rather than boiling them", "Dry hopping extracts hop aroma and flavor without a long boil; timing and contact practices vary.", "Adding hops only at the start of the wort boil", "Steeping hops in hot wort for the full boil", "Adding hop pellets to the mash before lautering"],
      ["Why do brewers choose different hop varieties?", "Varieties can have different bitterness, flavor, and aroma characteristics", "Hop varieties differ in their oils and alpha-acid content, and growing conditions also affect them.", "Each variety has the same bitterness but a different fermentation temperature", "Varieties differ only in pellet size, not aroma or bitterness", "Hop variety determines the grain bill's fermentability"],
      ["What does IBU estimate?", "The concentration of iso-alpha acids and related bittering compounds in beer", "IBU is a laboratory-oriented estimate of bitterness compounds; perceived bitterness also depends on the beer.", "The amount of bitterness perceived regardless of malt sweetness or other flavors", "The exact amount of hop aroma in the beer", "The concentration of fermentable sugar before fermentation"],
      ["What does brewing yeast need to ferment wort successfully?", "Suitable wort, an appropriate yeast strain, and healthy fermentation conditions", "Yeast health, pitching rate, temperature, and wort composition all influence fermentation.", "A wort with no fermentable sugars", "Fermentation temperatures outside the strain's recommended range", "Oxygen throughout active fermentation rather than primarily before or around pitching"],
      ["What is a common broad difference between ale and lager yeast use?", "Many ale strains are fermented warmer than many lager strains", "There are exceptions, but ale strains are often used at warmer temperatures than traditional lager strains.", "Many lager strains are fermented warmer than many ale strains", "Ale and lager strains are usually fermented at about the same temperature", "All ale strains must be fermented warmer than every lager strain"],
      ["What does attenuation describe?", "How much of the wort's fermentable extract yeast ferments", "Apparent attenuation relates the drop in gravity during fermentation to the starting extract.", "How much of the wort's original extract was present before fermentation", "How much bitterness hops contribute to the beer", "How readily yeast cells clump and settle"],
      ["What does yeast flocculation describe?", "How readily yeast cells clump together and settle", "Flocculation is yeast's tendency to aggregate and sediment, which affects beer clarity and yeast handling.", "How much fermentable extract yeast consumes", "How quickly yeast begins fermenting after it is pitched", "How well a yeast strain tolerates a given fermentation temperature"],
      ["Why is pitching an appropriate amount of yeast important?", "It supports a healthy fermentation suited to the wort and yeast strain", "Pitching rate is one factor in fermentation health and flavor; appropriate rates depend on the wort and yeast.", "It guarantees the beer will be clear immediately", "It removes the need to control fermentation temperature", "It determines the final beer color"],
      ["Why might a brewer make a yeast starter?", "To grow or prepare healthy liquid yeast for pitching when appropriate", "A starter can increase viable yeast available for pitching; whether it is needed depends on yeast type and batch.", "To increase the wort's fermentable extract", "To lower the beer's final gravity without fermentation", "To condition dry yeast that the manufacturer says not to rehydrate"],
      ["Why may wort be aerated or oxygenated before pitching many brewing yeasts?", "Yeast uses oxygen early to build components needed for healthy cell growth", "Oxygen is useful to yeast during its early growth phase; brewers typically avoid aerating finished beer.", "It supplies oxygen mainly after fermentation is complete", "It reduces oxygen exposure by adding oxygen to packaged beer", "It replaces the need to pitch a suitable amount of yeast"],
      ["Why should brewers generally avoid splashing fermented beer during transfer?", "Oxygen pickup can cause staling and damage flavors", "Once fermentation is complete, excess oxygen exposure can oxidize beer and reduce freshness.", "It removes all carbonation", "It makes yeast ferment faster", "It increases the beer's original gravity"],
      ["Why is fermentation temperature controlled?", "Temperature affects yeast activity and the flavors it produces", "Fermentation temperature influences yeast performance and flavor; targets depend on strain and recipe.", "It determines how much fermentable extract was collected in the kettle", "It controls hop isomerization during the boil", "It sets the carbonation target in a sealed bottle"],
      ["Why can a fermenter feel warmer than the room during active fermentation?", "Fermentation produces heat", "Yeast activity releases heat, so the beer can be warmer than ambient air.", "The airlock warms the beer as gas passes through it", "The yeast produces heat only after fermentation has finished", "The fermenter is warming because hops are still boiling"],
      ["What is krausen?", "The foamy head that can form on fermenting beer", "Krausen forms from yeast, proteins, and carbon dioxide during active fermentation.", "The layer of spent grain left after lautering", "The foam produced only when beer is poured from a keg", "A deposit of hop material that forms during the boil"],
      ["What does an airlock mainly do on a fermenter?", "Lets gas escape while helping limit outside air and contaminants entering", "An airlock provides a one-way vent path, though it is not a substitute for sound sanitation and a proper seal.", "Measures changes in the beer's gravity", "Keeps the fermenter at its target temperature", "Allows oxygen to enter throughout active fermentation"],
      ["What does original gravity (OG) measure?", "The wort's density before fermentation begins", "OG indicates dissolved extract in wort before fermentation and is used in brewing calculations.", "The wort's volume before fermentation begins", "The wort's temperature before fermentation begins", "The beer's density after fermentation is complete"],
      ["What does final gravity (FG) measure?", "The beer's density after fermentation", "FG is measured after fermentation and, with OG, can help estimate alcohol and assess fermentation progress.", "The wort temperature at mash-in", "The weight of the empty fermenter", "The bitterness of a hop addition"],
      ["How is a basic ABV estimate commonly calculated from gravity readings?", "Using the difference between original and final gravity in an approximate formula", "A common homebrew estimate uses OG minus FG multiplied by a factor; it is an approximation, not a laboratory measurement.", "By using final gravity alone without the starting reading", "By comparing the beer's color with a color chart", "By using the mash temperature and boil time alone"],
      ["Why should a hydrometer reading be temperature-corrected when needed?", "Liquid temperature can affect density readings", "Hydrometers are calibrated for a reference temperature, so readings outside that range may need correction.", "Use the instrument's calibration temperature as the sample temperature even when they differ", "Correct the reading using room temperature instead of sample temperature", "Apply an alcohol correction rather than a temperature correction"],
      ["Why can refractometer readings be harder to interpret after fermentation starts?", "Alcohol affects how light refracts, so a correction is needed", "A refractometer reading after fermentation needs an alcohol correction using the original reading or another method.", "The instrument measures density in the same way as a hydrometer", "Fermentation changes the reading only by changing the sample color", "A post-fermentation reading needs no correction"],
      ["What is a useful sign that primary fermentation may be complete?", "Gravity readings remain stable over an appropriate period", "Stable gravity readings are more useful than airlock activity alone; allow time for the beer and yeast to finish.", "Airlock activity has just started", "The krausen is still rising", "The beer has cooled to room temperature for one hour"],
      ["What is the fermentation lag phase?", "The early period when yeast adapts and grows before vigorous fermentation is apparent", "Yeast may be active before visible signs appear; lag duration varies with yeast and conditions.", "The period when yeast settles after fermentation", "The conditioning time after gravity has stabilized", "The rest period when malt enzymes convert starch"],
      ["What is diacetyl often associated with in beer?", "A buttery or butterscotch-like flavor", "Diacetyl can be produced during fermentation; yeast may reduce it when given suitable time and conditions.", "A green-apple aroma", "A cooked-corn flavor", "A solvent-like alcoholic aroma"],
      ["What is one common effect of fermenting lager yeast at cooler temperatures?", "Slower yeast activity and a longer conditioning phase", "Cooler temperatures slow lager yeast activity and lengthen fermentation and conditioning; the exact timing depends on the strain and process.", "Faster yeast activity and a shorter conditioning phase", "Higher original gravity without changing the recipe", "Automatic removal of every sulfur aroma"],
      ["Why might beer be conditioned after primary fermentation?", "To allow flavors to mature and the beer to reach its intended state", "Conditioning time can allow yeast to clean up some fermentation byproducts and flavors to integrate.", "To continue converting starches that were not present in the wort", "To remove all yeast before gravity has stabilized", "To replace temperature control during fermentation"],
      ["What is priming sugar used for in bottle conditioning?", "Yeast ferments a measured amount to produce carbonation in the sealed bottle", "Residual yeast ferments priming sugar and the resulting carbon dioxide dissolves into beer; accurate measurement matters.", "It raises the beer's bitterness as it carbonates", "It stops yeast activity as soon as it is added", "It replaces the need to confirm fermentation is complete"],
      ["Why is bottling beer before fermentation is complete risky?", "Continued fermentation can create excessive pressure in bottles", "More fermentable sugar can produce more carbon dioxide in sealed bottles than intended, risking bottle failure.", "The beer will lose all of its dissolved carbon dioxide", "The bottles stop yeast from fermenting any remaining sugar", "It prevents the beer from reaching its expected final gravity"],
      ["How is beer commonly force-carbonated in a keg?", "Carbon dioxide is supplied from a gas cylinder and dissolves into the beer", "Keg carbonation uses regulated CO₂; pressure, temperature, and time affect carbonation.", "By fermenting measured priming sugar in sealed bottles", "By allowing fermentation gas to escape through an airlock", "By adding unregulated air to the beer"],
      {
        prompt: "Why should a keg and its beer-contact parts be cleaned and sanitized before filling?",
        correctAnswer: "To keep dirt and germs from getting into the beer",
        explanation: "Clean, sanitized parts help keep unwanted germs from spoiling the beer.",
        wrongAnswers: [
          "To remove dirt but leave germs on the parts that touch beer",
          "To remove germs but leave dirt on the parts that touch beer",
          "To clean the keg after the beer has been poured",
        ],
      },
      {
        prompt: "What is the difference between cleaning and sanitizing?",
        correctAnswer: "Clean off dirt first, then kill germs on the clean surface.",
        explanation: "Clean first to remove dirt, then kill germs on the clean surface.",
        wrongAnswers: [
          "Kill germs first, then wash away dirt.",
          "Clean off dirt, but do not kill germs.",
          "Kill germs on a dirty surface without cleaning it first.",
        ],
      },
      ["Why should a brewer follow the sanitizer label's directions?", "Contact time, dilution, and use instructions vary by product", "Using the correct concentration and contact time helps the sanitizer work as intended and supports safe use.", "Use the same dilution and contact time for every sanitizer", "Rinse every sanitizer off immediately even when its label says not to", "Apply sanitizer before removing visible soil"],
      ["What can brewing-water minerals influence?", "Mash chemistry, yeast performance, and perceived flavor", "Water ions interact with malt and affect mash pH and flavor; suitable profiles depend on the beer and source water.", "Only the beer's color, with no effect on mash or flavor", "Only yeast performance, with no effect on mash chemistry", "Only mash pH, with no effect on flavor or fermentation"],
      ["Why might chlorine or chloramine in tap water concern brewers?", "They can contribute medicinal or plastic-like off-flavors", "Some water supplies use disinfectants that can react with malt-derived compounds; brewers choose an appropriate treatment.", "They change only the water's hardness", "They reliably improve hop aroma at any level", "They remove the need to control mash pH"],
      ["What is one common reason brewers treat brewing water to address chloramine?", "Some use a suitable dose of metabisulfite, following reliable guidance", "Metabisulfite can neutralize chloramine when used appropriately; verify the water and dose rather than guessing.", "Adding more hops masks chloramine without treating the water", "A carbon filter always removes every level of chloramine", "More yeast removes chloramine during fermentation"],
      ["What does water hardness mainly relate to in brewing water?", "The concentration of dissolved minerals, especially calcium and magnesium", "Hardness is largely associated with calcium and magnesium ions and can affect mash and flavor chemistry.", "The water's alkalinity alone, regardless of mineral content", "The water's temperature when it enters the mash tun", "The amount of dissolved carbon dioxide in the water"],
      ["Why is calcium often discussed in brewing-water profiles?", "It can influence mash chemistry and yeast flocculation", "Calcium has several brewing effects, including mash pH interactions and yeast behavior; amounts should suit the recipe and water.", "It determines hop variety without affecting mash chemistry", "It replaces the need to measure mash pH", "It provides most of the beer's bitterness"],
      ["Why avoid excessive sparging or unsuitable sparge conditions?", "They can extract unwanted compounds from the grain husks", "Very high pH and low gravity near the end of runoff can increase extraction of astringent husk compounds.", "They prevent all sugars from dissolving in the wort", "They reduce the wort volume without affecting its strength", "They remove yeast from beer during fermentation"],
      ["What is malt extract brewing?", "Using concentrated wort extract instead of mashing all the grain yourself", "Malt extract is produced from wort and lets brewers make beer without performing a full mash for all fermentables.", "Using wort from an all-grain mash but skipping the boil", "Mashing grain and using the concentrated extract only as a hop source", "Fermenting malt extract without adding yeast"],
      ["What distinguishes hopped malt extract from unhopped malt extract?", "Hops or hop-derived bitterness have been added during manufacture", "Hopped extract is made with hops or hop-derived bitterness; unhopped extract lets the brewer choose the hop additions.", "It contains a different malt base but no hop-derived bitterness", "It has already been fermented into beer", "It requires a different type of yeast to ferment"],
      ["What does all-grain brewing mean?", "The fermentable extract is produced by mashing malted grain", "All-grain brewers create wort from grain rather than relying on malt extract for the main fermentable portion.", "The recipe uses only specialty malts and no base malt", "Malt extract supplies most of the fermentable extract", "The wort is fermented without adding yeast"],
      ["What does mash efficiency describe?", "How effectively potential extract from the grain reaches the collected wort", "Efficiency compares collected extract with the grain's potential and depends on the recipe and process.", "How much of the grain's potential extract is lost to the spent grain", "How much wort volume is collected compared with the recipe target", "How much bitterness is extracted from the hops"],
      ["What is original gravity (OG) in a recipe used for?", "A target for wort concentration before fermentation", "OG helps describe wort strength and, together with FG, can help estimate alcohol.", "A target for wort concentration after fermentation", "A measure of the beer's bitterness before fermentation", "A measure of fermentation speed"],
      ["What is the purpose of lagering beer at a cold temperature?", "To allow yeast and chill haze to settle while the beer matures", "Cold storage can help improve clarity and allow the beer to mature; the exact effects depend on the style and process.", "To raise the original gravity", "To continue isomerizing hop alpha acids after fermentation", "To stop fermentation instantly and remove all yeast"],
      ["What is oxidation in packaged beer commonly associated with?", "Stale flavors and loss of freshness", "Oxygen exposure, especially after fermentation, can accelerate staling and change aroma and flavor.", "A fresh hop aroma that increases during storage", "A change in bitterness caused only by alpha-acid isomerization", "A mash pH change that occurs during lautering"],
      ["What is trub?", "Sediment made up of break material, hop matter, and other solids", "Trub forms during brewing and settling; brewers manage how much carries into fermentation.", "The yeast layer that settles after fermentation", "The grain bed left after lautering", "The foam produced during active fermentation"],
      ["When might yeast nutrient be useful?", "When a recipe or fermentation conditions call for additional nutrients", "Malt wort contains nutrients, but some fermentations may benefit from appropriate nutrient additions following product guidance.", "As a substitute for pitching healthy yeast", "To raise the wort's original gravity without adding fermentable extract", "To stop yeast from producing fermentation byproducts"],
      ["What is a yeast starter?", "A small propagation of liquid yeast before pitching into a larger batch", "A starter can grow yeast cells when appropriate; whether it is useful depends on yeast form, age, and batch size.", "A small amount of beer held back for bottle conditioning", "A sample of wort taken to measure original gravity", "A portion of yeast slurry stored after fermentation"],
      ["What does a beer's body describe?", "How full or light it feels in the mouth", "Body is a sensory impression influenced by residual extract, proteins, carbonation, and other factors.", "Its bitterness level on the palate", "Its aroma intensity above the glass", "Its exact alcohol percentage"],
      ["What does mash thickness describe?", "The amount of mash water relative to the grain", "Mash thickness is the liquor-to-grist ratio and can affect mash handling and wort composition.", "The amount of sparge water compared with collected wort", "The depth of the mash in the vessel", "The thickness of the grain bed after lautering"],
      ["What is a mash-out intended to do?", "Raise the mash temperature to reduce viscosity and slow enzyme activity", "Some brewers raise the mash temperature before runoff; the target and need depend on the process.", "Lower the mash temperature to increase enzyme activity", "Hold the drained wort at fermentation temperature", "Raise the temperature after lautering to continue starch conversion"],
      ["Why do brewers recirculate the first cloudy wort runoff?", "To help the grain bed filter suspended particles", "Returning early runoff gently can help clarify it as the grain bed settles into a filter.", "To increase the wort's original gravity without adding extract", "To rinse more sugars from the grain before sparging", "To lower the wort temperature before the boil"],
      ["What can a pre-boil gravity reading help a brewer assess?", "Whether the collected wort concentration is near the recipe target", "Pre-boil gravity, together with volume, helps assess extract collection before the boil.", "Whether the wort has reached its expected post-boil gravity", "Whether the fermenting beer has reached final gravity", "How much bitterness the planned hop additions will contribute"],
      ["What is a kettle fining commonly used for?", "Helping proteins and other particles settle from wort", "Kettle finings are used near the end of the boil to encourage break material to coagulate and settle.", "Reducing dissolved hop bitterness in the kettle", "Improving yeast flocculation after fermentation", "Adjusting mash pH before lautering"],
      ["What does a whirlpool help accomplish after the boil?", "Gather hot break and hop matter so clearer wort can be drawn off", "A whirlpool can collect solids in a cone while wort rests before chilling or transfer.", "Recirculate wort through the grain bed to improve runoff", "Mix sparge water with the mash before collecting wort", "Cool the wort without transferring heat to a cooling medium"],
      ["Why is wort cooled before yeast is pitched?", "To bring it into a temperature range suitable for the yeast", "Pitching temperature affects yeast health and fermentation behavior; follow the strain and recipe guidance.", "To make the wort reach its final gravity before yeast is added", "To extract more bitterness from hops after the boil", "To clarify the wort by removing all dissolved sugars"],
      ["What is cold break?", "Proteins and other material that precipitate as wort cools", "Cooling can cause additional wort compounds to form particles that may settle before or during fermentation.", "The foam that forms when yeast begins active fermentation", "The cloudy first runoff from the grain bed", "The sediment made only from yeast after fermentation"],
      ["Why follow the manufacturer's instructions when rehydrating dry yeast?", "The recommended method and temperature vary by product", "Some dry yeasts are designed to be pitched directly, while others may have specific rehydration guidance.", "All dry yeast products require the same rehydration method", "Rehydration changes the yeast's recommended fermentation range", "Rehydration removes the need to check the yeast's freshness"],
      ["What does yeast viability refer to?", "The proportion of yeast cells that are alive and capable of fermenting", "Viability is one factor in deciding whether a yeast pitch is suitable for a batch.", "The proportion of yeast cells that have settled out of the beer", "The amount of fermentable sugar left after fermentation", "The amount of flavor compounds produced by the yeast"],
      ["What can influence a yeast strain's apparent attenuation?", "Wort fermentability, yeast strain, and fermentation conditions", "Attenuation depends on both the wort and the yeast's performance under the given conditions.", "The wort's fermentability and yeast strain, but never fermentation conditions", "Fermentation temperature alone, regardless of wort composition", "The length of the boil, regardless of the yeast or wort"],
      ["What are esters in beer commonly associated with?", "Fruity aromas produced during fermentation", "Some yeast strains produce fruity esters, and their levels are affected by strain and fermentation conditions.", "Spicy or clove-like notes from yeast-derived phenols", "Buttery notes associated with diacetyl", "Cooked-corn notes associated with DMS"],
      ["What can phenolic character contribute to some beers?", "Spicy, clove-like, or smoky notes depending on source and style", "Yeast, ingredients, and process can all contribute phenols; whether they are desired depends on the beer.", "Fruity notes commonly associated with yeast esters", "Buttery notes commonly associated with diacetyl", "Cooked-corn notes commonly associated with DMS"],
      ["What is a blow-off tube used for during fermentation?", "Providing a larger path for krausen and gas to escape", "A blow-off setup can help manage vigorous fermentation when foam might otherwise clog an airlock.", "Returning cloudy wort through the grain bed", "Measuring gravity without taking a sample", "Keeping oxygen flowing into the fermenter during active fermentation"],
      ["Why should a blow-off vessel be kept from becoming sealed?", "Fermentation gas needs a safe, unobstructed path to escape", "A blocked or sealed vent can allow dangerous pressure to build in equipment not designed for it.", "Yeast needs a continuous supply of room air during active fermentation", "A sealed vessel makes fermentation gas escape more quickly", "The airlock needs to be blocked to maintain a safe pressure"],
      ["Why avoid opening a fermenter unnecessarily after fermentation?", "Opening it can expose beer to oxygen and contaminants", "Careful, sanitized handling helps limit oxidation and contamination during and after fermentation.", "Oxygen is needed to carbonate finished beer", "Opening it raises the beer's original gravity", "Opening it is required to keep yeast active"],
      ["Why sanitize a hydrometer sample jar before collecting beer?", "To reduce the chance of contaminating the fermenter or sample", "Clean, sanitized sampling equipment helps protect the batch; avoid returning a sample to the fermenter.", "Sanitize over visible residue without cleaning the jar first", "Rinse away sanitizer without checking its product directions", "Return the tasted sample to the fermenter"],
      ["Why should a brewer avoid returning a tasted gravity sample to the fermenter?", "It may introduce contaminants through contact with the sample vessel or mouth", "Discarding the sample is a simple way to avoid transferring microbes back into the batch.", "The sample no longer contains any yeast", "Returning it lowers the batch's original gravity", "The sample has already released all of its carbon dioxide"],
      ["What is a diacetyl rest?", "A period near the end of fermentation that allows yeast to reduce diacetyl", "Some fermentations benefit from a suitable temperature rise near completion so yeast can reabsorb diacetyl.", "A cold-conditioning period after yeast has settled", "A period when yeast is removed before it can reduce diacetyl", "A bottle-conditioning period when yeast ferments priming sugar"],
      ["What is yeast autolysis?", "The breakdown of yeast cells that can release unwanted flavors", "Extended contact with unhealthy or aging yeast can contribute meaty or yeasty flavors, though practical risk varies.", "The normal conversion of sugars into alcohol during fermentation", "The clumping and settling of yeast from beer", "The reduction of diacetyl by active yeast"],
      ["Why calculate bottle-priming sugar for the batch volume?", "To target carbonation while avoiding excessive bottle pressure", "The amount of fermentable sugar should account for beer volume and desired carbonation; fermentation must be complete first.", "To set the original gravity of the wort before fermentation", "To determine the beer's final gravity after bottle conditioning", "To estimate how much yeast has settled in the fermenter"],
      ["Why can residual CO₂ in beer matter when calculating priming sugar?", "It contributes to the carbonation already present before packaging", "Priming calculations should account for existing carbonation as well as the target level and beer volume.", "It tells you that the beer has reached stable final gravity", "It shows that all priming sugar has already fermented", "It determines how much fermentable sugar remains in the beer"],
      ["What is bottle conditioning?", "Carbonating beer in sealed bottles through yeast fermentation of a measured priming dose", "A small amount of fermentable sugar is fermented in the bottle, producing dissolved carbon dioxide.", "Carbonating beer in a keg with regulated carbon dioxide", "Allowing fermentation gas to escape through an airlock", "Measuring hop bitterness in packaged beer"],
      ["A lager has been conditioned cold for a long time and is very clear. What may help it carbonate in bottles?", "Add a small, suitable yeast dose along with measured priming sugar", "Long cold conditioning can leave little yeast in suspension; a suitable fresh yeast addition may help bottle carbonation.", "Add extra priming sugar but no yeast", "Extend cold storage and omit priming sugar", "Warm the bottles without checking the priming plan"],
      ["What does carbonation level usually describe?", "The amount of dissolved carbon dioxide in the beer", "Carbonation is commonly expressed as volumes of CO₂ or another defined measurement.", "The pressure rating printed on a keg", "The amount of foam left in a glass after pouring", "The number of yeast cells in suspension"],
      ["Why allow enough time for bottle-conditioned beer to carbonate?", "Yeast needs time at a suitable temperature to ferment the priming sugar", "Carbonation develops as yeast ferments the measured priming dose; timing varies with conditions.", "Bottle conditioning is complete as soon as the priming sugar is mixed in", "The beer must be chilled before yeast can ferment priming sugar", "A bottle's carbonation depends on the time the wort spent in the mash"],
      ["What does alcohol by volume (ABV) express?", "The proportion of a beverage's volume that is alcohol", "ABV is a volume-based measure of alcohol concentration; homebrew gravity formulas provide estimates.", "The proportion of a beverage's mass that is alcohol", "The amount of fermentable extract remaining in the beer", "The ratio of hop bitterness to wort strength"],
      ["What can a recipe's bitterness-to-gravity balance help a brewer consider?", "How hop bitterness may be perceived relative to wort strength", "The ratio is one rough planning aid; malt character, finishing gravity, and other factors also shape balance.", "Whether the beer has reached a stable final gravity", "How much fermentable extract the grain will provide", "How much yeast to pitch for the batch volume"],
      ["Why record actual brew-day volumes and gravity readings?", "They help diagnose process differences and improve future recipe adjustments", "Consistent records make it easier to compare results and refine equipment or recipe assumptions.", "They record only the recipe's planned values, not the brew's measurements", "They replace checking whether equipment losses changed", "They guarantee the same gravity in every batch"],
      ["Why compare a finished beer's gravity with the recipe's expected final gravity?", "It can help identify a difference in fermentation or wort fermentability", "Gravity is useful context, but stable readings and the recipe's process matter more than one exact target.", "It directly measures whether the beer is contaminated", "It confirms that all yeast has settled out", "It determines the beer's hop bitterness"],
    ]),
  },
  "brew-day-sequence": {
    title: "Brew Day Sequence",
    subtitle: "Follow the main stages of an all-grain brew day.",
    intro: "Answer seven random questions from a 100-question brew-day pool. Choices are shuffled each attempt, with explanations to help you learn the process.",
    source: "How to Brew, Chapters 1–11",
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
            text: "Heat the sparge water and prepare the lauter tun",
            correct: false,
            feedback: "Those preparations come later in the process. First heat strike water and mash in the grain.",
          },
          {
            text: "Add the crushed malt to room-temperature water and begin runoff",
            correct: false,
            feedback: "The mash needs suitable temperature and time before runoff; calculate and heat the strike water first.",
          },
          {
            text: "Begin recirculating wort through the grain bed",
            correct: false,
            feedback: "Recirculation takes place after the mash rest, during lautering.",
          },
        ],
        source: "Wikipedia: Brewing — process overview",
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
            text: "Raise the mash to mash-out temperature, then begin runoff",
            correct: false,
            feedback: "A mash-out may be part of the process, but first establish runoff and separate wort from the grain.",
          },
          {
            text: "Recirculate the first cloudy runoff, then collect the wort",
            correct: false,
            feedback: "Recirculation is a lautering step, but the grain bed must first be set for runoff after the mash rest.",
          },
          {
            text: "Add all sparge water and drain it without separating the first wort",
            correct: false,
            feedback: "Collect the first wort from the grain bed before the planned sparge and runoff steps.",
          },
        ],
        source: "Wikipedia: Brewing — process overview",
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
            text: "Check pre-boil volume and gravity, then bring the wort to a boil",
            correct: false,
            feedback: "Those checks happen before the boil. Once wort is collected and measured, follow the boil and hop schedule.",
          },
          {
            text: "Transfer the wort to the fermenter and begin cooling it there",
            correct: false,
            feedback: "The planned boil comes before cooling and transfer to the fermenter.",
          },
          {
            text: "Begin chilling the wort while the scheduled boil is still underway",
            correct: false,
            feedback: "Complete the scheduled boil and hop additions before chilling the wort.",
          },
        ],
        source: "Wikipedia: Brewing — process overview",
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
            text: "Whirlpool or settle the wort, then chill it to pitching temperature",
            correct: false,
            feedback: "Whirlpooling or settling may follow the boil, but the wort still needs to reach a suitable pitching temperature.",
          },
          {
            text: "Transfer the wort while hot and rely on the fermenter to cool it",
            correct: false,
            feedback: "The wort should be cooled to a suitable pitching temperature before yeast is added.",
          },
          {
            text: "Add yeast nutrient and pitch yeast before checking the wort temperature",
            correct: false,
            feedback: "Check and reach the yeast's suitable pitching temperature before adding it; follow nutrient instructions.",
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
            text: "Measure the cooled wort and aerate or oxygenate it as the process calls for",
            correct: false,
            feedback: "That can be part of the next steps, but transfer to a sanitized fermenter and pitch suitable yeast.",
          },
          {
            text: "Transfer the wort to a sanitized fermenter and wait for visible airlock activity before pitching",
            correct: false,
            feedback: "Pitch suitable yeast after transfer; visible airlock activity is not a prerequisite and may not be a reliable sign.",
          },
          {
            text: "Pitch yeast into the kettle and transfer the beer after fermentation begins",
            correct: false,
            feedback: "Transfer cooled wort to the sanitized fermenter before pitching to protect the batch and use the vessel as intended.",
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
            text: "Use a single gravity reading and package if it matches the expected final gravity",
            correct: false,
            feedback: "One reading cannot establish stability; compare gravity readings over an appropriate interval before packaging.",
          },
          {
            text: "Use the beer's clarity and a quiet airlock together as confirmation",
            correct: false,
            feedback: "Clarity and airlock activity are not reliable completion tests; use gravity readings over time.",
          },
          {
            text: "Wait a fixed number of days after bubbling stops, then package",
            correct: false,
            feedback: "Fermentation timing varies by yeast and conditions; confirm stable gravity rather than relying on a fixed interval.",
          },
        ],
      },
      ...buildQuestions([
        ["Your recipe, water, and ingredients are ready. What helps avoid a rushed brew day?", "Review the recipe, measure ingredients, and prepare clean equipment", "Preparation keeps the process organized and helps prevent missed steps.", "Check only the hop schedule and leave ingredient measurements until the boil", "Measure the water but leave equipment cleaning until after the mash", "Prepare the fermenter but skip checking the recipe quantities"],
        ["You are using grain that has not been milled. What is a suitable next action?", "Crush the malt to expose its interior while keeping husks mostly intact", "A suitable crush supports conversion and can help the grain bed filter during lautering.", "Crush it into a fine flour that includes the husks", "Leave the kernels whole so water can reach their interior", "Remove all the husks before crushing the grain"],
        ["You have a recipe and know the batch size. What should guide your strike-water amount?", "The recipe and the planned mash thickness and equipment losses", "Water volume depends on the recipe and process, including later sparging and system losses.", "Use batch size alone, without accounting for mash thickness", "Use the same strike-water volume for every batch", "Count sparge water as strike water and ignore system losses"],
        ["How should you choose the strike-water temperature?", "Calculate it to reach the recipe's target mash temperature after grain is added", "Grain temperature and mash thickness affect the final mash temperature.", "Use the target mash temperature as the strike temperature without accounting for grain temperature", "Use the fermentation temperature as the strike temperature", "Set it to the boiling point regardless of the mash target"],
        ["When adding crushed grain to strike water, what helps avoid dough balls?", "Stir the grain in gradually and mix thoroughly", "Gradual mixing helps wet the grain evenly and break up dry clumps.", "Add all the grain at once and do not break up clumps", "Stir briefly only at the surface of the mash", "Add sparge water before the grain has been wetted"],
        ["The mash is cooler than the recipe target. What is a sensible response?", "Adjust gently using the process your equipment and recipe allow", "A controlled adjustment can restore the target; avoid large swings and verify with a thermometer.", "Add a measured amount of hot water without checking the resulting temperature", "Raise the mash directly to its mash-out temperature before the rest is complete", "Leave it unchanged even if the temperature is well below the target"],
        ["The mash is hotter than intended. What should you do?", "Use a controlled correction appropriate to your setup and recheck", "Mash temperature affects enzyme activity, so correct carefully and record the actual temperature.", "Add cold water without accounting for the added volume", "Continue the rest at the higher temperature without recording it", "Cool the mash below its target and then add more hot water repeatedly"],
        ["Why stir the mash after dough-in?", "To distribute water and temperature through the grain bed", "Mixing helps avoid dry pockets and temperature stratification.", "To keep hot and cool areas separated", "To move the grain bed into the kettle before runoff", "To make the mash temperature rise without adding heat"],
        ["Why may a brewer check mash temperature in more than one place?", "The mash can have uneven temperatures", "Multiple checks help find hot or cool spots and confirm the mash is near target.", "The mash has one temperature at the surface and a different target at the center", "The thermometer must be calibrated separately for each grain kernel", "Temperature readings are unaffected by how thoroughly the mash is mixed"],
        ["The mash rest has finished. Why might a brewer raise the mash temperature before runoff?", "A mash-out can reduce wort viscosity and slow further enzyme activity", "Some processes use a mash-out; its use and target depend on the recipe and equipment.", "To increase yeast activity before pitching", "To extract additional hop bitterness from the grain", "To cool the wort before the boil"],
        ["Before collecting wort, what should be done with the grain bed in a typical lautering setup?", "Allow the bed to settle and establish a clear runoff path", "A stable grain bed can help filter particles as wort is collected.", "Stir the grain bed continuously while wort drains", "Begin runoff before the grain has settled", "Compact the bed firmly to make it drain faster"],
        ["The first runoff is cloudy with grain particles. What is one common response?", "Return some runoff gently to the top of the grain bed", "Recirculation can help the grain bed filter particles; follow the equipment process.", "Stir the grain bed to suspend more particles in the wort", "Add sparge water to the kettle before collecting runoff", "Increase runoff speed so particles pass through more quickly"],
        ["Why collect runoff without compacting the grain bed excessively?", "A compacted bed can restrict flow and cause a stuck runoff", "Avoiding excessive compaction helps maintain wort flow through the grain.", "A compacted bed filters out all dissolved sugars", "Compaction prevents hot water from reaching the grain", "A compacted bed increases the wort's flow rate"],
        ["What is the purpose of sparge water in a typical batch-sparge process?", "Rinse dissolved extract from the grain into the kettle", "Sparge water helps recover sugars remaining in the grain bed.", "Dilute the wort after the boil to reach the recipe volume", "Raise the mash temperature before the rest begins", "Recirculate the first cloudy runoff through the grain"],
        ["When sparging, why use suitable water temperature and pH?", "To support extraction while limiting unwanted husk compounds", "Very high pH and low-gravity runoff can increase astringent extraction; process targets vary.", "To raise the mash's original gravity after runoff", "To make hop alpha acids more soluble during fermentation", "To cool the collected wort before it enters the kettle"],
        ["Runoff is complete. What should you check before the boil?", "Collected volume and, if available, pre-boil gravity", "These measurements help compare the batch with the recipe and adjust the process.", "The post-boil volume before the wort has boiled", "The final gravity before fermentation has begun", "The mash temperature after the grain has been removed"],
        ["Why bring collected wort to a controlled boil?", "The boil supports wort processing and allows timed hop additions", "A planned boil supports sanitation and recipe-specific evaporation and hop extraction.", "It converts the wort's sugars into alcohol before yeast is added", "It removes the need to cool wort before pitching yeast", "It prevents the wort volume from changing during the boil"],
        ["A recipe calls for a bittering hop addition at the start of the boil. When should it be added?", "At the recipe's specified early-boil timing", "Longer boil time generally increases isomerization and bitterness contribution.", "At flameout so it receives no boil time", "During the mash before the wort is collected", "After fermentation when bitterness can no longer be extracted"],
        ["A recipe calls for a late-boil hop addition. Why follow its stated timing?", "Timing influences the balance of bitterness, flavor, and aroma", "Later additions receive less boil time and often retain more volatile hop character.", "Timing determines the wort's original gravity", "Late hops replace the need for an early bittering addition in every recipe", "Timing affects only the mash temperature, not hop character"],
        ["The boil is vigorous enough to risk a boil-over. What is the best response?", "Reduce heat temporarily and manage the boil safely", "A controlled boil helps prevent spills and keeps the process safe.", "Add sanitizer to the kettle", "Increase heat and leave the kettle unattended", "Cover and seal the kettle while it boils"],
        ["Why avoid leaving a kettle unattended during heating and boiling?", "Hot liquids and boil-overs can create burn and fire hazards", "Stay attentive, use stable equipment, and follow safe hot-side practices.", "The wort can foam up and boil over as it approaches a boil", "A kettle can be left uncovered over a flame without checking it", "The boiling wort can be sealed under pressure without a rated vessel"],
        ["A recipe includes a whirlfloc or kettle fining addition. When is it commonly used?", "Near the end of the boil, according to product and recipe directions", "Kettle finings are typically added late in the boil to aid hot-break and trub settling.", "At the start of fermentation after the wort has cooled", "During the mash before the wort is collected", "After packaging when the beer is ready to serve"],
        ["Why might a brewer use a whirlpool after the boil?", "To gather hop matter and trub into a more concentrated area", "Whirlpooling can help separate solids from wort; the method and rest depend on the recipe.", "To return cloudy first runoff through the grain bed", "To mix sparge water into the mash", "To bring the wort to a boil more quickly"],
        ["The boil is over. What should happen before transferring cooled wort?", "Use clean, sanitized equipment on surfaces that contact post-boil wort", "After the boil, contamination control becomes important; clean and sanitize contact surfaces.", "Use hot-side equipment without checking that it is clean", "Rinse the fermenter but skip sanitizer on beer-contact surfaces", "Sanitize the equipment before removing visible soil"],
        ["Why cool wort promptly using a suitable method after boiling?", "To reach a yeast-appropriate pitching temperature and manage contamination risk", "Cooling prepares wort for yeast and limits the time it remains in a vulnerable warm range.", "To make the wort reach its expected final gravity before fermentation", "To extract additional bitterness from hops after the boil", "To remove the need to sanitize equipment that contacts cooled wort"],
        ["What is one benefit of a counterflow or immersion wort chiller?", "It transfers heat from wort to a cooling medium", "A chiller helps bring wort down toward pitching temperature efficiently.", "It lowers wort gravity by adding cooling water", "It filters all trub from the wort", "It oxygenates the wort without contact with air or oxygen"],
        ["After chilling, why transfer wort carefully into the fermenter?", "To limit contamination and avoid unnecessary splashing after fermentation begins", "Use clean, sanitized contact surfaces; follow a suitable oxygenation plan before pitching.", "To transfer all break material into the fermenter regardless of the process", "To aerate the beer after fermentation has finished", "To keep the wort in contact with unclean equipment"],
        ["When is oxygen generally most useful to many brewing yeasts?", "Before or around pitching, according to the brewing process", "Yeast uses oxygen early for growth; oxygen exposure later can stale beer.", "Only after primary fermentation is complete", "Continuously throughout fermentation rather than before or near pitching", "Only after beer is packaged"],
        ["Why check the wort's pitching temperature before adding yeast?", "To keep the yeast within its recommended temperature range", "Pitching too hot or cold can stress yeast; follow strain and recipe guidance.", "To determine whether the wort has reached its final gravity", "To confirm that the wort is at the sparge temperature", "To estimate hop bitterness from the wort temperature"],
        ["You are using dry yeast. What is the best way to prepare it?", "Follow the yeast manufacturer's pitching instructions", "Dry-yeast handling guidance varies; follow the supplier's directions for the strain and batch.", "Rehydrate every product at the same temperature regardless of its instructions", "Use the yeast before checking its storage or expiry guidance", "Pitch it into wort outside the product's recommended range"],
        ["You are using liquid yeast and unsure whether it is enough for a large or strong wort. What should you do?", "Use a suitable pitching-rate estimate and follow yeast guidance", "Required cell count depends on wort volume, gravity, strain, and yeast condition.", "Assume a single pack provides the same cell count regardless of age or size", "Add yeast before the wort has cooled to its pitching range", "Use the same yeast amount for every batch volume and gravity"],
        ["Why might a brewer take an original-gravity reading after collecting and boiling wort?", "To compare wort strength with the recipe target", "OG records the starting density and supports later process and alcohol estimates.", "To measure the expected final gravity before fermentation", "To determine how much carbonation is already in a keg", "To estimate hop aroma without tasting the beer"],
        ["The original gravity is lower than the recipe target. What is a useful first step?", "Check measurement temperature, volume, and process notes before adjusting", "Verify readings and batch volume first; any correction depends on the recipe and stage.", "Add yeast to raise the wort's gravity", "Add sanitizer to increase dissolved extract", "Change the recipe's recorded target to match the measurement"],
        ["Why record the actual mash and boil volumes?", "They help diagnose process losses and improve future recipe consistency", "Good records help tune equipment profiles and repeat successful batches.", "They show whether the batch reached the expected volume without measuring gravity", "They determine the yeast strain's attenuation", "They replace the need to record ingredient amounts"],
        ["Why keep notes about hop additions and their timing?", "Timing and amount influence bitterness, flavor, and aroma", "Accurate hop records make recipe results easier to understand and reproduce.", "Hop timing determines the mash temperature", "The notes show whether fermentation has reached final gravity", "The notes show how much grain extract was collected"],
        ["Fermentation has begun. What should you do with the fermenter?", "Maintain conditions appropriate for the yeast and keep it protected", "Stable, suitable fermentation conditions support yeast performance and reduce contamination risk.", "Make large temperature changes whenever the airlock slows", "Open the fermenter frequently to check the beer's aroma", "Move it between warm and cool locations each day"],
        ["Why keep fermentation records such as temperature and gravity?", "They help track progress and troubleshoot deviations", "Measurements provide more reliable information than appearance or airlock activity alone.", "They show only the beer's color, not fermentation progress", "They determine the hop variety needed for the next batch", "They replace checking whether gravity is stable"],
        ["A recipe specifies fermentation temperature. Why follow it?", "The yeast strain and desired flavor profile inform the target", "Temperature affects yeast activity and flavor; strain guidance is important.", "It is chosen to match the boil temperature", "All beer ferments best at the same temperature", "It controls mash efficiency after fermentation"],
        ["The fermenter is bubbling vigorously. Should you open it to stir?", "Usually avoid opening it unless the process specifically calls for an intervention", "Opening increases contamination risk; vigorous airlock activity alone does not require stirring.", "Stir it on a schedule even when fermentation is progressing normally", "Add oxygen repeatedly during active fermentation", "Rouse the yeast every hour whether it has settled or not"],
        ["The airlock has slowed after several days. What should you do?", "Check gravity over time and continue following the recipe's fermentation guidance", "Airlock rate is not a reliable endpoint; stable gravity and adequate time are more useful.", "Bottle as soon as the airlock slows without checking gravity", "Use airlock speed alone to estimate the final gravity", "Assume the yeast has finished because the fermenter is quiet"],
        ["Why allow time after gravity appears stable before packaging?", "Yeast may still need time to finish and condition the beer", "Stable readings are useful, but recipe and yeast guidance may call for additional conditioning.", "To allow the wort's original gravity to increase again", "To extract more bitterness from hops after the boil", "To replace sanitation of packaging equipment"],
        ["What should you do before taking a gravity sample?", "Use clean, sanitized sampling equipment and avoid returning the sample", "Good sampling hygiene reduces contamination risk; do not return a measured sample to the fermenter.", "Use an unclean sample jar but sanitize the fermenter afterward", "Pour the measured sample back into the fermenter", "Open the fermenter and stir before taking the sample"],
        ["A hydrometer reading seems implausible. What should you check?", "Calibration temperature, sample conditions, and reading technique", "Temperature, bubbles on the instrument, and reading the meniscus correctly can affect results.", "The bottle-cap material", "The dry-hop amount instead of the sample conditions", "The label color instead of the hydrometer scale"],
        ["Why degas a fermented sample before a refractometer reading?", "Dissolved carbon dioxide can interfere with a clear reading", "Bubbles and alcohol effects can complicate readings; use an appropriate sampling and correction method.", "It raises the sample's original gravity", "It creates new fermentable sugars", "It replaces the alcohol correction needed after fermentation"],
        ["The beer has finished fermenting and you plan to bottle-condition it. What must be calculated carefully?", "The priming-sugar amount for beer volume and desired carbonation", "Over- or under-priming affects carbonation; use a reliable calculator and account for process conditions.", "The amount of grain extract to add to each bottle", "The hop boil time after filling", "The amount of yeast originally pitched into the fermenter"],
        ["Before bottling, what should you verify about fermentation?", "Gravity is stable and the beer is ready according to the recipe", "Packaging beer with ongoing fermentation can create excessive pressure.", "The airlock has stopped moving for one day", "The beer looks clear even though gravity is still changing", "The yeast has settled out of view"],
        ["What is important when filling bottles for conditioning?", "Use clean, sanitized bottles and suitable caps, leaving appropriate headspace", "Sanitation and consistent filling help protect beer and allow controlled carbonation.", "Rinse bottles but skip sanitizer on beer-contact surfaces", "Leave too little headspace for the planned carbonation", "Use different priming amounts without measuring them"],
        ["You plan to keg the finished beer. What should be clean and sanitized?", "The keg and all surfaces that contact the beer", "Beer-contact surfaces should be cleaned and sanitized before filling.", "Only the keg lid, leaving the inside unclean", "Only the gas-side parts, leaving beer-contact parts unclean", "The outside of the keg but not the beer-contact surfaces"],
        ["What is one advantage of transferring beer to a keg with minimal splashing?", "It limits oxygen pickup and protects flavor", "Reducing oxygen exposure after fermentation helps preserve freshness.", "It increases oxygen pickup and speeds up staling", "It allows air to mix into the beer more evenly", "It removes dissolved carbon dioxide from the beer"],
        ["After packaging, why store beer under conditions suited to its style and packaging?", "Temperature and light exposure can affect quality over time", "Storage conditions influence aging and freshness; follow recipe and packaging guidance.", "Use the same warm temperature for every style", "Keep light-sensitive beer in direct sunlight", "Store all packaged beer at the highest temperature available"],
        ["A batch misses its target volume after the boil. What should you do?", "Record the result and make only a suitable recipe-based adjustment", "Volume affects gravity and the batch profile; note it to improve future equipment and process estimates.", "Add unmeasured water or extract without checking the resulting gravity", "Change the recipe target to match without recording the actual volume", "Make an adjustment before measuring the wort volume"],
        ["Why keep the kettle covered or manage it as the recipe directs after the boil?", "To protect wort while following the intended cooling and process method", "Post-boil handling should limit contamination while allowing safe cooling; exact practice varies.", "Seal the kettle airtight while the hot wort cools", "Leave the cooled wort open to the room for an extended period", "Add yeast before the wort has cooled to its pitching range"],
        ["What is the role of a grain bed during lautering?", "It can act as a filter that retains larger grain particles", "A settled grain bed helps clarify runoff when handled appropriately.", "It extracts bitterness from hops during the boil", "It determines the wort's final gravity after fermentation", "It dissolves proteins while the wort cools"],
        ["Why avoid crushing malt to an excessively fine powder in many lauter systems?", "Fine material can impede runoff and contribute to a stuck mash", "Crush settings balance exposed endosperm with a workable grain-bed filter.", "A coarse crush prevents the grain from absorbing any water", "A fine crush makes runoff faster in every lauter system", "The crush determines hop utilization during the boil"],
        ["What does a recipe's target mash time help specify?", "How long the mash is held under its planned conditions", "Mash duration is part of the process; conversion and recipe methods influence the required rest.", "How long the sparge water is held at its target temperature", "How long the wort is boiled after lautering", "How long yeast is allowed to ferment after pitching"],
        ["What should you do if the mash temperature varies from the recipe?", "Measure accurately, make a controlled correction if appropriate, and record it", "Temperature affects the mash; consistent measurement and notes help with repeatability.", "Add hot or cold water without measuring the change", "Use a different thermometer reading without checking either instrument", "Change the recipe's target temperature to match the reading"],
        ["Why may a brewer use a kettle-volume mark or dipstick?", "To estimate wort volume at key stages", "Volume measurements help plan boil-off, batch size, and gravity comparisons.", "To estimate the mash temperature", "To estimate the grain's potential extract", "To estimate how much trub will settle"],
        ["A hop addition is listed at flameout. What does that mean?", "Add it when the heat is turned off at the end of the boil", "Flameout timing gives a hot steep rather than the full boil duration; follow the recipe.", "Add it when the boil has just begun", "Add it after the wort has cooled to pitching temperature", "Add it after fermentation is complete"],
        ["A whirlpool hop addition is in the recipe. What should you follow?", "The specified temperature and contact time for the whirlpool step", "Hop extraction depends on temperature and time; recipe directions define the intended result.", "Use the same temperature and contact time for every hop variety", "Use the yeast's fermentation temperature instead of the recipe's hop step", "Choose contact time based only on the beer's final gravity"],
        ["Why chill wort before pitching even if the yeast is robust?", "Pitching temperature affects yeast health and fermentation character", "Use the yeast's recommended range and avoid extremes that can stress cells.", "Chilling removes the need to pitch a suitable amount of yeast", "A robust yeast makes pitching temperature irrelevant", "Cooling guarantees the same alcohol level in every batch"],
        ["What should guide the choice of fermenter size?", "Batch volume plus suitable headspace for fermentation activity", "Headspace helps accommodate krausen and foaming; vessel needs vary by process.", "Batch volume without allowing room for krausen", "The size of the kettle rather than the fermenting batch", "The final packaged volume without accounting for fermentation losses"],
        ["What is a blow-off tube sometimes used for?", "Providing a wider path for gas and krausen during vigorous fermentation", "A blow-off setup can help manage foamy fermentation; keep the arrangement clean and safe.", "Providing a narrower vent than an airlock", "Measuring how much sugar remains in the beer", "Regulating the fermentation temperature"],
        ["Why ensure a fermenter's airlock is not blocked?", "Fermentation gas needs a safe path to escape", "A blocked vessel can build pressure; use suitable equipment and never seal active fermentation without pressure-rated design.", "A blocked airlock helps yeast use oxygen during fermentation", "A blocked airlock lowers pressure in the fermenter", "A blocked airlock prevents krausen from forming"],
        ["What should be done with used grain after lautering?", "Handle or dispose of it appropriately; it is no longer the wort", "Spent grain has had much of its soluble extract removed and can be composted or reused suitably.", "Add it back to the kettle to restore the extracted sugars", "Use it to clarify wort after the boil", "Return it to the mash tun as a substitute for fresh malt"],
        ["A recipe calls for a specific yeast strain. Why use that strain or a suitable substitute?", "Yeast choice affects fermentation behavior and flavor", "Strains vary in attenuation, temperature range, and flavor profile.", "Yeast determines the hop schedule without affecting fermentation", "All strains attenuate and flocculate at the same rate", "The strain affects color only, not flavor or fermentation"],
        ["What should you do if equipment instructions conflict with an online brew schedule?", "Follow safe equipment instructions and adapt the recipe appropriately", "Equipment safety and manufacturer guidance take precedence; record recipe adjustments.", "Follow the online schedule even if it exceeds the equipment rating", "Seal a kettle during the boil to match the schedule", "Use the equipment outside its stated temperature range"],
        ["Why clean brewing equipment soon after use?", "Fresh deposits are often easier to remove before they dry", "Prompt cleaning helps prevent buildup and makes later sanitation more effective.", "Cleaning removes the need to sanitize beer-contact surfaces", "Cleaning is most effective after residue has hardened", "Sanitizer can remove heavy soil without cleaning first"],
        ["At the end of brew day, what is valuable to record?", "Actual measurements, timings, deviations, and observations", "Detailed notes make it easier to repeat successes and diagnose differences in later batches.", "Only the recipe's planned values, not what actually happened", "Only the fermentation temperature before pitching", "Only the batch name and yeast strain"],
      ]).slice(0, 64),
      ...buildQuestions(createBrewDayPracticeQuestions()),
    ],
  },
  "fermentation-detective": {
    title: "Fermentation Detective",
    subtitle: "Use clues and measurements to make thoughtful brewing decisions.",
    intro: "Answer seven random questions from a 100-question troubleshooting pool. Choices are shuffled each attempt, and explanations help you reason through fermentation clues.",
    source: "How to Brew, Chapters 2–11",
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
            text: "Treat the quiet airlock as proof that fermentation is complete",
            correct: false,
            feedback: "Fermentation is almost certainly not confirmed complete after one day. Bottling too early can cause excessive pressure.",
          },
          {
            text: "Pitch more yeast before checking the temperature or gravity",
            correct: false,
            feedback: "A quiet airlock alone does not show that yeast is inactive. Check the seal, temperature, and gravity trend.",
          },
          {
            text: "Open the fermenter and aerate it after fermentation may have begun",
            correct: false,
            feedback: "A quiet airlock alone does not prove fermentation has stopped, and opening or aerating fermenting beer can introduce contamination or oxidation.",
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
            text: "Cool it below the strain's range as quickly as possible",
            correct: false,
            feedback: "Adding ice risks contamination and sudden temperature changes. Adjust the environment around the sealed fermenter instead.",
          },
          {
            text: "Leave it above the strain's range to speed fermentation",
            correct: false,
            feedback: "Higher temperatures can stress yeast and create unwanted flavors. Follow the yeast and recipe guidance.",
          },
          {
            text: "Use room temperature as the target even when it is outside the strain's range",
            correct: false,
            feedback: "Suitable temperatures depend on the yeast strain and recipe; verify the beer temperature and adjust gradually if needed.",
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
            text: "Yes. A quiet airlock is enough to confirm stable gravity",
            correct: false,
            feedback: "Airlock bubbles are not a reliable completion test. Check gravity and allow the beer time to finish and condition.",
          },
          {
            text: "Yes, if the beer looks clear even without gravity readings",
            correct: false,
            feedback: "Appearance is not a reliable way to determine final gravity. Use a hydrometer or other suitable gravity measurement.",
          },
          {
            text: "Only after the airlock has been still for one full day",
            correct: false,
            feedback: "A fixed period without bubbles does not confirm completion. Check gravity readings over time.",
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
          {
            text: "The beer has finished because the gravity is lower",
            correct: false,
            feedback: "A lower reading than yesterday shows a change, not completion. Wait for stable readings before packaging.",
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
            text: "Rinse away the sanitizer immediately, regardless of its label",
            correct: false,
            feedback: "Sanitizers differ; follow the product label for dilution, contact time, and whether rinsing is appropriate.",
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
        ["The airlock is not bubbling, but gravity has fallen since pitching. What does that suggest?", "Fermentation is occurring even if the airlock is quiet", "A leaky seal can prevent airlock activity; gravity change is evidence that extract is being consumed.", "The sample temperature or reading technique may need checking before drawing a conclusion", "The beer has reached final gravity because its reading is lower", "The airlock may not show activity even while gravity is still changing"],
        ["The airlock bubbles steadily. Does that prove fermentation is healthy and complete?", "No; check gravity, temperature, and the recipe's expected progress", "Bubbles show gas is escaping, but do not establish fermentation health or completion by themselves.", "Check whether gravity is stable before interpreting the airlock activity", "A steady airlock can coexist with a fermentation issue or leak", "Use the yeast's expected timeline alongside gravity and temperature"],
        ["The fermenter is warmer than the room during active fermentation. What best explains the difference?", "Yeast activity releases heat, so the beer can run warmer than the room", "Active fermentation can raise the beer temperature above ambient.", "The fermenter is insulated, so the beer cannot exchange heat with its surroundings", "Fermentation consumes heat, so a warmer reading means activity has stopped", "Only the airlock can create a temperature difference between beer and room"],
        ["A temperature probe attached to the fermenter reads above the yeast's recommended range. What next?", "Use a controlled cooling method and monitor the beer temperature", "Gently return the beer toward the strain's range and avoid abrupt swings.", "Add ice directly into the fermenter", "Move it next to a heater", "Open it to release heat"],
        ["The beer is colder than the yeast's recommended range and gravity is unchanged. What is sensible?", "Gently bring it toward the strain's range and monitor for activity", "Cold can slow some yeast; adjust gradually and recheck gravity rather than assuming a failure.", "Warm it gradually within the strain's range and recheck gravity", "Package it if the airlock is quiet, without confirming gravity stability", "Raise it well above the strain's range to restart activity quickly"],
        ["Fermentation temperature rose quickly after vigorous activity began. What should you consider?", "Use temperature control to avoid sustained excessive warmth", "Fermentation heat can raise beer temperature; follow the yeast's recommended range.", "Raise the temperature further above the strain's range", "Cool the beer far below the strain's range all at once", "Ignore the beer temperature and rely only on room temperature"],
        ["The fermenter is in direct sunlight. What is a better location?", "A shaded place with stable, suitable temperature", "Stable temperature and protection from light are generally preferable for fermentation.", "A location with the same temperature but stronger sunlight", "A warm location with large temperature swings", "A cold location outside the yeast's recommended range"],
        ["The yeast package says to ferment within a specific range. Which temperature should guide you?", "The yeast supplier's range and the recipe's intended profile", "Strain-specific guidance is more useful than a universal temperature for every beer.", "The room temperature regardless of the beer temperature", "The mash temperature used before the wort was boiled", "A single temperature used for every yeast strain"],
        ["A krausen has formed on top of the beer. What does it usually indicate?", "Active fermentation is producing foam", "Krausen commonly forms from yeast, proteins, and carbon dioxide during fermentation.", "Fermentation has reached its final gravity", "The beer has reached stable gravity", "The yeast has finished conditioning the beer"],
        ["Krausen has fallen, but you have not taken a gravity reading. What should you conclude?", "Appearance alone cannot confirm fermentation is complete", "Use gravity readings over time and follow the recipe and yeast guidance.", "The beer is safe to bottle because the foam has fallen", "The beer has reached the expected final gravity", "The yeast has stopped fermenting because it has settled"],
        ["A thick krausen is pushing into the airlock. What should you do?", "Use a suitable clean blow-off arrangement if needed and keep the vent path clear", "A blow-off tube can handle vigorous foam; never allow active fermentation gas to become trapped.", "Block the airlock to keep foam from escaping", "Remove the airlock and leave the fermenter open", "Keep using the clogged airlock without clearing its gas path"],
        ["The airlock appears blocked during active fermentation. Why is that important?", "Gas needs a safe, unobstructed route out of the vessel", "A blocked vessel can build pressure; use a suitable venting setup.", "The blockage prevents yeast from using dissolved sugars", "The blockage proves fermentation is complete", "The blockage means the beer is at its final gravity"],
        ["Your fermenter lid leaks slightly. What should you rely on to assess fermentation?", "Gravity readings and temperature rather than airlock bubbles", "A leak can bypass the airlock; measurements remain more informative.", "Use airlock bubbles alone to measure fermentation progress", "Use the lid's movement as the only sign of gravity change", "Open the fermenter repeatedly to check the aroma"],
        ["The airlock stopped after vigorous bubbling. What should you do before packaging?", "Take gravity readings over time and confirm they are stable", "Airlock activity often slows before fermentation is verified complete; stable gravity is a better check.", "Treat the airlock stopping as proof that final gravity is stable", "Use the krausen's appearance instead of taking gravity readings", "Package the beer after a fixed number of days without checking gravity"],
        ["Gravity is still dropping between readings. What does that mean for packaging?", "Wait; fermentation may still be active", "Changing gravity indicates extract is still being consumed, so packaging may be premature.", "Bottle the beer while gravity is falling", "Use the latest reading as final gravity without checking it again", "Assume the airlock stopping means fermentation has ended"],
        ["Two gravity readings taken too close together differ slightly. What is a careful next step?", "Take another reading after an appropriate interval using consistent technique", "Small measurement variation can occur; compare readings over time with a suitable instrument.", "Treat the small difference as proof of a stuck fermentation", "Change the hydrometer calibration temperature to match the result", "Use the airlock bubble rate to decide which reading is correct"],
        ["A gravity reading seems much higher than expected. What should you check first?", "Instrument calibration, sample temperature, and reading technique", "Temperature and technique can affect a hydrometer reading; verify before intervening.", "Compare it with the original-gravity reading without checking the sample", "Check whether the hydrometer is touching the sample jar", "Check whether bubbles are clinging to the instrument"],
        ["A refractometer reading after fermentation seems unexpectedly high. Why might that be?", "Alcohol affects refractive readings, so a post-fermentation correction is needed", "Use the original reading and an appropriate correction method, or confirm with a hydrometer.", "Use the refractometer's pre-fermentation scale without correction", "Treat the reading as a direct measure of alcohol percentage", "Apply a hydrometer temperature correction without accounting for alcohol"],
        ["The hydrometer has bubbles clinging to it in the sample. What should you do?", "Remove bubbles and read the instrument carefully at its calibrated temperature", "Bubbles can affect buoyancy and the reading; use clean, consistent technique.", "Take a second reading with bubbles still attached", "Read the scale at the top of the meniscus", "Use the sample temperature as the calibration temperature even when they differ"],
        ["A gravity sample is much warmer than the hydrometer calibration temperature. What is appropriate?", "Apply a suitable temperature correction or cool the sample safely", "Hydrometer readings depend on temperature; use the instrument's calibration guidance.", "Read it without correction even though the temperatures differ", "Apply the correction in the opposite direction", "Use the original-gravity value as the final-gravity reading"],
        ["The fermenter looks clear, but gravity has changed since yesterday. What should you do?", "Continue waiting and check for stable gravity", "Clarity does not prove fermentation is complete; changing gravity means it may still be active.", "Package it because clear beer cannot ferment further", "Use clarity instead of gravity readings to confirm completion", "Treat the beer as complete because the airlock is quiet"],
        ["Gravity is stable, but the beer tastes very sweet compared with the recipe. What is sensible?", "Review the recipe, expected FG, yeast, and measurement accuracy before deciding", "Stable gravity is useful, but an unexpectedly high FG may reflect recipe, yeast, or measurement factors.", "Add more priming sugar to reduce the sweetness", "Assume the sweetness proves the gravity reading is wrong", "Bottle it without checking whether the stable reading is above the expected range"],
        ["Gravity is stable but much lower than the recipe's expected FG. What should you do?", "Verify the readings and consider recipe fermentability and yeast attenuation", "A lower FG can result from fermentability, yeast, or measurement differences; check before taking action.", "Use the expected FG as the measured value", "Assume any lower final gravity means contamination", "Add fermentable sugar to the finished beer without recalculating the recipe"],
        ["The fermentation seems stalled at a higher gravity than expected. What should you check first?", "Verify gravity and review temperature, yeast health, and wort conditions", "Confirm the measurement and assess process factors before interventions.", "Assume the reading is final without checking the instrument", "Raise the temperature beyond the yeast's range immediately", "Add more yeast without checking whether fermentation is actually stalled"],
        ["A stalled fermentation has been confirmed. What is a responsible next step?", "Research the cause and choose a measured intervention suitable for the beer", "Potential interventions depend on yeast, temperature, gravity, and sanitation; avoid blind additions.", "Raise the temperature beyond the yeast's recommended range", "Add yeast without checking whether the wort can support fermentation", "Add fermentable sugar without diagnosing the stall"],
        ["The beer smells buttery during fermentation. What can help yeast reduce diacetyl?", "Allow suitable time and conditions for the yeast to finish", "Some yeast can reabsorb diacetyl during conditioning; follow strain and recipe guidance.", "Cold-crash the beer before the yeast can finish conditioning", "Package it as soon as the buttery aroma appears", "Transfer it away from the yeast before gravity is stable"],
        ["The beer smells like green apple during fermentation. What should you do?", "Allow fermentation and conditioning time, then reassess", "Acetaldehyde can be a fermentation byproduct that yeast may reduce with time; do not rush packaging.", "Transfer it off the yeast before fermentation is complete", "Package it while gravity is still falling", "Aerate the beer after fermentation has begun"],
        ["A sulfur-like aroma is present during fermentation. What is a reasonable response?", "Follow yeast guidance and allow time for fermentation and conditioning", "Some strains produce sulfur aromas that may diminish; assess the beer after suitable conditioning.", "Remove the beer from yeast before it has finished fermenting", "Add oxygen repeatedly during active fermentation", "Bottle the beer without confirming stable gravity"],
        ["The beer smells solvent-like after fermenting warm. What process factor is worth reviewing?", "Fermentation temperature and yeast health", "Some unwanted higher alcohol flavors can be associated with stressed or warm fermentation, though diagnosis depends on the beer.", "Whether the wort gravity was unusually high", "Whether the yeast was pitched at an appropriate rate", "Whether fermentation stayed within the strain's recommended range"],
        ["A medicinal, plastic-like flavor appears in the finished beer. Which brewing issue could be investigated?", "Chlorine or chloramine in brewing water or sanitation practices", "These disinfectants can react with phenolic compounds and create medicinal off-flavors.", "Yeast-derived clove phenols from the strain", "Warm fermentation that produced solvent-like alcohols", "Oxygen exposure that caused stale or papery notes"],
        ["The beer has a strong vinegar-like aroma and a surface film. What should you do?", "Avoid tasting if there are concerning signs and assess sanitation and contamination risk", "Acetic aromas and surface growth can indicate contamination; use caution and review process controls.", "Assume the film is harmless without considering the beer or process", "Skim the film and package the beer without further assessment", "Treat the surface as normal yeast krausen even if it formed after fermentation"],
        ["You see fuzzy growth on the beer surface. What is the safest choice?", "Do not consume it; discard carefully and review sanitation", "Fuzzy growth is a warning sign. Avoid disturbing it or trying to salvage the batch by skimming.", "Skim the growth and assume the beer beneath it is safe", "Stir the growth into the beer before packaging", "Taste the beer to identify the type of growth"],
        ["You see a thin pellicle but no fuzzy growth or obvious spoilage. What should you do?", "Assess the process and avoid disturbing it; seek reliable style-specific guidance", "A pellicle can have different causes and does not alone identify a safe or unsafe beer; avoid assumptions.", "Assume the pellicle proves the beer is safe", "Remove it and assume the beer is unsafe without considering other evidence", "Package the beer immediately without checking fermentation progress"],
        ["The airlock smells unusual when you open the fermenter. What is a sensible approach?", "Minimize opening and evaluate the beer with process history and other signs", "Opening exposes beer to contamination; aroma alone can be hard to interpret during active fermentation.", "Open the fermenter repeatedly to compare the aroma over time", "Use the airlock aroma alone to decide whether fermentation is complete", "Add sanitizer to the beer based only on the airlock smell"],
        ["You accidentally splashed finished beer during transfer. What should you do for the rest of the process?", "Reduce further oxygen exposure and package carefully", "One event cannot be undone, but limiting additional oxygen pickup helps protect freshness.", "Continue splashing so the beer receives an even amount of oxygen", "Leave the beer uncovered while it settles", "Assume the yeast will remove all oxygen after fermentation"],
        ["The fermenter was opened briefly with sanitized equipment. What should you do?", "Close it promptly and continue monitoring normally", "Brief exposure does not guarantee contamination; maintain sanitation and observe the batch.", "Assume the beer is contaminated solely because the lid was opened", "Keep the vessel open so any contaminants can escape", "Add a second yeast pitch immediately as a precaution"],
        ["You forgot to sanitize a spoon that touched the cooled wort. What is the best response?", "Avoid further handling, monitor carefully, and recognize contamination risk", "Contamination cannot be reversed reliably with a later addition; keep records and assess the batch cautiously.", "Add sanitizer to the wort after fermentation has begun", "Continue using the same unsanitized spoon for sampling", "Open the fermenter repeatedly to check for signs of contamination"],
        ["A sample thief was used and returned to the fermenter. What is the concern?", "The sample may have introduced contaminants", "Sampling tools should be clean and sanitized, and measured samples should not be returned.", "The sample changes the yeast strain", "The sample raises the beer's alcohol content", "The sample makes the original gravity increase"],
        ["The fermentation temperature controller reads a constant value, but a separate thermometer differs. What should you do?", "Check probe placement and verify instruments before adjusting", "Probe location and calibration can explain differences; confirm the beer temperature with a reliable method.", "Set the controller to the wort's boiling temperature", "Change the controller setting before checking either instrument", "Use the room temperature as the only measurement"],
        ["A heating belt warms one spot on the fermenter. What should you monitor?", "The beer temperature and the controller's sensor placement", "Localized heating can make the probe reading differ from the beer; use suitable placement and equipment guidance.", "The temperature at the belt alone without checking the beer", "The room temperature instead of the fermenter temperature", "Whether the belt has raised the beer above the yeast's range"],
        ["The room temperature falls overnight. What is a useful response?", "Check the beer temperature and maintain a suitable stable range", "Beer temperature can lag behind room changes; use a suitable control method and strain guidance.", "Change the controller based only on the room temperature", "Raise the fermenter well above the yeast's recommended range", "Assume fermentation will maintain the same temperature without checking"],
        ["A warm spell raises the room temperature during fermentation. What should you monitor?", "The actual fermenting beer temperature", "Active fermentation generates heat, so beer may be warmer than the surrounding air.", "The room temperature alone instead of the beer temperature", "The airlock temperature instead of the fermenter", "The mash temperature from brew day"],
        ["The fermenter appears inactive after cold storage. What might be happening?", "Low temperature may have slowed yeast activity", "Some yeast activity slows in cold conditions; check gravity and follow the strain's guidance before intervening.", "The yeast has necessarily reached final gravity", "The airlock has stopped because the beer is fully carbonated", "The cold temperature proves the yeast is no longer viable"],
        ["You cold-crashed beer while gravity was still falling. What is the concern?", "Cooling can slow yeast without proving fermentation is complete", "Confirm fermentation completion before packaging; cold temperatures can make activity less visible.", "Cold crashing confirms gravity is stable", "Cooling makes remaining fermentable sugar disappear", "The cold crash proves the yeast cannot resume activity"],
        ["The fermenter is under pressure and the spunding valve is not venting. What should you do?", "Follow pressure-rated equipment instructions and relieve pressure safely", "Never exceed vessel ratings; a blocked or failed pressure-relief system requires immediate safe attention.", "Increase the pressure setting to make the valve open", "Block the relief valve and wait for fermentation to stop", "Open the vessel abruptly without first relieving pressure"],
        ["A pressure-capable fermenter is used for fermentation. What is essential?", "Stay within the vessel and relief-valve pressure ratings", "Pressure fermentation requires rated equipment and correct relief setup; ordinary fermenters may not be pressure-safe.", "Close the vent and disable the relief valve", "Use pressure above the vessel's rated limit", "Rely on the airlock instead of the pressure-relief device"],
        ["A batch has a large amount of headspace in the fermenter. What should you consider?", "Monitor normal fermentation and protect the beer from unnecessary oxygen exposure later", "Headspace is not automatically a problem during active fermentation, when CO₂ is produced; later handling still matters.", "Top it up with unboiled water", "Add extra hops to fill the space", "Bottle the wort immediately"],
        ["You are tempted to top up a fermenter with tap water. What should you consider?", "Use only a suitable, sanitary method consistent with the recipe", "Added water affects gravity and may introduce contaminants; do not add untreated water casually.", "Use tap water without checking its treatment or sanitation", "Add an unmeasured amount of water without recalculating gravity", "Use sanitizer solution as dilution water"],
        ["A gravity sample tastes sweeter than expected during active fermentation. What should you do?", "Compare gravity readings over time and allow fermentation to proceed", "Wort and young beer can taste sweet while fermentable sugars remain; taste alone is not a completion test.", "Use sweetness alone to decide that fermentation is complete", "Bottle it because sweetness means yeast activity has stopped", "Add more priming sugar before checking gravity"],
        ["You are unsure whether a gravity change is real or instrument error. What helps?", "Repeat measurements with calibrated equipment and consistent sample technique", "Consistent method and reliable tools help separate actual fermentation changes from measurement variation.", "Use the same uncalibrated instrument without checking sample temperature", "Rely on airlock activity instead of taking another reading", "Change the recipe's expected final gravity to match the measurement"],
        ["The sample contains lots of suspended yeast. What should you remember when interpreting it?", "Cloudiness does not by itself indicate fermentation completion or failure", "Yeast in suspension is common; gravity trend and process context are more useful.", "Suspended yeast always means fermentation is complete", "A cloudy sample cannot be measured with a hydrometer", "The sample's appearance gives the exact final gravity"],
        ["A yeast packet is past its best-before date. What should you consider?", "Viability may be reduced; use fresh yeast or assess a suitable plan", "Age and storage affect yeast viability; follow supplier guidance and account for pitching needs.", "The yeast is guaranteed to have the original cell count", "The expiry date means the yeast must be pitched after packaging", "Use the original pitch rate without considering age or storage"],
        ["Yeast was stored warm for an extended period. What should you consider?", "Storage may have reduced viability, so use supplier guidance and assess the pitch", "Yeast health depends on strain, form, age, and storage; avoid assuming the original cell count remains.", "Warm storage always preserves the original viability", "Warm storage changes the strain's recommended fermentation range", "Use the same amount as fresh yeast without checking viability"],
        ["A high-gravity wort is fermenting slowly. What factors are worth reviewing?", "Yeast pitch rate, oxygenation before pitching, temperature, and wort composition", "High gravity can stress yeast; review process and measurements before choosing an intervention.", "The wort gravity without considering yeast health or temperature", "The yeast amount without considering batch size or wort strength", "Fermentation temperature without checking the yeast strain's range"],
        ["A low-gravity wort fermented quickly. Does fast fermentation alone mean it is ready to package?", "No; confirm stable gravity and suitable conditioning", "Speed varies and does not replace gravity checks or recipe guidance.", "Yes, package it because a short fermentation always ends at stable gravity", "Use the airlock stopping as the only completion check", "Assume the beer needs more yeast because fermentation was fast"],
        ["You added much more yeast than planned. What should you do?", "Record it and monitor fermentation; avoid unnecessary additions", "Pitching rate can affect fermentation behavior, but the batch should be assessed with measurements and process context.", "Add another yeast strain to offset the first pitch", "Remove yeast before checking gravity", "Change the fermentation temperature without monitoring the beer"],
        ["A fermentation smells fruity, but the recipe uses an expressive ale yeast. What should you do?", "Compare the aroma with the strain and style expectations and reassess after conditioning", "Some yeast strains produce esters; aroma should be interpreted in the recipe and fermentation context.", "Treat any fruity ester as proof of contamination", "Assume the yeast strain cannot affect aroma", "Evaluate the beer's aroma before considering the recipe or fermentation"],
        ["A fermented beer has little aroma while cold. What should you consider?", "Serving temperature can affect how aromas are perceived", "Cold beer can seem less aromatic; assess it at an appropriate serving temperature as well.", "Assume the beer has no aroma because it is cold", "Raise it above its intended serving temperature before every assessment", "Use original gravity to estimate its aroma intensity"],
        ["A sample tastes harshly bitter during active fermentation. What is sensible?", "Wait until fermentation and conditioning are complete before judging", "Young beer can taste unbalanced; assess the finished beer before making conclusions.", "Add priming sugar to reduce the beer's bitterness", "Increase hop additions before the beer is finished", "Use a sweetener before checking the finished beer's balance"],
        ["A finished beer is unexpectedly flat in the keg. What should you check?", "CO₂ supply, connections, temperature, and carbonation time", "Keg carbonation depends on gas supply, leaks, temperature, pressure, and time.", "The mash pH only", "The yeast packet date only", "The bottle-cap color"],
        ["Bottle-conditioned beer is overcarbonated. What is a key safety concern?", "Excess pressure can cause bottles to break", "Handle cautiously and cool the bottles; investigate fermentation completion and priming calculations.", "The beer may gush or foam excessively when opened", "The carbonation proves the beer is safe to open warm", "The beer has lost all of its alcohol"],
        ["Bottle-conditioned beer is undercarbonated. What should you review?", "Priming-sugar measurement, yeast activity, temperature, and conditioning time", "Carbonation depends on measured sugar, viable yeast, seal, temperature, and time.", "Increase the priming amount without checking the batch volume", "Warm the bottles beyond the yeast's range without checking its viability", "Assume the beer contains no yeast because it is undercarbonated"],
        ["After fermentation, the beer tastes stale or papery. What process issue might you review?", "Oxygen exposure during transfer or packaging", "Oxidation can create stale flavors; review splashing, headspace, and packaging practices.", "Yeast strain choice that produced a clove-like phenolic note", "Fermentation temperature that produced a buttery diacetyl note", "Mash profile that left a fuller, sweeter finish"],
        ["The beer is cloudy after fermentation. What should you check before deciding it is a fault?", "Style expectations, yeast settling, temperature, and any recipe additions", "Some beers are intentionally hazy; cloudiness can also come from yeast or other process factors.", "Assume haze always indicates contamination", "Use clarity alone to decide whether gravity is stable", "Add an unmeasured fining dose before checking the recipe"],
        ["A batch tastes unexpectedly astringent. What brewing factors could be reviewed?", "Mash and sparge pH, temperature, and grain-bed handling", "Astringency can be associated with husk extraction and other factors; review the process rather than guessing.", "Whether the yeast produced clove-like phenols", "Whether fermentation produced excessive diacetyl", "Whether oxygen exposure caused a papery flavor"],
        ["The beer tastes buttery after packaging. What should you review?", "Fermentation completion, yeast conditioning, and temperature control", "Diacetyl can reflect fermentation and conditioning factors; consult strain and recipe guidance.", "Whether the hop schedule produced more bitterness", "Whether the mash profile produced a fuller body", "Whether the package absorbed too much carbon dioxide"],
        ["You suspect a batch may be contaminated but see no visible growth. What is a responsible approach?", "Use sensory and process evidence cautiously; do not rely on one sign alone", "Contamination diagnosis can be difficult; avoid unsafe salvage assumptions and review sanitation and fermentation records.", "Taste a large amount to identify microbes", "Add sanitizer after fermentation", "Assume the beer is safe because no growth is visible"],
        ["A beer has a pellicle and a sour aroma, but the recipe was not intended to be sour. What should you do?", "Treat it as a possible unintended fermentation and assess cautiously", "Unplanned microbes can produce acidity and surface films; avoid packaging assumptions and follow safe handling.", "Stir the pellicle in and serve immediately", "Add unmeasured priming sugar", "Assume the pellicle is harmless in every beer"],
        ["A beer has a tart flavor in a style intended to be tart. What should you do?", "Compare it with the recipe and expected fermentation profile", "Some styles are intentionally acidic; judge flavor in the intended style and process context.", "Assume all acidity is contamination", "Use bitterness alone to decide whether the tartness is appropriate", "Compare it with a non-sour style instead of its recipe"],
        ["The yeast settled to the bottom after fermentation. Is that necessarily a problem?", "No; sedimentation is common, and clarity depends on yeast and process", "Yeast flocculation and settling are normal for many strains; avoid disturbing sediment during transfer if clarity matters.", "Yes; settled yeast means fermentation never occurred", "Yes; all yeast must remain suspended for fermentation to finish", "It proves the beer is contaminated"],
        ["You want to reuse yeast from a previous batch. What should you consider?", "Sanitary handling, yeast health, age, and suitability for the next wort", "Repitching depends on viability, contamination risk, generation, and the new beer's requirements.", "Reuse it without checking its age or storage conditions", "Store it in an unclean container before repitching", "Pitch it into wort before the wort has cooled"],
        ["You plan to add fruit after primary fermentation. What should you consider?", "Use a clean, suitable addition and account for renewed fermentation", "Fruit can introduce fermentable sugars and microbes; sanitation and renewed gravity checks matter.", "Fruit can never ferment", "Bottle immediately after adding fruit", "Add it without measuring the batch"],
        ["You plan to dry-hop after fermentation. What should you consider?", "Limit oxygen pickup and use clean handling practices", "Dry hopping can introduce oxygen and may restart activity; use suitable timing and handling.", "Aerate the beer thoroughly", "Add hops during bottle filling with dirty tools", "Assume gravity cannot change"],
        ["A gravity reading rises slightly after dry hopping. What may explain it?", "Hops can affect sampling and measurement; verify with consistent technique", "Suspended material and sampling conditions can complicate readings; investigate before concluding fermentation restarted or reversed.", "Yeast converted alcohol back into malt", "The beer gained sugar from nowhere", "The hydrometer is measuring keg pressure"],
        ["You see foam or bubbles after adding fermentable fruit. What should you do?", "Keep the vessel safely vented and monitor gravity", "Fruit sugars can restart fermentation and produce gas; do not seal an actively fermenting vessel without rated equipment.", "Seal the vessel tightly without a vent", "Bottle immediately", "Add sanitizer to stop the yeast"],
        ["The fermenter is nearly full and krausen is rising. What is a safer plan for future batches?", "Allow adequate headspace or use an appropriate blow-off setup", "Krausen can overflow; plan vessel capacity and venting for vigorous fermentation.", "Seal the airlock", "Fill above the lid", "Use a non-pressure-rated vessel as a pressure tank"],
        ["A pressure relief valve is venting frequently. What should you check?", "The pressure setting, gas path, and equipment instructions", "Use rated equipment and verify settings and obstructions; never disable a relief valve to retain pressure.", "Block the relief valve", "Heat the vessel", "Ignore vessel ratings"],
        ["You hear a hissing sound from a pressure fermenter. What should you do?", "Check for leaks and follow the equipment's safe pressure procedure", "A leak can affect pressure and sanitation; handle pressurized equipment according to its manufacturer.", "Ignore it if the pressure gauge is still within its usual range", "Increase the regulator pressure to compensate for the sound", "Disconnect a pressurized fitting to reseat the connection"],
        ["A fermentation temperature sensor fell off the vessel. What is appropriate?", "Reattach it correctly and verify the beer temperature with a reliable method", "A detached probe may read air temperature instead of beer temperature; confirm the actual process conditions.", "Assume the beer stayed exactly on target", "Increase heating to maximum", "Add ice to the fermenter"],
        ["The fermenter was moved during active fermentation. What should you do?", "Keep it sealed, restore suitable conditions, and continue monitoring", "Movement alone does not necessarily harm beer; minimize unnecessary exposure and check progress normally.", "Open it to stir in air", "Bottle it immediately", "Add sanitizer through the airlock"],
        ["A sample smells like rotten eggs during fermentation. What should you consider?", "Some yeast strains produce sulfur compounds that may diminish with conditioning", "Sulfur aromas can be strain-related; assess the beer after fermentation and follow yeast guidance.", "Check whether the strain commonly produces sulfur and allow appropriate conditioning time", "Treat the aroma as conclusive evidence of contamination", "Package the beer before gravity stabilizes to limit further sulfur production"],
        ["A strong solvent aroma persists in finished beer. What should you review for future batches?", "Yeast strain, fermentation temperature, pitching health, and wort gravity", "These factors can influence higher alcohol production and yeast stress.", "Bottle shape and label font", "The fermenter's exterior color", "The length of the mash paddle"],
        ["You have an uncertain fermentation problem and are considering adding a chemical. What should you do?", "Identify the product and use only a suitable, measured treatment with reliable guidance", "Unverified additions can harm beer or create safety issues; never guess with brewing chemicals.", "Add yeast nutrient without checking whether the wort needs it", "Adjust pH based on taste without measuring or checking the recipe", "Use a brewing treatment at a guessed concentration"],
        ["A sample has a sharp solvent smell, but the fermenter is still active. What should you do?", "Check temperature and yeast guidance, then reassess after fermentation", "Young beer can change during conditioning; avoid premature interventions and review fermentation conditions.", "Compare the beer temperature and pitching conditions with the yeast guidance", "Transfer the beer off the yeast before gravity has stabilized", "Increase the temperature beyond the strain's range to speed cleanup"],
        ["The beer is still cloudy after a short cold crash. What should you do?", "Allow more settling time or use a suitable clarification approach", "Clarification speed varies with yeast, temperature, and process; haze is not automatically a defect.", "Allow more time at a suitable temperature for the yeast and particles to settle", "Use a fining agent without checking its suitability or instructions", "Package before confirming gravity stability"],
        ["You notice sediment was disturbed while transferring finished beer. What should you do?", "Minimize further disturbance and avoid splashing", "Some sediment carryover may affect clarity and flavor; careful transfer limits more disturbance and oxygen.", "Stir vigorously to remove it", "Add priming sugar to settle it", "Open the fermenter for several hours"],
        ["A batch's gravity is stable but higher than expected, and the beer tastes sweet. What is a useful diagnostic?", "Review mash fermentability, yeast performance, and gravity measurement", "Recipe and process factors can leave more residual extract; verify readings and compare with expected FG.", "Compare measured original gravity and mash temperature with the recipe", "Review yeast attenuation and fermentation temperature before changing the recipe", "Check whether the sample was temperature-corrected and read consistently"],
        ["The beer reached a lower-than-expected FG. What should you review?", "Yeast attenuation, mash profile, recipe fermentability, and measurement accuracy", "These factors influence final gravity; compare process notes before changing future recipes.", "The measured original gravity and the yeast's expected attenuation", "Whether the mash temperature favored a more fermentable wort", "Whether the gravity reading was corrected for sample temperature"],
        ["You are planning a warm fermentation but the strain has a narrow temperature range. What should you do?", "Use a suitable temperature-control plan or choose a compatible strain", "Strain selection and temperature management should match the recipe and desired profile.", "Ignore the strain guidance", "Use direct sunlight as a controller", "Pitch the yeast during the boil"],
        ["The beer fermented colder than intended and is slow. What should you avoid?", "Avoid abrupt heating; adjust gradually and monitor progress", "Sudden changes can stress yeast; follow the strain's guidance and use gravity to assess activity.", "Boil the fermenter", "Add unmeasured sugar and bottle", "Open it and shake vigorously"],
        ["You suspect fermentation has stopped because the beer is too cold. What is a careful approach?", "Verify gravity and gradually restore a suitable temperature if appropriate", "Check whether gravity is actually stable, then make a controlled adjustment based on the yeast and recipe.", "Warm it gradually within the strain's range and monitor gravity", "Package it if the airlock is quiet, without confirming gravity stability", "Raise it well above the strain's range to restart activity quickly"],
        ["A fermenter is leaking around the lid, but gravity is decreasing. What should you conclude?", "Fermentation is progressing; the leak explains why the airlock may be quiet", "Gravity change is useful evidence; improve the seal if possible without unnecessary exposure.", "The batch is definitely finished", "The yeast is dead", "The wort has not been made"],
        ["There is no airlock movement, no gravity change, and the beer is cold. What first?", "Verify the readings and bring the beer gradually into the yeast's recommended range", "Confirm instrument technique and temperature before diagnosing a stuck fermentation.", "Bottle immediately", "Add boiling water", "Add a random sanitizer"],
        ["There is no airlock movement, but the beer is warm and gravity is falling. What is likely?", "Fermentation is active, with gas escaping somewhere other than the airlock", "A leak can bypass the airlock; gravity decline indicates fermentation activity.", "A small leak or imperfect seal may let gas bypass the airlock", "The gravity change may be measurement error, so compare another reading consistently", "The fermenter may be venting through a path other than the airlock"],
        ["A gravity sample was taken with an unsanitized tool. What should you do next?", "Sanitize future sampling equipment and avoid returning samples", "The sample may have introduced contamination; do not add more risk by returning it.", "Keep the fermenter closed and monitor for signs of contamination", "Add a measured brewing sanitizer dose directly to the beer", "Package immediately before any contamination can develop"],
        ["A strong yeasty flavor is present in a young beer. What may help?", "Allow settling and conditioning time, then transfer carefully if appropriate", "Suspended yeast can contribute flavor; time and careful handling may improve the finished beer.", "Add more yeast", "Aerate it after fermentation", "Bottle before gravity is stable"],
        ["The beer has a medicinal flavor and you used chlorinated tap water. What should you investigate?", "Water treatment and chlorine or chloramine removal", "Disinfectants can contribute medicinal off-flavors; verify water treatment for future batches.", "Mash paddle length", "Bottle headspace only", "The yeast packet color"],
        ["A finished beer has a cardboard-like flavor. What is a likely process area to review?", "Oxygen exposure during transfer and packaging", "Oxidation is a common cause of papery or stale flavors; reduce oxygen pickup after fermentation.", "Mash temperature only", "Kettle size only", "The amount of calcium only"],
        ["Beer foams excessively when poured from a keg. What should you check?", "Serving pressure, beer temperature, line setup, and carbonation", "Keg balance and temperature influence pour behavior; check system setup before changing the beer.", "Mash pH only", "Original gravity only", "Bottle priming sugar"],
        ["Beer pours flat from a keg even though the CO₂ cylinder is open. What should you check?", "Gas connections, leaks, regulator setting, and time at temperature", "A leak or insufficient carbonation time can prevent the beer reaching target carbonation.", "The dry-hop schedule only", "The fermenter's airlock", "The grain crush"],
        ["A bottle gushes when opened, but the beer was packaged recently. What is a key concern?", "Possible ongoing fermentation or excessive priming sugar", "Gushing can have several causes; check fermentation completion, priming calculations, and cleanliness.", "The beer's color is too dark", "The mash was stirred too often", "The bottle label is too small"],
        ["Bottles show inconsistent carbonation across a batch. What might you review?", "Priming-sugar mixing, filling consistency, seals, and storage conditions", "Uneven sugar distribution or sealing and temperature differences can cause variable carbonation.", "The original grain crush only", "The hop alpha-acid content", "The fermenter's shape"],
        ["You want to taste a suspicious batch. What is a sensible safety approach?", "Do not taste beer with visible mold or other clear warning signs", "Visible fuzzy growth or concerning contamination signs warrant avoiding consumption and careful disposal.", "Taste a large amount to confirm", "Bottle it under pressure", "Add sanitizer and taste again"],
      ]).slice(8, 73),
      ...buildQuestions(createFermentationPracticeQuestions()),
    ],
  },
  "recipe-builder": {
    title: "Recipe Builder",
    subtitle: "Shape a beer by making thoughtful ingredient and process choices.",
    intro: "Answer seven random questions from a 100-question recipe pool. Choose ingredients and techniques that best fit the beer you want to brew, then learn why each choice matters.",
    source: "How to Brew, Chapters 3–8",
    questions: buildQuestions([
      ["You want a clean, pale ale with a crisp finish. Which grain bill is the best starting point?", "Use pale base malt for most of the fermentable extract, with only a small amount of specialty malt", "A pale base malt provides fermentable extract while a restrained specialty-malt share keeps the color and flavor light.", "Use pale base malt with a measured share of Vienna malt for more bread-like malt character", "Use pale base malt with a small crystal addition for a hint of caramel sweetness", "Use pale base malt with a small amount of light Munich malt for a rounder malt profile"],
      ["You want a darker beer with restrained roast character. What is a sensible recipe choice?", "Add a modest amount of a dark malt suited to smooth roast character", "A measured amount of an appropriate dark malt can add color and subtle roast without dominating the beer.", "Use a larger share of chocolate malt for deeper color and cocoa notes", "Use dark crystal malt for deeper color and caramel character rather than roast", "Use black patent malt for a sharper roast character at a restrained proportion"],
      ["You want to boost hop aroma with minimal additional bitterness. Which change is the best fit?", "Increase a suitable dry-hop addition", "Dry hopping emphasizes hop aroma without adding bitterness from a long boil.", "Increase a whirlpool addition while the wort is still hot enough to isomerize some alpha acids", "Move the existing aroma addition earlier for a longer hot steep", "Increase the early bittering charge and reduce the late-hop amount"],
      ["Your beer should have a more pronounced bitterness. Which recipe change most directly supports that goal?", "Increase the appropriately calculated early-boil bittering addition", "An early-boil addition gives alpha acids more time to isomerize; calculate the amount for the recipe and target.", "Use a lower-alpha hop at the same early-boil amount and timing", "Move part of the bittering charge to a late or whirlpool addition", "Increase the dry-hop charge without changing the boil schedule"],
      ["You want a fuller malt impression and caramel notes in an amber ale. Which adjustment is most appropriate?", "Add a measured portion of a suitable crystal malt", "Crystal malts can add caramel-like flavors and color; keep the amount balanced with the base malt.", "Increase light Munich malt for a richer bread-like malt note", "Add more pale base malt while keeping the specialty-malt share unchanged", "Use a small amount of toasted malt for a drier, biscuit-like impression"],
      ["You want a drier, more fermentable wort while keeping the grain bill similar. Which mash adjustment is a sensible starting point?", "Mash toward the lower end of the recipe's suitable temperature range", "A lower mash temperature generally favors more fermentable wort, though yeast strain and process also affect the finish.", "Mash toward the upper end of the suitable temperature range", "Use more dextrin malt to increase unfermentable extract", "Extend the mash at the same temperature without changing the grain bill"],
      ["You are choosing yeast for a beer where malt and hop character should stay prominent. What is a useful selection criterion?", "Choose a strain with a compatible fermentation range and a relatively neutral profile", "A suitable neutral strain can let the recipe's malt and hop character come through; match it to the beer and process.", "Choose a strain with moderate esters that complement rather than dominate the hops", "Choose a phenolic strain to add clove and spice alongside the malt", "Choose a neutral strain whose fermentation range fits the planned temperature"],
      ["The recipe's target original gravity is higher than your current recipe estimate. What is the most direct ingredient adjustment?", "Increase the fermentable grain or extract while keeping the target batch volume in mind", "More fermentable ingredient can raise wort strength; update the recipe and account for expected system efficiency.", "Increase the fermentable amount and reduce batch volume to concentrate the wort", "Replace some pale base malt with an equal weight of lower-extract specialty malt", "Improve expected mash efficiency and update the estimated gravity before changing ingredients"],
      ["You want a lighter-colored beer without lowering its target gravity. Which recipe decision most directly helps?", "Replace some dark specialty malt with pale base malt and recalculate to maintain gravity", "The malt bill is the main recipe choice for wort color; replacing darker malt with pale base malt can retain extract while reducing color.", "Reduce the dark malt without replacing its extract contribution", "Choose a lighter base malt but retain the same dark specialty-malt proportions", "Increase the crystal-malt share while reducing the pale base malt"],
      ["You want to keep hop flavor while reducing bitterness. Which change most directly targets the bitterness contribution?", "Reduce the calculated early-boil bittering addition while keeping late hops unchanged", "The early addition contributes much of the bitterness; retaining late additions helps preserve flavor and aroma.", "Move some of the late hop charge to an earlier boil addition", "Replace the early bittering hop with a higher-alpha variety at the same amount", "Increase the early-boil addition and shorten the dry-hop contact time"],
      ["You are adapting a recipe to a different batch volume. What should you do with ingredient amounts?", "Scale ingredients by the volume ratio, then review gravity, bitterness, and system losses", "Volume scaling is a starting point; efficiency, hop utilization, and equipment losses can change the final recipe.", "Scale the water but leave the grain and hop amounts unchanged", "Scale by the inverse of the volume ratio", "Scale the grain bill but leave the hop schedule unchanged"],
      ["Your recipe tastes too sweet and heavy in previous batches. Which mash change is a sensible first trial if the grain bill and yeast stay the same?", "Mash toward the cooler end of the suitable range to favor a more fermentable wort", "A cooler mash can increase wort fermentability; keep the yeast and grain bill fixed to evaluate that change.", "Mash toward the warmer end of the suitable range to leave more dextrins", "Extend the mash rest at the same temperature to increase body", "Raise mash temperature and reduce the rest time to lower residual sweetness"],
      ...createRecipePracticeQuestions(),
    ]),
  },
  "brew-math-lab": {
    title: "Brew Math Lab",
    subtitle: "Work through the numbers behind everyday brewing decisions.",
    intro: "Answer seven random questions from a 100-question calculation pool. Each explanation walks through a practical recipe or measurement calculation.",
    source: "How to Brew, Chapters 3, 6, 9, and 11",
    questions: buildQuestions(createMathPracticeQuestions("metric")),
  },
  "flavor-aroma": {
    title: "Flavor & Aroma",
    subtitle: "Connect sensory clues to the ingredients and process behind them.",
    intro: "Answer seven random questions from a 100-question sensory pool about familiar beer flavors and aromas, and discover what ingredients or fermentation choices can contribute to them.",
    source: "How to Brew, Chapters 3, 5–7, and 10",
    questions: buildQuestions([
      ["A Belgian ale yeast gives a beer fruity, banana-like notes. Which yeast-derived flavor family best fits?", "Fruity esters", "Belgian ale strains can produce fruity esters, including banana-like notes.", "Clove-like phenols", "Buttery diacetyl", "Solvent-like fusel alcohols", "How to Brew, Chapter 6 — Belgian ale yeast"],
      ["A wheat beer has a clove-like, spicy character. Which yeast-derived flavor family best fits?", "Phenols", "Weizen yeast can produce the distinctive clove and spice character of wheat beers.", "Fruity esters", "Buttery diacetyl", "Solvent-like fusel alcohols", "How to Brew, Chapter 6 — wheat beer yeast"],
      ["Which hop variety is specifically named in the pale-ale example for its distinct citrus aroma?", "Cascade", "Cascade is the variety named in the pale-ale example for its citrus aroma.", "Centennial", "Citra", "Amarillo", "How to Brew, Chapter 7 — Cascade hops"],
      ["You want a pale ale with a hint of sweet caramel that does not mask the hop finish. Which ingredient fits?", "A restrained amount of crystal malt", "The pale-ale recipe uses caramel malt to add a hint of sweet caramel.", "A small amount of light Munich malt for a bready note", "A restrained amount of dextrin malt for body and foam", "A small share of Vienna malt for a light toasted character", "How to Brew, Chapter 7 — pale ale recipe"],
      ["A recipe uses toasted, roasted, or chocolate malt. What kind of character are these malts chosen to contribute?", "Toasty, roasted, or chocolate-like malt flavor", "These malt types are used to create different beer flavors and aromas.", "Caramel-like sweetness from crystal malt", "Fruity or spicy notes from yeast", "Citrus aroma from late hops", "How to Brew, Chapter 3 — malt types"],
      ["A beer tastes buttery or like butterscotch. Which brewing compound is commonly associated with this flavor?", "Diacetyl", "Diacetyl can give beer butter or butterscotch notes; whether a small amount is welcome depends on the style.", "Acetaldehyde", "Fusel alcohols", "Oxidized compounds", "How to Brew, Chapter 6 — yeast compounds"],
      ["A beer has a green-apple aroma. Which fermentation compound may be responsible?", "Acetaldehyde", "Acetaldehyde is associated with green-apple aroma or flavor, and yeast can reduce it later in fermentation.", "Diacetyl", "Fusel alcohols", "Hydrogen sulfide", "How to Brew, Chapter 10 — fermentation byproducts"],
      ["An old beer tastes papery or like cardboard. Which process issue could explain it?", "Oxygen exposure during aging or packaging", "Oxidation of fatty acids in old beers can produce cardboard-like and soapy off-flavors.", "Light exposure that can cause a skunky character", "Warm fermentation that can create solvent-like flavors", "Chlorine exposure that can create medicinal flavors", "How to Brew, Chapter 6 — oxidation and off-flavors"],
      ["A lager has a sulfur smell during fermentation. What should you keep in mind?", "Lager-yeast sulfur may fade during conditioning", "Lager yeast can produce more sulfur compounds during primary fermentation, and sulfur smells are not necessarily bad.", "Dimethyl sulfide may create a cooked-corn note", "Hydrogen sulfide may smell like rotten eggs", "Sulfur dioxide may smell like struck matches", "How to Brew, Chapters 6 and 10 — yeast and lager fermentation"],
      ["A beer has a sharp, solvent-like aroma. Which fermentation byproduct is a likely cause?", "Fusel alcohols", "Fusel alcohols can produce sharp or solvent-like aromas, and their levels are affected by fermentation conditions.", "Acetaldehyde", "Diacetyl", "Hydrogen sulfide", "How to Brew, Chapter 10 — fusel alcohols"],
      ...createFlavorPracticeQuestions(),
    ]),
  },
};

if (Object.values(LEARNING_GAMES).some((game) => game.questions.length !== 100)) {
  throw new Error("Every Brewing Academy game must contain exactly 100 questions.");
}

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
          <BackButton />
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

type CalculatorOperator = "+" | "-" | "×" | "÷";

function BrewMathCalculator() {
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<CalculatorOperator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  function formatResult(value: number) {
    if (!Number.isFinite(value)) return "Error";
    return String(Number(value.toPrecision(10)));
  }

  function reset() {
    setDisplay("0");
    setStoredValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }

  function enterDigit(digit: string) {
    setDisplay((current) =>
      current === "Error" || waitingForOperand || current === "0"
        ? digit
        : current.length < 14
          ? current + digit
          : current,
    );
    setWaitingForOperand(false);
  }

  function enterDecimal() {
    if (display === "Error" || waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay((current) => current + ".");
    }
  }

  function calculate(left: number, right: number, operation: CalculatorOperator) {
    if (operation === "+") return left + right;
    if (operation === "-") return left - right;
    if (operation === "×") return left * right;
    return right === 0 ? Number.NaN : left / right;
  }

  function chooseOperator(nextOperator: CalculatorOperator) {
    const currentValue = Number(display);
    if (!Number.isFinite(currentValue)) {
      reset();
      return;
    }

    if (operator && storedValue !== null && !waitingForOperand) {
      const result = formatResult(calculate(storedValue, currentValue, operator));
      setDisplay(result);
      if (result === "Error") {
        setStoredValue(null);
        setOperator(null);
        setWaitingForOperand(true);
        return;
      }
      setStoredValue(Number(result));
    } else if (storedValue === null || !operator) {
      setStoredValue(currentValue);
    }

    setOperator(nextOperator);
    setWaitingForOperand(true);
  }

  function equals() {
    if (!operator || storedValue === null || waitingForOperand) return;
    const result = formatResult(calculate(storedValue, Number(display), operator));
    setDisplay(result);
    setStoredValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }

  function toggleSign() {
    if (display !== "Error" && Number(display) !== 0) {
      setDisplay((current) => String(-Number(current)));
    }
  }

  function applyPercent() {
    if (display !== "Error") {
      setDisplay((current) => formatResult(Number(current) / 100));
      setWaitingForOperand(false);
    }
  }

  function backspace() {
    if (display === "Error" || waitingForOperand) {
      setDisplay("0");
      setWaitingForOperand(false);
      return;
    }
    setDisplay((current) => {
      const shortened = current.slice(0, -1);
      return shortened === "" || shortened === "-" ? "0" : shortened;
    });
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const { key } = event;
    if (key === "Enter" && event.target instanceof HTMLButtonElement) return;
    if (/^\d$/.test(key)) enterDigit(key);
    else if (key === ".") enterDecimal();
    else if (key === "+" || key === "-") chooseOperator(key);
    else if (key === "*") chooseOperator("×");
    else if (key === "/") chooseOperator("÷");
    else if (key === "Enter" || key === "=") equals();
    else if (key === "Backspace") backspace();
    else if (key === "Escape" || key.toLowerCase() === "c") reset();
    else return;
    event.preventDefault();
  }

  const buttons: Array<{ label: string; action: () => void; style?: string; ariaLabel?: string }> = [
    { label: "C", action: reset, style: "bg-white/15 text-amber-100" },
    { label: "±", action: toggleSign, style: "bg-white/15" },
    { label: "%", action: applyPercent, style: "bg-white/15" },
    { label: "÷", action: () => chooseOperator("÷"), style: "bg-green-800 text-green-100" },
    { label: "7", action: () => enterDigit("7") },
    { label: "8", action: () => enterDigit("8") },
    { label: "9", action: () => enterDigit("9") },
    { label: "×", action: () => chooseOperator("×"), style: "bg-green-800 text-green-100" },
    { label: "4", action: () => enterDigit("4") },
    { label: "5", action: () => enterDigit("5") },
    { label: "6", action: () => enterDigit("6") },
    { label: "−", action: () => chooseOperator("-"), style: "bg-green-800 text-green-100", ariaLabel: "Subtract" },
    { label: "1", action: () => enterDigit("1") },
    { label: "2", action: () => enterDigit("2") },
    { label: "3", action: () => enterDigit("3") },
    { label: "+", action: () => chooseOperator("+"), style: "bg-green-800 text-green-100" },
    { label: "⌫", action: backspace, style: "bg-white/15", ariaLabel: "Backspace" },
    { label: "0", action: () => enterDigit("0") },
    { label: ".", action: enterDecimal },
    { label: "=", action: equals, style: "bg-green-600 text-white" },
  ];

  return (
    <section
      aria-labelledby="brew-math-calculator-title"
      className="mx-auto mt-5 max-w-xl rounded-xl border border-white/10 bg-white/5 p-5 text-left sm:p-6"
    >
      <h2 id="brew-math-calculator-title" className="font-semibold text-green-100">
        Calculator
      </h2>
      <div
        className="mx-auto mt-4 max-w-xs"
        onKeyDown={handleKeyDown}
        aria-label="Basic calculator. Use the buttons or keyboard."
      >
        <output
          aria-live="polite"
          className="mb-3 flex min-h-14 items-center justify-end overflow-hidden rounded-lg border border-white/10 bg-black/40 px-4 text-right text-2xl font-semibold tabular-nums text-white"
        >
          {display}
        </output>
        <div className="grid grid-cols-4 gap-2">
          {buttons.map((button) => (
            <button
              key={button.label}
              type="button"
              aria-label={button.ariaLabel ?? button.label}
              onClick={button.action}
              className={`min-h-12 rounded-lg border border-white/10 px-3 text-lg font-semibold transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300 ${button.style ?? "bg-white/5 text-white"}`}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LearningGamePage() {
  const params = useParams<{ game: string }>();
  const game = LEARNING_GAMES[params.game];
  const { system: unitSystem } = useUnits();
  const activeQuestions = useMemo(
    () =>
      params.game === "brew-math-lab"
        ? buildQuestions(createMathPracticeQuestions(unitSystem))
        : game?.questions ?? [],
    [game, params.game, unitSystem],
  );
  const [attemptQuestions, setAttemptQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [missedAnswers, setMissedAnswers] = useState<MissedAnswerReview[]>([]);
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [savedMissedQuestions, setSavedMissedQuestions] = useState<
    Record<string, number>
  >({});
  const [progressMessage, setProgressMessage] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const lastQuestionByGame = useRef<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadSavedMisses() {
      try {
        const response = await fetch("/api/learning-progress", {
          cache: "no-store",
        });
        if (response.status === 401) {
          if (active) {
            setProgressMessage("Sign in to save scores and practice missed questions across devices.");
          }
          return;
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load saved learning progress.");
        }
        const row = result.progress.find(
          (entry: { game_id: string }) => entry.game_id === params.game
        );
        if (active && row?.missed_question_counts) {
          setSavedMissedQuestions(row.missed_question_counts);
          setProgressMessage("");
        }
      } catch (loadError) {
        console.error("Could not load saved Brewing Academy misses", loadError);
        if (active) {
          setProgressMessage(
            loadError instanceof Error
              ? `Progress tracker unavailable: ${loadError.message}`
              : "Progress tracker unavailable."
          );
        }
      }
    }

    if (game) void loadSavedMisses();
    return () => {
      active = false;
    };
  }, [game, params.game]);

  function startGame(questionPool = activeQuestions, retry = false) {
    const previousPrompt = lastQuestionByGame.current[params.game];
    const previousPromptKey = previousPrompt ? questionPromptKey(previousPrompt) : null;
    const uniquePool = uniqueQuestionsByPrompt(questionPool);
    const eligiblePool = uniquePool.filter(
      (question) => questionPromptKey(question.prompt) !== previousPromptKey,
    );
    const fallbackPool = uniqueQuestionsByPrompt(activeQuestions).filter(
      (question) => questionPromptKey(question.prompt) !== previousPromptKey,
    );
    const questionsToDraw = eligiblePool.length > 0 ? eligiblePool : fallbackPool;
    const selectedQuestions = shuffle(questionsToDraw).slice(0, 7).map((question) => ({
      ...question,
      answers: shuffle(question.answers),
    }));
    if (selectedQuestions[0]) {
      lastQuestionByGame.current[params.game] = selectedQuestions[0].prompt;
    }
    setAttemptQuestions(selectedQuestions);
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setHintVisible(false);
    setFinished(false);
    setMissedAnswers([]);
    setIsRetryRound(retry);
    setProgressMessage("");
    setStarted(true);
  }

  function chooseAnswer(answerIndex: number) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    const question = attemptQuestions[questionIndex];
    const selected = question.answers[answerIndex];
    if (selected.correct) {
      setScore((current) => current + 1);
    } else {
      const correctAnswer = question.answers.find((answer) => answer.correct);
      if (correctAnswer) {
        setMissedAnswers((current) => [
          ...current,
          {
            prompt: question.prompt,
            selected: plainLanguageAnswer(selected.text),
            correctAnswer: plainLanguageAnswer(correctAnswer.text),
            explanation: correctAnswer.feedback,
            source: question.source ?? game.source,
          },
        ]);
      }
    }
  }

  async function saveAttempt() {
    setSavingProgress(true);
    setProgressMessage("");
    try {
      const response = await fetch("/api/learning-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: params.game,
          score,
          total_questions: attemptQuestions.length,
          missed_questions: missedAnswers.map((missed) => missed.prompt),
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setProgressMessage("Sign in to save your score and practice missed questions next time.");
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || "Could not save learning progress.");
      }
      const updatedMisses = { ...savedMissedQuestions };
      for (const missed of missedAnswers) {
        updatedMisses[missed.prompt] = (updatedMisses[missed.prompt] ?? 0) + 1;
      }
      setSavedMissedQuestions(updatedMisses);
      setProgressMessage("Progress saved to your private account tracker.");
    } catch (saveError) {
      console.error("Could not save Brewing Academy attempt", saveError);
      setProgressMessage(
        saveError instanceof Error
          ? `Progress could not be saved: ${saveError.message}`
          : "Progress could not be saved."
      );
    } finally {
      setSavingProgress(false);
    }
  }

  function continueGame() {
    if (questionIndex + 1 === attemptQuestions.length) {
      setFinished(true);
      setStarted(false);
      if (isRetryRound) {
        setProgressMessage("Practice round complete. This retry does not change your saved stats.");
      } else {
        void saveAttempt();
      }
      return;
    }
    lastQuestionByGame.current[params.game] = attemptQuestions[questionIndex + 1].prompt;
    setQuestionIndex((current) => current + 1);
    setSelectedAnswer(null);
    setHintVisible(false);
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
              {activeQuestions.length} questions · 7 random questions per attempt
            </p>
            {params.game === "brew-math-lab" && (
              <p className="mt-2 text-center text-xs text-white/55">
                Question measurements use {unitSystem === "metric" ? "metric (L, kg, g)" : "imperial (gal, lb, oz)"} units.
              </p>
            )}
            {progressMessage && (
              <p
                role="status"
                className="mt-3 text-center text-xs leading-5 text-white/55"
              >
                {progressMessage}
              </p>
            )}
            <button
              type="button"
              onClick={() => startGame()}
              className="mt-6 min-h-11 w-full rounded-lg bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
            >
              Start challenge
            </button>
            {Object.keys(savedMissedQuestions).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const savedQuestions = activeQuestions
                    .filter((savedQuestion) => savedMissedQuestions[savedQuestion.prompt] > 0)
                    .sort(
                      (left, right) =>
                        (savedMissedQuestions[right.prompt] ?? 0) -
                        (savedMissedQuestions[left.prompt] ?? 0)
                    );
                  if (savedQuestions.length > 0) startGame(savedQuestions, true);
                }}
                className="mt-3 min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-white/10"
              >
                Practice saved misses (
                {
                  activeQuestions.filter(
                    (savedQuestion) => savedMissedQuestions[savedQuestion.prompt] > 0
                  ).length
                }
                )
              </button>
            )}
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
              {plainLanguageQuestion(question.prompt)}
            </h2>
            {params.game === "brew-math-lab" && question.hint && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  aria-expanded={hintVisible}
                  onClick={() => setHintVisible((visible) => !visible)}
                  className="min-h-10 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-white/10"
                >
                  {hintVisible ? "Hide hint" : "Show hint"}
                </button>
                {hintVisible && (
                  <p className="mt-2 rounded-lg border border-amber-200/15 bg-amber-950/20 p-3 text-left text-sm leading-6 text-amber-100/90">
                    Hint: {question.hint}
                  </p>
                )}
              </div>
            )}
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
                    {plainLanguageAnswer(answer.text)}
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
                <p className="mt-3 text-xs text-white/50">
                  Source: <SourceCitation source={question.source ?? game.source} />
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
              {isRetryRound
                ? "Try another round or return to the full challenge."
                : "Review missed answers or try another round to strengthen what you learned."}
            </p>
            <p
              role="status"
              className="mt-3 min-h-5 text-xs text-white/55"
              aria-live="polite"
            >
              {savingProgress ? "Saving progress…" : progressMessage}
            </p>
            {missedAnswers.length > 0 ? (
              <section
                aria-labelledby="missed-answers-title"
                className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4 text-left"
              >
                <h2
                  id="missed-answers-title"
                  className="font-semibold text-amber-100"
                >
                  Review missed answers
                </h2>
                <ol className="mt-3 space-y-4">
                  {missedAnswers.map((missed, index) => (
                    <li
                      key={`${missed.prompt}-${index}`}
                      className="border-t border-white/10 pt-3 first:border-0 first:pt-0"
                    >
                      <p className="text-sm font-medium leading-6 text-white/85">
                        {plainLanguageQuestion(missed.prompt)}
                      </p>
                      <p className="mt-1 text-xs text-amber-100/75">
                        Your answer: {missed.selected}
                      </p>
                      <p className="mt-1 text-sm text-green-100">
                        Correct answer: {missed.correctAnswer}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/60">
                        {missed.explanation}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Source: <SourceCitation source={missed.source ?? game.source} />
                      </p>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => startGame(
                    missedAnswers
                      .map((missed) => activeQuestions.find((item) => item.prompt === missed.prompt))
                      .filter((item): item is Question => item !== undefined),
                    true
                  )}
                  className="mt-4 min-h-10 w-full rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                >
                  Practice missed questions
                </button>
              </section>
            ) : (
              <p className="mt-4 text-sm text-green-200">
                Great work—you got every question in this round right.
              </p>
            )}
            <button
              type="button"
              onClick={() => startGame()}
              className="mt-3 min-h-11 w-full rounded-lg bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
            >
              {isRetryRound ? "Start full challenge" : "Play again"}
            </button>
          </div>
        )}
      </section>
      {params.game === "brew-math-lab" && <BrewMathCalculator />}
      <div className="mt-5 text-center">
        <Link href="/games" className="text-sm text-white/55 underline underline-offset-4 hover:text-green-200">
          Back to learning challenges
        </Link>
      </div>
    </LearningGameFrame>
  );
}
