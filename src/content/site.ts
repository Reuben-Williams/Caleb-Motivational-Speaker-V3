import {
  evidenceRegistry,
  type EvidenceId,
} from "@/content/evidence";

export { evidenceRegistry };

export type SiteFact = {
  id: string;
  value: string;
  evidenceIds: readonly EvidenceId[];
};

export const contact = {
  phoneDisplay: "(404) 941-5670",
  phoneHref: "tel:+14049415670",
  email: "info@calebjakes.com",
  emailHref: "mailto:info@calebjakes.com",
  location: "Rochester, New York",
  facebook: "https://www.facebook.com/caleb.jakes.7/",
  instagram: "https://www.instagram.com/therealcaleb.j/",
} as const;

export const book = {
  title:
    "Shedding Pounds, Gaining Purpose: The Weighty Joy of Surrender",
  body:
    "Caleb's book connects his personal transformation with faith, surrender, identity, and the discovery of purpose.",
  purchaseUrl:
    "https://www.amazon.com/Shedding-Pounds-Gaining-Purpose-Surrender/dp/B0D2YFGMJR",
  cover: "/media/book/caleb-book-front.webp",
  amazonArt: "/media/book/caleb-book-amazon.webp",
} as const;

export const hero = {
  eyebrow: "MOTIVATIONAL SPEAKER • AUTHOR • TRANSFORMATIONAL LEADER",
  title: "PAIN HAS PURPOSE.",
  body:
    "Caleb Jakes turns struggles into strength and dreams into destiny through transformational keynotes, workshops, and faith-centered experiences built to move audiences from inspiration into action.",
  credential:
    "IAPO Certified Motivational Speaker • RTF Deliverance Minister",
  location:
    "Based in Rochester, NY • Available for engagements worldwide",
} as const;

export const siteFacts: readonly SiteFact[] = [
  {
    id: "experience",
    value: "Six years of speaking experience",
    evidenceIds: ["E02"],
  },
  {
    id: "iapo",
    value: "IAPO Certified Motivational Speaker",
    evidenceIds: ["E02"],
  },
  {
    id: "rtf",
    value: "RTF Deliverance Minister",
    evidenceIds: ["E02"],
  },
  {
    id: "author",
    value: "Published author",
    evidenceIds: ["E03"],
  },
  {
    id: "founder",
    value: "Founder of Joyionaire™ Enterprises",
    evidenceIds: ["E02", "E03"],
  },
  {
    id: "international",
    value: "Available internationally",
    evidenceIds: ["E02"],
  },
] as const;

export const audienceMenu = [
  { label: "Schools & Colleges", href: "/schools-colleges" },
  { label: "Churches & Faith Communities", href: "/faith-events" },
  {
    label: "Conferences & Organizations",
    href: "/conferences-workshops",
  },
] as const;

export const navigation = [
  { label: "Home", href: "/" },
  { label: "About Caleb", href: "/about" },
  { label: "Speaking", href: "/speaking" },
  { label: "Book & Media", href: "/book-media" },
  { label: "FAQ", href: "/faq" },
  { label: "Book Caleb", href: "/book-caleb" },
] as const;

export const audiencePaths = [
  {
    id: "schools-colleges",
    title: "Schools & Colleges",
    href: "/schools-colleges",
    description:
      "A practical message about resilience, identity, growth mindset, and purpose for students and campus communities.",
  },
  {
    id: "faith-community",
    title: "Churches & Faith Communities",
    href: "/faith-events",
    description:
      "Scripture-grounded encouragement that connects faith, freedom, identity, and transformation.",
  },
  {
    id: "conference-organization",
    title: "Conferences & Organizations",
    href: "/conferences-workshops",
    description:
      "Keynotes and workshops that turn lived experience into practical reflection, resilience, and purpose-centered action.",
  },
  {
    id: "leadership-male-empowerment",
    title: "Leadership & Male Empowerment",
    href: "/conferences-workshops",
    description:
      "Honest conversations about identity, accountability, faith, character, and legacy.",
  },
] as const;

export const speakingTopics = [
  "Pain Has Purpose",
  "Turning Struggles Into Strength",
  "Dreams Into Destiny",
  "Identity and Purpose",
  "Resilience and Growth Mindset",
  "Faith, Freedom, and Transformation",
  "Male Empowerment and Legacy",
  "Leadership Through Adversity",
] as const;

export const topicPromise =
  "Caleb combines lived experience, reflection, and practical application to help audiences move from inspiration toward purposeful action.";

export const organizerOutcomes = [
  "Audiences are invited to feel seen rather than lectured.",
  "Personal stories lead into practical reflection and action.",
  "The message can be calibrated for secular or faith-based environments.",
  "Programs can be shaped as keynotes, workshops, panels, or multi-session experiences.",
  "Every inquiry begins with the audience and the organizer's event goals.",
] as const;

