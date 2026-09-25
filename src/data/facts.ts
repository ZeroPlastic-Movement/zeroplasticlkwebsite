/**
 * Content model for /facts, the ZeroPlastic reference page.
 *
 * The page renders entirely from this file. Nothing is hand-duplicated in the
 * template, so a second language is a data change rather than a rebuild: every
 * piece of visible copy sits behind `Localized<T>`, which today carries `si`
 * and tomorrow can carry `en` alongside it. The page reads whichever locale it
 * is asked for and falls back to Sinhala, so a partial translation renders
 * without breaking.
 *
 * Answers are typed blocks rather than HTML strings. That keeps the markup in
 * the template where it can stay semantic and accessible, keeps translator
 * input free of tags, and means a new presentation (a print view, an English
 * page, a summary card) can render the same content differently.
 */

/** Locales this page can render. Add 'en' here when the translation lands. */
export type Locale = 'si' | 'en';

/** Sinhala is the source language, so `si` is required and others are optional. */
export type Localized<T> = { si: T } & Partial<Record<Exclude<Locale, 'si'>, T>>;

export function pick<T>(value: Localized<T>, locale: Locale): T {
  return (value as Record<string, T | undefined>)[locale] ?? value.si;
}

/** A citation shown beside a claim and repeated in the sources section. */
export interface Source {
  key: string;
  label: string;
  url: string;
}

/** The oversized figure used to anchor a data-backed answer. */
export interface Stat {
  value: string;
  caption: Localized<string>;
  sourceKey: string;
}

/**
 * Answer blocks.
 *
 * Deliberately few types. Each maps to one semantic pattern in the template,
 * so the page cannot drift into arbitrary styling per answer.
 */
export type Block =
  /** Body paragraph. */
  | { kind: 'p'; text: Localized<string> }
  /** Short lead-in above a list, styled a little stronger than body copy. */
  | { kind: 'sub'; text: Localized<string> }
  /** Bulleted list. */
  | { kind: 'list'; items: Localized<string[]> }
  /** Numbered list rendered with oversized 01..0n markers. */
  | { kind: 'steps'; items: Localized<string[]> }
  /** Boxed emphasis. The single most important line of an answer. */
  | { kind: 'callout'; text: Localized<string>; lines?: Localized<string[]> }
  /** Pull-quote styling, for a two-line contrast. */
  | { kind: 'quote'; text: Localized<string> }
  /** Two labelled columns, e.g. demand side and supply side. */
  | { kind: 'columns'; groups: { title: Localized<string>; items: Localized<string[]> }[] }
  /** Vertical hierarchy diagram, e.g. the waste hierarchy. */
  | { kind: 'flow'; steps: Localized<string[]>; note?: Localized<string> }
  /** Data table rendered as a simple breakdown list. */
  | { kind: 'breakdown'; rows: { value: string; label: Localized<string> }[] }
  /** Internal link out to related ZeroPlastic content. */
  | { kind: 'link'; href: string; text: Localized<string> };

