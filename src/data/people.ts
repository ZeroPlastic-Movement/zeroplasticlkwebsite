/**
 * Advisory Board and Experts.
 *
 * Every name, title, biography and photograph here was taken from the existing
 * WordPress pages. Nothing is paraphrased into new claims and nothing is
 * invented. Photographs were matched to people by their position in the
 * WordPress markup.
 *
 * Sources:
 *   https://www.zeroplastic.lk/advisory-board-zeroplastic-movement/
 *   https://www.zeroplastic.lk/our-experts/
 */

export interface Person {
  /** File stem under /images/people. */
  slug: string;
  name: string;
  role: string;
  /** Widths generated for this portrait. Sources are never upscaled. */
  widths: number[];
  bio: string[];
}

export const ADVISORY_BOARD: Person[] = [
  {
    slug: 'erik-solheim',
    name: 'Mr. Erik Solheim',
    role: 'Senior Advisor',
    widths: [240, 480],
    bio: [
      'Erik Solheim (born 18 January 1955) is a Norwegian diplomat and former politician. He served in the Norwegian government from 2005 to 2012 as Minister of International Development and Minister of the Environment, and as Under-Secretary-General of the United Nations and Executive Director of the United Nations Environment Programme from 2016 to 2018. Solheim is a member of the Green Party.',
    ],
  },
  {
    slug: 'vipula-wanigasekera',
    name: 'Dr. Vipula Wanigasekera',
    role: 'Senior Advisor',
    widths: [240, 480],
    bio: [
      'Dr. Vipula Wanigasekera, former Sri Lankan Diplomat, Head of Sri Lanka Tourism Authority and Sri Lanka Convention Bureau and Corporate head, is currently a Senior lecturer in Marketing, Management, International Business, Tourism and Events, as well as a Non-Duality and Buddhist Meditation Teacher, Classical musician and IICA Healing Therapist, who entered the study of comparative religion, Buddhist philosophy, Modern spirituality and Wellness-spiritual tourism.',
    ],
  },
  {
    slug: 'ravi-fernando',
    name: 'Dr. Ravi Fernando',
    role: 'Senior Advisor',
    widths: [240],
    bio: [
      'Dr. Ravi Fernando is a distinguished sustainability leader, corporate strategist, and board director with over four decades of global experience across Asia, the Middle East, and Africa. He is an alumnus of the University of Cambridge, where he completed a Postgraduate Certificate in Sustainable Business (2008) and a Master of Studies in Sustainability Leadership (2014). He also holds an MBA from the University of Colombo and a Doctor of Business Administration from the European Business School (2016).',
      'Dr. Fernando began his career in multinational corporations, serving from 1981 to 2007 with leading global organizations including Unilever, Reckitt Benckiser, and SmithKline Beecham International. His work during this period spanned multiple regions, contributing to strategic growth and operational excellence.',
      'He has played a pioneering role in advancing sustainability in Sri Lanka and beyond. In 2007, he became the first UN Global Compact Focal Point for Sri Lanka and was instrumental in establishing the UN Global Compact Sri Lanka Network. He later served as the first CEO of the Sri Lanka Institute of Nanotechnology (2008 to 2011) and as Operations Director of the Malaysia Blue Ocean Strategy Institute (2011 to 2016).',
      'Dr. Fernando currently serves on the boards of several prominent organizations, including LOLC Holdings PLC, Dilmah Ceylon Tea Company PLC, Melstacorp PLC, Aitken Spence Plantations PLC, Aitken Spence Hotels PLC, Ceylon Graphene Technologies, Ceylon Asset Management Ltd, Global Strategic Corporate Sustainability Pvt. Ltd, and the UN Global Compact.',
      'In recognition of his contributions to global strategy and sustainability, he was awarded the Global Strategy Leadership Award in 2007 by Professor Renee Mauborgne of INSEAD at the World Strategy Summit.',
    ],
  },
  {
    slug: 'maithree-malwattegoda',
    name: 'Mrs. Maithree Malwattegoda',
    role: 'Advisor',
    widths: [240],
    bio: [
      'Maithree Malwattegoda is a seasoned professional with extensive experience as the General Manager for Sarvoda Fusion, the ICT arm of Sarvodaya. With over 20 years in marketing and management, she has successfully led numerous national-level organizations. Maithree holds a degree in marketing and a postgraduate qualification in management. Her passion for innovation and dedication to social impact drive her work in ICT and beyond.',
    ],
  },
  {
    slug: 'amithe-gamage',
    name: 'Mr. Amithe Gamage',
    role: 'Advisor',
    widths: [225],
    bio: [
      'Amithe Gamage is a dynamic professional with a diverse skill set. As the Co-Founder of Quantum Leap Pvt. Ltd, he has been instrumental in driving growth and innovation. With expertise as a CEO Coach, Personal Branding Strategist, LinkedIn Marketing specialist, and Live Streamer, Amithe excels in helping individuals and businesses achieve their goals. He is also a Sales Performance Evangelist, empowering teams to achieve remarkable results.',
    ],
  },
  {
    slug: 'kanishka-weeramunda',
    name: 'Mr. Kanishka Weeramunda',
    role: 'Advisor',
    widths: [240],
    bio: [
      'Holding more than 18 years of high level experience in the ICT industry, Kanishka Weeramunda is the CEO of PayMedia (Pvt) Ltd, a rapidly evolving Fin-Tech company in Sri Lanka, started with the aim of providing the best calibre of total software solutions for Banks, Government and other Financial Institutes.',
    ],
  },
  {
    slug: 'roshan-ranawake',
    name: 'Roshan Ranawake',
    role: 'Advisor',
    widths: [240, 480],
    bio: [
      'Roshan Ranawake is the Managing Director at Control Union Sri Lanka and a graduate of the Faculty of Agriculture at the University of Peradeniya. With deep expertise in standards and quality assurance, he has played a pivotal role in elevating Sri Lanka to one of the largest operations within Control Union’s global network. His leadership has been instrumental in maintaining the company’s reputation for excellence in testing, inspection, and certification, while expanding its impact across over 80 countries.',
    ],
  },
];

