export const motdList = [
  "The brewery smells amazing today 🍻",
  "Ready to make some magic in the vessels again? 🔥",
  "Let’s brew something that makes people smile 😎",
  "Your batches missed you, honestly 🍯",
  "Time to wake up the yeast again 🍻",
  "Your vessels are standing by like soldiers at sunset ⚔️",
  "You know what to do — let’s brew 💪",
  "The brewery comes alive when you log in 🌅",
  "It’s a good day for mead 🍯",
  "Let’s brew something that tastes like summer 🌴",
  "Always brew with heart ❤️",
  "You’re back — quality incoming 🍻",
  "Ready for some brewery magic again? ✨",
  "Your vessels have been waiting patiently 😌",
  "Let’s give the yeast something to work with 💥",
  "The brewery is cooler when you’re here 😎",
  "You brew like a legend ⚔️",
  "The brewhouse wakes up when you arrive 🔥",
  "Let’s brew something that tastes like adventure 🌙",
  "Your batches have missed you 🍯",
  "You’re back — things are happening 💪",
  "Your vessels are ready for the next chapter 📖",
  "Let’s brew something that makes people say wow 😮",
  "The brewery is in good hands now 🛡️",
  "You brew like you were taught by the gods ⚡",
  "Let’s brew something that warms the soul 🔥",
  "Brew with pride 🍻",
  "You’re back — the yeast is cheering 🎉",
  "Your vessels are ready for battle ⚔️",
  "Let’s brew something that tastes like sunshine 🌞",
  "The brewery appreciates you 😎",
  "You’re back — quality is guaranteed 🍯",
  "Let’s brew something that makes people dance 💃",
  "Brew like you mean it 💥",
  "Your vessels are ready for new adventures 🌄",
  "You’re back — good vibes incoming 🍻",
  "Let’s brew something that tastes like freedom 🌬️",
  "The brewery wakes up when you log in 🔥",
  "You brew like a champion 🏆",
  "Let’s brew something that tastes like joy 😌",
  "Your vessels are ready for action ⚡",
  "You’re back — things just got serious 💪",
  "Let’s brew something that tastes like summer rain 🌧️",
  "The brewery smiles when you walk in 😄",
  "You brew like a master 👑",
  "Let’s brew something that tastes like dreams 🌙",
  "Your vessels are always ready for you 🍯",
  "You’re back — time for magic ✨",
  "Let’s brew something that tastes like victory 🏆",
  "The brewery missed you more than you know 😌",
  "You’re back — craftsmanship incoming 💪",
  "Let’s brew something that tastes like sunset 🌇",
  "Your vessels warm up when you arrive 🔥",
  "You brew like a true craftsman 🛠️",
  "Let’s brew something that tastes like peace 🌿",
  "The brewery is quiet without you 🍻",
  "You’re back — time to bring life 💥",
  "Let’s brew something that tastes like spring 🌱",
  "Your vessels are ready for a little love ❤️",
  "You brew like someone who knows exactly what they’re doing 😎",
  "Let’s brew something that tastes like mountain air 🏔️",
  "The brewery opens its arms when you walk in 🤝",
  "You’re back — high‑level craftsmanship incoming 🏆",
  "Let’s brew something that tastes like warm hands 🔥",
  "Your vessels are ready for a new story 📜",
  "You brew like someone with brewing in their blood 👴",
  "Let’s brew something that tastes like pure joy 😄",
  "The brewery gets better every time you log in 🍻",
  "You’re back — real quality incoming 💎",
  "Let’s brew something that tastes like the northern lights 🌌",
  "Your vessels are ready for a little magic ✨",
  "You brew like someone who loves the craft ❤️",
  "Let’s brew something that tastes like ocean breeze 🌊",
  "The brewery is proud of you 🏅",
  "You’re back — good vibes incoming 🔥",
  "Let’s brew something that tastes like autumn 🍂",
  "Your vessels are ready for another round ⚡",
  "You brew like someone with brewing in their veins 🩸",
  "Let’s brew something that tastes like winter comfort ❄️",
  "The brewery lights up when you walk in 🌟",
  "You’re back — time for real craftsmanship 💪",
  "Let’s brew something that tastes like spring sunshine 🌞",
  "Your vessels are ready for action again 🔥",
  "You brew like someone who never gives up 💥",
  "Let’s brew something that tastes like good vibes 😌",
  "The brewery is happy to see you 🍻",
  "You’re back — time for quality time 💛",
  "Let’s brew something that tastes like pure inspiration ✨",
  "Your vessels are ready for you 🤝",
  "You brew like someone who found their calling 😎",
  "Let’s brew something that tastes like true craftsmanship 🛠️",
  "The brewery feels alive when you’re here 🔥",
  "You’re back — high‑level brewing incoming 🏆",
  "Let’s brew something that tastes like adventure in a glass 🍯",
  "Your vessels are ready to shine 🌟",
  "You brew like someone born for this ⚔️",
  "Let’s brew something that tastes like pure happiness 😄",
  "The brewery feels complete when you’re here 🍻"
];

function shuffle(array: string[]) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getNextMotd() {
  if (typeof window === "undefined") {
    return motdList[0];
  }

  let shuffled = JSON.parse(localStorage.getItem("motd_shuffled") || "null");
  let pointer = Number(localStorage.getItem("motd_pointer") || "0");

  if (!shuffled || shuffled.length !== motdList.length) {
    shuffled = shuffle(motdList);
    pointer = 0;
  }

  const motd = shuffled[pointer];

  pointer++;

  if (pointer >= shuffled.length) {
    shuffled = shuffle(motdList);
    pointer = 0;
  }

  localStorage.setItem("motd_shuffled", JSON.stringify(shuffled));
  localStorage.setItem("motd_pointer", String(pointer));

  return motd;
}