export interface Faq {
  /** Permanent anchor. Part of the public URL contract, never regenerate. */
  id: string;
  /** Matched against the search field, alongside the question text. */
  keywords: string[];
  question: Localized<string>;
  answer: Block[];
  /** Oversized figure shown beside the answer. */
  stat?: Stat;
  /** Citation shown at the foot of the card. */
  sourceKey?: string;
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export const SOURCES: Source[] = [
  {
    key: 'oecd',
    label: 'OECD, Global Plastics Outlook',
    url: 'https://www.oecd.org/en/publications/global-plastics-outlook_de747aef-en.html',
  },
  {
    key: 'unep-suo',
    label: 'UNEP, Single-use Plastics: A Roadmap for Sustainability',
    url: 'https://www.unep.org/resources/report/single-use-plastics-roadmap-sustainability',
  },
  {
    key: 'unep-pollution',
    label: 'UNEP, Everything you need to know about plastic pollution',
    url: 'https://www.unep.org/news-and-stories/story/everything-you-need-know-about-plastic-pollution',
  },
  {
    key: 'who',
    label: 'World Health Organization, Dietary and inhalation exposure to nano- and microplastic particles',
    url: 'https://www.who.int/publications/i/item/9789240054608',
  },
  {
    key: 'fda',
    label: 'US Food and Drug Administration, Recycled Plastics in Food Packaging',
    url: 'https://www.fda.gov/food/packaging-food-contact-substances-fcs/recycled-plastics-food-packaging',
  },
];

export const SOURCE_BY_KEY = new Map(SOURCES.map((s) => [s.key, s]));

/* ------------------------------------------------------------------ */
/* Page furniture                                                      */
/* ------------------------------------------------------------------ */

export const PAGE = {
  eyebrow: 'THE FACTS BEHIND ZEROPLASTIC',
  title: { si: 'ZeroPlastic ගැන ඇත්ත' } as Localized<string>,
  heroHeadline: {
    si: 'අපි Plastic නැති ලෝකයක් ගැන කියන්නේ නැහැ.',
  } as Localized<string>,
  heroSupport: {
    si: [
      'අපි ගොඩනගන්නේ ප්ලාස්ටික් වගකීමෙන් භාවිතා කරන,',
      'අනවශ්‍ය single-use plastic අවම කරන,',
      'ප්ලාස්ටික් ස්වභාවයට නොයන අනාගතයක්.',
    ],
  } as Localized<string[]>,
  /** Sits under the three pillars. The single most important line on the page. */
  cornerstone: {
    si: [
      '"ZeroPlastic" කියන්නේ සියලුම plastic නැති කිරීම නොවේ.',
      'Plastic pollution නැති කිරීමයි.',
    ],
  } as Localized<string[]>,
} as const;

export const PILLARS = [
  {
    number: '01',
    title: 'ZERO SINGLE-USE PLASTIC',
    body: {
      si: 'අනවශ්‍ය, එක් වරක් භාවිතා කර ඉවතලන ප්ලාස්ටික් භාවිතය අවසන් කිරීම.',
    } as Localized<string>,
  },
  {
    number: '02',
    title: 'ZERO PLASTIC IN NATURE',
    body: {
      si: 'භාවිතා කරන ප්ලාස්ටික් නිසි ලෙස කළමනාකරණය කර පරිසරයට, ගංගාවලට, මුහුදට සහ ස්වභාවික පද්ධතිවලට ඇතුළු වීම වැළැක්වීම.',
    } as Localized<string>,
  },
  {
    number: '03',
    title: 'ZERO MICROPLASTICS IN US',
    body: {
      si: 'මිනිසුන්ගේ ආහාර, ජලය සහ වාතය හරහා සිදුවන අනවශ්‍ය ප්ලාස්ටික් නිරාවරණය අවම කරන සමාජයක් සඳහා වැඩ කිරීම.',
    } as Localized<string>,
  },
] as const;

export const INTRO = {
  heading: { si: 'නමෙන් නෙවෙයි. අපේ අරමුණෙන් අපිව තේරුම් ගන්න.' } as Localized<string>,
  body: {
    si: [
      'ZeroPlastic Movement කියන නම දැකලා අපි ලෝකයේ සෑම plastic නිෂ්පාදනයක්ම ඉවත් කරන්න කියන සංවිධානයක් කියලා හිතන්න පුළුවන්.',
      'එය අපේ අරමුණ නොවේ.',
      'නවීන ලෝකයේ වෛද්‍ය උපකරණ, තාක්ෂණය, ප්‍රවාහනය, ඉදිකිරීම් සහ තවත් බොහෝ ක්ෂේත්‍රවල plastic වැදගත් ද්‍රව්‍යයක්.',
      'ප්‍රශ්නය plastic පවතින එක පමණක් නොවේ.',
      'ප්‍රශ්නය වන්නේ අවශ්‍ය නොවන plastic නිපදවීම, එක් වරක් පාවිච්චි කර ඉවත දැමීම සහ භාවිතයෙන් පසු එය නිසි ලෙස කළමනාකරණය නොවීමයි.',
      'ZeroPlastic Movement වැඩ කරන්නේ ඒ system එක වෙනස් කිරීමටයි.',
    ],
  } as Localized<string[]>,
} as const;

/** The "what we mean / what we do not mean" comparison. */
export const CONTRAST = {
  affirm: {
    title: { si: 'අපි කියන්නේ' } as Localized<string>,
    items: {
      si: [
        'අනවශ්‍ය single-use plastic අඩු කරන්න',
        'reuse සහ refill වැඩි කරන්න',
        'plastic nature එකට යාම නවත්වන්න',
        'producers සහ consumers වගකීම ගන්න',
        'alternatives සඳහා market එකක් ගොඩනගන්න',
        'better policy සහ systems හදන්න',
      ],
    } as Localized<string[]>,
  },
  deny: {
    title: { si: 'අපි කියන්නේ නැහැ' } as Localized<string>,
    items: {
      si: [
        'සෑම plastic product එකක්ම තහනම් කරන්න',
        'phones, vehicles හෝ medical equipment plastic නැතුව හදන්න',
        'plastic භාවිතා කරන හැම පුද්ගලයෙකුටම දොස් කියන්න',
        'recycling එක සම්පූර්ණයෙන් නවත්වන්න',
        'overnight plastic-free society එකක් හදන්න',
      ],
    } as Localized<string[]>,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

export const FAQS: Faq[] = [
  {
    id: 'what-is-zeroplastic',
    keywords: [
      'zeroplastic', 'meaning', 'ban', 'all plastic', 'සියලුම', 'තහනම්', 'අරමුණ',
      'what is', 'definition', 'vision',
    ],
    question: { si: 'ZeroPlastic කියන්නේ ලෝකයේ සියලුම plastic නැති කරන්නද?' },
    answer: [
      { kind: 'p', text: { si: 'නැහැ.' } },
      {
        kind: 'p',
        text: { si: 'ZeroPlastic Movement හි අරමුණ සෑම plastic භාවිතයක්ම තහනම් කිරීම නොවේ.' },
      },
      {
        kind: 'p',
        text: {
          si: 'Plastic අද ලෝකයේ වෛද්‍ය සේවා, තාක්ෂණය, විදුලි උපකරණ, ගොඩනැගිලි, ප්‍රවාහනය සහ තවත් බොහෝ අත්‍යවශ්‍ය ක්ෂේත්‍රවල භාවිතා වෙනවා.',
        },
      },
      { kind: 'sub', text: { si: 'අපගේ අවධානය යොමු වන්නේ:' } },
      {
        kind: 'list',
        items: {
          si: [
            'අනවශ්‍ය single-use plastic අඩු කිරීම',
            'නැවත භාවිතා කළ හැකි පද්ධති වැඩි කිරීම',
            'plastic ස්වභාවයට ඇතුළු වීම වැළැක්වීම',
            'නිෂ්පාදකයන් සහ පාරිභෝගිකයන් වගකීමෙන් plastic කළමනාකරණය කිරීම',
            'sustainable alternatives සඳහා වෙළඳපොළක් ගොඩනැගීම',
          ],
        },
      },
      {
        kind: 'callout',
        text: { si: 'Plastic itself is not the entire problem.' },
        lines: { si: ['How we design, use and discard it is the problem.'] },
      },
    ],
  },

  {
    id: 'plastic-visible',
    keywords: [
      'photo', 'photos', 'sunglasses', 'phone', 'phones', 'shoes', 'chair', 'chairs',
      'hypocrite', 'ඡායාරූප', 'පුටු', 'phone එක', 'durable', 'product',
    ],
    question: {
      si: 'එහෙනම් ZeroPlastic photos වල sunglasses, phones, shoes, chairs වගේ plastic තියෙන්නේ ඇයි?',
    },
    answer: [
      { kind: 'p', text: { si: 'ඒක තමයි ZeroPlastic ගැන ඇති ප්‍රධානම වැරදි අවබෝධයකින් එකක්.' } },
      { kind: 'p', text: { si: 'අපි "plastic කිසිවක් භාවිතා නොකරන්න" කියන්නේ නැහැ.' } },
      {
        kind: 'p',
        text: {
          si: 'Mobile phone එකක, vehicle එකක, safety equipment එකක, electrical equipment එකක හෝ දිගුකාලීනව භාවිතා කරන product එකක plastic තිබීම සහ විනාඩි කිහිපයකට භාවිතා කර ඉවත දමන plastic item එකක් අතර විශාල වෙනසක් තිබෙනවා.',
        },
      },
      { kind: 'p', text: { si: 'අපි විරුද්ධ වන්නේ plastic ද්‍රව්‍යයට පමණක් නොවේ.' } },
      { kind: 'p', text: { si: 'අපි වෙනස් කිරීමට උත්සාහ කරන්නේ "take, use once, throw away" culture එකයි.' } },
      {
        kind: 'callout',
        text: { si: 'Plastic chair එකක් photo එකක තිබීම ZeroPlastic vision එකට විරුද්ධ දෙයක් නොවේ.' },
        lines: {
          si: [
            'එය භාවිතයෙන් පසු කොහෙට යනවාද?',
            'එය කොපමණ කාලයක් භාවිතා වෙනවාද?',
            'එය අවශ්‍යද?',
            'එය නැවත භාවිතා කළ හැකිද?',
            'අපි අහන්නේ ඒ ප්‍රශ්නයි.',
          ],
        },
      },
    ],
  },

  {
    id: 'single-use',
    keywords: [
      'single use', 'single-use', 'packaging', 'straw', 'cup', 'bag', 'bottle',
      'takeaway', 'එක් වරක්', 'ඇසුරුම්', '50%', 'half',
    ],
    question: { si: 'Single-use plastic ගැන මෙච්චර focus කරන්නේ ඇයි?' },
    stat: {
      value: '50%',
      caption: {
        si: 'Plastic packaging accounts for approximately half of global plastic waste.',
      },
      sourceKey: 'unep-suo',
    },
    answer: [
      {
        kind: 'p',
        text: {
          si: 'Plastic pollution වල විශාල කොටසක් ඉතා කෙටි කාලයක් භාවිතා කරන නිෂ්පාදන සහ packaging වලින් පැමිණෙනවා.',
        },
      },
      {
        kind: 'p',
        text: {
          si: 'UN Environment Programme අනුව plastic packaging ලෝකයේ plastic waste වල ඉතා විශාල කොටසක් නිර්මාණය කරනවා.',
        },
      },
      { kind: 'p', text: { si: 'බොහෝ packaging products භාවිතා වන්නේ එක වරක් පමණයි.' } },
      {
        kind: 'p',
        text: {
          si: 'ඒ නිසා straw, disposable cup, takeaway container, shopping bag, unnecessary wrapping, disposable water bottle වගේ products වලට alternatives, refill සහ reuse systems හඳුන්වා දීමෙන් pollution එක source එකේදීම අඩු කළ හැකියි.',
        },
      },
    ],
    sourceKey: 'unep-suo',
  },

  {
    id: 'recycling',
    keywords: [
      'recycling', 'recycle', 'reuse', '9%', 'oecd', 'landfill', 'incinerate',
      'ප්‍රතිචක්‍රීකරණ', 'hierarchy', 'refuse', 'reduce',
    ],
    question: { si: 'Recycling තිබෙනවා නම් plastic pollution ප්‍රශ්නය විසඳන්න බැරි ඇයි?' },
    stat: {
      value: '9%',
      caption: {
        si: 'Of the world’s plastic waste in 2019, only about 9% was successfully recycled.',
      },
      sourceKey: 'oecd',
    },
    answer: [
      { kind: 'p', text: { si: 'Recycling අවශ්‍යයි.' } },
      { kind: 'p', text: { si: 'නමුත් recycling එකම solution එක නොවේ.' } },
      {
        kind: 'p',
        text: {
          si: 'OECD Global Plastics Outlook අනුව 2019 වසරේ ලෝකයේ plastic waste වලින් අවසානයේ සාර්ථකව recycle වී තිබුණේ 9% පමණයි.',
        },
      },
      { kind: 'sub', text: { si: 'එම කාලයේ:' } },
      {
        kind: 'breakdown',
        rows: [
          { value: '9%', label: { si: 'recycled' } },
          { value: '19%', label: { si: 'incinerated' } },
          { value: '~50%', label: { si: 'landfilled' } },
          { value: '~22%', label: { si: 'mismanaged, openly burned, dumped or leaked' } },
        ],
      },
      {
        kind: 'p',
        text: { si: '"අපි recycle කරමු" කියන එකෙන් පමණක් මේ ප්‍රශ්නය විසඳෙන්නේ නැහැ.' },
      },
      { kind: 'p', text: { si: 'Waste එක නිර්මාණය වීමට පෙර එය අඩු කිරීම වඩාත් වැදගත්.' } },
      {
        kind: 'flow',
        steps: { si: ['REFUSE', 'REDUCE', 'REUSE / REFILL', 'RECYCLE', 'RESPONSIBLE DISPOSAL'] },
      },
      {
        kind: 'callout',
        text: { si: 'Recycling is part of the solution.' },
        lines: { si: ['It is not permission to continue unlimited single-use plastic consumption.'] },
      },
    ],
    sourceKey: 'oecd',
  },

  {
    id: 'recycle-forever',
    keywords: [
      'forever', 'downcycling', 'quality', 'pet', 'bottle to bottle', 'bottle-to-bottle',
      'food contact', 'fda', 'නැවත', 'polymer',
    ],
    question: { si: 'Plastic එක හැමදාම recycle කරන්න පුළුවන්ද?' },
    answer: [
      {
        kind: 'p',
        text: {
          si: 'සාමාන්‍ය mechanical recycling ක්‍රියාවලියේදී plastic material එකේ quality සහ performance කාලයත් සමඟ අඩු විය හැකියි.',
        },
      },
      {
        kind: 'p',
        text: {
          si: 'Heat, processing, contamination, additives සහ different polymer types mix වීම නිසා එකම material එක සීමාවකින් තොරව එකම quality එකෙන් recycle කිරීම ප්‍රායෝගික නොවන අවස්ථා බොහෝමයක් තිබෙනවා.',
        },
      },
      { kind: 'p', text: { si: 'ඒ නිසා recycling systems වලදී "downcycling" ද බහුලයි.' } },
      {
        kind: 'p',
        text: {
          si: 'උදාහරණයක් ලෙස high-value packaging material එකක් පසුව lower-value product එකක් බවට පත් විය හැකියි.',
        },
      },
      {
        kind: 'callout',
        text: {
          si: 'Modern recycling technology can in some cases produce recycled PET suitable for new food-contact packaging.',
        },
        lines: {
          si: [
            'But this requires suitable feedstock, collection, sorting, cleaning and controlled recycling processes.',
          ],
        },
      },
    ],
    sourceKey: 'fda',
  },

  {
    id: 'why-campaign',
    keywords: [
      'campaign', 'walk', 'awareness', 'march', 'protest', 'policy', 'advocacy',
      'market', 'demand', 'ව්‍යාපාරය', 'system change',
    ],
    question: { si: 'එහෙනම් ZeroPlastic walk, campaign, awareness programme කරන්නේ ඇයි?' },
    answer: [
      { kind: 'p', text: { si: 'Market එක තනිවම වෙනස් වෙන්නේ නැහැ.' } },
      {
        kind: 'p',
        text: {
          si: 'Single-use plastic ඉතා cheap සහ convenient නම් businesses සහ consumers ඒ system එකෙන් ඉවත් වීමට incentive එකක් අඩුයි.',
        },
      },
      {
        kind: 'list',
        items: {
          si: [
            'Demand වෙනස් වූ විට,',
            'institutional purchasing වෙනස් වූ විට,',
            'policy වෙනස් වූ විට,',
            'regulation හඳුන්වා දුන් විට,',
          ],
        },
      },
      { kind: 'p', text: { si: 'alternative products සහ systems සඳහා market එකක් හැදෙනවා.' } },
      { kind: 'sub', text: { si: 'ඒ නිසා ZeroPlastic:' } },
      {
        kind: 'list',
        items: {
          si: [
            'public awareness හදනවා',
            'youth mobilise කරනවා',
            'companies සහ institutions සමඟ consumption patterns වෙනස් කරනවා',
            'policy advocacy කරනවා',
            'reusable/refill systems push කරනවා',
            'plastic alternatives සඳහා demand එකක් හදනවා',
          ],
        },
      },
      {
        kind: 'callout',
        text: { si: 'Campaign එකේ අරමුණ plastic item එකකට විරුද්ධ වීම නොවේ.' },
        lines: { si: ['System එක වෙනස් කිරීමයි.'] },
      },
      { kind: 'link', href: '/advocacy/', text: { si: 'ZeroPlastic advocacy සහ policy වැඩ බලන්න' } },
    ],
  },

  {
    id: 'alternatives',
    keywords: [
      'alternatives', 'alternative', 'market', 'entrepreneur', 'innovation',
      'supply', 'demand', 'විකල්ප', 'reusable', 'refill',
    ],
    question: { si: 'Plastic alternatives දැනටමත් market එකේ නැත්තේ ඇයි?' },
    answer: [
      { kind: 'p', text: { si: 'Alternative එකක් නිර්මාණය කළා කියලා market එකක් automatically හැදෙන්නේ නැහැ.' } },
      {
        kind: 'p',
        text: {
          si: 'Entrepreneur කෙනෙක් හෝ inventor කෙනෙක් alternative product එකකට ආයෝජනය කිරීමට නම් demand එකක් තිබිය යුතුයි.',
        },
      },
      {
        kind: 'p',
        text: {
          si: 'Cheap disposable plastic එකට unrestricted market advantage එකක් තිබෙන විට reusable සහ sustainable alternatives compete කරන්න අමාරු වෙනවා.',
        },
      },
      { kind: 'p', text: { si: 'ඒ නිසා ZeroPlastic එකම වෙලාවේ දෙපැත්තෙන් වැඩ කරනවා.' } },
      {
        kind: 'columns',
        groups: [
          {
            title: { si: 'DEMAND SIDE' },
            items: {
              si: ['Awareness', 'Campaigning', 'Policy', 'Institutional commitments', 'Consumer behaviour'],
            },
          },
          {
            title: { si: 'SUPPLY SIDE' },
            items: {
              si: [
                'Local SMEs',
                'Craftspeople',
                'Entrepreneurs',
                'Universities',
                'Innovators',
                'Plastic-alternative businesses',
              ],
            },
          },
        ],
      },
      { kind: 'quote', text: { si: 'Demand එක හදන්නේ නැතුව alternative economy එකක් හදන්න බැහැ.' } },
    ],
  },

  {
    id: 'local-business',
    keywords: [
      'local', 'sme', 'craft', 'craftsmen', 'artisan', 'business', 'economy',
      'employment', 'ශිල්පීන්', 'impact center',
    ],
    question: { si: 'ZeroPlastic local craftsmen සහ SMEs support කරන්නේ ඇයි?' },
    answer: [
      { kind: 'p', text: { si: 'Plastic pollution එක environmental issue එකක් පමණක් නොවේ.' } },
      { kind: 'p', text: { si: 'එය economic issue එකක්ද වෙනවා.' } },
      {
        kind: 'p',
        text: {
          si: 'Traditional materials වලින් household products සහ crafts නිෂ්පාදනය කළ communities බොහෝවිට mass-produced cheap plastic products සමඟ compete කරනවා.',
        },
      },
      { kind: 'sub', text: { si: 'Sustainable alternatives සඳහා demand වැඩි කළ විට:' } },
      {
        kind: 'list',
        items: {
          si: [
            'local producers සඳහා market එකක් හැදෙනවා',
            'traditional skills ආරක්ෂා වෙනවා',
            'local employment වැඩි වෙනවා',
            'imported disposable products මත dependence අඩු කළ හැකියි',
            'innovation සඳහා commercial reason එකක් හැදෙනවා',
          ],
        },
      },
      {
        kind: 'link',
        href: '/sustainable-travel/',
        text: { si: 'Impact Center සහ plastic alternatives ගැන වැඩිදුර බලන්න' },
      },
    ],
  },

  {
    id: 'cleanups',
    keywords: [
      'cleanup', 'cleanups', 'clean up', 'beach', 'symptom', 'prevention',
      'පිරිසිදු', 'volunteers', 'world cleanup day',
    ],
    question: { si: 'Cleanups කරලා plastic pollution විසඳන්න පුළුවන්ද?' },
    answer: [
      { kind: 'p', text: { si: 'නැහැ.' } },
      { kind: 'p', text: { si: 'Cleanup එකෙන් pollution එකේ symptom එකට ප්‍රතිචාර දක්වන්න පුළුවන්.' } },
      {
        kind: 'p',
        text: {
          si: 'නමුත් plastic එතැනට පැමිණීමට හේතුව වෙනස් නොකළොත් නැවත waste එක එකතු වෙනවා.',
        },
      },
      { kind: 'sub', text: { si: 'ZeroPlastic cleanups භාවිතා කරන්නේ:' } },
      {
        kind: 'list',
        items: {
          si: [
            'environment එකෙන් existing waste ඉවත් කිරීමට',
            'volunteers engage කිරීමට',
            'public awareness හදන්න',
            'pollution data සහ practical experience ලබා ගැනීමට',
            'longer-term behaviour and policy change සඳහා communities mobilise කිරීමට',
          ],
        },
      },
      {
        kind: 'quote',
        text: { si: 'Cleanups treat the symptom. Prevention and policy treat the cause.' },
      },
    ],
  },

  {
    id: 'microplastics',
    keywords: [
      'microplastic', 'microplastics', 'health', 'who', 'exposure', 'research',
      'ක්ෂුද්‍ර', 'water', 'food', 'air',
    ],
    question: { si: '"Zero Microplastics in Us" කියන්නේ මොකක්ද?' },
    answer: [
      {
        kind: 'p',
        text: {
          si: 'Microplastics අද environment, food, water සහ air තුළ හඳුනාගෙන තිබෙන emerging pollution issue එකක්.',
        },
      },
      {
        kind: 'p',
        text: {
          si: 'ZeroPlastic හි "Zero Microplastics in Us" යන්න scientific claim එකක් නොව vision statement එකක්.',
        },
      },
      {
        kind: 'p',
        text: {
          si: 'අපගේ අරමුණ වන්නේ unnecessary plastic pollution සහ preventable human exposure අඩු කරන society එකක් වෙනුවෙන් වැඩ කිරීමයි.',
        },
      },
      {
        kind: 'p',
        text: {
          si: 'Human health impacts පිළිබඳ research තවමත් develop වෙමින් තිබෙන නිසා absolute medical claims භාවිතා නොකරන්න.',
        },
      },
      {
        kind: 'callout',
        text: {
          si: 'WHO has identified important knowledge gaps and continuing research needs concerning human exposure to microplastics.',
        },
      },
    ],
    sourceKey: 'who',
  },

  {
    id: 'partnerships',
    keywords: [
      'partner', 'partnership', 'company', 'companies', 'sponsor', 'brand',
      'සහයෝගිතා', 'evaluate', 'criteria',
    ],
    question: { si: 'ZeroPlastic ඕනෑම company එකක් එක්ක වැඩ කරනවද?' },
    answer: [
      { kind: 'p', text: { si: 'නැහැ.' } },
      {
        kind: 'p',
        text: { si: 'Partnership එකක් තිබුණා කියලා environmental credibility automatically ලැබෙන්නේ නැහැ.' },
      },
      { kind: 'p', text: { si: 'ZeroPlastic potential partners evaluate කරනවා.' } },
      { kind: 'sub', text: { si: 'Partnership එකක් සලකා බලන විට අපි බලන්නේ:' } },
      {
        kind: 'list',
        items: {
          si: [
            'partnership එකෙන් measurable environmental benefit එකක් තිබෙනවාද',
            'activity එක organisation එකේ broader behaviour එකට සම්බන්ධද',
            'communication transparent ද',
            'ZeroPlastic identity marketing decoration එකක් ලෙස පමණක් භාවිතා කරනවාද',
            'greenwashing risk එකක් තිබෙනවාද',
            'partner meaningful change එකකට open ද',
          ],
        },
      },
      { kind: 'quote', text: { si: 'Our name is not for sale.' } },
    ],
  },

  {
    id: 'greenwashing',
    keywords: [
      'greenwashing', 'greenwash', 'perfect', 'hide', 'footprint', 'measurable',
      'credibility', 'reputational',
    ],
    question: { si: 'Company එකක් plastic භාවිතා කරනවා නම් ඔවුන් සමඟ ZeroPlastic වැඩ කරන්නේ කොහොමද?' },
    answer: [
      { kind: 'p', text: { si: 'Perfect organisations විතරක් එක්ක වැඩ කළොත් system change එක සිදුවෙන්නේ නැහැ.' } },
      { kind: 'sub', text: { si: 'වැදගත් ප්‍රශ්නය:' } },
      { kind: 'p', text: { si: '"ඔබ අද perfect ද?" නොවේ.' } },
      { kind: 'p', text: { si: '"ඔබ measurable change එකක් කරන්න සූදානම්ද?" යන්නයි.' } },
      {
        kind: 'p',
        text: { si: 'ZeroPlastic partnership එකේ අරමුණ existing plastic footprint එක hide කිරීම නොවේ.' },
      },
      {
        kind: 'p',
        text: {
          si: 'එය measurable reductions, better systems, alternatives, responsible waste management සහ long-term commitments ඇති කිරීමයි.',
        },
      },
      {
        kind: 'callout',
        text: {
          si: 'We reserve the right to decline partnerships where the environmental benefit does not justify the reputational or greenwashing risk.',
        },
      },
    ],
  },

  {
    id: 'what-can-i-do',
    keywords: [
      'what can i do', 'action', 'help', 'individual', 'personal', 'refuse',
      'reusable', 'මට', 'කරන්න', 'steps',
    ],
    question: { si: 'එහෙනම් සාමාන්‍ය පුද්ගලයෙකුට කරන්න පුළුවන් මොනවාද?' },
    answer: [
      {
        kind: 'steps',
        items: {
          si: [
            'අවශ්‍ය නැති single-use plastic refuse කරන්න.',
            'Reusable bottle, cup, bag සහ containers භාවිතා කරන්න.',
            'Refill සහ reuse options තිබෙන businesses තෝරන්න.',
            'Plastic භාවිතයෙන් පසු environment එකට නොයන ලෙස responsible disposal කරන්න.',
            'ඔබගේ workplace, university, school හෝ community එකේ system change එකක් ඉල්ලන්න.',
          ],
        },
      },
      {
        kind: 'callout',
        text: { si: 'Perfect වෙන්න අවශ්‍ය නැහැ.' },
        lines: { si: ['Better decisions නැවත නැවත ගන්න එකයි වැදගත්.'] },
      },
    ],
  },
];

/** Closing mission block. */
export const CLOSING = {
  label: 'THE ZEROPLASTIC VISION',
  lines: {
    si: ['Plastic useful විය හැකියි.', 'Plastic pollution කිසිදා useful නොවේ.'],
  } as Localized<string[]>,
  pillars: ['ZERO SINGLE-USE PLASTIC', 'ZERO PLASTIC IN NATURE', 'ZERO MICROPLASTICS IN US'],
  actions: [
    { label: { si: 'අපේ වැඩ බලන්න' } as Localized<string>, href: '/our-work/', primary: true },
    { label: { si: 'ZeroPlastic සමඟ එක්වන්න' } as Localized<string>, href: '/volunteers/', primary: false },
  ],
} as const;

/** Interface strings, so the chrome translates with the content. */
export const UI = {
  shareLabel: { si: 'මේ පිළිතුර share කරන්න' } as Localized<string>,
  copy: { si: 'Copy link' } as Localized<string>,
  copied: { si: 'Link copied' } as Localized<string>,
  share: { si: 'Share' } as Localized<string>,
  searchLabel: { si: 'ඔබට තියෙන ප්‍රශ්නය සොයන්න' } as Localized<string>,
  noResults: { si: 'ගැළපෙන ප්‍රශ්නයක් හමු නොවීය.' } as Localized<string>,
  questionsButton: { si: 'ප්‍රශ්න' } as Localized<string>,
  questionsTitle: { si: 'සියලු ප්‍රශ්න' } as Localized<string>,
  close: { si: 'වසන්න' } as Localized<string>,
  sourcesTitle: { si: 'මූලාශ්‍ර සහ වැඩිදුර කියවීම' } as Localized<string>,
  sourcePrefix: { si: 'මූලාශ්‍රය' } as Localized<string>,
} as const;
