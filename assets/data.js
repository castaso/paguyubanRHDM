/* Paguyuban RHDM, content model (mock data).
   Swap these arrays for a real source later; every page reads from here. */
(function () {
  "use strict";

  var CATEGORIES = [
    { id: "handmade",   label: "Handmade" },
    { id: "secondhand", label: "Second-hand" },
    { id: "services",   label: "Services" },
    { id: "produce",    label: "Produce" },
    { id: "rentals",    label: "Rentals" },
    { id: "digital",    label: "Digital" }
  ];

  var NOTEBOOK_URL = "https://notebook.google.com/notebook/2983b39b-e5cd-41e3-9b9f-e0c2cede3f54";

  var MEMBERS = [
    { id: "pearl-alder", name: "Pearl Alder", branch: "Grandparents", role: "Keeper of the recipes", place: "Coyote Creek, OR", initials: "PA", tint: "--tint-6", bio: "Still the person everyone calls when a recipe has gone missing. Holds the original cinnamon-knot method and will not be rushed." },
    { id: "al-alder", name: "Al Alder", branch: "Grandparents", role: "Grows more tomatoes than anyone can eat", place: "Coyote Creek, OR", initials: "AA", tint: "--tint-2", bio: "The orchard, the hens, and more tomatoes than a barn can hold. Turns eighty this year and has already forbidden speeches." },
    { id: "june-whitlock", name: "June Whitlock", branch: "Second branch", role: "Sourdough, e-books, and unsolicited advice", place: "Tacoma, WA", initials: "JW", tint: "--tint-1", bio: "Keeper of the family starter since 2011. Types things down so nobody has to guess twice." },
    { id: "ray-whitlock", name: "Ray Whitlock", branch: "Second branch", role: "Furniture rescue", place: "Tacoma, WA", initials: "RW", tint: "--tint-3", bio: "Refinishes tables, rebuilds chairs, and is honest about the water rings. Pickup only, he will help you load it." },
    { id: "nora-alder", name: "Nora Alder", branch: "Third branch", role: "Knits, runs, ships things", place: "Bend, OR", initials: "NA", tint: "--tint-4", bio: "Merino socks made to order, and the first of us to finish the Bend half. Already signed up for the full one." },
    { id: "theo-alder", name: "Theo Alder", branch: "Third branch", role: "Guitar teacher, bad at email", place: "Bend, OR", initials: "TA", tint: "--tint-5", bio: "Lessons for anyone in the family who asks. Replies to email eventually. Better in person." },
    { id: "priya-raman", name: "Priya Raman", branch: "Fourth branch", role: "Photographs everything", place: "Boise, ID", initials: "PR", tint: "--tint-5", bio: "The albums exist because she keeps taking pictures. First photos of Ivy are hers." },
    { id: "dev-okafor", name: "Dev Okafor", branch: "Fourth branch", role: "Cameras and camping gear", place: "Boise, ID", initials: "DO", tint: "--tint-4", bio: "Lends the good camera and the trailer when it is free. Knows which tent still has all its pegs." },
    { id: "grandma-ivy", name: "Grandma Ivy", branch: "Grandparents", role: "Newest member, best sleeper", place: "Boise, ID", initials: "GI", tint: "--tint-1", bio: "Born on the fourth, eight pounds, already the calmest member of the fourth branch." },
    { id: "marcus-alder", name: "Marcus Alder", branch: "Second branch", role: "Keeps the site running", place: "Tacoma, WA", initials: "MA", tint: "--tint-3", bio: "The organiser. News, dates, and the market all pass through him. Email him if something should be on the site." }
  ];

  var LISTINGS = [
    {
      id: "oak-dining-table",
      title: "Solid oak dining table, seats eight",
      category: "secondhand",
      price: 240, priceUnit: "",
      condition: "Well loved",
      seller: "Ray Whitlock", place: "Tacoma, WA",
      posted: "2026-09-12", tint: "--tint-3",
      blurb: "Refinished last spring. Long enough for the whole second branch, honest enough about the water ring on one corner.",
      details: [
        "182 × 92 cm, seats eight comfortably",
        "Solid oak, refinished 2025",
        "One water ring on the north corner, photographed",
        "Pickup only; we can help you load it"
      ],
      tags: ["furniture", "pickup", "refinished"]
    },
    {
      id: "sourdough-starter",
      title: "Sourdough starter + the one-page guide",
      category: "handmade",
      price: 12, priceUnit: "",
      condition: "New",
      seller: "June Whitlock", place: "Tacoma, WA",
      posted: "2026-09-11", tint: "--tint-6",
      blurb: "A jar of the starter that has been in the family since 2011, plus the laminated sheet that actually explains how to keep it alive.",
      details: [
        "Active starter, ready to feed",
        "One-page feeding guide included",
        "Bring your own jar or take one of mine",
        "Free refill if it dies in the first month, that is on you though"
      ],
      tags: ["bread", "kitchen", "beginner-friendly"]
    },
    {
      id: "handknit-wool-socks",
      title: "Hand-knit wool socks, made to order",
      category: "handmade",
      price: 38, priceUnit: "/ pair",
      condition: "New",
      seller: "Nora Alder", place: "Bend, OR",
      posted: "2026-09-09", tint: "--tint-1",
      blurb: "Merino, machine-washable by accident and dryer-safe by no means. Tell me your size and your colours and I will get going.",
      details: [
        "100% merino, two-ply",
        "Sizes 36-47 EU",
        "Pick your colour stripe",
        "Two-week turnaround in reunion season"
      ],
      tags: ["knitting", "winter", "made-to-order"]
    },
    {
      id: "beginner-guitar-lessons",
      title: "Beginner guitar lessons, 30 minutes",
      category: "services",
      price: 25, priceUnit: "/ session",
      condition: "n/a",
      seller: "Theo Alder", place: "Bend, OR",
      posted: "2026-09-08", tint: "--tint-4",
      blurb: "For anyone who got a guitar for their birthday and has not touched it since. Video call or in person when you are in town.",
      details: [
        "30 minutes, video or in person",
        "First session free for anyone under 16",
        "Bring a guitar that stays in tune",
        "I am slow to reply to email, text instead"
      ],
      tags: ["music", "lessons", "kids-welcome"]
    },
    {
      id: "backyard-eggs",
      title: "Backyard eggs, dozen",
      category: "produce",
      price: 6, priceUnit: "/ dozen",
      condition: "Fresh",
      seller: "Pearl Alder", place: "Coyote Creek, OR",
      posted: "2026-09-07", tint: "--tint-6",
      blurb: "Six hens, more eggs than two people can reasonably eat. Collect at the gate; the box is on the porch.",
      details: [
        "Mixed-brown, collected daily",
        "Honour box on the porch",
        "Limit two dozen a week so everyone gets some",
        "No eggs the week of the reunion, the hens get a break too"
      ],
      tags: ["eggs", "weekly", "porch-pickup"]
    },
    {
      id: "trailer-loan-july",
      title: "Camping trailer loan, one week",
      category: "rentals",
      price: 0, priceUnit: "",
      condition: "Borrow",
      seller: "Dev Okafor", place: "Boise, ID",
      posted: "2026-09-05", tint: "--tint-2",
      blurb: "Sleeps four, tows fine behind anything with a hitch. Free to family, I just want it back with the water tank emptied.",
      details: [
        "Sleeps four, small kitchenette",
        "Booked for reunion week, ask for another week",
        "Return with water tank emptied and interior swept",
        "You arrange the hitch and the insurance"
      ],
      tags: ["camping", "borrow", "free-to-family"]
    },
    {
      id: "recipe-ebook",
      title: "The RHDM Recipe Book (PDF)",
      category: "digital",
      price: 8, priceUnit: "",
      condition: "New",
      seller: "June Whitlock", place: "Tacoma, WA",
      posted: "2026-09-04", tint: "--tint-5",
      blurb: "Forty-one recipes collected over three reunions, typed up properly. Includes the green tomato relish that nobody wrote down for years.",
      details: [
        "41 recipes, 68 pages, PDF",
        "Delivered by email after you send the money",
        "Print-friendly layout",
        "Free to anyone who contributed a recipe"
      ],
      tags: ["recipes", "pdf", "gift"]
    },
    {
      id: "vintage-film-camera",
      title: "Vintage film camera, fully working",
      category: "secondhand",
      price: 85, priceUnit: "",
      condition: "Good",
      seller: "Dev Okafor", place: "Boise, ID",
      posted: "2026-09-02", tint: "--tint-4",
      blurb: "Serviced this spring, light seals replaced, shutter accurate. Comes with two rolls so you can start immediately.",
      details: [
        "35mm SLR, 50mm f/1.8 lens",
        "Serviced spring 2026, light seals replaced",
        "Two rolls of film included",
        "Happy to walk you through your first roll"
      ],
      tags: ["photography", "film", "serviced"]
    },
    {
      id: "tomato-seedlings",
      title: "Tomato seedlings, six-pack",
      category: "produce",
      price: 5, priceUnit: "/ pack",
      condition: "Ready to plant",
      seller: "Al Alder", place: "Coyote Creek, OR",
      posted: "2026-08-30", tint: "--tint-2",
      blurb: "San Marzano and cherry, hardened off and itching to go in the ground. I started too many again.",
      details: [
        "Six seedlings per pack, mixed varieties",
        "Hardened off and ready for the ground",
        "Bring a flat to carry them",
        "Ask me anything, I will tell you anyway"
      ],
      tags: ["gardening", "spring", "vegetables"]
    },
    {
      id: "photo-retouching",
      title: "Wedding & reunion photo retouching",
      category: "services",
      price: 60, priceUnit: "/ batch",
      condition: "n/a",
      seller: "Priya Raman", place: "Boise, ID",
      posted: "2026-08-28", tint: "--tint-5",
      blurb: "Send me the ones you would frame. I fix colour, dust, and the uncle who blinked, and send back print-ready files.",
      details: [
        "Up to 25 photos per batch",
        "Colour, dust, and basic restoration",
        "Print-ready files returned in a week",
        "Family discount is the price you see"
      ],
      tags: ["photography", "restoration", "printing"]
    },
    {
      id: "jigsaw-and-drill",
      title: "Jigsaw + drill, lend for a weekend",
      category: "rentals",
      price: 0, priceUnit: "",
      condition: "Borrow",
      seller: "Ray Whitlock", place: "Tacoma, WA",
      posted: "2026-08-26", tint: "--tint-3",
      blurb: "Good tools, better if they get used. Lend them for a weekend, bring them back with the bits still in the box.",
      details: [
        "Corded jigsaw and 18V drill",
        "Two batteries, charger, assorted bits",
        "Weekend loans, longer by arrangement",
        "Please do not lend them onward without asking"
      ],
      tags: ["tools", "borrow", "weekend"]
    },
    {
      id: "green-tomato-relish",
      title: "Green tomato relish, jar",
      category: "handmade",
      price: 7, priceUnit: "/ jar",
      condition: "New",
      seller: "Pearl Alder", place: "Coyote Creek, OR",
      posted: "2026-08-24", tint: "--tint-1",
      blurb: "Made the week the frost came early. The recipe is finally written down, this is the batch that made us write it down.",
      details: [
        "500 ml jar, properly sealed",
        "Keeps a year in a cool cupboard",
        "Pairs with everything, especially eggs",
        "Recipe is in the new family book"
      ],
      tags: ["preserves", "kitchen", "autumn"]
    }
  ];

  var EVENTS = [
    { date: "2026-09-27", title: "Sunday roast + video call", place: "Everyone, wherever you are", kind: "Recurring", note: "Camera on at 6pm. Pearl is doing the lamb and narrating it.", going: 14 },
    { date: "2026-10-10", title: "Cousins' board game night", place: "Nora and Theo's place, Bend", kind: "In person", note: "Bring a snack and a grudge. Settlers has been banned after last time.", going: 7 },
    { date: "2026-11-02", title: "Grandpa Al's 80th", place: "Coyote Creek barn", kind: "Milestone", note: "Potluck. Al has asked for no speeches and will be getting speeches.", going: 31 },
    { date: "2026-11-21", title: "Harvest potluck + market day", place: "Coyote Creek barn", kind: "Market day", note: "Bring whatever you have too much of. Tables set up at ten.", going: 22 },
    { date: "2026-12-19", title: "Alder reunion weekend", place: "Coyote Creek, OR", kind: "Reunion", note: "Cabins booked. Trailer is spoken for. Recipes due to June by the 1st.", going: 38 }
  ];

  var NEWS = [
    { date: "2026-09-14", title: "Nora finished the Bend half-marathon", author: "Marcus Alder", tag: "Milestones", excerpt: "Third time entered, first time finished, and according to Theo she has already signed up for the full one." },
    { date: "2026-09-11", title: "The cabin kitchen is finally done", author: "Ray Whitlock", tag: "Projects", excerpt: "Two summers, one very stubborn chimney, and a countertop that turned out to be oak all along. Photos in the album." },
    { date: "2026-09-08", title: "Welcome, Ivy", author: "Priya Raman", tag: "New arrivals", excerpt: "Born on the fourth, eight pounds, already the calmest member of the fourth branch. First photos are up." },
    { date: "2026-09-02", title: "The market passed forty listings", author: "Marcus Alder", tag: "Site news", excerpt: "Started with two bags of tomatoes. Now there is a trailer, a camera, and a recipe book on here." },
    { date: "2026-08-27", title: "Green tomato relish: recipe recovered", author: "June Whitlock", tag: "Kitchen", excerpt: "Pearl made it, we ate it, nobody wrote it down for eleven years. It is written down now." }
  ];

  var RECIPES = [
    { title: "Pearl's cinnamon knots", by: "Pearl Alder", minutes: 180, tags: ["Baking", "Sunday"], note: "The ones that show up at every reunion. Dough rests overnight, do not rush it." },
    { title: "Coyote Creek chili", by: "Al Alder", minutes: 120, tags: ["Dinner", "Big batch"], note: "Feeds a barn. Al insists on the coffee in it and will not be negotiating." },
    { title: "June's sourdough, properly written down", by: "June Whitlock", minutes: 1440, tags: ["Bread", "Slow"], note: "The one-page guide that comes with the starter, typed out for anyone who lost theirs." },
    { title: "Green tomato relish", by: "Pearl Alder", minutes: 90, tags: ["Preserves", "Autumn"], note: "Recovered in 2026 after eleven years of everyone assuming someone else had it." }
  ];

  var SITE = {
    brand: "Paguyuban RHDM",
    tagline: "Community news, recipes, and a market run by members",
    organizer: "Marcus Alder",
    contact: "market@paguyubanrhdm.example",
    founded: 2019
  };

  window.ALDER = {
    site: SITE,
    categories: CATEGORIES,
    members: MEMBERS,
    listings: LISTINGS,
    events: EVENTS,
    news: NEWS,
    recipes: RECIPES,
    notebookUrl: NOTEBOOK_URL
  };
})();