export const EXPERTS: Person[] = [
  {
    slug: 'thanzyl-thajudeen',
    name: 'Thanzyl Thajudeen',
    role: 'Consultant, Public Affairs, PR and Communications',
    widths: [240],
    bio: [
      'Thanzyl is the founder and director of Mark and Comm Ltd with over 10 years of experience in PR and communications. He is a board member of PRCA Asia Pacific and serves on the education advisory board and membership committee of PRCA, the world’s largest PR body. He is also a member of the CIPR international committee and sits on CIPR’s professional standards standing committee. He holds a postgraduate diploma in marketing from the Chartered Institute of Marketing and an executive MBA from the University of Colombo.',
    ],
  },
  {
    slug: 'jay-de-silva',
    name: 'Jay De Silva',
    role: 'Consultant, Sustainable Finance',
    widths: [240, 480],
    bio: [
      'Jay De Silva is a banking and finance professional with nearly 20 years of experience in the financial services sector, having worked with one of the largest private banks in Sri Lanka and one of the country’s fastest-growing finance companies. His expertise spans SME financing, credit risk management, lending operations, digital workflow transformation, and business process development within regulated financial environments.',
      'Currently based in Finland, Jay holds an Executive MBA in Finance from the University of Bedfordshire in the UK and a Bachelor’s degree in Digital International Business from South-Eastern Finland University of Applied Sciences.',
      'In addition to his corporate banking experience, Jay works as a consultant to several SME-focused finance and business organizations in Sri Lanka, supporting operational development, lending processes, workflow improvements, and business protocols.',
      'His professional journey reflects a commitment to continuous learning, international business adaptation, and sustainable business transformation. As an advocate for responsible growth and environmental sustainability, Jay is focused on promoting sustainable SME practices, digital transformation, and environmentally conscious business operations.',
    ],
  },
];
