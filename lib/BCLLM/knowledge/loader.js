// Cloudflare Worker compatible knowledge loader
// No fs, no path, no dynamic imports — everything is bundled statically

import commonKnowledge from "./commonKnowledge.js";
import homebrewersassociation_mead from "./homebrewersassociation_mead.js";
import howtobrew_section1_ch1 from "./howtobrew_section1_ch1.js";
import howtobrew_section1_ch2 from "./howtobrew_section1_ch2.js";
import howtobrew_section1_ch3 from "./howtobrew_section1_ch3.js";
import howtobrew_section1_ch4 from "./howtobrew_section1_ch4.js";
import howtobrew_section1_ch5 from "./howtobrew_section1_ch5.js";
import howtobrew_section1_ch6 from "./howtobrew_section1_ch6.js";
import howtobrew_section1_ch7 from "./howtobrew_section1_ch7.js";
import howtobrew_section1_ch8 from "./howtobrew_section1_ch8.js";
import howtobrew_section1_ch9 from "./howtobrew_section1_ch9.js";
import howtobrew_section1_ch10 from "./howtobrew_section1_ch10.js";
import howtobrew_section1_ch11 from "./howtobrew_section1_ch11.js";
import knowledge_mal from "./knowledge_mal.js";
import meadHoneytoWaterRatio from "./meadHoneytoWaterRatio.js";

export async function loadKnowledge() {
  return `
${commonKnowledge}

${homebrewersassociation_mead}

${howtobrew_section1_ch1}
${howtobrew_section1_ch2}
${howtobrew_section1_ch3}
${howtobrew_section1_ch4}
${howtobrew_section1_ch5}
${howtobrew_section1_ch6}
${howtobrew_section1_ch7}
${howtobrew_section1_ch8}
${howtobrew_section1_ch9}
${howtobrew_section1_ch10}
${howtobrew_section1_ch11}

${knowledge_mal}

${meadHoneytoWaterRatio}
`.trim();
}