export const engagementFormats = [
  {
    title: "Keynote presentations",
    description:
      "A focused message shaped around the event audience, theme, and desired emphasis.",
  },
  {
    title: "School and college assemblies",
    description:
      "A student-centered program discussed around age group, setting, goals, and available time.",
  },
  {
    title: "Faith-based events",
    description:
      "A Scripture-grounded experience discussed around the community, occasion, and desired faith emphasis.",
  },
  {
    title: "Leadership seminars",
    description:
      "A facilitated session connecting resilience, identity, character, purpose, and leadership.",
  },
  {
    title: "Half-day workshops",
    description:
      "An extended interactive format with room for reflection, discussion, and practical application.",
  },
  {
    title: "Full-day workshops",
    description:
      "A longer facilitated format whose agenda and breaks are planned with the organizer.",
  },
  {
    title: "Male-empowerment conferences",
    description:
      "A purpose-centered conversation about identity, accountability, faith, character, and legacy.",
  },
  {
    title: "Multi-session programs",
    description:
      "More than one session planned around a shared audience or event goal.",
  },
  {
    title: "Panel appearances",
    description:
      "Participation in a moderated conversation aligned with Caleb's supported themes.",
  },
  {
    title: "Podcast and media appearances",
    description:
      "An interview or conversation about faith, identity, resilience, transformation, purpose, and the book.",
  },
] as const;

export const bookingProcess = [
  {
    title: "Tell Us About Your Event",
    description:
      "Share the audience, preferred date, location, format, and goals.",
  },
  {
    title: "Plan the Right Experience",
    description:
      "Caleb's team reviews the inquiry and follows up to discuss fit, availability, and the event.",
  },
  {
    title: "Bring the Message to Your Audience",
    description:
      "If the engagement moves forward, the experience is shaped around the room and the organizer's goals.",
  },
] as const;

export const faqs = [
  {
    question: "What audiences does Caleb speak to?",
    answer:
      "Caleb's current speaking work is positioned for schools and colleges, churches and faith communities, conferences and organizations, leadership programs, male-empowerment events, and podcast or media conversations.",
  },
  {
    question: "Does Caleb speak at secular institutions?",
    answer:
      "Yes. An inquiry can identify the institution, audience, and event goals so the proposed message can be discussed for that setting.",
  },
  {
    question: "Can the faith content be adjusted for the audience?",
    answer:
      "Caleb serves both secular and faith-based settings. The inquiry should describe the audience and the desired role of faith content so fit can be discussed before an engagement is confirmed.",
  },
  {
    question: "Is Caleb available internationally?",
    answer:
      "Caleb's current site states that he is available for international engagements. Availability, travel, and event requirements are confirmed through the inquiry process.",
  },
  {
    question: "What speaking formats are available?",
    answer:
      "Supported formats include keynotes, school or college assemblies, faith events, leadership seminars, half-day or full-day workshops, male-empowerment conferences, multi-session programs, panels, and podcast or media appearances.",
  },
  {
    question: "Can a workshop be paired with a keynote?",
    answer:
      "The current service range supports both keynotes and workshops. Use the inquiry to describe the desired combination so scope and fit can be discussed.",
  },
  {
    question: "How far in advance should an organization inquire?",
    answer:
      "Inquire as early as the event allows. The website does not promise availability for any date until Caleb's team confirms it.",
  },
  {
    question: "What information is required for a quote?",
    answer:
      "Provide the organization, audience, event type, preferred date or range, location or virtual format, estimated audience size, approximate program length, event goals, and any relevant budget context.",
  },
  {
    question: "Does Caleb participate in panels or podcasts?",
    answer:
      "Yes. Panels and podcast or media appearances are included in the current service range.",
  },
  {
    question: "Are travel expenses included?",
    answer:
      "The website does not publish an inclusion policy. Travel and event requirements are discussed before an engagement is confirmed.",
  },
  {
    question: "Is a speaker one-sheet or media kit available?",
    answer:
      "No public download is offered in this release. Organizers can request speaker information through the booking form.",
  },
] as const;

