import { Scenario, DirectionOption } from './types';

const DEFAULT_OPTIONS: DirectionOption[] = ['Right', 'Left', 'Front', 'Behind'];

// Helper to create standard 6 image placeholders per scenario from template folder
function createScenarioImages(scenarioId: number) {
  const base = `/perspective/templates/scenario_${scenarioId}`;
  return [
    { id: 1, label: 'Main View 1', src: `${base}/main_view_1.png`, description: 'Overall scene overview' },
    { id: 2, label: 'Main View 2', src: `${base}/main_view_2.png`, description: 'Secondary scene perspective' },
    { id: 3, label: "A's Perspective", src: `${base}/perspective_a.png`, description: 'Point of view of character A' },
    { id: 4, label: "B's Perspective", src: `${base}/perspective_b.png`, description: 'Point of view of character B' },
    { id: 5, label: "C's Perspective", src: `${base}/perspective_c.png`, description: 'Point of view of character C' },
    { id: 6, label: "D's Perspective", src: `${base}/perspective_d.png`, description: 'Point of view of character D' },
  ];
}

// User-provided questions for Scenario 1
const SCENARIO_1_QUESTIONS = [
  {
    id: 1,
    questionNumber: 1,
    text: 'If C is standing at the yellow swing in the park and facing the monkey bar, what would be the location of the see-saw?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Right' as DirectionOption,
  },
  {
    id: 2,
    questionNumber: 2,
    text: 'If A is standing at the Monkey Bar and facing the Slide, where is the Building?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Behind' as DirectionOption,
  },
  {
    id: 3,
    questionNumber: 3,
    text: 'If B is standing at the Cube Structure and facing the Circular Bench, where is the Building?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Left' as DirectionOption,
  },
  {
    id: 4,
    questionNumber: 4,
    text: 'If D is standing near the Circular Bench and facing the Building, where is the Monkey Bar?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Front' as DirectionOption,
  },
  {
    id: 5,
    questionNumber: 5,
    text: 'If C is sitting on the Rectangular Bench and looking at the Circular Swing, where is the Slide?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Right' as DirectionOption,
  },
  {
    id: 6,
    questionNumber: 6,
    text: 'If B is standing near the Cube Structure and facing the Rectangular Bench, where is the building?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Behind' as DirectionOption,
  },
  {
    id: 7,
    questionNumber: 7,
    text: 'If D is at the Circular Swing and facing the Monkey Bar, where is the Circular Bench?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Left' as DirectionOption,
  },
  {
    id: 8,
    questionNumber: 8,
    text: 'If A is at the See Saw and facing the Building, where is the Monkey Bar?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Right' as DirectionOption,
  },
  {
    id: 9,
    questionNumber: 9,
    text: 'If C is standing near the Swings and facing the Monkey Bar, where is the Rectangular Bench?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Front' as DirectionOption,
  },
  {
    id: 10,
    questionNumber: 10,
    text: 'If B is at the Slide and facing the Circular Bench, where is the building?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Left' as DirectionOption,
  },
  {
    id: 11,
    questionNumber: 11,
    text: 'If D is sitting at the Rectangular Bench and facing the Building, where is the Monkey Bar?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Behind' as DirectionOption,
  },
  {
    id: 12,
    questionNumber: 12,
    text: 'If A is standing near the Monkey Bar and facing the Rectangular Bench, where is the Circular Bench?',
    points: 1,
    options: DEFAULT_OPTIONS,
    correctAnswer: 'Right' as DirectionOption,
  },
];

// Helper to generate template questions for scenarios 2-8
function generateScenarioQuestions(scenarioId: number) {
  const landmarks = [
    ['Gazebo', 'Fountain', 'Flower Bed', 'Statue'],
    ['Basketball Court', 'Bleachers', 'Scoreboard', 'Cafeteria'],
    ['Library Entrance', 'Clock Tower', 'Bike Rack', 'Flagpole'],
    ['Pond Bridge', 'Duck Feeding Dock', 'Willow Tree', 'Pavilion'],
    ['School Gate', 'Principal Office', 'Courtyard', 'Gymnasium'],
    ['Playground Carousel', 'Sandbox', 'Climbing Wall', 'Picnic Table'],
    ['Amphitheater', 'Stage', 'Sound Booth', 'Snack Bar'],
  ];

  const set = landmarks[(scenarioId - 2) % landmarks.length];
  const persons = ['A', 'B', 'C', 'D'];
  const dirs: DirectionOption[] = ['Right', 'Left', 'Front', 'Behind'];

  return Array.from({ length: 12 }, (_, i) => {
    const p = persons[i % persons.length];
    const origin = set[i % set.length];
    const facing = set[(i + 1) % set.length];
    const target = set[(i + 2) % set.length];
    const randDir = dirs[(i + scenarioId) % dirs.length];

    return {
      id: scenarioId * 100 + (i + 1),
      questionNumber: i + 1,
      text: `If ${p} is standing at the ${origin} and facing the ${facing}, where is the ${target}?`,
      points: 1,
      options: DEFAULT_OPTIONS,
      correctAnswer: randDir,
    };
  });
}

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'Scenario 1: Park & Playground Layout',
    context: 'Use the 6 reference views to understand the layout of the park, including the playground equipment, benches, and central building.',
    images: createScenarioImages(1),
    questions: SCENARIO_1_QUESTIONS,
  },
  {
    id: 2,
    title: 'Scenario 2: Central Plaza & Gazebo',
    context: 'Examine the plaza angles to determine perspective directions around the gazebo, fountain, and statues.',
    images: createScenarioImages(2),
    questions: generateScenarioQuestions(2),
  },
  {
    id: 3,
    title: 'Scenario 3: Sports Ground & Bleachers',
    context: 'Review the sports complex views from different spectator and player vantage points.',
    images: createScenarioImages(3),
    questions: generateScenarioQuestions(3),
  },
  {
    id: 4,
    title: 'Scenario 4: Campus Quad & Clock Tower',
    context: 'Identify relative positions across the university quadrangle and surrounding monuments.',
    images: createScenarioImages(4),
    questions: generateScenarioQuestions(4),
  },
  {
    id: 5,
    title: 'Scenario 5: Lake Park & Pavilion',
    context: 'Determine orientations along the scenic lake path, bridge, and pavilion.',
    images: createScenarioImages(5),
    questions: generateScenarioQuestions(5),
  },
  {
    id: 6,
    title: 'Scenario 6: School Courtyard',
    context: 'Analyze positions within the school courtyard and classroom building access points.',
    images: createScenarioImages(6),
    questions: generateScenarioQuestions(6),
  },
  {
    id: 7,
    title: 'Scenario 7: Adventure Play Zone',
    context: 'Inspect the obstacle course and climbing structures from multiple angles.',
    images: createScenarioImages(7),
    questions: generateScenarioQuestions(7),
  },
  {
    id: 8,
    title: 'Scenario 8: Botanical Garden & Amphitheater',
    context: 'Navigate relative orientations between the garden beds, stage, and observation deck.',
    images: createScenarioImages(8),
    questions: generateScenarioQuestions(8),
  },
];
