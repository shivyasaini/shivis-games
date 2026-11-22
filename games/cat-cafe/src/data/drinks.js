// Step types:
//  pick  – choose the right ingredient from three options
//  tap   – click the button `count` times
//  hold  – press and hold to fill the bar, release inside the target zone [lo, hi]
//  timer – the bar fills on its own over `secs`; stop it inside the zone (past 100% = burnt)
//  stir  – press and move the pointer around inside the bowl until the meter fills
export const DRINKS = [
  {
    id: "latte", name: "Latte", emoji: "☕", price: 6,
    steps: [
      { type: "pick", label: "Grab the coffee beans", answer: "🫘", options: ["🫘", "🍵", "🍫"] },
      { type: "tap", label: "Grind the beans", icon: "⚙️", count: 6 },
      { type: "hold", label: "Pull the espresso", icon: "☕", lo: 58, hi: 80, hint: "Release in the golden zone" },
      { type: "hold", label: "Steam the milk", icon: "🥛", lo: 68, hi: 90, hint: "Nice and foamy, not boiling" },
      { type: "stir", label: "Pour the latte art", icon: "🌿", target: 1200, hint: "Swirl the pointer around the cup" },
    ],
  },
  {
    id: "matcha", name: "Matcha", emoji: "🍵", price: 7,
    steps: [
      { type: "pick", label: "Grab the matcha powder", answer: "🍵", options: ["🍫", "🍵", "🫘"] },
      { type: "tap", label: "Sift the matcha", icon: "🥄", count: 5 },
      { type: "hold", label: "Add hot water", icon: "💧", lo: 40, hi: 62, hint: "Just a little, not too much" },
      { type: "stir", label: "Whisk until frothy", icon: "🧹", target: 1600, hint: "Fast zig-zags make the best foam" },
    ],
  },
  {
    id: "cocoa", name: "Hot Cocoa", emoji: "🍫", price: 6,
    steps: [
      { type: "pick", label: "Grab the chocolate", answer: "🍫", options: ["🍯", "🍫", "🍵"] },
      { type: "timer", label: "Warm the milk", icon: "🥛", secs: 5, lo: 60, hi: 86, hint: "Stop before it boils over!" },
      { type: "stir", label: "Melt in the chocolate", icon: "🥄", target: 1100, hint: "Stir until it's glossy" },
      { type: "tap", label: "Top with marshmallows", icon: "🍡", count: 4 },
    ],
  },
  {
    id: "cake", name: "Honey Cake", emoji: "🍰", price: 5,
    baking: true,
    steps: [
      { type: "pick", label: "Grab the honey", answer: "🍯", options: ["🍯", "🫘", "🍫"] },
      { type: "stir", label: "Mix the batter", icon: "🥣", target: 1500, hint: "Round and round until smooth" },
      { type: "hold", label: "Pour into the tin", icon: "🫙", lo: 66, hi: 88, hint: "Fill it up, but don't overflow" },
      { type: "timer", label: "Bake in the oven", icon: "🔥", secs: 7, lo: 74, hi: 92, hint: "Take it out when it's golden" },
      { type: "tap", label: "Drizzle honey on top", icon: "🍯", count: 3 },
    ],
  },
  {
    id: "boba", name: "Milk Tea", emoji: "🧋", price: 8,
    steps: [
      { type: "pick", label: "Grab the tea leaves", answer: "🫖", options: ["🫖", "🍫", "🍯"] },
      { type: "timer", label: "Steep the tea", icon: "🫖", lo: 55, hi: 82, secs: 5, hint: "Too long and it goes bitter" },
      { type: "tap", label: "Scoop the boba pearls", icon: "⚫", count: 5 },
      { type: "hold", label: "Add the milk", icon: "🥛", lo: 48, hi: 70, hint: "Leave room for ice" },
      { type: "stir", label: "Shake it up", icon: "🧋", target: 1300, hint: "Shake shake shake!" },
    ],
  },
];

export const drinkById = (id) => DRINKS.find((d) => d.id === id);

export function ratingFor(q) {
  if (q >= 0.9) return { label: "Perfect!", stars: "★★★", key: "perfect" };
  if (q >= 0.65) return { label: "Good", stars: "★★☆", key: "good" };
  return { label: "Hmm…", stars: "★☆☆", key: "meh" };
}