export const routeMetadata = {
  "/": {
    title: "Caleb Jakes | Motivational Speaker & Author",
    description:
      "Book Caleb Jakes for schools, colleges, faith events, conferences, leadership programs, workshops, panels, and media conversations.",
  },
  "/about": {
    title: "About Caleb Jakes | Pain Has Purpose",
    description:
      "Learn about Caleb Jakes, Joyionaire™ Enterprises, his transformation story, faith, authorship, and purpose-driven speaking mission.",
  },
  "/speaking": {
    title: "Speaking Topics & Formats | Caleb Jakes",
    description:
      "Explore Caleb Jakes keynotes, workshops, school programs, faith events, leadership sessions, panels, and media appearances.",
  },
  "/schools-colleges": {
    title: "School & College Speaker | Caleb Jakes",
    description:
      "Explore resilience, identity, growth mindset, and purpose programs for school and college communities.",
  },
  "/faith-events": {
    title: "Church & Faith Event Speaker | Caleb Jakes",
    description:
      "Explore Scripture-grounded speaking for churches, faith communities, ministry events, and conferences.",
  },
  "/conferences-workshops": {
    title: "Conference Keynotes & Workshops | Caleb Jakes",
    description:
      "Explore keynotes, workshops, leadership sessions, and male-empowerment conversations for conferences and organizations.",
  },
  "/book-media": {
    title: "Book & Media | Caleb Jakes",
    description:
      "Explore Caleb Jakes's book, approved speaking footage, podcast availability, panels, and media conversations.",
  },
  "/faq": {
    title: "Speaking FAQ | Caleb Jakes",
    description:
      "Read current answers about audiences, formats, travel, timing, media appearances, and the booking process.",
  },
  "/book-caleb": {
    title: "Book Caleb Jakes | Speaking Inquiry",
    description:
      "Share your event, audience, preferred date, location, format, and goals with Caleb Jakes and Joyionaire™ Enterprises.",
  },
  "/privacy": {
    title: "Privacy Policy | Joyionaire™ Enterprises",
    description:
      "Learn how speaking-inquiry information is transmitted and used by the Caleb Jakes website.",
  },
  "/thank-you": {
    title: "Speaking Inquiry | Caleb Jakes",
    description: "Continue the Caleb Jakes speaking-inquiry experience.",
  },
} as const;

export const privacyDisclosure =
  "When you submit a speaking inquiry, Joyionaire™ Enterprises uses the information to evaluate and respond to your request. The website does not store inquiry details in its own application database in this release. Information is transmitted through form-security, rate-limiting, and email-delivery providers and may remain in Caleb's business email system or those providers' operational records under their respective policies. Do not include sensitive personal, medical, financial, or student information. Inquiry information is not sold through this website. To ask about an inquiry or the information you submitted, contact info@calebjakes.com or call (404) 941-5670.";

export const routeCopy = {
  about: {
    title: "FROM THE STRUGGLE TO THE CALLING.",
    intro:
      "Caleb Jakes is an IAPO Certified Motivational Speaker, RTF Deliverance Minister, author, and founder of Joyionaire™ Enterprises. His message connects lived experience, faith, identity, resilience, and practical transformation.",
    chapters: [
      {
        title: "THE STRUGGLE",
        body:
          "Caleb speaks honestly about fatherlessness, weight loss, personal battles, identity, and the seasons that tested his faith and sense of purpose.",
      },
      {
        title: "THE TRANSFORMATION",
        body:
          "Faith, surrender, discipline, and the work of becoming whole reshaped how Caleb understood strength, joy, and purpose.",
      },
      {
        title: "THE CALLING",
        body:
          "Speaking became a way to help students, leaders, churches, and organizations recognize that struggle does not have to be the final word in their story.",
      },
      {
        title: "THE MISSION BEHIND JOYIONAIRE™",
        body:
          "Joyionaire™ Enterprises is built around a different picture of wealth—being rich in joy, faith, character, purpose, and the strength to keep standing when life becomes heavy.",
      },
    ],
  },
  speaking: {
    title: "A MESSAGE SHAPED FOR THE ROOM.",
    intro:
      "Caleb delivers keynotes, workshops, faith events, school and college programs, leadership sessions, panels, and media conversations. Every inquiry begins with the audience, event setting, and organizer's goals.",
    note:
      "Final content, timing, faith emphasis, and format are discussed before an engagement is confirmed.",
  },
  schools: {
    title: "HELP STUDENTS TURN PRESSURE INTO PURPOSE.",
    intro:
      "Caleb brings a practical message about resilience, identity, growth mindset, and purpose to school and college communities.",
    note:
      "Use the inquiry to describe the age group, setting, event goals, preferred format, and any faith-content requirements.",
  },
  faith: {
    title: "FAITH THAT MEETS PEOPLE IN REAL LIFE.",
    intro:
      "Caleb connects Scripture-grounded encouragement with honest conversations about identity, freedom, resilience, surrender, and transformation.",
    note:
      "Use the inquiry to describe the congregation or community, event setting, desired faith emphasis, and preferred format.",
  },
  conferences: {
    title: "MOVE FROM INSPIRATION INTO ACTION.",
    intro:
      "Caleb offers keynotes, workshops, leadership sessions, panels, and male-empowerment conversations for conferences and organizations.",
    note:
      "Use the inquiry to describe the audience, event theme, desired level of interaction, program length, and goals.",
  },
  bookMedia: {
    title: "THE MESSAGE BEYOND THE STAGE.",
    intro:
      "Explore Caleb's book and approved speaking footage, or request Caleb for a podcast, panel, interview, or book-centered event.",
  },
  faq: {
    title: "BOOKING QUESTIONS, CLEAR ANSWERS.",
    intro:
      "These answers explain the information currently available on formats, audiences, travel, and the inquiry process.",
  },
  booking: {
    title: "LET'S START THE CONVERSATION.",
    intro:
      "Share the event details, audience, preferred date, and goals. Submitting an inquiry does not confirm an engagement or date.",
  },
} as const;
