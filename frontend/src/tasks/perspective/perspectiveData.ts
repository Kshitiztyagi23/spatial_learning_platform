import { Scenario, DirectionOption } from './types';
// Scenario titles, questions and correct answers. The backend reads the same
// file (services/park_scenarios.py) to check answers and brief the AI tutor.
// Scenario 1 has the real questions; 2-8 are placeholders until their
// questions and photos are added.
import scenarioData from './scenarios.json';

const DEFAULT_OPTIONS: DirectionOption[] = ['Right', 'Left', 'Front', 'Behind'];

// Scenarios that have real photos (compressed JPEGs, ~0.8 MB for main views).
// The rest use the SVG placeholders until their photos are added. To add a
// scenario's photos: put main_view_1/2.jpg and perspective_a-d.jpg in its
// templates folder (resize photos to ~2000 px wide first) and add its id here.
const SCENARIOS_WITH_PHOTOS = new Set([1]);

// Helper to create the 6 images per scenario from its template folder
function createScenarioImages(scenarioId: number) {
  const base = `/perspective/templates/scenario_${scenarioId}`;
  const ext = SCENARIOS_WITH_PHOTOS.has(scenarioId) ? 'jpg' : 'svg';
  return [
    { id: 1, label: 'Main View 1', src: `${base}/main_view_1.${ext}`, description: 'Overall scene overview' },
    { id: 2, label: 'Main View 2', src: `${base}/main_view_2.${ext}`, description: 'Secondary scene perspective' },
    { id: 3, label: "A's Perspective", src: `${base}/perspective_a.${ext}`, description: 'Point of view of character A' },
    { id: 4, label: "B's Perspective", src: `${base}/perspective_b.${ext}`, description: 'Point of view of character B' },
    { id: 5, label: "C's Perspective", src: `${base}/perspective_c.${ext}`, description: 'Point of view of character C' },
    { id: 6, label: "D's Perspective", src: `${base}/perspective_d.${ext}`, description: 'Point of view of character D' },
  ];
}

export const SCENARIOS: Scenario[] = scenarioData.map(s => ({
  id: s.id,
  title: s.title,
  context: s.context,
  images: createScenarioImages(s.id),
  questions: s.questions.map(q => ({
    ...q,
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: q.correctAnswer as DirectionOption,
  })),
}));
