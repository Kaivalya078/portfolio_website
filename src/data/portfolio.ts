/**
 * Every piece of copy and every external URL on this site lives here.
 *
 * To change a link, edit `social` or a project's `githubUrl` / `liveUrl` / `extraLink`.
 * A `null` URL simply hides that link - no other change is needed anywhere.
 */

export type Link = {
  label: string;
  href: string;
};

export type Project = {
  id: string;
  title: string;
  subtitle: string;
  /** One sentence. The README is the documentation; this is not. */
  description: string;
  /** Optional one-line pipeline sketch, rendered in mono. */
  architecture?: string;
  highlights: string[];
  technologies: string[];
  /** Ongoing work, rendered as a plain closing note - never a badge or category. */
  inProgress?: string;
  githubUrl: string | null;
  liveUrl: string | null;
  extraLink?: Link | null;
};

export type Role = {
  id: string;
  company: string;
  title: string;
  period: string;
  location: string;
  points: string[];
};

export const identity = {
  name: 'Kaivalya Patel',
  role: 'AI / ML Engineer',
  tagline: 'building practical AI systems.',
  /** Used for <title>, meta description and Open Graph. */
  summary: 'AI / ML Engineer building practical AI systems.',
};

export const social: Link[] = [
  { label: 'GitHub', href: 'https://github.com/Kaivalya078' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kaivalya-patel-333a86321/' },
  { label: 'Instagram', href: 'https://www.instagram.com/kaivalyapatel_078/' },
  { label: 'Kaggle', href: 'https://www.kaggle.com/kaivalya78' },
];

/** Copied to the clipboard rather than opening a mail client. */
export const email = 'kaivalya.patel2004@gmail.com';

export const experience: Role[] = [
  {
    id: 'bit01',
    company: 'Bit01 Techplode',
    title: 'Data Science Intern',
    period: 'Jan 2026 — Jun 2026',
    location: 'Ahmedabad, India',
    points: [
      'Preprocessed, cleaned and validated structured datasets for machine learning workflows, improving data quality and consistency for downstream model development.',
      'Performed exploratory data analysis, feature engineering and visualization to identify trends, validate datasets and support experimentation.',
      'Assisted in developing and evaluating models by preparing training datasets, monitoring performance metrics and supporting model validation.',
      'Collaborated with cross-functional teams on implementation, technical documentation and end-to-end data science workflows.',
    ],
  },
  {
    id: 'petpooja',
    company: 'Petpooja',
    title: 'Data Science Intern',
    period: 'Jul 2025 — Dec 2025',
    location: 'Ahmedabad, India',
    points: [
      'Contributed to development and validation of an in-house face recognition attendance system reaching 92–95% recognition accuracy across multiple image-processing pipelines.',
      'Built and maintained employee facial embedding databases through iterative threshold tuning and testing cycles, reducing false positives and false negatives.',
      'Preprocessed and structured datasets for retrieval-augmented generation pipelines powered by fine-tuned language models.',
    ],
  },
];

export const projects: Project[] = [
  {
    id: 'finsightai',
    title: 'FinSightAI / Cognifin',
    subtitle: 'Financial RAG System',
    description:
      'Retrieval-augmented question answering over Indian financial documents, where every answer is grounded in cited evidence from the source PDFs.',
    highlights: [
      'Hybrid retrieval combining FAISS dense search, BM25, reranking and multi-query generation.',
      'Indexes 287K+ document chunks with query latency of 200–600ms.',
      'Citation-grounded responses with confidence scoring.',
      'Runtime PDF upload and multi-document comparative querying.',
    ],
    technologies: [
      'FastAPI',
      'PyMuPDF',
      'sentence-transformers',
      'FAISS',
      'BM25',
      'OpenAI',
      'React',
      'Vite',
    ],
    githubUrl: 'https://github.com/Kaivalya078/finsightai',
    liveUrl: null,
  },
  {
    id: 'raceos',
    title: 'RaceOS',
    subtitle: 'Formula 1 Telemetry Analytics Platform',
    description:
      'A full-stack Formula 1 analytics platform for race pace, tyre wear, sectors and strategy, built on ingested FastF1 telemetry.',
    highlights: [
      '17-feature XGBoost lap-time predictor achieving 0.277s MAE across 1,086 Bahrain 2024 race laps.',
      'Telemetry ETL pipelines and analytical PostgreSQL views behind an async API.',
      'Tyre degradation, rolling pace, sector delta and pit-stop analysis.',
      'Head-to-head driver comparison, strategy recommendation and race-outcome prediction.',
    ],
    technologies: [
      'Python',
      'FastAPI',
      'PostgreSQL',
      'SQLAlchemy',
      'Alembic',
      'XGBoost',
      'scikit-learn',
      'React',
      'TypeScript',
      'Recharts',
    ],
    githubUrl: 'https://github.com/Kaivalya078/RaceOS',
    liveUrl: null,
  },
  {
    id: 'signscribe',
    title: 'SignScribe',
    subtitle: 'ASL Alphabet Recognition System',
    description:
      'Real-time American Sign Language alphabet recognition that classifies hand landmarks rather than raw pixels, which keeps it fast and robust to lighting.',
    highlights: [
      'Approximately 96% accuracy with sub-5ms MLP inference across 29 classes.',
      'Threaded capture and inference pipeline with a bounded queue, so the interface stays responsive.',
      'Confidence smoothing — a prediction is accepted only above 80% confidence, held for 3 consecutive frames, with a 1.5s cooldown.',
      'Sentence building with offline text-to-speech and a live confidence HUD.',
    ],
    technologies: ['PyTorch', 'MediaPipe Tasks', 'OpenCV', 'NumPy', 'Tkinter', 'pyttsx3'],
    githubUrl: 'https://github.com/Kaivalya078/SignScribe_v2',
    liveUrl: null,
  },
  {
    id: 'pulsefit',
    title: 'PulseFit',
    subtitle: 'Voice AI Agent',
    description:
      'A real-time voice agent that holds a live phone conversation for a fictional fitness-studio chain, answering from member records and handing off to a human when it does not know.',
    architecture:
      'Caller → Twilio Voice → FastAPI → Pipecat → STT → LLM + tools → TTS → Caller',
    highlights: [
      'Cascaded pipeline over Twilio Media Streams with barge-in, so callers can interrupt mid-sentence.',
      'Member authentication with fuzzy name matching and two retries before a graceful fallback.',
      'Semantic FAQ retrieval over a curated knowledge base; offers a human callback when nothing matches.',
      'Callback booking auto-filled from member records, and a triple safety net that ends calls cleanly.',
    ],
    technologies: [
      'FastAPI',
      'Pipecat',
      'Twilio Voice',
      'Sarvam STT/TTS',
      'Gemini 2.0 Flash',
      'GPT-4o-mini',
      'sentence-transformers',
      'rapidfuzz',
      'SQLite',
    ],
    githubUrl: 'https://github.com/Kaivalya078/pulsefit_agent',
    liveUrl: null,
  },
  {
    id: 'cognispend',
    title: 'CogniSpend',
    subtitle: 'Purchase Intelligence',
    description:
      'A purchase-decision assistant that scores a prospective purchase against your income, commitments, goals and price trends, and explains the verdict.',
    highlights: [
      'Multi-factor recommendation scoring with explicit constraints, thresholds and human-readable explanations.',
      'Affordability, cash-flow volatility and spending-pattern analytics.',
      'Price snapshots with normalization and trend analysis.',
      'Alerts on price drops, verdict changes, budget warnings and savings-goal milestones.',
      'JWT authentication with ownership checks on every user-scoped endpoint.',
    ],
    technologies: [
      'FastAPI',
      'SQLAlchemy 2',
      'Alembic',
      'Pydantic v2',
      'PostgreSQL',
      'JWT',
      'Next.js',
      'React',
      'TypeScript',
    ],
    inProgress:
      'In development. The backend and the first frontend build are complete; persistent item identity and the goal simulator come next.',
    githubUrl: 'https://github.com/Kaivalya078/CogniSpend',
    liveUrl: null,
  },
  {
    id: 'intellicart',
    title: 'IntelliCart',
    subtitle: 'Conversational Product Recommendation',
    description:
      'A conversational sales associate that turns an ordinary sentence into validated requirements and recommends real products from catalogue data.',
    highlights: [
      'Semantic search over pgvector embeddings sits behind hard SQL filters, so a close embedding match priced above “under ₹80,000” is never a candidate in the first place.',
      'LLM-extracted requirements are re-validated against the same category registry and normalizers the catalogue uses; anything that fails is dropped with a reason rather than guessed at.',
      'Catalogue ingestion from CSV, JSON and JSONL with deduplication, provenance and idempotent upserts.',
      'Conversational refinement asks one question at a time and stops as soon as it knows enough.',
      'Weighted recommendation ranking that carries its own arithmetic, so any position in the list can be explained.',
    ],
    technologies: [
      'FastAPI',
      'SQLAlchemy',
      'Alembic',
      'PostgreSQL',
      'pgvector',
      'sentence-transformers',
      'Pydantic',
    ],
    inProgress:
      'In development. Phases 1–6 are complete; live price and availability verification comes next.',
    githubUrl: null,
    liveUrl: null,
  },
];
